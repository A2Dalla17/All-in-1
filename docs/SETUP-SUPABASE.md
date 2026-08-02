# AC7 Ride — running on Supabase

The app now talks to Supabase directly. The Go services are still in the repo
and still compile, but nothing in the web app depends on them being deployed.

---

## 1. Set the Vercel environment variables

Vercel → your project → **Settings → Environment Variables**. Add these to
**Production, Preview and Development** (tick all three boxes):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://lsxeernnmohrsjoqmyxo.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_9KV3HXBY4JQ9Gvb78eeNpw_IImCmKXC` |
| `VITE_CONTROL_CENTRE_TEL` | `+447833172989` |
| `VITE_CONTROL_CENTRE_DISPLAY` | `+44 7833 172989` |
| `VITE_PREVIEW_MODE` | `true` — for now. Set to `false` once there are real drivers. |

Then **Deployments → ⋯ → Redeploy**. Environment variables are read at build
time, not at run time, so changing them without a redeploy does nothing. This
is why the preview screens were invisible: `VITE_PREVIEW_MODE` was never set,
so the demo data was stripped out of the bundle at build time.

**The anon key is meant to be public.** It ships inside the JavaScript. It
identifies the project; it does not authorise anything. Row level security
decides what each request can see. What must never appear in Vercel with a
`VITE_` prefix is the **service role** key — that one bypasses RLS completely.

---

## 2. Turn on email sign-up

Supabase → **Authentication → Providers → Email**. Enable it.

While testing, also turn **off** "Confirm email" under
**Authentication → Sign In / Providers**, otherwise every new account sits
unusable until someone clicks a link. Turn it back on before real customers
arrive.

---

## 3. Make yourself an admin

Sign up through the app first, then run this in the Supabase SQL editor:

```sql
update public.users set role = 'admin' where email = 'ghaalabh10@gmail.com';
```

Admin cannot be self-assigned. The sign-up trigger accepts only `rider` or
`driver` from the client and silently downgrades anything else — otherwise
anyone could register as an admin by posting `{"role":"admin"}` to the sign-up
endpoint.

---

## 4. Create your first driver

Register in the app with **Driver** selected. A `drivers` row and a permanent
code (`AC700001`, `AC700002`, …) are created automatically by a database
trigger, so the code exists from the moment the account does.

Check it worked:

```sql
select u.email, d.driver_code, d.presence
from public.drivers d join public.users u on u.id = d.user_id;
```

Then open `https://<your-site>/d/AC700001` — that is exactly what the driver's
QR encodes, and what a passenger's camera app opens.

---

## What is now real

| Feature | State |
|---|---|
| Sign up / sign in | Supabase Auth. `public.users` is linked by `users.auth_id`. |
| Driver codes | Permanent, sequence-issued, `AC7` + 5 digits. Immutable — RLS blocks changing your own. |
| QR code | On the driver's profile. Encodes a URL, so any camera app opens the check page. |
| QR scanning | In-app on Android/Chrome. iPhone falls back to typing the code, or the built-in Camera app. |
| Driver lookup | Public, no sign-in. Returns name, photo, rating, car, availability — nothing else. |
| Online / offline | Writes `drivers.presence` for real. Optimistic, with rollback, and listens for server-side changes. |
| Chat | `chat_threads` / `chat_messages` over Supabase Realtime. History from a fetch, liveness from the socket. |
| Shifts | `claim_shift()` settles the race in the database. The loser is told someone was faster. |
| Landing page | App download, control centre number, and driver code check. |

## What is still not real

- **Fares and ride booking** still run through the Go `pricing` and `rides`
  services, which are not deployed. Booking a ride will not work until either
  those are deployed or the flow is moved onto Supabase too.
- **Wallet and payments** — no Stripe account is connected.
- **Advertising platform, business partnerships, Hall of Fame** — not built.
- **Admin dispatch board** for assigning leftover shifts — not built.
- **`schema_migrations` is stale.** It reads `5` while far more has been
  applied. Supabase migrations are now the source of truth; golang-migrate
  should not be pointed at this database again without reconciling it first.

## Still outstanding from before

The Supabase database password and the JWT secret were committed to the public
GitHub repo in `PUSH-TO-GITHUB.ps1` and `FIX-AND-PUSH.ps1`. **They have not been
rotated.** Supabase → Settings → Database → Reset database password, and
Settings → API → JWT Settings. Do this before there is anything real in the
database.
