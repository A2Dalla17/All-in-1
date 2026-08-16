# REPOSITORY AUDIT

**Audited:** 9 August 2026 · every finding below was read from the actual files,
not inferred from documentation.

---

## Two findings that change the plan

> ### 1. `All in 1/backend/` is third-party code with **no licence at all**
>
> Go module path: `github.com/richxcame/ride-hailing`. Fourteen microservices,
> ~120 database tables, 96 SQL migrations. There is **no `LICENSE`, `COPYING` or
> `NOTICE` file anywhere in the tree**, and no README naming a source.
>
> Code published without a licence is **all rights reserved by default**. Nobody
> may copy, modify or distribute it without the author's permission. Building a
> commercial delivery business on it is the same legal risk as the unlicensed UI
> library we rejected earlier in this project — except this one would be the
> entire backend.

> ### 2. That backend is a **ride-hailing** system, not a delivery system
>
> Its tables: `rides`, `negotiation_sessions`, `surge_thresholds`,
> `driver_quests`, `eta_predictions`, `fare_disputes`, `wallets`,
> `loyalty_tiers`, `family_accounts`, `weather_multipliers`.
>
> Tables it does **not** have: no restaurants, no stores, no menus, no products,
> no orders, no order items. There is nothing to integrate for food delivery —
> the domain model is a different business.

---

## Repository map

| # | Location | What it actually is | Git | Licence |
|---|---|---|---|---|
| **R1** | `All in 1/` *(root)* | **GALEYR delivery platform** — live, working | `A2Dalla17/All-in-1` · 31 commits · clean | yours |
| **R2** | `All in 1/backend/` | Cloned Go ride-hailing microservices | inside R1's git | ⚠️ **none** |
| **R3** | `All in 1/frontend/` | `act-platform` React remnant + stray Flutter pubspec | inside R1's git | yours |
| **R4** | `AC7 Mobile/` | Flutter taxi app (Galeyr-branded) | `A2Dalla17/AC7-Mobile` · 6 commits | yours |
| **R5** | `AC7 Taxi/` | Original taxi project | `A2Dalla17/A2-taxi` · 213 commits | yours |
| **R6** | `AC7 Community/` | Older React landing site | **not a git repo** | yours |
| **R7** | `AC7 Galeyr/enatega/` | Enatega — 5 frontends | 143 commits · partial copy | MIT + **paid backend** |
| **R7b** | `ride-hailing/enatega/` | Same repo, complete verified copy | 143 commits · clean | MIT |

---

## R1 — GALEYR delivery platform *(the live system)*

| | |
|---|---|
| **Framework** | React 18.3 + Vite 6 |
| **Language** | TypeScript 5.7, strict (`noUncheckedIndexedAccess`, `noUnusedLocals`) |
| **Package manager** | npm |
| **Frontend** | React Router 6, TanStack Query 5, Tailwind 3.4, Inter, Motion 12 |
| **Backend** | **Supabase** — Postgres 17.6, project `lsxeernnmohrsjoqmyxo`, eu-west-2 |
| **Database** | Postgres with row level security on every table |
| **Auth** | Supabase Auth (JWT), `public.users.auth_id` link, staff roles + bcrypt 4-digit codes |
| **API** | PostgREST + 12 `SECURITY DEFINER` RPCs holding the business logic |
| **Realtime** | Not yet used — polling at 15–30s intervals |
| **Maps** | **None.** Deliberate: Mogadishu has no postcodes; addresses are district + landmark |
| **GPS** | None |
| **Notifications** | None — the Control Centre telephones people |
| **Payments** | Cash on delivery only, by design |
| **Storage** | Supabase Storage — `banners` (public), `verification-docs` (private) |
| **Env** | `.env.local`, gitignored |
| **Deployment** | Vercel |
| **Licence** | Yours |

**What works today, verified end to end:** customer ordering with server-side
pricing, tracking by order number + phone, restaurant portal, Control Centre
with sidebar console, line managers, incidents, 24-hour support queue, audit
trail, restaurant and courier applications, background-check workflow,
per-restaurant promotions, community advertising. 10 demo restaurants, 28
orders, 10 couriers seeded.

---

## R2 — Go ride-hailing backend ⚠️

| | |
|---|---|
| **Framework** | Gin |
| **Language** | Go 1.24 |
| **Module** | `github.com/richxcame/ride-hailing` — **third party** |
| **Services** | `admin analytics auth fraud geo ml-eta mobile negotiation notifications payments promos realtime rides scheduler` |
| **Database** | Postgres via `pgx/v5` and `lib/pq` · 96 migrations · ~120 tables |
| **Auth** | `golang-jwt` |
| **Realtime** | `gorilla/websocket` |
| **Cache** | Redis |
| **Deployment** | Dockerfile, `fly.toml` |
| **Licence** | **NONE — all rights reserved by default** |

**Domain:** ride-hailing. Rides, fare negotiation, surge pricing, driver
gamification and quests, ML ETA prediction, fraud detection, family accounts,
loyalty tiers, gift cards, emergency alerts.

**Not a food-delivery backend.** Zero restaurant, menu, product or order tables.

---

## R4 — AC7 Mobile *(Flutter)*

Framework Flutter 3.x · Dart · 22 dependencies · `supabase_flutter`,
`google_maps_flutter`, `geolocator`, `riverpod`, `go_router`. Git:
`A2Dalla17/AC7-Mobile`, 6 commits. Already points at **your Supabase**, which
makes it the closest thing you have to a working mobile client.

Description still reads *"Galeyr — licensed minicabs across London"* — it is a
taxi app, not a delivery app.

---

## R5 / R6 — AC7 Taxi, AC7 Community

R5 is the original taxi project, 213 commits, superseded. **It contains the
leaked Supabase database password and JWT secret in `PUSH-TO-GITHUB.ps1` and
`FIX-AND-PUSH.ps1`, in a public repository, still unrotated.**

R6 is an older React + Supabase landing site and is **not under version
control** — no history, no recovery if it is edited.

---

## R7 — Enatega

MIT licence covering **five frontends only**. The backend and API are
proprietary and require a paid licence from Ninjas Code — stated twice in their
README and confirmed by inspection: no `server/`, `api/` or `backend/`
directory exists. All five apps query `https://aws-server-v2.enatega.com/graphql`.

Next.js 14 (web, admin) · React Native + Expo (customer, rider, store) · Apollo
Client · 338 GraphQL operations including 8 live subscriptions · JWT in
`localStorage` · deprecated `subscriptions-transport-ws` · Google Maps · Firebase
messaging · Cloudinary · Stripe/PayPal · Sentry.

Three Google API keys committed in source; six `.env.*` files tracked in git.

---

## Conflicts between repositories

| Conflict | Detail |
|---|---|
| **Three competing backends** | Supabase (R1, live) · Go microservices (R2, unlicensed) · Enatega's paid API (R7) |
| **Two incompatible domains** | R2 models rides and fares. R1 and R7 model orders and menus. They do not merge — one is a taxi company |
| **Two auth models** | Supabase Auth + RLS (R1, R4) vs Go JWT + application-layer checks (R2) vs Enatega JWT in `localStorage` (R7) |
| **Two mobile stacks** | Flutter (R4, on Supabase) vs React Native/Expo (R7, on GraphQL) |
| **Address formats** | R1 uses district + landmark + phone. R2 and R7 use lat/lng + street address. Mogadishu has neither postcodes nor signed streets |
| **Payments** | R1 is cash-only by design. R2 has wallets and payouts. R7 has Stripe and PayPal |
| **Realtime** | R1 polls. R2 uses raw WebSockets. R7 uses GraphQL subscriptions |

---

## Security findings

### Critical

**S1 — Leaked production credentials, still live.** Supabase database password
and JWT secret committed to the public `A2Dalla17/A2-taxi` repository. Anyone
who read those files has full database access, bypassing every RLS policy.
Rotation has been outstanding for weeks and outranks everything else here.

**S2 — Unlicensed third-party backend in your repository.** R2 carries no
licence and is committed inside R1's git history.

**S3 — API keys committed in R7.** Three Google keys plus six tracked `.env.*`
files.

### High

**S4 — R6 is not under version control.** No history, no recovery.

**S5 — JWT in `localStorage` (R7).** One XSS becomes account takeover.

**S6 — No rate limiting on public endpoints (R1).** The staff-code path is
limited; the application forms and `galeyr_submit_customer_request` are not, so
anonymous submissions can be flooded.

### Medium

**S7 — Deprecated WebSocket transport in R7.** `subscriptions-transport-ws`,
unmaintained, holding an authenticated connection.

**S8 — No file-upload validation path is live.** The `verification-docs` bucket
is private and correctly policed, but nothing uploads to it yet, so the
end-to-end path is untested.

---

## Licensing summary

| Repository | Licence | Commercial use |
|---|---|---|
| R1, R3, R4, R5, R6 | Yours | Unrestricted |
| **R2 Go backend** | **None** | ❌ **Not permitted without the author's agreement** |
| R7 Enatega frontends | MIT | ✅ Permitted — keep `LICENSE` and the copyright notice |
| R7 Enatega API | Proprietary | ❌ Paid licence required; MIT does not cover it |

---

## What I did not do

I did not run R2's Go services, R4's Flutter build, or R7's mobile apps. Each
needs a toolchain not present here (Go, Flutter SDK, Expo/Xcode/Android SDK).
Only R1 and R7's web app have been built and verified in this environment.
