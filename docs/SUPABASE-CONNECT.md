# Connecting AC7 Ride to Supabase

Five steps. No code changes, no commented-out SQL.

---

## The thing to understand first

**Supabase is PostgreSQL.** Hosted, with a dashboard on top — but underneath it is Postgres 17, reached over the standard Postgres wire protocol.

This has three consequences that make the job much smaller than it sounds:

| Concern | Reality |
|---|---|
| "Comment out the Postgres code" | There is nothing to comment out. `pgx` connects to Supabase unchanged. |
| "Comment out the SQL" | The 24 migrations are **how tables get created in Supabase**. Removing them leaves an empty database and login still fails. |
| "Connect my Supabase key" | The anon key has no role here. What is needed is the **database password**. |

Authentication is the Go `auth` service — it hashes passwords with bcrypt and issues its own JWTs against the `users` table. Supabase Auth is not used, and swapping to it would mean replacing the authentication system.

**Switching from local Docker Postgres to Supabase is six environment variables.**

---

## Step 1 — Resume the project

Both projects are currently paused, which is why nothing can connect.

1. Open <https://supabase.com/dashboard/project/<SUPABASE_PROJECT_REF>>
2. Click **Restore** / **Resume**
3. Wait for `ACTIVE_HEALTHY`

---

## Step 2 — Get the password

**Settings → Database → Database password.** Reset it if you have lost it.

Never paste this into a chat, a commit, or any `VITE_*` variable.

---

## Step 3 — Create `backend/.env`

```bash
cd backend
cp .env.supabase.example .env
```

Then fill in two values:

```dotenv
DB_PASSWORD=<the password from step 2>
JWT_SECRET=<openssl rand -base64 48>
```

Everything else is pre-filled for your project.

---

## Step 4 — Run the migrations

This is the step that creates `users`, `rides`, `wallets` and the rest. Without it Supabase is an empty database and login returns an error no matter what else is correct.

Use the **direct** connection (port 5432), not the pooler — golang-migrate needs advisory locks, which the transaction pooler does not support.

```bash
export SUPABASE_URL="postgresql://postgres:<password>@db.<SUPABASE_PROJECT_REF>.supabase.co:5432/postgres?sslmode=require"

cd backend
migrate -path database/migrations -database "$SUPABASE_URL" up
```

Confirm:

```bash
psql "$SUPABASE_URL" -c "\dt" | head -20
```

You should see roughly 60 tables. If `users` is not among them, stop — nothing downstream will work.

---

## Step 5 — Start the stack

Redis, NATS and Kong still run locally. Supabase supplies Postgres only.

```bash
docker compose \
  -f deploy/docker-compose.yml \
  -f deploy/docker-compose.supabase.yml \
  up -d
```

Verify:

```bash
curl http://localhost:8000/api/v1/auth/healthz
```

Then register a user end to end:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email":"test@ac7ride.com",
    "password":"Test1234!",
    "phone_number":"+252610000000",
    "first_name":"Test",
    "last_name":"User",
    "role":"rider"
  }'
```

A success returns `{"success":true,"data":{...}}`. Check the row landed:

```sql
select id, email, role, created_at from users order by created_at desc limit 1;
```

Now log in through the app at `http://localhost:3000/login`.

---

## Going back to local Postgres

Drop the override file. That is the whole procedure.

```bash
docker compose -f deploy/docker-compose.yml up -d
```

Local Postgres is genuinely better for day-to-day development — faster, offline, and free to reset. Supabase earns its place when you need data that persists across machines and a dashboard your team can look at.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `connection refused` | Project still paused, or resuming |
| `SSL is not enabled` | `DB_SSLMODE` is not `require` |
| `password authentication failed` | With the pooler, the user must be `postgres.<project-ref>`, not `postgres` |
| `too many connections` | Lower `DB_MAX_CONNS`; free tier allows 60 pooled total |
| `relation "users" does not exist` | Step 4 was skipped |
| `Dirty database version N` | A migration failed midway: `migrate ... force N` then `up` |
| Login returns 500 | Backend not running, or migrations not applied |

---

## Row Level Security

Supabase's advisor will warn that RLS is disabled on these tables. That is expected and correct here: the Go services connect as the database owner and enforce authorisation in application middleware (`middleware.RequireRole`), not in the database.

It is safe **because the database credentials never reach the browser** — the frontend only ever talks to the Go API.

Do not enable RLS without rewriting the repositories. Half-applied RLS silently returns empty result sets, which is far harder to debug than an outright error.
