# Put AC7 Ride on your phone

A design preview: the real UI, running from sample London data, with no backend
needed. Live on a URL you can open on any phone.

**Time:** about 10 minutes.
**Cost:** nothing. Both free tiers.

---

## Before you start

Two things I could not do for you, because both need your password:

1. **Push to GitHub** — needs your GitHub credentials
2. **Create the Vercel project** — needs you to sign in

Everything else is done. The commands below are the whole job.

---

## Step 1 — Create the repository

Go to **https://github.com/new** and create:

- **Owner:** `a2dalla`
- **Name:** `ac7-taxi`
- **Private** (recommended — this is a real business)
- **Do not** tick "Add a README", "Add .gitignore" or "Choose a licence".
  The repo must be empty or the first push is rejected.

---

## Step 2 — Push

Open PowerShell and run these one at a time.

```powershell
cd "C:\Users\hassa\OneDrive\Documents\A2 Projects\Taxi App\AC7 Taxi"
```

Set who the commits belong to:

```powershell
git config user.name "Abdullahi Mohamud"
git config user.email "ghaalabh10@gmail.com"
```

Stage and commit:

```powershell
git add -A
git commit -m "AC7 Ride: London launch, new design system, preview build"
```

Push. **GitHub will ask you to sign in** — a browser window opens, or it asks
for a Personal Access Token. Use the browser option if offered; it is simpler.

```powershell
git push -u origin main
```

> If it says `src refspec main does not match any`, your branch is called
> something else. Run `git branch --show-current` and use that name.

---

## Step 3 — Deploy to Vercel

Go to **https://vercel.com/new** and sign in with GitHub.

1. **Import** `a2dalla/ac7-taxi`
2. Set **Root Directory** to `frontend` — this is the one setting people miss.
   Click *Edit* next to Root Directory and pick the `frontend` folder.
   Vercel will then detect Vite automatically.
3. Open **Environment Variables** and add these four:

   | Name | Value |
   |---|---|
   | `VITE_PREVIEW_MODE` | `true` |
   | `VITE_DEFAULT_MAP_LAT` | `51.5074` |
   | `VITE_DEFAULT_MAP_LNG` | `-0.1278` |
   | `VITE_DEFAULT_CURRENCY` | `GBP` |

   `VITE_PREVIEW_MODE=true` is the important one. Without it you get a login
   screen that cannot work, because there is no backend deployed yet.

4. **Deploy**

You get a URL like `https://ac7-taxi.vercel.app`.

---

## Step 4 — Open it on your phone

Open that URL on your phone. To make it look like a real app:

**iPhone (Safari)** — Share → *Add to Home Screen*
**Android (Chrome)** — ⋮ → *Add to Home screen*

It then opens fullscreen with no browser bar, with the AC7 icon.

---

## What you will see

Everything, populated with realistic London data — real streets, real
coordinates, plausible fares in pounds.

A yellow **PREVIEW** pill sits at the bottom. Tap it to switch between:

- **Rider** — home, booking, map, trips, wallet, profile, referral
- **Driver** — dashboard, earnings, ratings breakdown, trips, wallet, profile
- **Admin** — dashboard, analytics, users, drivers, settings

Try the dark mode toggle in the header — that is where the deep red really
works.

## What will not work, and why

| | |
|---|---|
| Signing in | No backend deployed. The preview signs you in automatically. |
| Saving edits | Fixtures are read-only. Changes are acknowledged, not stored. |
| Live driver tracking | Needs the WebSocket service. |
| Real prices and routes | Fares and ETAs are sample values. |

This is for judging **how it looks and feels**. Making it real means deploying
the Go backend — see `docs/DEPLOY.md`.

---

## Making changes later

Vercel redeploys automatically on every push:

```powershell
git add -A
git commit -m "what changed"
git push
```

About 30 seconds later the URL is updated. Refresh on your phone.

---

## Two things worth knowing

**The project lives in OneDrive.** OneDrive syncs files while git is writing
them, which causes intermittent lock errors and occasional corruption. It is
worth moving the project to something like `C:\dev\ac7-taxi` and letting GitHub
be the backup instead. Not urgent, but it will bite eventually.

**Preview mode must never be on for the real launch.** It is off by default —
it only switches on when `VITE_PREVIEW_MODE=true` is explicitly set. When the
backend is live, delete that variable from Vercel and set `VITE_API_BASE_URL`
to your gateway instead. `frontend/src/preview/README.md` covers removing the
code entirely.
