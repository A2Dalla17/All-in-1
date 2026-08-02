#!/usr/bin/env node
/**
 * AC7 Ride — release gate
 *
 * Nothing reaches production without this exiting 0.
 *
 *   npm run gate
 *
 * ── Why it is one script and not a CI config ───────────────────────────────
 * A gate that only exists inside a CI provider is a gate you cannot run before
 * you push, which means you find out it failed after the fact and after
 * everyone else has pulled. This runs identically on a laptop and in CI. CI
 * calls this file; it does not reimplement it.
 *
 * ── Why a failure is fatal rather than a warning ───────────────────────────
 * Warnings are read once and ignored forever. Every check below is either
 * something that must be true to ship or it is not in the list.
 *
 * Exit codes:
 *   0  safe to release
 *   1  a check failed — do not release
 *   2  the gate itself could not run (missing config), which is also not safe
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* -------------------------------------------------------------------------- */
/* Reporting                                                                  */
/* -------------------------------------------------------------------------- */

const results = [];
let failed = false;

const c = {
  dim: (s) => `[2m${s}[0m`,
  red: (s) => `[31m${s}[0m`,
  green: (s) => `[32m${s}[0m`,
  yellow: (s) => `[33m${s}[0m`,
  bold: (s) => `[1m${s}[0m`,
};

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`${c.green('  PASS')}  ${name}${detail ? c.dim(`  ${detail}`) : ''}`);
}

function fail(name, detail) {
  failed = true;
  results.push({ name, ok: false, detail });
  console.log(`${c.red('  FAIL')}  ${name}\n        ${c.red(detail)}`);
}

function skip(name, why) {
  results.push({ name, ok: null, detail: why });
  console.log(`${c.yellow('  SKIP')}  ${name}${c.dim(`  ${why}`)}`);
}

function section(title) {
  console.log(`\n${c.bold(title)}`);
}

function run(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...opts,
  });
}

/* -------------------------------------------------------------------------- */
/* 1. Secrets                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * This project has already leaked a database password and a JWT secret into a
 * public repository once. This check runs first and blocks the release,
 * because a secret that reaches a public commit is compromised the moment it
 * lands — rotating it afterwards is damage control, not a fix.
 */
function checkSecrets() {
  section('1. Secrets');

  const patterns = [
    // Supabase service role JWTs — bypass RLS entirely.
    { re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, what: 'a JWT' },
    { re: /service_role/g, what: 'a service_role reference' },
    { re: /sb_secret_[A-Za-z0-9_-]+/g, what: 'a Supabase secret key' },
    // Postgres connection strings with an inline password.
    { re: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/g, what: 'a database URL with a password' },
  ];

  const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '.vercel']);
  const SCAN_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|ps1|bat|sh|yml|yaml|md|env)$/i;

  const hits = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = join(dir, entry);

      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }

      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!SCAN_EXT.test(entry)) continue;
      // The gate itself contains the patterns it searches for.
      if (full.endsWith('release-gate.mjs')) continue;

      let text;
      try {
        text = readFileSync(full, 'utf8');
      } catch {
        continue;
      }

      for (const { re, what } of patterns) {
        re.lastIndex = 0;
        if (re.test(text)) {
          hits.push(`${full.replace(ROOT, '.')} contains ${what}`);
        }
      }
    }
  };

  walk(ROOT);

  if (hits.length) {
    fail('no secrets in the tree', hits.slice(0, 8).join('\n        '));
  } else {
    pass('no secrets in the tree');
  }

  // .env files must not be tracked by git.
  try {
    const tracked = run('git ls-files', { cwd: ROOT }).split('\n');
    const bad = tracked.filter((f) => /(^|\/)\.env(\.|$)/.test(f) && !/\.example$/.test(f));
    if (bad.length) {
      fail('no .env files tracked by git', bad.join(', '));
    } else {
      pass('no .env files tracked by git');
    }
  } catch {
    skip('no .env files tracked by git', 'not a git checkout');
  }
}

/* -------------------------------------------------------------------------- */
/* 2. Types and build                                                         */
/* -------------------------------------------------------------------------- */

function checkTypesAndBuild() {
  section('2. Types and build');

  try {
    run('npx tsc -b --noEmit');
    pass('typecheck');
  } catch (e) {
    fail('typecheck', String(e.stdout || e.message).trim().split('\n').slice(0, 12).join('\n        '));
    return false;
  }

  try {
    run('npx vite build');
    pass('production build');
  } catch (e) {
    fail('production build', String(e.stderr || e.stdout || e.message).trim().slice(0, 800));
    return false;
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/* 3. Bundle budget                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A budget, not a measurement.
 *
 * The point is to fail the day someone imports a 400 kB date library into the
 * sign-in screen, on a product whose users are standing in the street on
 * mobile data. Raising the number is allowed; raising it silently is not, and
 * that is the whole mechanism.
 */
const ENTRY_BUDGET_KB = 320;

function checkBundleBudget() {
  section('3. Bundle budget');

  const assets = join(ROOT, 'dist', 'assets');
  if (!existsSync(assets)) {
    fail('bundle budget', 'dist/assets missing — the build did not produce output');
    return;
  }

  const entries = readdirSync(assets).filter((f) => /^index-.*\.js$/.test(f));
  if (!entries.length) {
    fail('bundle budget', 'no entry chunk found in dist/assets');
    return;
  }

  let worst = 0;
  let worstName = '';
  for (const f of entries) {
    const kb = statSync(join(assets, f)).size / 1024;
    if (kb > worst) {
      worst = kb;
      worstName = f;
    }
  }

  const size = `${worst.toFixed(0)} kB (budget ${ENTRY_BUDGET_KB} kB)`;
  if (worst > ENTRY_BUDGET_KB) {
    fail('bundle budget', `${worstName} is ${size}`);
  } else {
    pass('bundle budget', size);
  }
}

/* -------------------------------------------------------------------------- */
/* 4. Automated tests                                                         */
/* -------------------------------------------------------------------------- */

function checkTests() {
  section('4. Automated tests');

  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  if (!pkg.scripts?.test) {
    /* Deliberately loud. This is currently the largest hole in AC7's release
       safety: every other check here verifies that the code compiles and is
       shaped correctly, and none of them verifies that it does the right
       thing. */
    skip('unit tests', 'NO TEST SUITE EXISTS — nothing here checks behaviour');
    return;
  }

  try {
    run('npm test --silent');
    pass('unit tests');
  } catch (e) {
    fail('unit tests', String(e.stdout || e.message).trim().slice(0, 800));
  }
}

/* -------------------------------------------------------------------------- */
/* 5. Database — auth, RLS, flags                                             */
/* -------------------------------------------------------------------------- */

function env(name) {
  const direct = process.env[name];
  if (direct) return direct.trim();

  for (const file of ['.env.production.local', '.env.local', '.env']) {
    const p = join(ROOT, file);
    if (!existsSync(p)) continue;
    const line = readFileSync(p, 'utf8')
      .split('\n')
      .find((l) => l.trim().startsWith(`${name}=`));
    if (line) return line.slice(line.indexOf('=') + 1).trim();
  }
  return '';
}

async function rest(url, key, path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function checkDatabase() {
  section('5. Database — reachability, RLS, flag integrity');

  const url = env('VITE_SUPABASE_URL');
  const anon = env('VITE_SUPABASE_ANON_KEY');

  if (!url || !anon) {
    fail('database configured', 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not found');
    return;
  }

  // Reachability
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon } });
    if (!res.ok) {
      fail('auth service reachable', `GET /auth/v1/health returned ${res.status}`);
      return;
    }
    pass('auth service reachable');
  } catch (e) {
    fail('auth service reachable', e.message);
    return;
  }

  /* RLS assertions.
   *
   * Each of these tables must return NOTHING to a caller holding only the
   * publishable key. The key ships in the JavaScript bundle, so "the client
   * does not query this table" is not a control — RLS is the control, and
   * this is where it gets proven rather than assumed. */
  const mustBeEmpty = [
    'users',
    'rides',
    'drivers',
    'payments',
    'wallet_transactions',
    'chat_messages',
    'feature_flags',
    'feature_flag_overrides',
    'feature_flag_audit',
    'release_events',
  ];

  for (const table of mustBeEmpty) {
    const { status, text } = await rest(url, anon, `${table}?select=*&limit=1`);

    // 200 with [] is correct (policy returns no rows). 401/403/404 also fine
    // — the grant was revoked outright.
    if (status === 200) {
      let rows;
      try {
        rows = JSON.parse(text);
      } catch {
        rows = null;
      }
      if (Array.isArray(rows) && rows.length === 0) {
        pass(`anon cannot read ${table}`);
      } else {
        fail(`anon cannot read ${table}`, `returned ${Array.isArray(rows) ? rows.length : '?'} row(s) — DATA IS PUBLIC`);
      }
    } else if ([401, 403, 404].includes(status)) {
      pass(`anon cannot read ${table}`, `HTTP ${status}`);
    } else {
      fail(`anon cannot read ${table}`, `unexpected HTTP ${status}: ${text.slice(0, 160)}`);
    }
  }

  /* RPC exposure.
   *
   * This check exists because the obvious way to secure a Postgres function —
   * `revoke all on function … from public` — does not work on Supabase.
   * Supabase sets default privileges that grant EXECUTE to anon and
   * authenticated by name at CREATE time, so revoking PUBLIC leaves the
   * function wide open while looking, in the migration, as though it were
   * locked. Four internal functions shipped exposed that way before this check
   * existed. Asking PostgREST directly is the only answer that cannot be
   * fooled by how the migration reads. */
  const mustNotBeCallable = [
    ['flag_bucket', { p_key: 'x', p_subject: 'y' }],
    ['trip_circuit_breaker', { p_flag_key: 'x' }],
    ['log_feature_flag_change', {}],
    ['touch_feature_flag', {}],
    ['promote_flag', { p_key: 'x', p_stage: 'ga' }],
  ];

  for (const [fn, body] of mustNotBeCallable) {
    const { status } = await rest(url, anon, `rpc/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // 404 = not in the exposed schema, 401/403 = permission denied. Anything
    // else means anon reached it.
    if ([401, 403, 404].includes(status)) {
      pass(`anon cannot call ${fn}()`, `HTTP ${status}`);
    } else {
      fail(`anon cannot call ${fn}()`, `HTTP ${status} — REACHABLE BY ANONYMOUS CALLERS`);
    }
  }

  /* Flag integrity: the client's FLAG_KEYS and the database must agree.
   * A key in the code but not the database silently evaluates to its default
   * forever, which looks exactly like "the feature is off" and is how a
   * finished feature sits dark for a month without anyone noticing. */
  const flagsFile = readFileSync(join(ROOT, 'src', 'lib', 'flags.ts'), 'utf8');
  const block = flagsFile.match(/export const FLAG_KEYS = \[([\s\S]*?)\] as const;/);

  if (!block) {
    fail('flag keys parsed from source', 'could not find FLAG_KEYS in src/lib/flags.ts');
    return;
  }

  const codeKeys = [...block[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]).sort();

  const { status, text } = await rest(url, anon, 'rpc/evaluate_flags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_anon_id: 'release-gate' }),
  });

  if (status !== 200) {
    fail('evaluate_flags callable by anon', `HTTP ${status}: ${text.slice(0, 200)}`);
    return;
  }
  pass('evaluate_flags callable by anon');

  let dbKeys = [];
  try {
    dbKeys = JSON.parse(text).map((r) => r.key).sort();
  } catch {
    fail('evaluate_flags returned rows', text.slice(0, 200));
    return;
  }

  const missingInDb = codeKeys.filter((k) => !dbKeys.includes(k));
  const missingInCode = dbKeys.filter((k) => !codeKeys.includes(k));

  if (missingInDb.length) {
    fail('every code flag exists in the database', `missing: ${missingInDb.join(', ')}`);
  } else {
    pass('every code flag exists in the database', `${codeKeys.length} flags`);
  }

  if (missingInCode.length) {
    // Not fatal: a flag can legitimately exist server-side before the client
    // that reads it has shipped. Worth saying out loud all the same.
    skip('every database flag is used in code', `unused in client: ${missingInCode.join(', ')}`);
  } else {
    pass('every database flag is used in code');
  }
}

/* -------------------------------------------------------------------------- */
/* 6. Critical journeys                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Route-level smoke check against the built output.
 *
 * This is a shape check, not a behaviour check: it proves the routes that
 * every user journey starts from are still registered and were not dropped by
 * a refactor. It cannot tell you the booking flow works. Only real tests can
 * do that, and there are none yet — see check 4.
 */
function checkJourneys() {
  section('6. Critical journeys (route registration)');

  const appSrc = join(ROOT, 'src', 'App.tsx');
  if (!existsSync(appSrc)) {
    fail('App.tsx present', 'not found');
    return;
  }

  const src = readFileSync(appSrc, 'utf8');
  const required = [
    ['about', 'landing — about'],
    ['privacy', 'landing — privacy'],
    ['/taxi', 'taxi entry (Book Taxi lands here)'],
    ['/taxi/login', 'taxi sign in'],
    ['/taxi/register', 'taxi sign up'],
    ['/taxi/app/*', 'rider app'],
    ['/taxi/driver/*', 'driver app'],
    ['/taxi/d/:code', 'driver code lookup'],
    ['/taxi/cards', 'printable street cards'],
    ['/admin/*', 'control centre'],
  ];

  for (const [path, label] of required) {
    if (src.includes(`path="${path}"`)) {
      pass(`route registered: ${label}`, path);
    } else {
      fail(`route registered: ${label}`, `no <Route path="${path}"> in App.tsx`);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* 7. One application                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Guards the merge.
 *
 * ACT was two applications on two Vercel projects, joined by an absolute link
 * from the landing site to a2-taxi.vercel.app. Merging them is easy to undo by
 * accident: one `href` to an external origin, one reintroduced VITE_TAXI_URL,
 * and the platform is quietly two deployments again while every other check
 * here still passes.
 */
function checkSingleApplication() {
  section('7. One application');

  const src = join(ROOT, 'src');
  const offenders = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx)$/.test(entry)) continue;

      const text = readFileSync(full, 'utf8');
      const rel = full.replace(ROOT, '.');

      // Strip block and line comments: the env.ts note explaining the merge
      // legitimately names the old host.
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

      if (/a2-taxi\.vercel\.app/.test(code)) offenders.push(`${rel} links to the old taxi deployment`);
      if (/VITE_TAXI_URL/.test(code)) offenders.push(`${rel} reads VITE_TAXI_URL — taxi is a route, not a URL`);
    }
  };
  walk(src);

  if (offenders.length) {
    fail('taxi is a route, not a second deployment', offenders.join('\n        '));
  } else {
    pass('taxi is a route, not a second deployment');
  }

  // The standalone taxi landing page must stay deleted.
  if (existsSync(join(src, 'routes', 'LandingPage.tsx'))) {
    fail('no standalone taxi landing page', 'src/routes/LandingPage.tsx is back');
  } else {
    pass('no standalone taxi landing page');
  }
}

/* -------------------------------------------------------------------------- */

async function main() {
  console.log(c.bold('\nAC7 Ride — release gate\n'));

  checkSecrets();
  const built = checkTypesAndBuild();
  if (built) checkBundleBudget();
  checkTests();
  await checkDatabase();
  checkJourneys();
  checkSingleApplication();

  const passed = results.filter((r) => r.ok === true).length;
  const skipped = results.filter((r) => r.ok === null).length;
  const failures = results.filter((r) => r.ok === false);

  console.log(
    `\n${c.bold('Summary')}  ${passed} passed, ${failures.length} failed, ${skipped} skipped\n`,
  );

  if (failed) {
    console.log(c.red(c.bold('DO NOT RELEASE.')));
    for (const f of failures) console.log(c.red(`  - ${f.name}`));
    console.log('');
    process.exit(1);
  }

  console.log(c.green(c.bold('Safe to release.')));
  if (skipped) {
    console.log(c.yellow(`${skipped} check(s) skipped — read them before you promote past canary.`));
  }
  console.log('');
}

main().catch((e) => {
  console.error(c.red(`\nThe gate itself failed to run: ${e.message}\n`));
  process.exit(2);
});
