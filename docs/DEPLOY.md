# Deploying AC7 Ride

> **Never paste real secrets into this file.** It is tracked by git and the
> repository is public. Placeholders like `<DB_PASSWORD>` are deliberate —
> the real values live in `backend/.env`, which is git-ignored. If you need
> them, open that file locally.



Once this is done, the app runs whether your laptop is on or not.

**Time:** about 30 minutes.
**Cost:** free, on the tiers below.

---

## What this removes, permanently

Every problem from the last few days belongs to running servers on a laptop:

| Problem | After deployment |
|---|---|
| Docker daemon not running | Gone — Fly builds the image |
| WSL has no IPv6 route to Supabase | Gone — Fly has proper networking |
| Port 8080 vs 8081 mismatch | Gone — one fixed URL |
| `go run` dies when the terminal closes | Gone — Fly keeps the machine alive |
| Vite stops when the laptop sleeps | Gone — Vercel serves a static build |
| Restarting two servers every session | Gone — nothing to restart |

---

## The shape of it

```
Phone / browser
      │
      ▼
Vercel ─────────── the React app          free
      │
      │ /api/*
      ▼
Fly.io ─────────── the Go auth service    free tier
      │
      ▼
Supabase ───────── PostgreSQL             free tier, already live
```

---

## 1 — Backend on Fly.io

### Install the CLI

```powershell
iwr https://fly.io/install.ps1 -useb | iex
fly auth signup     # or: fly auth login
```

### Create the app

```powershell
cd "C:\Users\hassa\OneDrive\Documents\A2 Projects\Taxi App\AC7 Taxi\backend"
fly launch --no-deploy
```

Answer:
- App name → **ac7-ride-auth**
- Region → **lhr** (London — next to your Supabase project)
- Postgres → **No** (Supabase is the database)
- Redis → **No** (auth does not use it)

`fly.toml` is already written, so it will use that rather than guessing.

### Set the secrets

Never put these in `fly.toml` — that file is committed.

```powershell
fly secrets set DB_PASSWORD="<DB_PASSWORD>"
fly secrets set JWT_SECRET="$(openssl rand -base64 48)"
```

If `openssl` is unavailable on Windows, generate one in WSL and paste it.

### Deploy

```powershell
fly deploy
```

First build takes 3–5 minutes. Then check:

```powershell
fly status
curl https://ac7-ride-auth.fly.dev/healthz
```

You want `{"status":"healthy","service":"auth-service"}`.

---

## 2 — Frontend on Vercel

### Point it at the deployed API

Create `frontend/.env.production`:

```dotenv
VITE_API_BASE_URL=https://ac7-ride-auth.fly.dev
VITE_WS_BASE_URL=wss://ac7-ride-auth.fly.dev
VITE_DEFAULT_MAP_LAT=2.0469
VITE_DEFAULT_MAP_LNG=45.3182
VITE_DEFAULT_CURRENCY=USD
VITE_GOOGLE_MAPS_BROWSER_KEY=
```

### Deploy

```powershell
npm i -g vercel
cd "C:\Users\hassa\OneDrive\Documents\A2 Projects\Taxi App\AC7 Taxi\frontend"
vercel
```

Answer:
- Set up and deploy → **Y**
- Framework → **Vite** (detected)
- Build command → `npm run build`
- Output directory → `dist`

Then promote it to production:

```powershell
vercel --prod
```

You get a URL like `https://ac7-ride.vercel.app`.

---

## 3 — Let the two talk to each other

The browser calls Fly from the Vercel origin, so the backend must allow it.

```powershell
cd ..\backend
fly secrets set CORS_ORIGINS="https://ac7-ride.vercel.app"
```

That triggers a restart. Wait about 30 seconds, then open the Vercel URL and sign in.

---

## 4 — Check it properly

Turn your laptop off. Open the Vercel URL on your phone. Sign in.

If that works, you are done — the app no longer depends on your machine.

---

## Costs, honestly

| Service | Free allowance | When you would pay |
|---|---|---|
| Vercel | 100 GB bandwidth/month | Well past thousands of users |
| Fly.io | 3 shared machines, 160 GB out | If you keep a machine always-on: ~$2/mo |
| Supabase | 500 MB database, 60 connections | Past ~50k rows or heavy traffic |

The one trade-off worth knowing: `min_machines_running = 0` in `fly.toml` lets the machine sleep when idle, which keeps it free but adds a second or two to the first request after a quiet period. Once you have real traffic, set it to `1` — roughly $2/month and no cold start.

---

## Adding the other services later

Only `auth` is deployed here, because that is what login needs. `rides`, `geo` and `payments` also need Redis, so they come as a set:

```powershell
fly redis create                      # Upstash, free tier
fly launch --dockerfile Dockerfile --build-arg SERVICE_NAME=rides
```

Do that when you need booking to work end to end. Login and the admin console work without it.

---

## Updating after a change

```powershell
# Backend
cd backend && fly deploy

# Frontend
cd frontend && vercel --prod
```

Connect the GitHub repo in the Vercel dashboard and the frontend redeploys on every push, with no command at all.

---

## If something fails

| Symptom | Cause |
|---|---|
| `fly deploy` fails on build | Run from `backend/` — that is where the Dockerfile is |
| Health check never passes | `fly logs` — usually a wrong `DB_PASSWORD` |
| CORS error in the browser console | `CORS_ORIGINS` does not match the Vercel URL exactly, including `https://` |
| 404 refreshing `/admin/users` | `vercel.json` missing — the SPA rewrite is in it |
| Login returns 500 | `fly logs`, then check the Supabase project is not paused |

```powershell
fly logs          # live
fly status        # machine health
fly secrets list  # names only, never values
```
