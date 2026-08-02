# ACT — AC7 Transport

One repository. One application. One build. One deployment.

The landing site, the taxi product, School Runs, Bookings and the Control
Centre are modules inside a single React application, reached by route. They
are not separate apps, and they are not separate Vercel projects.

---

## Layout

```
ACT/
  frontend/          The application. One package.json, one build.
    src/
      App.tsx        The whole route table — the contract between modules
      main.tsx       One React root, one set of providers
      components/
        ui/          Design system (shared)
        layout/      Landing site chrome — header, footer, cookie banner
        marketing/   Landing site sections
      config/        env, navigation
      lib/           supabase, http, session, flags, utils
      providers/     Auth, Flags, Theme
      routes/
        landing/     Landing site + adverts admin
        auth/        Sign in, register  (taxi)
        rider/       Rider app          (taxi)
        driver/      Driver app         (taxi)
        admin/       Control Centre
    scripts/
      release-gate.mjs
  backend/           Go services (not deployed yet)
  database/
    migrations/
  docs/
  ACT.code-workspace
```

Open `ACT.code-workspace` in VS Code. Everything is inside this one folder;
nothing is cloned or maintained anywhere else.

## Running it

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Before any release:

```bash
npm run gate       # must exit 0
```

## Routes

| Path | Module |
|---|---|
| `/` | Landing site |
| `/about` `/privacy` `/terms` `/cookies` `/settings` | Landing site |
| `/taxi` | Taxi — **Book Taxi lands here** |
| `/taxi/login` `/taxi/register` | Taxi sign in |
| `/taxi/app/*` | Rider app |
| `/taxi/driver/*` | Driver app |
| `/taxi/d/:code` | Driver code lookup (public) |
| `/taxi/cards` | Printable street cards |
| `/admin/*` | Control Centre |
| `/school-runs/*` `/bookings/*` `/marketplace` | Not built yet — fall through to 404 |

### The one journey

Landing site → Taxi application. Pressing **Taxi** or **Book Taxi** resolves
`/taxi`, which sends a signed-in user to their home and everyone else to sign
in. There is no taxi marketing page in between. The standalone one was deleted
and the release gate fails if it comes back.

## What changed in the merge

**Two deployments became one.** The landing site used to link to
`a2-taxi.vercel.app` — an absolute URL to a second Vercel project running a
second build of a second application, which had its own front page. Pressing
Book Taxi left the site entirely. `env.services.taxi` is now the string
`/taxi`, and the nav uses a `<Link>` rather than an `<a>`, so the transition is
in-app with no reload.

**Two authentication systems became one, and the surviving one is Supabase.**
This was the substantive finding. They did not merely differ in shape — they
authenticated against different servers:

- AC7 Community → Supabase Auth. Works.
- AC7 Taxi → `POST /api/v1/auth/login` on the Go backend, which is deployed
  nowhere, so it could not succeed for anybody.

Unifying the interfaces while keeping both backends would have produced one
provider that signed you into the landing site and then failed silently when
you pressed Book Taxi. Supabase also happens to be the identity every other
system already trusts: row level security, `current_user_id()`, the feature
flag evaluator, driver code lookup and chat all resolve the caller from the
Supabase JWT. A second identity would have meant a signed-in taxi user whom RLS
treats as anonymous.

`AuthProvider` exposes both vocabularies — `user / role / login / logout` for
the taxi modules, `session / email / isAdmin / signIn / signOut` for the
landing modules — over one session, so they cannot disagree. New code should
prefer the first.

**Two dependency trees became one.** They already matched exactly: same
packages, same versions. Taxi added `leaflet`, `qrcode` and Google Maps types.
Nothing needed resolving.

**Two design systems became one.** Taxi's was a superset — its `Button` had
seven variants to ACT's five, and it also exported `IconButton` and `Fab`. Only
three tokens were missing (`--accent`, `--accent-ink`, `--accent-soft`, the
landing site's green) plus a `site` max-width. Those were added; ACT's
duplicate `Button`, `Card` and `Badge` were dropped.

**82 internal links were rewritten.** Every absolute path inside the taxi
module (`/app`, `/driver`, `/login`, `/d/:code`, `/cards`) moved under `/taxi`.
TypeScript cannot catch these — they are strings — so they were rewritten with
an anchored pattern and verified by search afterwards. `/admin` deliberately
stayed at the root: taxi operations and the landing site's advert showcase are
one console because they are one job.

## Adding a module

1. `src/routes/<module>/` with its own layout owning its internal routes.
2. One entry in the route table in `App.tsx` — that file is the only place
   where namespaces are allocated, which is what stops two modules quietly
   claiming the same path.
3. A chunk rule in `vite.config.ts` so it is not shipped to users who never
   open it.
4. A feature flag, so it can ship dark. See `docs/RELEASE.md`.

Do not create a second application, a second repository, or a second
deployment.

## Still outstanding

- **The leaked Supabase database password and JWT secret are still unrotated**,
  in `PUSH-TO-GITHUB.ps1` and `FIX-AND-PUSH.ps1` on the public GitHub
  repository. Those files were not carried into this repo, but the credentials
  they contain are still live.
- No automated test suite. The release gate says so on every run.
- The Go backend is not deployed, so taxi fares and booking do not work end to
  end. When it ships it must be configured to verify Supabase JWTs — not to
  issue its own.
- School Runs and Bookings are not built.
