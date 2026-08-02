# Supabase — current status

**Project:** A2Dalla17's Project · `<SUPABASE_PROJECT_REF>` · eu-west-2 · Postgres 17.6
**Last updated:** 27 July 2026

---

## Done

| Step | Status |
|---|---|
| Project resumed from paused | Done |
| Connection verified | Done |
| Migrations 000001–000004 applied | Done |
| Write access verified (insert / select / delete) | Done |
| `golang-migrate` version marker set to 4 | Done |

**16 tables created**, `ride_types` seeded with Economy, Premium and XL.

```
users              drivers            rides              wallets
payments           wallet_transactions notifications     favorite_locations
driver_locations   promo_codes        promo_code_uses    referral_codes
referrals          ride_types         profiles*          savings*
```

\* `profiles` and `savings` were already in the database from earlier work. Nothing touched them.

**Registration and login will now work.** Those paths only need `users`, and the table is live and writable.

---

## Remaining — migrations 000005 to 000024

Twenty migrations still to apply. They add performance indexes, ML-ETA tables, analytics views, fraud detection, audit logs, multi-country support, negotiation, safety features, two-factor auth, driver documents, loyalty and gamification, and recurring rides.

Run them in one command:

```bash
cd backend

export SUPABASE_URL="postgresql://postgres:<password>@db.<SUPABASE_PROJECT_REF>.supabase.co:5432/postgres?sslmode=require"

migrate -path database/migrations -database "$SUPABASE_URL" up
```

Use the **direct** host (`db.<ref>.supabase.co`, port 5432), not the pooler — golang-migrate needs advisory locks, which the transaction pooler does not support.

It will start at 000005 because of the version marker. Confirm afterwards:

```bash
migrate -path database/migrations -database "$SUPABASE_URL" version    # expect 24
```

---

## Why the version marker exists

Migrations 1–4 went in through the Supabase API, which records applied migrations in `supabase_migrations.schema_migrations`. The `migrate` CLI reads a different table — `public.schema_migrations`.

Without a marker the CLI would see an empty history, start at 000001, and fail immediately with *relation "users" already exists*.

Setting `version = 4, dirty = false` tells it those four are done. It resumes at 000005.

---

## Row Level Security — checked, and fine

Supabase enables RLS on every table by default. Every one of these tables shows `rls_enabled: true` with **zero policies**, which normally means nothing can be read.

It works here because:

- Tables are owned by `postgres`
- `relforcerowsecurity` is `false`
- **A table owner bypasses RLS unless FORCE is applied**

Verified empirically rather than assumed — an insert, select and delete against `public.users` all succeeded.

**Do not enable FORCE ROW LEVEL SECURITY, and do not add policies**, unless you also rewrite the Go repositories. Authorisation in this platform is enforced by `middleware.RequireRole` in the application, not by the database. Half-applied RLS returns empty result sets silently, which is far harder to debug than an outright error.

This is safe because the database credentials never reach the browser. The frontend talks only to the Go API.

---

## `auth.users` is a different table

Supabase ships its own `auth.users` in the `auth` schema, owned by `supabase_auth_admin`. It is untouched and unused.

Your application's users live in `public.users`, created by migration 000001 and managed by the Go `auth` service. The two are unrelated — do not confuse them when browsing the dashboard.

---

## Connecting the backend

```bash
cd backend
cp .env.supabase.example .env
```

Fill in:

```dotenv
DB_PASSWORD=<from Supabase dashboard>
JWT_SECRET=<openssl rand -base64 48>
```

Then start the stack. Redis, NATS and Kong still run locally — Supabase supplies Postgres only:

```bash
docker compose \
  -f deploy/docker-compose.yml \
  -f deploy/docker-compose.supabase.yml \
  up -d
```

Verify end to end:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@ac7ride.com","password":"Test1234!","phone_number":"+252610000000","first_name":"Test","last_name":"User","role":"rider"}'
```

Then check the row arrived:

```sql
select id, email, role, created_at from public.users order by created_at desc limit 1;
```

---

## One thing to plan for

The free tier allows **60 pooled connections** in total, and this platform runs **17 services**. `.env.supabase.example` sets `DB_MAX_CONNS=8`, which is already 136 connections if every service runs at once.

For local development, run only what you need:

```bash
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.supabase.yml \
  up -d kong auth-service rides-service geo-service payments-service redis nats
```

Running all seventeen against the free tier will exhaust the pool.
