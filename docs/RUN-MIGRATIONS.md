# Apply the remaining migrations

Your database has 8 of 24 migrations applied. Everything you asked for —
driver tiers, seasons, shifts, documents, safety — needs the rest.

Run these in **WSL**, from `~/a2-taxi`.

---

## Before you start

**Read this first.** I applied migrations 6, 8 and 9 directly through the
Supabase connector to get started, but that method does not update the
`schema_migrations` table. So right now:

- the tables from 6, 8 and 9 **exist**
- `schema_migrations` still says **version 5**

If you run `migrate up` without fixing that, it starts at 6 and fails with
*"index already exists"*. Step 3 below corrects it. My mistake — the fix is
one command.

---

## 1. Install golang-migrate

```bash
cd ~/a2-taxi
curl -L https://github.com/golang-migrate/migrate/releases/download/v4.17.1/migrate.linux-amd64.tar.gz | tar xvz
sudo mv migrate /usr/local/bin/
migrate -version
```

## 2. Set the connection string

Use the **session pooler** host — the direct host is IPv6-only and WSL
cannot reach it. That was a real failure earlier in this project.

Replace `<DB_PASSWORD>` with your current Supabase database password. If you
rotated it after the leak, use the new one.

```bash
export DB_URL="postgresql://ac7_app.<SUPABASE_PROJECT_REF>:<DB_PASSWORD>@aws-1-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require"
```

Both placeholders are in `backend/.env` on your machine — that file is
git-ignored, so it still holds the real values.

Check it connects:

```bash
migrate -path backend/database/migrations -database "$DB_URL" version
```

Should print `5` (possibly with `dirty` — that is fine, step 3 clears it).

## 3. Correct the version to 9

This tells migrate that 6, 8 and 9 are already applied. It changes no tables.

```bash
migrate -path backend/database/migrations -database "$DB_URL" force 9
```

## 4. Run the rest

```bash
migrate -path backend/database/migrations -database "$DB_URL" up
```

This applies 10, 12–18, 20–24. It will take a minute — migration 12 alone
creates 17 tables.

## 5. Verify

```bash
migrate -path backend/database/migrations -database "$DB_URL" version
```

Should print `24` with no `dirty`.

---

## If it fails partway

migrate marks the database `dirty` and stops at the failing version. Nothing
is half-applied — each migration runs in a transaction.

```bash
# see where it stopped
migrate -path backend/database/migrations -database "$DB_URL" version

# then send me the error message
```

Do **not** run `force` to skip past a real failure — that marks a migration
as applied when it is not, and every later one will build on a schema that
does not exist. `force` is only correct in step 3, where the tables genuinely
are already there.

---

## What this unlocks

| Migration | Gives you |
|---|---|
| 010 | Fraud detection tables |
| 012 | Multi-country: regions, cities, currencies, tax rules |
| 013 | Fare negotiation |
| 014 | Safety: SOS, trip sharing, emergency contacts |
| 015 | Two-factor auth and OTP |
| 016 | Driver documents and approval workflow |
| **017** | **Driver tiers, quests, achievements, leaderboards** ← your ranking system |
| 018 | Payment methods, family accounts, chat, disputes |
| 020–023 | Ride type cleanup, driver approval status, vehicle fixes |
| 024 | Recurring rides ← foundation for Booking Shifts |

After this, `internal/gamification` has tables to talk to and the tier system
can actually run.
