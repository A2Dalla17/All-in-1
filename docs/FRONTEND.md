# AC7 Ride — Frontend

React 18 + TypeScript + Vite 6 + Tailwind 3.4, talking to the Go microservices backend through Kong.

## Getting started

```bash
# 1. Install
npm install

# 2. Configure
cp .env.frontend.example .env.development.local
#    Leave VITE_API_BASE_URL empty for local dev — Vite proxies to Kong.

# 3. Start the backend (separate terminal)
docker compose up -d

# 4. Run
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # typecheck + production bundle
npm run typecheck    # types only
npm run preview      # serve the production build
```

## How requests reach the backend

In development the Vite dev server proxies three prefixes to Kong on `:8000`:

```
/api  →  http://localhost:8000/api    (every microservice)
/ws   →  http://localhost:8000/ws     (realtime, WebSocket upgrade)
/maps →  http://localhost:8000/maps   (maps service — not under /api/v1)
```

Everything is therefore same-origin and CORS never applies locally. In production set `VITE_API_BASE_URL` to your gateway origin.

## Folder structure

```
src/
├─ api/              One module per backend domain. Every path here was read
│  ├─ index.ts       out of the Go handlers — nothing is invented.
│  └─ types.ts       Mirrors pkg/models and the internal/* domain structs.
│
├─ components/
│  └─ ui/            Reusable primitives. Each one accessible by default.
│
├─ config/
│  └─ env.ts         Every environment-dependent value. No URL or key is
│                    hard-coded anywhere else in the app.
│
├─ hooks/            React bindings — useRealtime, and more to come.
│
├─ lib/
│  ├─ http.ts        Envelope-aware fetch. Unwraps {success,data,error},
│  │                 attaches Bearer token, Idempotency-Key, 401 handling.
│  ├─ session.ts     JWT + user persistence, expiry, cross-tab sync.
│  ├─ ws.ts          Reconnecting WebSocket with backoff and heartbeat.
│  └─ utils.ts       Formatting, geo maths, Waze/Google deep links.
│
├─ providers/
│  └─ AuthProvider   Session state, login/register/logout, WS lifecycle.
│
├─ routes/           One folder per role. Driver and admin are lazy-loaded.
│  ├─ auth/
│  ├─ rider/
│  ├─ driver/
│  └─ admin/
│
└─ styles/
   └─ index.css      Tailwind entry + CSS custom properties mirroring the theme.
```

## Conventions

**API calls never bypass `src/api/`.** Components import from `@/api`, never call `fetch` directly. That keeps every backend path in one auditable place.

**The wire format is snake_case and stays that way.** `pickup_latitude`, not `pickupLatitude`. The JSON tags in the Go structs are the contract; renaming them client-side creates a translation layer nobody maintains.

**Missing backend features throw, they do not fake.** Where the brief asks for something the backend does not expose — password reset, for instance — the API module throws `NotImplementedError` and the screen shows an honest state. There is no mock data anywhere in this codebase.

**Colour comes from the theme, never from a literal.** `text-brand`, not `text-[#8A1538]`. Charts draw from the `chart.1`–`chart.6` ramp. No orange, no yellow, no bright red beyond the semantic `danger` token.

**Every interactive element is keyboard reachable** and has a visible `:focus-visible` ring. The ring colour is brand maroon at 2px with a background-coloured offset.

## Design system

| Token | Value | Use |
|---|---|---|
| `background` | `#FFFFFF` | Cards, sheets, inputs |
| `surface` | `#F5F5F7` | Page background |
| `card` | `#ECECEC` | Flat panels, secondary buttons |
| `brand` | `#8A1538` | Primary actions, active states |
| `brand-hover` | `#A31B48` | Hover on primary |
| `ink` | `#1F1F1F` | Body text |
| `ink-muted` | `#6B7280` | Secondary text |
| `success` | `#10B981` | Confirmations, online status |
| `danger` | `#EF4444` | Errors, destructive actions |

Type scale: `display` / `h1` / `h2` / `h3` / `h4`, all Inter with negative tracking. Radii: `card` 1rem, `sheet` 1.5rem, `pill` full. Shadows are soft and layered — `xs`, `sm`, `card`, `lifted`, `sheet`, `brand`. Motion uses `ease-smooth` (`cubic-bezier(0.32, 0.72, 0, 1)`) and respects `prefers-reduced-motion`.

## Maps

The backend already wraps Google server-side (`internal/maps`, using `GOOGLE_MAPS_API_KEY`). The frontend calls `/maps/route`, `/maps/eta` and `/geo/geocode/*` rather than calling Google directly — this keeps the server key private and means routing, ETA and traffic all go through your own rate limiting and caching.

A **separate browser key** (`VITE_GOOGLE_MAPS_BROWSER_KEY`) is needed only to render tiles via the Maps JavaScript API. It is public by design and must be HTTP-referrer restricted. When it is unset, the map degrades to a static placeholder and the rest of the app keeps working.

Driver navigation hands off to Waze (`waze://ul?ll=…&navigate=yes`) or Google Maps via `wazeLink()` / `googleMapsNavLink()` in `lib/utils.ts`. Both are pure client-side deep links with no key requirement.

## Realtime

One shared WebSocket for the whole app, at `/api/v1/ws?token=<jwt>`. The token travels in the query string because browsers cannot set headers on a WebSocket handshake; the backend supports this explicitly.

```ts
import { useRealtimeStatus, useRideEvents } from '@/hooks/useRealtime';

const status = useRealtimeStatus();          // 'open' | 'reconnecting' | …

useRideEvents(rideId, 'driver_location', (msg) => {
  setDriverPosition(msg.data);
});
```

Event types seen from the backend hub: `location_update`, `driver_location`, `ride_status_update`, `ride_update`, `driver_eta`, `chat_message`, `notification`.

The client reconnects with exponential backoff and full jitter, heartbeats every 25 s, queues outbound frames while down, and reconnects eagerly when the tab regains focus or the network returns.

## What is not built yet

Phase 1 delivered the foundations: real authentication, a live socket, and a typed API layer bound to actual endpoints. The rider, driver and admin surfaces currently render a scaffold that proves the plumbing works end to end.

Phases 4–7 build those surfaces out. See `docs/AC7-ARCHITECTURE-AUDIT.md` §6 for the sequence.

## Legacy

The previous frontend attempts are preserved under `legacy-frontend/` rather than deleted — the vanilla-JS hash router, its CSS, and the standalone driver dashboard. Nothing imports them and they are excluded from the build. The Next.js scaffold remains at `taxi-platform/`, also unused. Delete either when you are satisfied nothing is needed from them.
