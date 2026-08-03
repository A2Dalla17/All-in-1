# Google Maps Platform — setup and cost control

Pay-as-you-go, engineered to sit inside the free tier.

Everything in the Cloud Console has to be done by you: I can write the code, but
creating a billing account and attaching a payment card is yours to do. This
document is the exact sequence, in order, with the reasoning for each choice.

Budget about 25 minutes.

---

## The one thing to understand before you start

**Google changed its pricing on 1 March 2025.** The old $200/month credit that
covered everything is gone. In its place:

- Each **Essentials** SKU gets **10,000 free calls per month**
- Each **Pro** SKU gets 5,000
- Each **Enterprise** SKU gets 1,000

**The free tiers do not pool.** Geocoding has its own 10,000. Autocomplete has a
separate 10,000. Routes has another. You cannot borrow a quiet API's headroom
to cover a busy one.

And the second thing:

> **Budget alerts do not stop spending. They send an email.**

This surprises people every month. A budget alert is a notification, nothing
more — Google will happily keep serving requests and billing you after it
fires. The only thing that actually stops spend is a **quota cap**, which is
step 5. Do not skip step 5.

---

## What this app actually calls

| What | Google API | SKU tier | Free/month |
|---|---|---|---|
| Address suggestions as you type | Places API (New) — Autocomplete | Essentials | 10,000 sessions |
| Turning the chosen address into coordinates | Places API (New) — Place Details | Essentials | 10,000 |
| "Where am I" on the rider home screen | Geocoding API | Essentials | 10,000 |
| Distance, time and fare basis | Routes API — Compute Routes | Essentials | 10,000 |
| **The map itself** | **none — Leaflet + CARTO tiles** | — | see the licensing warning below |

> ### ⚠️ Open item: your basemap tiles are not licensed for commercial use
>
> The map currently renders CARTO's tiles (`basemaps.cartocdn.com`). CARTO's
> terms restrict their tile service to **Enterprise customers and non-profit
> grantees** — commercial use requires a licence. AC7 is a commercial taxi
> business, so this needs resolving before launch. It is a licensing exposure,
> not a bill that will arrive, but it is real.
>
> The OpenStreetMap Foundation's own tile servers are **not** the answer either:
> their usage policy explicitly excludes heavy and commercial use.
>
> Realistic options, cheapest first:
>
> 1. **OpenFreeMap** — free, no key, no limit, explicitly fine for commercial
>    use. Swap the tile URL and you are done.
> 2. **Protomaps, self-hosted** — one `.pmtiles` file on your own storage.
>    Free, unlimited, entirely under your control, no third-party dependency.
> 3. **MapTiler / Stadia / Thunderforest** — a free tier with a key, then a
>    paid plan. Around £20–25/month at small scale.
> 4. **Google Dynamic Maps** — see the cost note directly below. Not recommended.
>
> This is a decision about money and risk, so it is flagged rather than changed
> silently. Everything else in this document stands regardless of which you pick.

### Why the map is deliberately not on Google

This is the single biggest cost decision in the integration, so it is worth
being explicit.

Google's **Dynamic Maps** SKU bills **per map load** — every time a map is
created on screen. 10,000 free per month is about **330 a day**. Your rider
home screen *is* a map. Booking is a map. Tracking is a map. One rider taking
one journey can produce three or four map loads.

At even 100 riders a day that is 300–400 map loads daily, and you would be
paying for the map before you had taken enough fares to notice.

A raster tile provider — any of the options in the warning above — serves the
same map for free or for a flat ~£20/month with no per-load metering. Even the
paid options are cheaper and far more predictable than per-map-load billing.

So the Google allowance is spent where Google is genuinely better and the free
alternatives are genuinely weak: **UK address search**. Nominatim, the free
geocoder, is poor at British postcodes and building names and is rate-limited
to one request per second. That is the part worth paying for. Tiles are not.

If you ever do want Google tiles, read the cost note at the bottom first.

---

## Step 1 — Create the project

1. Go to <https://console.cloud.google.com/>
2. Sign in with the Google account that should **own** this — not a personal
   throwaway. Moving a Maps project between accounts later is painful.
3. Top bar → project dropdown → **New Project**
4. Name: `ac7-transport`
5. **Create**, then make sure the project selector shows `ac7-transport` before
   doing anything else. Enabling APIs on the wrong project is the most common
   way to lose an hour here.

---

## Step 2 — Enable billing

Billing must be enabled **even to use the free tier**. Google will not serve
Maps Platform requests from a project without a billing account attached, free
quota or not.

1. Left menu → **Billing**
2. **Link a billing account** → **Create billing account**
3. Country: **United Kingdom**. Currency **GBP** — this cannot be changed later.
4. Account type: **Business** if AC7 GROUP is registered; otherwise Individual.
5. Add your card.

**You will not be charged for staying inside the free tiers.** New Google Cloud
accounts also usually come with a separate free trial credit; that is on top of
the Maps free tiers, and when it expires nothing auto-charges — Google requires
you to manually upgrade to a paid account.

Two things to check before you leave this page:

- Note the **Billing account ID** — you need it in step 6.
- Under **Payment settings**, confirm the account is not set to close when the
  trial ends, or your APIs will stop one day without warning.

---

## Step 3 — Enable exactly three APIs

Left menu → **APIs & Services** → **Enable APIs and Services**. Enable these
and only these:

1. **Places API (New)** — note the **(New)**. The legacy "Places API" is a
   different product with different SKUs, and session tokens are not
   interchangeable between them. The app uses the new one.
2. **Geocoding API**
3. **Routes API**

Do **not** enable Maps JavaScript API, Directions API, Distance Matrix API or
anything else. An API that is not enabled cannot be billed, which makes this
the cheapest security control available. If a key ever leaks, the blast radius
is limited to what you switched on.

---

## Step 4 — Create and restrict the key

**APIs & Services** → **Credentials** → **Create credentials** → **API key**.

Rename it `act-web-places` so you can tell it apart later. Then **Edit API key**:

### Application restrictions

Choose **Websites**, and add exactly:

```
https://your-production-domain.com/*
https://*.vercel.app/*
http://localhost:3000/*
```

Replace the first with your real domain. Keep the Vercel wildcard so preview
deployments work, and localhost so development works.

> **Be clear-eyed about what this achieves.** A referrer header is set by
> whoever makes the request, so it can be forged with a one-line `curl`.
> Referrer restrictions stop casual copy-paste theft of your key from the
> bundle; they do not stop a determined attacker. This is not a flaw in your
> setup — it is inherent to every browser key, Google's included. It is
> precisely why step 5 exists, and why step 5 is the step that actually
> protects you.

### API restrictions

Select **Restrict key** and tick only:

- Places API (New)
- Geocoding API
- Routes API

**Save.** Restrictions take up to five minutes to apply — if the app returns
403 immediately after, wait before assuming something is wrong.

Copy the key into `frontend/.env.local`:

```
VITE_GOOGLE_PLACES_KEY=AIza...
```

`.env.local` is gitignored. Never put the key in `.env.example`, and never
commit it. If you ever paste it into a chat, a screenshot or a support ticket,
delete the key in Console and make a new one — a leaked key cannot be un-leaked.

---

## Step 5 — Quota caps (this is the one that stops the bill)

**APIs & Services** → select the API → **Quotas & System Limits**.

For each of the three APIs, find the **requests per day** quota, tick it, click
**Edit Quotas**, and set:

| API | Daily cap | Why |
|---|---|---|
| Places API (New) | **300** | 300 × 31 = 9,300, safely under the 10,000 free |
| Geocoding API | **300** | same |
| Routes API | **300** | same |

The arithmetic is deliberate: the free tier is monthly but quotas are daily, so
the daily number has to assume a 31-day month. 300/day cannot exceed 9,300 in
any month, which leaves 700 calls of headroom for a busy day.

**What happens when a cap is hit:** Google returns HTTP 429. The app catches
that specific status and falls back to OpenStreetMap for address search, so
riders keep getting a working search — degraded in quality, not broken. Route
calculation returns nothing rather than guessing, because quoting a rider £12
and charging £19 is worse than showing no estimate.

This is what you chose: a hard ceiling, never a surprise bill.

**When you outgrow it**, raise these numbers deliberately, having decided what
you are willing to spend. Do not raise them because something broke.

---

## Step 6 — Budget alerts

These do not stop anything. They tell you what is happening, which is still
worth having.

**Billing** → **Budgets & alerts** → **Create budget**.

- Name: `ac7-maps`
- Scope: Projects → `ac7-transport`
- Budget type: **Specified amount**
- Amount: **£10**

Set alert thresholds at:

| Threshold | What it means |
|---|---|
| **50%** (£5) | Something is calling more than expected — go and look |
| **90%** (£9) | Your quota caps are not doing their job; check step 5 |
| **100%** (£10) | Investigate today |

Tick **Email alerts to billing admins**. Add a second recipient if anyone else
should know.

£10 is chosen so that *any* alert at all is a signal. If everything is working,
your Maps bill is £0.00 and you should never see one of these emails. An alert
firing means something is wrong — which is a far more useful signal than an
alert that fires every month because the threshold was set generously.

---

## Step 7 — Watch the usage

**Google Cloud Console → Google Maps Platform → Metrics** is the source of
truth. Set the grouping to **SKU**, because that is the unit the free tier is
measured in. A total request count across all APIs tells you nothing about
whether any individual free tier is close to exhausted.

Check it weekly for the first month. Two things to look for:

- **A SKU climbing much faster than the others.** Usually means something is
  calling in a loop — a `useEffect` missing a dependency, or a retry with no
  backoff.
- **Any usage at all on a SKU you did not expect.** That is either a code path
  you forgot about or somebody else using your key.

The app also keeps its own tally in the browser, spending nothing after roughly
8,500 calls per SKU per month and quietly using OpenStreetMap instead. That is
a per-device count and cannot see your global total, so it is a cost
optimisation and not a control — Console is the number that matters.

---

## What the code does to stay inside the free tier

You do not need to do anything for these; they are already in the app. They are
listed so you know what to preserve if you change this code later.

### Session tokens — the biggest single saving

Without a session token, **every keystroke that reaches Google is billed
separately**. A rider typing "Heathrow Terminal 5" produces a charge per
debounced keystroke.

With a token, the whole typing session plus the final selection is **one
billable session**, however much was typed. Identical on screen, a fraction of
the cost.

The lifecycle has to be exact or the saving silently disappears — Google bills
a reused or missing token as though no token were sent, at full per-request
price, with nothing to tell you it is happening. `frontend/src/lib/maps/google.ts`
owns the token in a small class specifically so this cannot drift.

### Not fetching coordinates for results nobody picked

Autocomplete returns names and IDs, not positions. Resolving all six results
would be six paid Place Details calls to fill a list the rider takes one item
from. The app resolves only the one they tap.

### Rounded-coordinate caching for "where am I"

The rider home screen turns their GPS position into a street name on every
open. GPS returns a slightly different reading each time, so an exact-match
cache never hits and every single app open is a paid call.

Positions are rounded to four decimal places — about 11 metres, well inside
phone GPS accuracy in a city — so a rider opening the app twenty times from
their own front door pays for **one** lookup, not twenty.

### Caching that respects the licence

Google's terms permit caching geocoding results for **up to 30 days**, and
storing **place IDs indefinitely**. `frontend/src/lib/maps/cache.ts` enforces
the 30-day ceiling on every write — asking for longer silently gets 30 days.
That limit is deliberately not a parameter a future change can raise, because a
longer TTL would be a licence breach that no test would catch.

Routes are cached for two minutes only: a route duration is a live traffic
estimate, and quoting a fare from a stale one quotes the wrong fare. That cache
exists to stop a re-render re-requesting the identical route, not to avoid
asking again later.

### Narrow field masks

Places and Routes both bill by **which fields you ask for**. The app requests
the minimum that keeps each call on the **Essentials** tier. Adding one field
from a higher tier — opening hours, ratings, photos, per-step navigation —
moves the entire call to Pro or Enterprise, which has a *smaller* free
allowance and a higher rate. Nothing warns you. The bill just changes.

If you widen a field mask, check which tier the new field belongs to first.

---

## Scaling up later

The integration is built so growth is configuration, not a rewrite.

**1. Raise the quota caps.** Step 5, deliberately, with a number you have
chosen to spend.

**2. Move the key server-side.** When volume makes an exposed browser key too
expensive to leave open, put an unrestricted key in a Supabase Edge Function
and set:

```
VITE_GOOGLE_MAPS_PROXY_URL=https://<project>.supabase.co/functions/v1/maps
```

Every Google call already routes through `resolveEndpoint()`, so this is one
environment variable and no code change. With it set the browser is never given
a key at all. It also gives you one place to add server-side caching shared
across all users — far more effective than a per-device cache, since one
rider's lookup of a common address then serves everybody.

**3. Consider a subscription.** Once you are consistently over the free tiers,
Google's plans start around $100/month for 50,000 calls, which becomes cheaper
than pay-as-you-go at volume. Compare against your actual Console figures, not
an estimate.

**4. Only then, reconsider the map.** If you want Google tiles, budget for
Dynamic Maps as a **per-map-load** cost and count how many map screens one
journey touches. Keep the OpenStreetMap path in place as the fallback — it is
the reason a billing problem can never take your app down.

---

## If something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| 403 on every request | Key restrictions do not match where the app runs, or the API is not enabled | Check step 3 and step 4. Allow five minutes after saving restrictions. |
| 403 only on the deployed site, fine locally | Production domain missing from the referrer list | Add it in step 4 |
| 429 | Daily quota cap reached — working as designed | App falls back to OpenStreetMap. Raise the cap only if you mean to spend more. |
| Address search works but results are poor | Falling back to OpenStreetMap | Key missing, budget spent, or quota hit. Check Console → Metrics. |
| A bill you did not expect | Almost always a widened field mask or a request loop | Console → Metrics grouped by SKU shows which one |

---

## Checklist

- [ ] Project created, correct project selected
- [ ] Billing enabled, billing account ID noted
- [ ] Exactly three APIs enabled, nothing else
- [ ] Key created and renamed
- [ ] Website referrer restrictions set, including production domain
- [ ] Key restricted to the three APIs
- [ ] **Daily quota caps set to 300 on all three** ← the one that stops the bill
- [ ] Budget alert at £10 with 50/90/100% thresholds
- [ ] Key in `frontend/.env.local`, not committed
- [ ] Same key added to Vercel → Settings → Environment Variables
- [ ] Console → Metrics checked once, grouped by SKU
