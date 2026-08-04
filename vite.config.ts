/**
 * AC7 — landing website build
 *
 * This builds ac7taxi.com and nothing else. It has no knowledge of the rider,
 * driver or admin applications, and cannot accidentally pull them in: those
 * modules live in packages/app, which this package does not depend on.
 *
 * That separation is the whole point of the restructure. A marketing site does
 * not need the map engine, the booking flow or the driver dashboard, and a
 * visitor reading the pricing page should not download them.
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  /**
   * The site reads adverts from Supabase, so a production build without
   * credentials would deploy successfully and then show an empty showcase.
   *
   * Fatal rather than a warning, and only on build: degrading is right in
   * development, where a contributor may have no credentials and only wants to
   * work on layout.
   */
  if (command === 'build') {
    const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter(
      (key) => !env[key]?.trim(),
    );
    if (missing.length) {
      throw new Error(
        [
          '',
          'BUILD STOPPED - Supabase is not configured for the landing site.',
          '',
          `  Missing: ${missing.join(', ')}`,
          '',
          '  Without these the community showcase renders empty and the site',
          '  gives no indication why.',
          '',
          '  On Vercel:  Project -> Settings -> Environment Variables',
          '  Locally:    packages/landing/.env.local',
          '',
        ].join('\n'),
      );
    }
  }

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        /* Source, not a build artefact — see the same note in the app config. */
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },

    server: {
      host: true,
      /* Deliberately not 3000. The app owns that port, and both running at
         once is normal during development — one to check a marketing change
         against the product it is describing. */
      port: 3001,
      watch: {
        /* The project lives on a Windows drive under OneDrive and the dev
           server is usually started from WSL, where that mount does not
           forward filesystem events. Without polling, edits appear to do
           nothing at all. */
        usePolling: true,
        interval: 300,
      },
    },

    preview: { host: true, port: 3001 },

    build: {
      target: 'es2020',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
                return 'vendor-react';
              }
              return 'vendor';
            }
            return undefined;
          },
        },
      },
    },
  };
});
