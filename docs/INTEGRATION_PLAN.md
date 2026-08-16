# INTEGRATION PLAN

Read `REPOSITORY_AUDIT.md` first. This document answers the fourteen questions
you asked, in order, and ends with the phases. **Nothing here has been executed.**

---

## The honest headline

You asked me to connect several cloned repositories into one platform. Having
read all of them, my recommendation is that **most of them should not be
connected to anything.**

- The Go backend (R2) is **unlicensed** and models **ride-hailing, not delivery**
- Enatega's backend (R7) is **proprietary and paid**, and not in the repository
- The taxi projects (R4, R5) are a **different business**

You already have one authoritative backend, one database, one auth system and
one business-logic layer — and they work. It is R1, your Supabase platform. The
integration task is therefore not "merge five backends". It is **connect three
new frontends to the backend you already own**, and retire the rest.

That is a smaller, safer and much faster project than the one described in the
brief, and it produces exactly the architecture you drew.

---

## 1. Repository map

See `REPOSITORY_AUDIT.md`. Eight code locations, five distinct projects, three
competing backends, two incompatible business domains.

## 2. Current architecture

```
R1 GALEYR web ──────► Supabase Postgres + RLS ◄────── R4 Flutter taxi app
   (live, working)         (the real backend)             (taxi domain)

R2 Go microservices ──► its own Postgres schema     (unlicensed, ride-hailing,
   (14 services)          ~120 tables                 never deployed)

R7 Enatega × 5 ───────► aws-server-v2.enatega.com   (proprietary, paid,
                          (someone else's server)      not included)
```

Three islands. Nothing shares a database. Two of the three backends are not
legally usable.

## 3. Conflicts

Tabulated in the audit. The load-bearing ones:

- **Domain**: R2 models rides and fare negotiation. There is no restaurant,
  menu, product or order table anywhere in its 120 tables. It cannot be adapted
  to food delivery; it would have to be rewritten, and it is not yours to rewrite.
- **Address model**: R1 uses district + landmark + phone because Mogadishu has
  no postcodes and mostly unsigned streets. R2 and R7 assume lat/lng + street
  address. Forcing R1 onto their model would make addresses *worse*, not more
  standard.
- **Payments**: R1 is cash-on-delivery by design, which removes Stripe, PayPal,
  wallets, payouts and refunds — a large fraction of both R2 and R7.

## 4. Recommended final architecture

```
                            GALEYR
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
  galeyr-customer       galeyr-driver         galeyr-store
  React Native          React Native          Web (exists) → RN later
  ← from Enatega app    ← from Enatega rider  ← R1 /portal
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ↓
                    Supabase — ONE backend
              Postgres · RLS · SECURITY DEFINER RPCs
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
   galeyr-web            galeyr-admin          Realtime
   marketing + ordering  Control Centre        order/driver channels
   ← R1 root             ← R1 /control
```

**Assignments:**

| Role | Source | Action |
|---|---|---|
| **Customer web** | R1 root | Keep as-is. Working. |
| **Customer mobile** | R7 `enatega-multivendor-app` | Port UI; replace Apollo with `supabase-js` |
| **Driver mobile** | R7 `enatega-multivendor-rider` | Port UI; replace Apollo with `supabase-js` |
| **Store** | R1 `/portal` | Keep. Wrap as RN later if a native app is wanted |
| **Admin** | R1 `/control` | Keep. Already a full operations console |
| **Website** | R1 root | Keep — marketing and ordering are the same app today |
| **R2 Go backend** | — | **Remove from the repository.** Unlicensed, wrong domain |
| **R4 Flutter** | — | Archive. Taxi product, currently paused |
| **R5 AC7 Taxi** | — | Archive **after rotating the leaked credentials** |
| **R6 AC7 Community** | — | Put under git, then archive |
| **R7 web / admin / store** | — | Do not port. R1 already does all three, better |

**Repository layout — separate repos, not a monorepo.** Expo and Vite want
different Node and build tooling; a monorepo forces one CI matrix onto both. The
shared surface is small — types and the Supabase client — and is better served
by one published `@galeyr/core` package than by a workspace.

```
galeyr-web        (R1, existing — includes admin and store portal)
galeyr-customer   (new, from Enatega app)
galeyr-driver     (new, from Enatega rider)
galeyr-core       (new, small: types + supabase client + status vocabulary)
```

## 5. Database migration plan

**There is no migration.** R1's Supabase schema is already the source of truth
and already carries live demo data. R2's schema is a different business and is
not adopted.

What the mobile apps need that does not exist yet:

| Need | Change |
|---|---|
| Driver GPS | `galeyr_driver_locations` — courier_id, lat, lng, heading, accuracy, recorded_at. Insert-only, TTL-pruned |
| Driver availability | `galeyr_couriers.is_available` exists. Add `last_seen_at` |
| Push tokens | `galeyr_push_tokens` — user_id, token, platform, locale |
| Customer accounts | `public.users` exists; ordering stays account-optional |
| Standard location | Add `latitude`, `longitude` to `galeyr_orders` as **optional** alongside district + landmark, never replacing them |

On your STEP 12 standard: I would keep `latitude, longitude, address, city,
country` and **drop `postcode`**. Somalia does not use postal codes. A required
field nobody can fill teaches people to type rubbish into it.

## 6. Backend migration plan

Supabase stays. The business logic already lives in `SECURITY DEFINER` functions
— `galeyr_place_order` prices server-side, `galeyr_verify_staff_code` rate-limits
and audits, `galeyr_approve_application_as_staff` assigns line managers
atomically. Mobile apps call the same functions the web app calls.

Your STEP 4 `/api/auth /api/orders …` layout describes a REST service. PostgREST
already exposes exactly that shape from the schema, and the RPCs give the
verb-style endpoints. Adding a Node API in front would mean a second place for
authorisation to live and drift.

**One thing to fix:** rate limiting. Public endpoints
(`galeyr_submit_customer_request`, application inserts) have none.

## 7. Authentication plan

One Supabase Auth user per person. Roles already exist:

```
public.users.role        rider · driver · admin
galeyr_staff.role        operator · line_manager · supervisor · admin
galeyr_restaurant_members.role   owner · manager · staff
```

This is already RBAC, and it is enforced in RLS rather than in application code.
A courier who signs in on the customer app sees customer things because the
policies scope by role, not because the app hides buttons.

**Missing:** a `courier` link from `galeyr_couriers` to a `users` row, so a
driver can sign in to the driver app at all. That is one column and one policy.

## 8. Realtime plan

Replace polling with Supabase Realtime on three channels:

| Channel | Subscribers | Filter |
|---|---|---|
| `galeyr_orders` | store, driver, admin, customer | restaurant_id · courier_id · order_number |
| `galeyr_incidents` | admin, line manager | assigned_staff_id |
| `galeyr_driver_locations` | customer (own order), admin | courier_id |

Realtime respects RLS, so a customer subscribing to orders receives only their
own. Keep polling as a fallback — a websocket that dies on a weak connection and
never reconnects is worse than a 30-second poll.

## 9. GPS plan

Driver app posts to `galeyr_driver_locations` every 10–15s **while on an active
delivery only**. Not while merely online — continuous background GPS drains a
courier's battery and collects location data you have no reason to hold.

Customer sees driver position only between `out_for_delivery` and `delivered`,
enforced by an RLS policy, not by the app choosing not to render it.

Android needs `ACCESS_BACKGROUND_LOCATION` and a foreground-service
notification; iOS needs `UIBackgroundModes: location` and a plain-language
purpose string. Both stores reject apps that request background location without
a visible justification.

## 10. Notification plan

Expo Push (free, wraps FCM and APNs). One `galeyr_notifications` table, one Edge
Function triggered on order-status change.

Bilingual from the start: store a **template key + parameters**, not rendered
text. `{ key: 'order.accepted', params: { restaurant: 'X' } }` renders in the
recipient's locale at send time. Storing English strings and translating later
means re-translating every historical notification.

## 11. Payment plan

Cash on delivery. No Stripe, no PayPal, no secret keys anywhere.

**The real gap is not card payments — it is cash reconciliation.** Nothing
currently records that a courier collected money or handed it in.
`payment_status` stays `pending` after delivery. That is correct modelling and
an incomplete workflow, and it is the largest operational hole before real money
moves. It needs `galeyr_cash_collections` before scale, not Stripe.

## 12. Security risks

Ranked, from the audit:

1. **Leaked Supabase password + JWT secret** in the public `A2-taxi` repo, still
   unrotated. Nothing else on this list matters until this is done.
2. **Unlicensed Go backend** committed inside `All in 1`.
3. **No rate limiting** on public form endpoints.
4. **R6 not under version control.**
5. Weak Control Centre password if `Galeyr123` was used.
6. Enatega's committed API keys — only relevant if you adopt that code.

## 13. Licensing concerns

- **R2 must go.** No licence means all rights reserved. Removing it from the
  working tree is not enough — it is in R1's git history and would need
  `git filter-repo` to purge properly.
- **R7 is MIT and safe to port**, provided `LICENSE` and the
  `Copyright (c) 2023 Ninjas Code` notice travel with any derived code. Add a
  `NOTICES.md`.
- **R7's API is off-limits** without a paid agreement, regardless of the MIT
  licence on the frontends.

## 14. Implementation phases

**Phase 0 — Legal and security. Before any code.**
Rotate the Supabase password and JWT secret. Remove R2 from `All in 1`. Put R6
under git. Confirm the Control Centre password is strong.
*Blocking. Nothing else should start first.*

**Phase 1 — Prepare the backend for mobile.**
`galeyr_driver_locations`, `galeyr_push_tokens`, courier→user link, optional
lat/lng on orders, rate limiting on public endpoints. All additive; the web app
keeps working throughout.

**Phase 2 — Realtime.**
Enable Realtime on orders and incidents. Replace polling in the Control Centre
and restaurant portal, keeping polling as fallback. Verifiable immediately.

**Phase 3 — `galeyr-core`.**
Extract shared types, the Supabase client and the order-status vocabulary into
one package both mobile apps import. Small, and it prevents the status enums
drifting across three codebases.

**Phase 4 — Driver app.**
Port Enatega's rider app. Replace Apollo with `supabase-js`. Online/offline, job
list, accept, pick up, deliver, GPS. Ship this before the customer app — you
have no way to dispatch a courier from a phone today, and that is the operational
gap that actually hurts.

**Phase 5 — Customer app.**
Port Enatega's customer app. Browse, order, track, support.

**Phase 6 — Notifications.**
Expo Push, bilingual templates, Edge Function on status change.

**Phase 7 — Cash reconciliation.**
`galeyr_cash_collections`. Courier hands in, Control Centre confirms, figures
reconcile.

**Phase 8 — Design system.**
Unify once all three clients exist. Doing it earlier means doing it twice.

---

## What I need from you before starting

1. **Approval of this direction** — specifically, that R2 is removed rather than
   integrated, and that Supabase remains the single backend.
2. **Confirmation on Phase 0** — I cannot rotate your Supabase credentials; that
   is done in the dashboard by you.
3. If you want R2 kept, tell me why and where it came from — if you have the
   author's permission, the licensing objection disappears and I will reassess.
