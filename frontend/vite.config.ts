import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import path from 'node:path';

/**
 * Identify this build.
 *
 * Every error reported to public.release_events carries this string, which is
 * what lets an incident be answered with "it started with 4f2a1c" instead of
 * "it started sometime today". Order of preference:
 *
 *   1. VITE_RELEASE_ID          — set explicitly by CI
 *   2. VERCEL_GIT_COMMIT_SHA    — set automatically by Vercel
 *   3. `git rev-parse`          — a local build from a checkout
 *   4. a timestamp              — a build from a tarball with no git at all
 *
 * The git call is wrapped because it fails in exactly the case where it is
 * least acceptable to fail the build: a deploy from a source archive.
 */
function resolveReleaseId(env: Record<string, string>): string {
  const explicit = env['VITE_RELEASE_ID']?.trim();
  if (explicit) return explicit;

  const vercel = env['VERCEL_GIT_COMMIT_SHA']?.trim();
  if (vercel) return vercel.slice(0, 12);

  try {
    return execSync('git rev-parse --short=12 HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return `build-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
  }
}

/**
 * AC7 Ride — Vite configuration
 *
 * In development the dev server proxies `/api` and `/ws` to the Go backend
 * (Kong gateway by default) so the browser sees a same-origin app. This avoids
 * CORS entirely during development and means `VITE_API_BASE_URL` can stay empty
 * locally. In production the app is served as static files and talks to the
 * gateway origin configured via `VITE_API_BASE_URL`.
 */
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Kong proxy listens on :8000 and fronts every microservice.
  const gateway = env.DEV_API_PROXY_TARGET || 'http://localhost:8000';

  /**
   * Preview builds are a design showcase with no backend — see src/preview/.
   *
   * This goes through `define` rather than being read from import.meta.env in
   * application code, and that distinction matters. Vite replaces
   * `import.meta.env` with a plain object, so `env.VITE_PREVIEW_MODE` stays a
   * runtime property access that the minifier will not fold — which means the
   * `if (preview)` branches survive and drag the whole fixture set into a
   * production bundle. A build check caught exactly that.
   *
   * `define` substitutes a bare `true` / `false` literal at every use site, so
   * the branches become statically dead and the fixture chunk is never
   * referenced. Verified by grepping the built assets.
   */
  const previewMode = env.VITE_PREVIEW_MODE === 'true';

  const releaseId = resolveReleaseId(env);

  /**
   * Refuse to build a production bundle that cannot reach Supabase.
   *
   * -- Why this is fatal rather than a warning -----------------------------
   * src/lib/supabase.ts falls back to `https://placeholder.supabase.co` when
   * the variables are absent, so that developers can run the UI without
   * credentials. That fallback is correct for `npm run dev` and catastrophic
   * for a deploy: the site builds green, loads, renders every screen, and then
   * fails on the first request with "Failed to fetch". Nothing in the build
   * log hints at the cause. That exact deploy has already been shipped once.
   *
   * A missing environment variable is a configuration mistake, and the cheapest
   * possible moment to catch it is here — before the artefact exists — rather
   * than from a user reporting that sign-in is broken.
   *
   * Dev is deliberately exempt: degrading is the right behaviour when there is
   * no deploy to get wrong.
   */
  if (command === 'build' && !previewMode) {
    const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter(
      (key) => !env[key]?.trim(),
    );

    if (missing.length) {
      throw new Error(
        [
          '',
          'BUILD STOPPED - Supabase is not configured.',
          '',
          `  Missing: ${missing.join(', ')}`,
          '',
          '  Without these the bundle points at placeholder.supabase.co. The site',
          '  would deploy successfully and then fail on every sign-in with',
          '  "Failed to fetch", with nothing in the build log to explain it.',
          '',
          '  On Vercel:  Project -> Settings -> Environment Variables',
          '              add both, tick Production + Preview + Development,',
          '              then redeploy.',
          '',
          '  Locally:    put them in frontend/.env.local',
          '',
        ].join('\n'),
      );
    }
  }

  return {
    plugins: [react()],

    define: {
      __PREVIEW_BUILD__: JSON.stringify(previewMode),
      /* Read through import.meta.env in src/lib/flags.ts, so it must be
         defined on that object rather than as a bare global. */
      'import.meta.env.VITE_RELEASE_ID': JSON.stringify(releaseId),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      host: true,
      port: 3000,
      proxy: {
        '/api': {
          target: gateway,
          changeOrigin: true,
        },
        '/ws': {
          target: gateway,
          changeOrigin: true,
          ws: true,
        },
        // The maps service is mounted at /maps (not under /api/v1).
        '/maps': {
          target: gateway,
          changeOrigin: true,
        },
      },
    },

    preview: {
      host: true,
      port: 3000,
    },

    build: {
      target: 'es2020',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              /**
               * Order and precision both matter here.
               *
               * The previous rule tested `id.includes('react')` first, which
               * is a substring match against the whole path — so
               * `@tanstack/react-query` matched "react" and went to
               * vendor-react, while `@tanstack/query-core` went to
               * vendor-query. One library, split across two chunks that then
               * imported each other: Rollup reported
               * `vendor -> vendor-react -> vendor`, a circular chunk graph.
               *
               * Matching on `node_modules/<name>` anchors to the package
               * boundary, and @tanstack is claimed before the react test can
               * steal it.
               */
              if (id.includes('node_modules/@tanstack/')) return 'vendor-query';

              /* vendor-react holds ONLY the runtime leaf: react, react-dom
                 and scheduler import nothing outside themselves. Router is
                 deliberately excluded — react-router-dom depends on
                 @remix-run/router, which lands in `vendor`, so including it
                 here would make vendor-react point at vendor while lucide-react
                 (in vendor) points back at vendor-react. That is the cycle. */
              if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
                return 'vendor-react';
              }
              return 'vendor';
            }

            /**
             * Shared infrastructure — must be listed BEFORE the role bundles.
             *
             * Without this rule, Rollup is free to place a module shared
             * between the entry and a manual chunk *inside* that manual chunk,
             * and it does. The flag client is imported by main.tsx and by the
             * admin Releases console, and it ended up in `app-admin` — so the
             * kill switch, which every user depends on, was living in the
             * admin bundle. It happened to work only because index.html
             * preloads that bundle; a change to the preload behaviour would
             * have silently broken flag evaluation for everyone.
             *
             * Naming these directories explicitly pins them to their own
             * chunk, which is what they are: code every role runs.
             */
            /* Admin-only API modules, claimed before the app-core sweep below.
               src/api/releases.ts is the release console's data layer; without
               this line the `/src/api/` rule pulls it into app-core and every
               rider downloads the admin mutation surface. Harmless — the RPCs
               are guarded server-side — but there is no reason to ship it. */
            if (id.includes('/src/api/releases')) return 'app-admin';

            /* Module bundles. Each top-level route namespace gets its own
               chunk so a visitor reading the landing page never downloads the
               driver app, and a driver never downloads the control centre.
               This is what keeps a route-based monolith from shipping every
               module to every user. */
            if (id.includes('/src/routes/landing/adverts-admin/')) return 'app-admin';
            if (id.includes('/src/routes/landing/')) return 'module-landing';
            if (id.includes('/src/components/marketing/')) return 'module-landing';

            if (
              id.includes('/src/lib/') ||
              id.includes('/src/providers/') ||
              id.includes('/src/config/') ||
              id.includes('/src/components/') ||
              id.includes('/src/hooks/') ||
              id.includes('/src/api/')
            ) {
              return 'app-core';
            }

            // Role bundles.
            //
            // Note these are lazily imported in App.tsx but still appear as
            // <link rel="modulepreload"> in index.html, so they are fetched
            // on first load regardless — pre-existing behaviour, worth fixing
            // separately if first-paint weight on mobile data matters.
            if (id.includes('/src/routes/admin/')) return 'app-admin';
            if (id.includes('/src/routes/driver/')) return 'app-driver';
            return undefined;
          },
        },
      },
    },
  };
});
