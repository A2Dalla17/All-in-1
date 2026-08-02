# AC7 Ride — Supabase setup runbook

**Target project:** A2Dalla17's Project
**Ref:** `<SUPABASE_PROJECT_REF>`
**Region:** eu-west-2 (London)
**Postgres:** 17.6
**Status at time of writing:** `INACTIVE` — must be resumed before anything below will work.

---

## What Supabase does and does not do here

Read this first, because it determines everything else.

**Supabase provides the Postgres database. That is all it provides in this architecture.**

| Component | Provider |
|---|---|
| Postgres | **Supabase** |
| Redis (cache, rate limiting, geo indexes) | Docker Compose / managed Redis |
| NATS (event bus between services) | Docker Compose / managed NATS |
| Authentication | **The Go `auth` service** — not Supabase Auth |
| File storage | Backend `pkg/storage` |

Three consequences worth being explicit about:

1. **The Supabase anon key is not used.** Your backend authenticates users itself: `internal/auth` hashes passwords, issues its own JWTs, and `pkg/middleware` validates them with `RequireRole`. Swapping in Supabase Auth would mean replacing the authentication system, which your brief explicitly rules out. The frontend talks to the Go API and never to Supabase.

2. **The frontend never connects to Supabase directly.** No `@supabase/supabase-js`, no anon key in the browser bundle. All data flows through the Go services.

3. **Redis and NATS still need to run.** Supabase does not supply them. Locally that is the existing `docker-compose.yml`.

---

## Step 1 — Resume the project

Paused Supabase projects refuse connections, which is why I could not query it during the audit.

1. Open <https://supabase.com/dashboard/project/<SUPABASE_PROJECT_REF>>
2. Click **Restore project** / **Resume**
3. Wait for the status to read `ACTIVE_HEALTHY` (usually a minute or two)

---

## Step 2 — Get the connection details

In the dashboard: **Project Settings → Database → Connection string**.

You need the **session pooler** (port `6543`) or the **direct connection** (port `5432`):

| Use | Host | Port |
|---|---|---|
| Migrations (needs a real session) | `db.<SUPABASE_PROJECT_REF>.supabase.co` | `5432` |
| Application services | `aws-0-eu-west-2.pooler.supabase.com` | `6543` |

Use the **direct connection for migrations** — golang-migrate needs advisory locks, which the transaction pooler does not support. Use the **pooler for the running services**, because 17 services × a connection pool each will exhaust direct connections quickly.

The database password is the one you set when creating the project. If you have lost it, reset it under **Settings → Database → Database password**.

---

## Step 3 — Configure the backend

The backend reads discrete fields via `pkg/config` → `cfg.DSN()` → `pgxpool`. Create `.env` at the repo root:

```dotenv
# --- Supabase Postgres -----------------------------------------------------
DB_HOST=aws-0-eu-west-2.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.<SUPABASE_PROJECT_REF>
DB_PASSWORD=<your-database-password>
DB_NAME=postgres
DB_SSLMODE=require
DB_MAX_CONNS=10
DB_MIN_CONNS=2
```

Two details that will bite you if missed:

- **`DB_SSLMODE=require` is mandatory.** Supabase rejects unencrypted connections. The default `disable` will fail.
- **The username is `postgres.<project-ref>`, not `postgres`**, when going through the pooler. Direct connections use plain `postgres`.

Keep `DB_MAX_CONNS` modest. Supabase's free tier allows 60 pooled connections in total; seventeen services each opening a large pool will hit the ceiling.

Everything else in `.env.example` stays as it is — Redis, NATS, JWT, Stripe, Twilio, Firebase are unrelated to this change.

---

## Step 4 — Apply the migrations

There are 24 forward migrations in `db/migrations/`, none of which have been applied to Supabase yet.

Install golang-migrate if you do not have it:

```bash
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

Run against the **direct connection** (port 5432, plain `postgres` user):

```bash
export SUPABASE_DB_URL="postgresql://postgres:<password>@db.<SUPABASE_PROJECT_REF>.supabase.co:5432/postgres?sslmode=require"

# Dry run — see what would apply
migrate -path db/migrations -database "$SUPABASE_DB_URL" version

# Apply everything
migrate -path db/migrations -database "$SUPABASE_DB_URL" up
```

Alternatively the repo's `Makefile` already has targets — check `make migrate-up` and point `DATABASE_URL` at the string above.

### Expected extension

Migration `000001_init_schema.up.sql` begins with:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

Supabase ships `uuid-ossp` and permits it, so this succeeds. There is **no PostGIS dependency** — geospatial work uses H3 in application code, so nothing further is needed.

### If a migration fails midway

```bash
# Inspect
migrate -path db/migrations -database "$SUPABASE_DB_URL" version

# Clear the dirty flag at version N, then re-run
migrate -path db/migrations -database "$SUPABASE_DB_URL" force <N>
migrate -path db/migrations -database "$SUPABASE_DB_URL" up
```

---

## Step 5 — Redis and NATS

Supabase does not provide these. For local development bring them up from the existing compose file:

```bash
docker compose up -d redis nats
```

Then point the backend at them:

```dotenv
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

NATS_URL=nats://localhost:4222
```

For production you will want managed equivalents (Upstash, Redis Cloud, Synadia) rather than self-hosted containers.

---

## Step 6 — Verify

```bash
# 1. Tables exist
psql "$SUPABASE_DB_URL" -c "\dt" | head -30

# 2. Start the auth service
go run ./cmd/auth

# 3. Health check
curl http://localhost:8080/healthz

# 4. Register a user end to end
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email":"test@ac7ride.com",
    "password":"Test1234!",
    "phone_number":"+97450000000",
    "first_name":"Test",
    "last_name":"User",
    "role":"rider"
  }'
```

A successful register returns the `{success:true, data:{...user}}` envelope. Confirm the row landed:

```sql
select id, email, role, created_at from users order by created_at desc limit 1;
```

---

## Step 7 — Row Level Security

Supabase enables RLS prompts by default on tables created through its dashboard. **These migrations create tables through raw SQL, so RLS will be off**, which is correct for this architecture: the Go services connect as the database owner and enforce authorisation in application middleware, not in the database.

You will see RLS warnings in the Supabase dashboard's advisor. They are expected and safe **provided the database credentials never reach the browser** — which they do not, because the frontend only ever talks to the Go API.

Do not enable RLS on these tables without also rewriting the repositories. Half-applied RLS will silently return empty result sets.

---

## Security checklist

- [ ] `.env` is git-ignored (it is — see `.gitignore`)
- [ ] Database password never appears in any `VITE_*` variable
- [ ] `DB_SSLMODE=require` on every environment
- [ ] Supabase service-role key is not used anywhere in this project
- [ ] `JWT_SECRET` is a fresh random value, not the example one
- [ ] Production `CORS_ORIGINS` lists only your real domains

---

## Second project

Your account also has **AC7 Group** (`<SUPABASE_PROJECT_REF_2>`, eu-west-3). It is untouched by this runbook. If you later decide the Paris region suits you better, the only change is the host and username in Step 3 — the migrations are identical.
