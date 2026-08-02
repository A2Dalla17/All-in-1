# ACT — AC7 Transport

**AC7 GROUP · Aragti Cad**

Product requirements. This document is the source of truth for scope; where it
disagrees with anything already built, this document wins and the existing code
is what changes.

---

## 1. What this is

A transport platform, not a taxi app. Six parts, of which five are in scope now:

| # | Part | Status |
|---|---|---|
| 1 | Landing website | In scope |
| 2 | Taxi platform | In scope — exists, needs rebranding |
| 3 | School Runs portal | In scope — not started |
| 4 | Booking platform | In scope — not started |
| 5 | Control Centre | In scope — not started |
| 6 | Marketplace | **Phase 2. Do not build.** Button on the landing page only. |

### Rules that constrain every decision below

- **Taxi and School Runs are separate systems.** School Runs is not a mode
  inside the taxi app. A parent booking a school route and a rider hailing a
  cab share a login and nothing else.
- **The Control Centre is the heart.** Every service must be operable by a
  human operator on the phone, because a large share of customers will never
  install anything.
- **Marketplace is Phase 2**, but the landing architecture must already have a
  place for it, so adding it later is not a redesign.
- **No placeholder code.** Every screen shipped is a working screen.

---

## 2. Branding

**Company:** AC7 GROUP
**Meaning:** Aragti Cad
**Product:** ACT (AC7 Transport)

Luxury, corporate, modern. Apple-level clean. Professional, minimal, enterprise
SaaS. Typography modern and highly readable. Animation smooth and elegant —
never decorative.

### Visual system

- Dark premium theme
- Glassmorphism
- Rounded cards, soft shadows
- Professional icons
- Premium **blue / green** accents only — no other colour
- No clutter

### Decision — two brands, one codebase

Resolved 31 July 2026. The original draft said "blue/green accents only"; the
agreed direction is **dark blue and white**, and the Taxi product **keeps its
red**.

| Brand | Surface | Accent | Used by |
|---|---|---|---|
| **AC7 GROUP / ACT** | Dark navy `#080F1C` | Blue `#2563EB`, text `#7DB0FF` | Landing site, corporate shell |
| **Taxi** | Light default, dark mode available | Deep red `#8B0000` | Rider and driver apps |

Implemented as a **CSS scope**, not a theme: `.act` re-points the existing token
names at navy for whatever subtree it wraps. Every primitive inside inherits it
without being modified, and nothing outside changes. School Runs and Bookings
can each take their own scope later without touching either of the first two.

`.act` is deliberately separate from `.dark`. Dark mode is a user preference
that flips the whole app; ACT is a fixed brand surface that must look the same
whatever the reader's system setting says.

All 29 foreground/background pairs in the navy scope were measured against
WCAG AA. Worst case is `ink-subtle` on `elevated` at 4.66:1 against a 3.0
requirement; white on the blue fill is 5.17:1.

---

## 3. Landing website

The central hub. SEO-friendly, fast, accessible.

### Header

**Left:** Taxi · School Runs · Bookings · Marketplace · About Us
**Right:** Settings · AC7 GROUP logo

### Hero

- Title: **AC7 GROUP**
- Subtitle: **Aragti Cad**
- Professional tagline
- Below: **24/7 Control Centre** with the company phone number
- Buttons: **Book Taxi** · **Call Control Centre**

### Service cards

Four premium cards, each opening its platform:

Taxi · School Runs · Bookings · Marketplace

Marketplace is inactive and shows **Coming Soon**.

### Featured banner

One banner at a time. Dynamic, admin-controlled. Supports:

- Driver of the Quarter
- Business advertisements
- Restaurant promotions
- Marketplace promotions
- Company announcements

**Automatic behaviour:** every three months the banner switches to *Driver of
the Quarter* for roughly three days — photo, name, rating, achievements — then
returns to advertising. An admin can override at any time.

### Why choose ACT

Professional drivers · Trusted community · Reliable service · 24/7 support ·
Fast booking

### Control Centre block

Phone, email, support information, and a large call button.

### Footer

Quick links (Taxi, School Runs, Bookings, Marketplace, About Us), Privacy
Policy, Terms, Cookies, and copyright: **AC7 GROUP — Aragti Cad**.

---

## 4. Taxi platform

Independent. Contains no School Runs functionality.

- Customer app
- Driver app
- Real-time booking
- Ride history
- Payments
- Notifications
- Ratings
- Airport transfers
- Private hire
- Control Centre support
- Modern admin dashboard

---

## 5. School Runs

An independent platform reached from the landing page. Three portals.

### Parent portal

Sign in · booking requests · assigned driver · trip status · support

### Driver portal

Sign in · today's shifts · upcoming shifts · accept shift · route information ·
trip completion · availability status

### Admin portal

One enterprise dashboard covering:

**Contracts and structure** — council contracts, schools, routes
**Shifts** — morning shifts, afternoon shifts
**Drivers** — working, available, waiting, off duty
**Vehicles** — available, in maintenance
**Trips** — completed, cancelled
**Allocation** — shift allocation, driver allocation, vehicle allocation

Everything manageable from one dashboard. Must scale.

---

## 6. Booking platform

Separate from Taxi. Users book:

Restaurants · barbers · salons · garages · car wash · mechanics · future services

**Search by:** business name · business code · driver name · driver code

If a user cannot complete a booking they contact the Control Centre, and an
operator creates it manually on their behalf.

---

## 7. Control Centre

One centralised panel. Operators can:

- View and manage taxi bookings
- Support customers and drivers
- Receive calls
- Manage School Runs
- Manage future services

---

## 8. Marketplace — Phase 2

**Do not build.** Prepare architecture and ship the landing button showing
*Coming Soon*.

Future scope: restaurants, food ordering, shops, grocery, halal meat, delivery,
community advertising, business profiles, offers, discounts.

### Community advertising

Must be built into the landing website architecture now, even though the
marketplace is not. Businesses can buy:

- Homepage banners
- Featured business placement
- Special offers
- Restaurant and shop promotions
- Seasonal campaigns — Ramadan, Eid, Back to School, Black Friday

Admin controls every advertisement.

---

## 9. Technical requirements

Scalable architecture · modular codebase · future-ready · responsive ·
SEO-friendly landing · fast loading · accessibility compliant · enterprise
security · production-ready structure · clean folder architecture · no
placeholder code · maintainable and expandable.

Every future module must connect without redesigning the platform.

---

## 10. Where this collides with what exists

Recorded here so the decisions are made deliberately rather than discovered
halfway through.

| Conflict | Detail |
|---|---|
| **Palette** | ~~Conflict~~ **Resolved** — see §2. Navy `.act` scope added and contrast-audited; taxi red untouched. |
| **Product name** | Shipped copy says "AC7 Ride" throughout the rider and driver apps. The landing site now says AC7 GROUP / ACT. The apps have **not** been renamed. |
| **Driver codes** | Format is `AC7` + 5 digits, issued by a database sequence, immutable, and printed on physical windscreen cards. A rename must NOT change issued codes. |
| **Landing page** | Currently three doors (download, call, check a driver). PRD wants five nav items, four service cards, a rotating banner, and a marketplace placeholder. Rebuild, not adjust. |
| **Booking flow** | Fares still route through the Go pricing service, which is not deployed. Taxi booking does not work end to end today regardless of branding. |
| **School Runs** | Nothing exists. No schema, no portals. This is the largest single item in the document. |
| **Control Centre** | Nothing exists beyond the admin console skeleton. |

## 11. Outstanding from before this document

- Supabase database password and JWT secret were committed to the public repo
  and **have not been rotated**.
- The RLS impersonation test (12 assertions) is written but **has not been run**.
- `schema_migrations` is stale; Supabase migrations are now the source of truth.
