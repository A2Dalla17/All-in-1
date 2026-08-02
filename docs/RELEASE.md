# AC7 — Progressive Delivery

How a change gets from your laptop to every rider in London without taking the
service down on the way.

---

## What is actually built, and what is not

Four things were asked for. Two are built and tested. Two depend on
infrastructure AC7 does not currently have, and this section says so plainly
rather than shipping something that carries the right name and does the wrong
job.

| Asked for | Status | Reality |
|---|---|---|
| **Feature flags** | **Built** | Database-backed, per-user, instant kill switch, full audit trail. |
| **Progressive delivery** | **Built** | Stage ladder, percentage rollout, health telemetry, automatic circuit breaker. |
| **Canary deployment** | **Substituted** | See below — done at the flag layer, not the traffic layer. |
| **Rolling deployment** | **Not applicable yet** | See below — there is nothing to roll. |

### Canary — why it is done with flags, not traffic splitting

A true canary sends a slice of *traffic* to a different *build*. On Vercel that
is the Rolling Releases feature, and it is [available on Pro and Enterprise
plans](https://vercel.com/docs/rolling-releases) — not on Hobby. There is no
way to split traffic between two builds on the current plan.

What is built instead: one build goes to everyone, and the *feature inside it*
is switched on for 5% of users. The user-visible outcome is the same — a small
group gets the new thing first, everyone else is untouched — and it is better
in two respects:

- **Rollback is instant and total.** Traffic-splitting rollback means promoting
  the previous deployment and waiting for the CDN. A flag is a database UPDATE
  that every open tab picks up within a minute.
- **The blast radius is one feature, not one build.** A canary build that
  breaks takes down everything in it. A canary flag that breaks takes down
  exactly the feature behind it, and the four other things you shipped that
  week keep working.

What it genuinely does not give you: coverage of changes that are not behind a
flag. A dependency upgrade, a routing change, a CSS refactor — those ship to
100% immediately, and no flag can stage them. If that becomes the thing that
bites you, Vercel Pro is the fix, and this document should be revisited.

### Rolling deployment — why it is a no-op today

Rolling deployment means replacing instances of a long-running service a few at
a time. It requires more than one instance.

- **The frontend** is static files on a CDN. Vercel swaps them atomically and
  keeps the previous deployment addressable for instant rollback. Rolling would
  be strictly worse: it would mean serving two versions of the JavaScript
  simultaneously, which is how you get a stale `index.html` requesting a chunk
  that no longer exists.
- **The Go backend is not deployed anywhere.** Zero instances. There is nothing
  to roll. When it does ship, Fly.io performs rolling deploys by default, and
  `fly.toml` is where that gets configured — not here.

So this is not a gap that was skipped; it is a step that comes after the backend
exists.

---

## The stage ladder

```
off ──► internal ──► canary ──► rollout ──► ga
 │         │            │           │        │
 └─────────┴────────────┴───────────┴────────┴──► killed
```

| Stage | Who sees it | Use it for |
|---|---|---|
| `off` | nobody | Merged, not started. The default for everything. |
| `internal` | admins only | Your own testing on production data. Percentage is ignored. |
| `canary` | a % of the audience | First real users. Start at 5. |
| `rollout` | a larger % | Widening. 25 → 50 → 75. |
| `ga` | everyone in the audience | Done. Delete the flag from the code next sprint. |
| `killed` | nobody | It hurt someone. Requires a written reason. |

Two rules are enforced by the database, not by the console, so they hold even
if someone bypasses the UI:

1. **Forward moves cannot skip a stage.** `off → ga` is refused. Retreating is
   unrestricted, because retreating is always safe.
2. **A killed flag restarts at `internal` only.** Whatever broke gets re-proven
   on staff before it touches a customer again.

---

## Releasing something

```bash
cd frontend
npm run gate          # must exit 0. If it does not, you are not releasing.
```

Then deploy the build, and drive the rollout from **Admin → Releases**:

1. **Promote to Staff only.** Use it yourself. Do the thing a rider would do.
2. **Promote to Canary at 5%.** Wait. Watch the error count on the row.
3. **Widen to 25, then 50, then 100.** Wait between each. "Wait" means long
   enough for real traffic to exercise it — for AC7's volume that is hours,
   not minutes.
4. **Promote to Everyone.**

At every step the row shows how many distinct users have hit an error in the
last hour, next to the threshold that trips the breaker. If that number is
climbing, stop widening.

### When it goes wrong

Press **Kill** and write what happened. The feature is off for everyone within
about a minute — no redeploy, no Vercel, no waiting for a build.

Then: fix it, ship the fix, promote back to `internal`, and walk the ladder
again.

---

## The circuit breaker

The system switches a feature off by itself when **5 distinct authenticated
users** report errors against it inside **10 minutes**. Both numbers are per
flag and editable.

**It counts distinct users, never events.** This is the whole design. An
error-reporting endpoint that anyone can call, wired to an automatic kill
switch, is a remote off button for your own product — if raw volume tripped it,
one person with a loop could disable school runs on a Monday morning. Three
things prevent that:

- distinct authenticated users are counted, so ten thousand errors from one
  account is one user;
- a unique index discards more than one report per user, per flag, per kind,
  per minute, so a flood costs one row;
- anonymous reports are stored for humans to read but excluded from the
  arithmetic entirely, because an anonymous id is a string the client makes up.

Verified: 500 error reports from a single account across 500 distinct minutes
did not trip a breaker set to a threshold of 2. Two reports from two different
accounts tripped it immediately.

**The breaker can only ever switch a feature off.** It has no code path that
turns anything on. An automated system that could resume a release is an
automated system that can restart an outage.

---

## What the gate checks

`npm run gate` — exits 0 or you do not ship.

1. **Secrets** — no JWTs, service-role keys or database URLs with passwords
   anywhere in the tree; no `.env` file tracked by git.
2. **Types and build** — `tsc -b --noEmit`, then a real production build.
3. **Bundle budget** — entry chunk under 320 kB. Raising the number is fine;
   raising it silently is not.
4. **Automated tests** — see the warning below.
5. **Database** — auth reachable; ten tables proven unreadable by the anon key;
   five internal RPCs proven uncallable by anon; every flag in the code exists
   in the database.
6. **Critical journeys** — the seven routes every user journey starts from are
   still registered.

### The gap you should know about

**There are no automated tests.** The gate says so, loudly, every run.

Everything above verifies that the code compiles, is shaped correctly, and does
not leak. Nothing verifies that it does the right thing. A fare calculation
that returns the wrong number passes every single check in this file.

Feature flags reduce what that costs you — a wrong fare behind a 5% canary
reaches a handful of people instead of everyone — but they do not find the bug.
Until there is a test suite, the canary stage *is* the test suite, and the
people in it are doing the testing. Treat the waiting periods as real.

---

## Using a flag in code

```tsx
import { useFlag } from '@/providers/FlagsProvider';
import { ReleaseErrorBoundary } from '@/components/ReleaseErrorBoundary';

// Simple branch
const canBookSchoolRun = useFlag('school_runs');

// Whole section, with crash containment and attribution
<ReleaseErrorBoundary flag="school_runs" fallback={<Unavailable />}>
  <SchoolRunsPanel />
</ReleaseErrorBoundary>
```

Wrap every flagged feature in its own `ReleaseErrorBoundary`. Without it a
crash reports as "the app broke" and your only option is a full rollback. With
it, the crash is attributed to one flag, the breaker switches off that one
feature, and everything else stays up.

### Adding a flag

1. Add the key to `FLAG_KEYS` and a safe default to `FLAG_DEFAULTS` in
   `src/lib/flags.ts`.
2. Insert the row in `public.feature_flags` at stage `off`.
3. The gate fails if you do one and forget the other.

### Build-time flags vs runtime flags

`env.features` in `src/config/env.ts` are **build-time** — the bundler deletes
the dead branch, so the code is not in the shipped file at all. Use those to
hide something unfinished.

The flags in `src/lib/flags.ts` are **runtime** — both branches ship, and the
database decides. Use those for anything you might need to switch off in a
hurry. A build-time flag cannot be a kill switch.

---

## Still outstanding

- **The leaked Supabase database password and JWT secret have not been
  rotated.** They are still in `PUSH-TO-GITHUB.ps1` and `FIX-AND-PUSH.ps1` on
  the public GitHub repository. Everything in this document is about limiting
  the damage a bad *release* can do; none of it helps if someone already has
  the database credentials. Rotate them.
- No test suite (above).
- Go backend not deployed, so `live_fares` cannot leave `off`.
