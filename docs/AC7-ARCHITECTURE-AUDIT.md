# AC7 Ride — Architecture Audit & Frontend Migration Plan

**Date:** 26 July 2026
**Scope:** Full workspace analysis. No code changed.
**Repo origin:** `github.com/richxcame/ride-hailing` (Go module path confirmed in imports)

---

## 1. Executive summary

The backend is a genuinely large, production-grade Go microservices platform — **356 Go files, 49 domain packages, 17 deployable services, 24 SQL migrations, an OpenAPI spec, a Postman collection, and unit tests per domain.** It is far more capable than the frontend currently exposes.

The frontend is **not in a working state.** It does not build, it does not boot, and every single data call is a hard-coded mock pointing at a fake domain (`https://api.ac7ride.example/v1`). There are also three parallel, half-finished frontend attempts sitting in the repo at once.

**The gap is the whole project.** The backend needs almost nothing. The frontend needs to be built properly, from a clean base, against the real API surface.

There is also one significant assumption in the brief that does not match the code: **there is no Supabase integration anywhere in this repository.** Details in §5.

---

## 2. Backend architecture (source of truth — preserve)

### 2.1 Service topology

17 independently deployable binaries under `cmd/`, fronted by **Kong** as the API gateway (`kong/setup-kong.sh`):

| Service | Kong route | Purpose |
|---|---|---|
| `auth` | `/api/v1/auth` | Register, login, profile, JWT issuance |
| `rides` | `/api/v1/rides` | Ride lifecycle (rider + driver) |
| `geo` | `/api/v1/geo` | Driver location, nearby search, geocoding, H3 surge |
| `payments` | `/api/v1/payments`, `/api/v1/wallet` | Wallet, payments, payouts, Stripe webhooks |
| `notifications` | `/api/v1/notifications` | Push / SMS / email fan-out |
| `realtime` | `/ws` | WebSocket hub |
| `mobile` | `/api/v1/mobile` | BFF aggregating ~18 domains |
| `admin` | `/api/v1/admin` | Admin console API |
| `promos` | `/api/v1/promos` | Promo codes, referrals |
| `scheduler` | `/api/v1/scheduler` | Scheduled + recurring rides |
| `analytics` | `/api/v1/analytics` | Reporting, materialized views |
| `fraud` | `/api/v1/fraud` | Risk scoring |
| `ml-eta` | `/api/v1/eta` | ETA prediction |
| `negotiation` | — | Fare negotiation sessions |

Infrastructure: **PostgreSQL** (pgx/v5 pool, primary + read replicas), **Redis** (cache, rate limiting), **NATS** (event bus), **Prometheus** + **OpenTelemetry** + **Sentry**.

### 2.2 Domain packages (`internal/`, 49 total)

```
admin  analytics  auth  cancellation  chat  corporate  currency  delivery
demandforecast  disputes  documents  earnings  experiments  family  favorites
fraud  gamification  geo  geography  giftcards  loyalty  maps  matching  mleta
negotiation  notifications  onboarding  paymentmethods  payments  paymentsplit
pool  preferences  pricing  promos  ratings  realtime  recording  ridehistory
rides  ridetypes  safety  scheduler  scheduling  subscriptions  support  tips
twofa  vehicle  verification  waittime
```

Every package follows the same clean layering: `handler.go` → `service.go` → `repository.go`, with `interfaces.go` / `models.go` and `*_test.go` alongside. This is a well-disciplined codebase and should not be touched.

### 2.3 Authentication flow

- `POST /api/v1/auth/register` — `{email, password, phone_number, first_name, last_name, role}` where `role ∈ {rider, driver}`
- `POST /api/v1/auth/login` — `{email, password}` → `{user, token}`
- `GET|PUT /api/v1/auth/profile` — Bearer-protected

JWT claims (`pkg/middleware/auth.go`):

```go
type Claims struct {
    UserID uuid.UUID
    Email  string
    Role   models.UserRole  // rider | driver | admin
    jwt.RegisteredClaims
}
```

Key details that constrain the frontend:

- Token is read from `Authorization: Bearer <token>` **or** from the `?token=` query param — the latter exists specifically so the WebSocket can authenticate.
- Key rotation is supported via `jwtkeys.KeyProvider` and a `kid` JWT header.
- Role gating is enforced server-side by `middleware.RequireRole(...)` and `middleware.RequireAdmin()`.
- **There is no refresh-token endpoint.** Single access token only.
- **There is no OTP, forgot-password, or email-verification endpoint in `auth`.** A `twofa` package and a `verification` package exist and are mounted on the mobile BFF (`/api/v1/2fa`), but they are not part of the login flow. See §4 gaps.

### 2.4 Standard response envelope (`pkg/common/response.go`)

Every endpoint returns:

```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "per_page": 20, "total": 100 },
  "error": { "code": 401, "error_code": "...", "message": "..." },
  "correlation_id": "..."
}
```

The frontend HTTP client must unwrap `.data` and surface `.error.message`. The current `lib/api.js` helper reads `.message` off the raw body — wrong shape.

### 2.5 Ride lifecycle

Status machine (`pkg/models/ride.go`):

```
requested → accepted → in_progress → completed
     └──────────────────────────────→ cancelled
```

Endpoints:

**Rider** (`/api/v1/rides`, role `rider` or `driver`)

```
POST   /api/v1/rides                 RequestRide
GET    /api/v1/rides                 GetMyRides
GET    /api/v1/rides/:id             GetRide
GET    /api/v1/rides/surge-info      GetSurgeInfo
GET    /api/v1/rides/match-drivers   MatchDrivers
POST   /api/v1/rides/:id/cancel      CancelRide
POST   /api/v1/rides/:id/rate        RateRide
```

**Driver** (`/api/v1/driver/rides`, role `driver`)

```
GET    /api/v1/driver/rides/available    GetAvailableRides
POST   /api/v1/driver/rides/:id/accept   AcceptRide
POST   /api/v1/driver/rides/:id/start    StartRide
POST   /api/v1/driver/rides/:id/complete CompleteRide
```

`RideRequest` payload the UI must produce:

```json
{
  "pickup_latitude": 25.2854, "pickup_longitude": 51.5310, "pickup_address": "...",
  "dropoff_latitude": 25.2697, "dropoff_longitude": 51.5210, "dropoff_address": "...",
  "ride_type_id": "uuid|null", "promo_code": "", "scheduled_at": null, "is_scheduled": false
}
```

The `Ride` model is rich — it already carries `surge_multiplier`, `discount_amount`, `currency_code`, `country_id`/`region_id`/`city_id`, `pickup_zone_id`, `was_negotiated`, `pricing_version_id`. The UI is currently using none of it.

### 2.6 Geo, pricing and maps

```
POST /api/v1/geo/location                 driver location ping (driver role)
GET  /api/v1/geo/drivers/nearby           nearby drivers
GET  /api/v1/geo/drivers/:id/location     single driver position
GET  /api/v1/geo/geocode                  forward geocode
GET  /api/v1/geo/geocode/reverse          reverse geocode
GET  /api/v1/geo/geocode/autocomplete     place autocomplete
GET  /api/v1/geo/geocode/place            place details
GET  /api/v1/geo/h3/surge                 H3 surge
GET  /api/v1/geo/h3/demand-heatmap        demand heatmap
POST /api/v1/geo/distance                 distance calc

POST /api/v1/pricing/estimate             fare estimate
POST /api/v1/pricing/bulk-estimate        estimate for all vehicle tiers
GET  /api/v1/pricing/surge                surge lookup
POST /api/v1/pricing/cancellation-fee     cancellation fee

POST /maps/route, /maps/eta, /maps/distance-matrix,
     /maps/traffic/flow, /maps/traffic/incidents,
     /maps/roads/snap, /maps/roads/speed-limits,
     /maps/waypoints/optimize, /maps/eta/batch

GET  /api/v1/ride-types/available         vehicle tiers
```

**Important:** `GOOGLE_MAPS_API_KEY` already exists in `.env.example` and the `maps` service already wraps Google server-side. The correct pattern here is **the frontend calls `/maps/*` and `/geo/geocode/*` on the backend, not Google directly.** That keeps the key server-side. A separate *browser* key is still needed purely to render the map tiles via the Maps JavaScript API — that one is public by design and must be HTTP-referrer restricted.

### 2.7 Payments & wallet

```
GET  /api/v1/wallet                        balance
POST /api/v1/wallet/topup                  top up
GET  /api/v1/wallet/transactions           ledger
POST /api/v1/payments/process              charge
GET  /api/v1/payments/:id                  detail
POST /api/v1/payments/:id/refund           refund
GET  /api/v1/driver/payouts/summary        driver payout summary
POST /api/v1/driver/payouts/withdraw       driver withdrawal
POST /api/v1/webhooks/stripe               Stripe webhook (server-only)
GET  /api/v1/payment-methods               saved methods
```

### 2.8 Safety / SOS

Fully built already — `POST /safety/sos`, emergency contacts CRUD with verification, live trip share links (`/safety/share` → public `/share/:token`), safety check-ins, trusted/blocked drivers, incident reporting, plus an admin emergency console. The SOS button in the UI has a real endpoint waiting for it.

### 2.9 Realtime (WebSocket)

```
GET /api/v1/ws?token=<jwt>              connect
GET /api/v1/rides/:ride_id/chat         chat history
GET /api/v1/stats                       admin only
POST /api/v1/internal/broadcast/ride    service-to-service
POST /api/v1/internal/broadcast/user    service-to-service
```

Message envelope (`pkg/websocket/client.go`):

```go
type Message struct {
    Type      string                 `json:"type"`
    RideID    string                 `json:"ride_id,omitempty"`
    UserID    string                 `json:"user_id,omitempty"`
    Timestamp time.Time              `json:"timestamp"`
    Data      map[string]interface{} `json:"data"`
}
```

Observed types: `location_update`, `driver_location`, `ride_status_update`, `ride_update`, `chat_message`, `notification`, `driver_eta`.

The hub groups clients three ways: by user ID, by ride ID, and by negotiation session ID.

### 2.10 Database

- **PostgreSQL via pgx/v5**, `pgxpool`, primary + optional read replicas, `QueryExecModeCacheStatement`.
- 24 forward migrations in `db/migrations/`, golang-migrate naming, every one with a `.down.sql`.
- Extensions: `uuid-ossp`. No PostGIS — geospatial work is done with H3 in application code.
- Coverage spans the full platform: init schema, promos, scheduled rides, ML-ETA tables, analytics materialized views, fraud, audit logs, multi-country, negotiation, safety, 2FA, driver documents, loyalty/gamification, recurring rides.

---

## 3. Current frontend state

Three overlapping, incomplete attempts coexist in the repo:

| Attempt | Location | State |
|---|---|---|
| **A. Vanilla JS + Vite hash-router** | `src/`, `lib/`, `style/`, `index.html`, `main.js` | Most complete. Broken imports, mock data only. |
| **B. Standalone driver page** | `driver_dashboard.html` | 16 KB static HTML, inline styles, hard-coded content, remote CDN images. Disconnected. |
| **C. Next.js scaffold** | `taxi-platform/` | `create-next-app` default. Untouched apart from the template. `.next/` build cache committed. |

None is wired to the backend. None currently builds.

### 3.1 Blocking defects (the app cannot boot today)

**1. Broken module imports — fatal.**

`src/main.js` imports:
```js
import { hydrateIcons } from './components/lib/icons.js';   // does not exist
import { applyTheme, ... } from './components/lib/ui.js';   // does not exist
```
The real files are `lib/icons.js` and `lib/ui.js` at the repo root.

`src/components/lib/pages/index.js` imports:
```js
import { riderHome, bookRide, ... } from "./rider.js";      // does not exist here
```
The real file is `src/components/rider.js`, two directories up.

**2. Tailwind v3 syntax on a Tailwind v4 install.**
`package.json` pins `tailwindcss ^4.3.3`, but `src/styles/main.css` uses `@tailwind base/components/utilities` and `postcss.config.js` registers the bare `tailwindcss` plugin. v4 requires `@import "tailwindcss";` and the `@tailwindcss/postcss` package. Styles will not compile.

**3. ESM/CJS conflict in PostCSS config.**
`package.json` declares `"type": "module"`, but `postcss.config.js` uses `module.exports = {...}` → `ReferenceError: module is not defined`.

**4. Malformed HTML in `index.html`.**
Line 44 reads `header class="bg-primary ...">` — the opening `<` is missing, so the header renders as literal text. This is the "1 problem" VS Code is flagging.

**5. Dueling entry points.**
Root `main.js` and `src/main.js` are near-identical copies importing different (both partly non-existent) paths. `index.html` loads `/src/main.js`; root `main.js` is dead code.

**6. Duplicated stylesheets.**
`style/*.css` (1,928 lines, hand-written design system) and `src/styles/main.css` + `src/index.css` (Tailwind entry) both exist. Neither is fully wired. `style/token.css` and the Tailwind theme define the same palette twice.

**7. `.env.develpoment.local` is misspelled** — should be `.env.development.local`. Its contents are unrelated to this project (v0.dev / AI-gateway keys), so nothing is lost, but Vite is silently loading nothing.

**8. Repo hygiene.** `node_modules/`, `taxi-platform/.next/`, `package-lock.json` are untracked but present; a stray `gitignore` file (no dot) sits next to the real `.gitignore`. Nothing frontend-related has been committed yet.

### 3.2 Integration defects

**9. `lib/api.js` is 100% mock.** 289 lines, every function returns `setTimeout`-wrapped literals. `API_BASE_URL` points at `https://api.ac7ride.example/v1` — a domain that does not exist. Not one real call anywhere in the app.

**10. `ws()` is a no-op stub** returning `{close, open}` with no socket. No realtime at all.

**11. Response shape mismatch.** The `http()` helper does `res.json().message` — but the backend envelope is `{success, data, error:{message}}`. Even if pointed at the real API it would fail to read errors and would hand raw envelopes to the UI.

**12. No auth persistence, no token attachment, no route guards.** Nothing stores the JWT, nothing sends `Authorization`, nothing prevents an anonymous user hitting `#/admin/dashboard`.

**13. Wrong map stack for the brief.** `lib/map.js` uses **Leaflet + CARTO/OpenStreetMap tiles**, explicitly commented "no API key required". The brief asks for Google Maps, live tracking, traffic and Waze deep links. Leaflet cannot do Google traffic layers or Google routing.

**14. Palette violations.** The mock admin data hard-codes chart colours `#F59E0B` (amber/orange) and `#3B82F6` (blue) — both explicitly ruled out. `#0F172A` slate is used as the primary chart colour instead of the brand maroon `#8A1538`.

**15. Backend capability barely surfaced.** 49 backend domains exist; the UI exposes maybe six, all faked. Negotiation, pooling, corporate accounts, gift cards, subscriptions, loyalty, gamification, disputes, delivery, family accounts, driver documents/verification, and multi-currency all have complete APIs and zero UI.

---

## 4. Gaps between the brief and the backend

These are the places where the requested feature has **no backend endpoint**, so a decision is required rather than an assumption.

> **Correction (26 July, post-verification).** My first pass understated the OTP
> support. Reading `internal/twofa/handler.go` route-by-route showed a full OTP
> subsystem, not just TOTP. The table below is the corrected version.

| Requested | Backend reality | Recommendation |
|---|---|---|
| **OTP verification** | **Fully implemented.** `internal/twofa` exposes `POST /api/v1/2fa/otp/send` and `/otp/verify` with types `login`, `phone_verification`, `enable_2fa`, `disable_2fa`, `password_reset`, delivered by `sms` or `email`. Also `/phone/send`, `/phone/verify`, `/totp/verify`, backup codes and trusted devices. | Wire directly. Done in Phase 5 — `src/api/index.ts → otpApi`. |
| **Forgot password** | **Partial.** The `password_reset` OTP type exists and works, so steps 1–2 (send code, verify code) are real. Step 3 — an endpoint that accepts the new password — does not exist, and the OTP routes require authentication so they cannot serve a logged-out user. | UI built and honest about the gap. Closing it needs one handler on `internal/auth`: `POST /auth/password/reset`. Awaiting your sign-off. |
| **Token refresh** | No refresh endpoint; single access token. | Frontend handles 401 by clearing session and redirecting to login. Acceptable for v1. |
| **Waze deep links** | Purely client-side (`waze://ul?ll=<lat>,<lng>&navigate=yes`). | No backend work needed. |
| **Google Maps browser rendering** | `GOOGLE_MAPS_API_KEY` is server-side for the `maps` service. | Needs a **second, referrer-restricted browser key** exposed as `VITE_GOOGLE_MAPS_BROWSER_KEY`. |

---

## 5. Supabase — important correction

The brief says "use my existing Supabase project" and "reuse my existing Supabase URL / Anon Key". After a full-repo search:

- **There is no Supabase client, SDK, URL, anon key, or config anywhere in this repository.**
- `.env.example` defines discrete Postgres fields (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSLMODE`) consumed by `cfg.DSN()` → `pgxpool`.
- `.env.develpoment.local` contains only unrelated v0.dev / AI-gateway keys.
- Your Supabase account has two projects — *A2Dalla17's Project* (`<SUPABASE_PROJECT_REF>`, eu-west-2) and *AC7 Group* (`<SUPABASE_PROJECT_REF_2>`, eu-west-3). **Both are currently INACTIVE/paused**, so neither could be queried and neither is holding this schema.

**What this means in practice.** Supabase *can* absolutely be the Postgres for this backend — it is standard Postgres 17, and pgx connects to it with a normal connection string, no code change. But three things must be understood:

1. **Supabase supplies Postgres only.** This backend also requires **Redis** and **NATS**. Those still need to run somewhere (Docker Compose locally, or a managed provider in production).
2. **The anon key and Supabase JS SDK have no role here.** Auth is the Go `auth` service issuing its own JWTs against the `users` table. Using Supabase Auth instead would mean replacing the authentication system — which the brief explicitly forbids. The frontend should talk to the Go API, never to Supabase directly.
3. **The 24 migrations must be applied to the Supabase database** via `golang-migrate` before anything works. Nothing has been applied yet.

I have not changed any configuration. Your instruction to reuse a Supabase project is achievable, but it means "point `DB_*` at Supabase and run the migrations", not "add the Supabase SDK to the frontend". Confirm before I proceed.

---

## 6. Migration plan

Principle throughout: **the backend is frozen.** Every phase is additive on the frontend and verified against live endpoints before moving on.

### Phase 0 — Stabilise (no design work)
Get the repo to a state where `npm run dev` and `npm run build` both succeed.

- Pick **one** frontend and delete the other two (see decision below).
- Fix the broken import paths.
- Resolve Tailwind v3-vs-v4 (recommend pinning to **v3.4** — stable, and the existing `tailwind.config.js` already targets it).
- Convert `postcss.config.js` to ESM.
- Fix the malformed `<header>` in `index.html`.
- Rename `.env.develpoment.local` → `.env.development.local`; add a real `.env.example` for the frontend.
- Add `node_modules/`, `.next/`, `dist/` to `.gitignore`; delete the stray `gitignore` file.
- **Exit criterion:** clean build, blank-but-working app shell.

### Phase 1 — Foundations
- `src/lib/http.js` — fetch wrapper that unwraps the `{success, data, error}` envelope, attaches `Authorization`, handles 401 → logout, injects `Idempotency-Key` on POST/PUT/PATCH, honours `X-RateLimit-*`.
- `src/lib/session.js` — JWT storage, decode of `{user_id, email, role}`, expiry check.
- `src/lib/ws.js` — real WebSocket client against `/api/v1/ws?token=`, with reconnect/backoff, typed event dispatch, heartbeat.
- `src/lib/config.js` — single place for `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`, `VITE_GOOGLE_MAPS_BROWSER_KEY`, feature flags. No hard-coded URLs anywhere else.
- Design tokens: one source of truth for the maroon palette, Inter scale, radii, shadows, motion. Delete the duplicate.
- **Exit criterion:** login against the real backend returns a real JWT; the WebSocket connects and logs frames.

### Phase 2 — Design system
Reusable, accessible primitives: Button, Input, Select, Card, Sheet, Modal, Toast, Table, Badge, Avatar, Skeleton, EmptyState, GlassNav, Sidebar, StatCard, Chart wrapper. Each ≤150 lines, keyboard-accessible, focus-visible, WCAG AA contrast on the maroon.
**Exit criterion:** component gallery route renders every primitive in light and dark.

### Phase 3 — Auth
Login, register (rider + driver), profile, route guards by role, 2FA step against `/api/v1/2fa`. Forgot-password and signup-OTP held pending your decision in §4.
**Exit criterion:** all three roles can log in and land on the correct dashboard; guards reject cross-role access.

### Phase 4 — Maps
Google Maps JS API loader, map component, pickup/destination markers, live driver markers from `/geo/drivers/nearby`, route polyline from `/maps/route`, ETA from `/maps/eta`, traffic layer, Waze deep-link button for drivers.
**Exit criterion:** real driver positions render and update from the backend.

### Phase 5 — Rider journey
Home → destination search (`/geo/geocode/autocomplete`) → vehicle tiers (`/ride-types/available`) → estimate (`/pricing/bulk-estimate`, with surge) → request (`POST /rides`) → live tracking over WebSocket → completion → rating → receipt. Plus trip history, wallet, payment methods, notifications, SOS, support.
**Exit criterion:** a ride booked in the UI appears in the database with correct fare and status.

### Phase 6 — Driver
Online/offline toggle (`/geo/driver/status`), incoming requests, accept/reject, navigation handoff, active trip, earnings, ratings, wallet/payouts, documents, profile.
**Exit criterion:** a driver accepts a rider-created ride and both sides update live.

### Phase 7 — Admin
Dashboard, analytics, users, drivers, trips, live ride monitoring, payments, wallet management, coupons/promos, reports, support tickets, emergency console, settings.
**Exit criterion:** admin sees the ride created in Phases 5–6 with accurate figures.

### Phase 8 — Hardening
Code-splitting per role bundle, image/font optimisation, a11y audit, responsive sweep 320→2560 px, error boundaries, loading/empty/error states everywhere, Lighthouse ≥90.

---

## 7. Decisions needed before implementation

1. **Which frontend base survives?** Recommendation: keep the Vite app, delete the Next.js scaffold and the standalone driver HTML. Alternative: commit to Next.js/TypeScript and rebuild there — better long-term for an app this size, but it discards the existing 2,000 lines of CSS.
2. **Vanilla JS or React?** The current hash-router with `innerHTML` string templates will not scale to ~40 screens with live WebSocket state. Strong recommendation: **React + TypeScript**.
3. **Supabase** — confirm the §5 reading is correct, and tell me which of the two projects to target.
4. **Forgot-password and signup-OTP** — UI-only placeholder, or approve a minimal backend addition?
5. **Google Maps browser key** — do you have one, or should I build behind a config placeholder with graceful degradation?

---

*No source files were modified in producing this audit.*
