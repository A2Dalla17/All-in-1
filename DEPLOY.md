# GALEYR — publish All in 1

**Prepared:** 11 August 2026
**Commit ready:** `a2c8855` — *Galeyr: all-in-one marketplace positioning*

The commit is made and verified. Two commands publish it. I could not run them
myself: this environment has no network access to GitHub and none of your
credentials, which is as it should be.

---

## 1. Push to GitHub

```powershell
cd "$env:USERPROFILE\OneDrive\Documents\A2 Projects\All in 1"
git push origin main
```

Remote is already set to `https://github.com/A2Dalla17/All-in-1.git`.

## 2. Vercel

If the project is already linked, **the push deploys it** — nothing else to do.

First time only:

```powershell
npx vercel --prod
```

`vercel.json` is already correct: Vite framework, `dist` output, and the SPA
rewrite that stops `/our-partners` 404ing on a hard refresh.

### ⚠️ Environment variables — do this or the site loads empty

Vercel → Project → Settings → Environment Variables:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://lsxeernnmohrsjoqmyxo.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the publishable key from `.env.local` |
| `VITE_CUSTOMER_APP_URL` | where the customer app is deployed |
| `VITE_CONTROL_CENTRE_TEL` | a **Mogadishu** number |
| `VITE_CONTROL_CENTRE_DISPLAY` | the same, formatted |

`.env.local` is gitignored, so Vercel has no idea these exist until you add
them. The build will succeed and every restaurant list will render empty —
which looks like a data problem and is not.

**`VITE_CUSTOMER_APP_URL` defaults to `http://localhost:3000`.** Leave it unset
in production and every category tile sends your visitors to their own machine.

---

## What is in this commit

**648 files changed. 323,031 deletions** — almost all of that is untracking
`backend/`.

### Nav: Restaurants → Our Partners

Hovering opens a dropdown of the twelve categories; clicking opens
`/our-partners`, which lists them in full. Restaurant → Supermarket → Shop →
Pharmacy → Beauty & Cosmetics → Electronics → Warehouse → and the rest.

The dropdown used to fetch and list individual restaurants by name. That was
right when Galeyr was a food company. A dropdown of restaurant names tells
every other kind of business the platform is not for them.

Hover is not the only way in — click, Enter, Space and arrow-down all open it,
Escape closes it. There is no hover on a phone and a keyboard user never
generates one.

### `backend/` untracked — 624 files

Third-party Go **ride-hailing** code: `rides`, `surge_thresholds`,
`fare_disputes`. No restaurant, menu, product or order table anywhere in its
~120. A different product that was never deployed.

**It is still on disk** and archived at
`Downloads/galeyr-phase0/go-backend-reference-archive.tar.gz`. It is simply no
longer part of this repository.

⚠️ **`git rm --cached` does not remove it from HISTORY.** It stays in every
past commit. That needs `git filter-repo`, which rewrites history and force-
pushes — say the word and I will prepare it.

---

## Verified before the commit

| Check | Result |
|---|---|
| Typecheck | ✅ clean |
| Production build | ✅ 50s |
| Files that would be published | 197 |
| Secrets in them | ✅ **0** |
| `backend/` files tracked | ✅ **0** |
| `.env.local` ignored | ✅ |
| `backend/.env.example` `DB_PASSWORD` | the literal `postgres` — a local dev default, not a secret |

---

## Ports

**Enatega is back on 3000**, as you asked. All in 1 no longer competes for it
because it lives on Vercel.

To run All in 1 locally anyway, give it a different port:

```powershell
npm run dev -- --port 3001
```
