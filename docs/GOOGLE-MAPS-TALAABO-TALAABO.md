# Google Maps — talaabo talaabo (Af-Soomaali)

Waxa aad samaynayso saddex shay, kala duwan, isla project-ka dhexdiisa:

1. **Shid AFAR API** — si key-gaagu u helo waxa uu wacayo
2. **Xaddid key-ga** — si aan qof kale u isticmaalin
3. **Dhig quota cap** — **tan kaliya ayaa lacagta joojinaysa**

Waqti: 20–25 daqiiqo.

> ### 🆕 Cusboonaysiin — hadda waa AFAR API, ee ma aha saddex
>
> Markii hore map-ku wuxuu ahaa Leaflet + CARTO. Waxaad codsatay in Google map
> la isticmaalo — taasna waa la sameeyay. Sidaas darteed waxaa lagu daray API
> afaraad: **Maps JavaScript API**.
>
> Tani sidoo kale way xallisay dhibaato shatiga ah oo aan kuu sheegay: CARTO
> shuruudahoodu ma oggola isticmaal ganacsi. Google map-ku waa mid aad shati u
> leedahay.
>
> **Qiimaha:** Google map wuxuu bixiyaa **10,000 map load oo bilaash ah bishii**
> (~330 maalintii). Koodhku wuxuu **hal map** oo keliya sameeyaa oo dhammaan
> shaashadaha ku wareejiyaa — sidaas rakaab hal safar ah wuxuu ku kacayaa **hal
> load**, ee ma aha afar. Haddii ay dhammaadaan, si aamusan ayuu ugu noqonayaa
> Leaflet — rakaabku waxba ma arko.

---

## Ka hor: hubi project-ka

Fur <https://console.cloud.google.com/>

Sare, agagaarka calaamadda Google Cloud, waxaa jira **sanduuq project ah**. Guji.

- Haddii aad hore u samaysay project (tusaale `ac7-transport`) — dooro.
- Haddii aanad lahayn — guji **New Project**, magac u bixi `ac7-transport`, ka dib **Create**.

> **MUHIIM:** Ka hor inta aanad wax kale samayn, hubi in sanduuqa sare uu muujinayo magaca project-ka saxda ah. Khaladka ugu badan ee dadku sameeyaan waa in ay API-yada ku shidaan project khaldan, ka dibna ay saacad ku lumiyaan raadin.

### Billing — waa lagama maarmaan

Google Maps ma shaqeeyo project aan billing lahayn, xitaa haddii aad isticmaalayso heerka bilaashka ah.

Bidix menu → **Billing** → **Link a billing account**.

Haddii aanad lahayn: **Create billing account** → Country **United Kingdom** → Currency **GBP** (lama beddeli karo mar dambe) → ku dar kaarkaaga.

> Lacag kaama go'ayso ilaa aad ka gudubto heerka bilaashka ah. Quota cap-ka (tallaabada 3) ayaa hubinaya inaadan ka gudbin.

---

## Tallaabada 1 — Shid afarta API

Bidix menu → **APIs & Services** → **Library**

Ama si toos ah u fur linkiyadan (mid mid):

| API | Link toos ah | Magaca aad ka raadinayso Library-ga |
|---|---|---|
| **Places API (New)** | <https://console.cloud.google.com/apis/library/places.googleapis.com> | `Places API (New)` |
| **Geocoding API** | <https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com> | `Geocoding API` |
| **Routes API** | <https://console.cloud.google.com/apis/library/routes.googleapis.com> | `Routes API` |
| **Maps JavaScript API** 🆕 | <https://console.cloud.google.com/apis/library/maps-backend.googleapis.com> | `Maps JavaScript API` |

Mid kasta: guji badhanka buluugga ah ee **ENABLE**. Sug ilaa uu ka beddelmo **MANAGE**. Ka dibna u gudub kan xiga.

> **Fiiro gaar ah — `(New)` waa muhiim.** Waxaa jira laba: *Places API* iyo *Places API (New)*. Koodhku wuxuu isticmaalaa **(New)**. Haddii aad shiddo midka hore oo keliya, waxaad heli doontaa **403** oo aad u malayn doonto in key-gu xun yahay — xumaan mahan, waa mid qaldan oo la shiday.

**Kuwa kale ha shidin.** API aan la shidin lama qaadi karo lacag. Haddii key-gaagu maalin uu baxo, waxa uu gaari karo waa waxa aad shiddey oo kaliya.

---

## Tallaabada 2 — Xaddid key-ga

Bidix menu → **APIs & Services** → **Credentials**

Toos: <https://console.cloud.google.com/apis/credentials>

Waxaad arki doontaa liiska key-yadaada. Guji **magaca key-ga** (ma aha calaamadda copy).

### 2a. Application restrictions

Dooro **Websites**, ka dibna **ADD** — mid mid ku dar saddexdan:

```
https://your-production-domain.com/*
https://*.vercel.app/*
http://localhost:3000/*
```

- Kan koowaad ku beddel domain-kaaga dhabta ah.
- `*.vercel.app` — si preview deployments-ku u shaqeeyaan.
- `localhost:3000` — si computer-kaaga uu ugu shaqeeyo.

> Tani waxay joojinaysaa qof caadi ah oo key-gaaga ka copy gareeya bundle-ka. Ma joojinayso qof khibrad leh — header-ka referrer waa la been abuuri karaa. Sidaas darteed tallaabada 3 ayaa ah tan dhab ahaan ku ilaalinaysa.

### 2b. API restrictions

Isla boggaas, hoos u dhaadhac.

Dooro **Restrict key**, ka dibna sanduuqa liiska ka calaamadi afartan **oo keliya**:

- ☑ Places API (New)
- ☑ Geocoding API
- ☑ Routes API
- ☑ **Maps JavaScript API** 🆕

Guji **SAVE**.

> **Haddii aad hore u samaysay** oo aad calaamadaysay saddexda kaliya — noqo
> oo ku dar **Maps JavaScript API**. Haddii kale map-ku ma soo bixi doono
> (Leaflet ayuu isticmaali doonaa), cilad muuqatana ma arki doontid.

> **Sug 5 daqiiqo.** Xaddidaaddu wakhti bay qaadataa inay shaqayso. Haddii aad isla markiiba tijaabiso oo aad hesho 403, sug ka hor inta aanad wax beddelin.

---

## Tallaabada 3 — Quota cap (tan ayaa lacagta joojinaysa)

> **Fahan tan:** Budget alert **lacag ma joojiyo** — email buu kuu soo diraa oo kaliya, Google-na wuu sii wadaa adeegga oo lacag buu kaa qaadaa. **Quota cap** ayaa dhab ahaan joojisa.

Mid kasta oo ka mid ah afarta API:

**APIs & Services** → **Enabled APIs & services** → guji API-ga → tab-ka **QUOTAS & SYSTEM LIMITS**

1. Sanduuqa raadinta ku qor: `requests per day`
2. Calaamadi sanduuqa safka bidixdiisa
3. Guji **EDIT QUOTAS** (sare)
4. Qiimaha geli: **300**
5. **SUBMIT REQUEST**

Ku celi afarta API.

### Sababta 300

| | |
|---|---|
| Google wuxuu bixiyaa | **10,000 bilaashka bishii** SKU kasta |
| Bil waxay leedahay ugu badnaan | 31 maalmood |
| 300 × 31 = | **9,300** |

9,300 waa ka hooseeyaa 10,000. Marka **suurtagal ma aha** inaad bisha ka gudubto heerka bilaashka ah, si kastaba ha noqotee.

### Maxaa dhacaya marka la gaaro?

Google wuxuu soo celiyaa **429**. App-kaagu wuu qabtaa oo si aamusan ayuu ugu noqdaa OpenStreetMap-ka bilaashka ah — raadinta cinwaanku wuu sii shaqaynayaa, tayadu way hoos u dhacdaa oo kaliya. Rakaabku cilad ma arko.

---

## Tallaabada 4 (ikhtiyaari laakiin wanaagsan) — Budget alert

**Billing** → **Budgets & alerts** → **CREATE BUDGET**

- Magac: `ac7-maps`
- Scope → Projects → dooro `ac7-transport`
- Amount: **£10**
- Thresholds: **50%**, **90%**, **100%**
- Calaamadi **Email alerts to billing admins**

£10 waa tiro yar si ula kac ah. Haddii wax walba si sax ah u shaqaynayaan, biilkaagu waa **£0.00** oo email weligaa ma heli doontid. Haddii aad hesho — micnaheedu waa in wax khaldan yihiin, taasina waa calaamad faa'iido leh.

---

## Tallaabada 5 — Ku dar Vercel

Key-gu horeba wuxuu ugu jiraa computer-kaaga (`frontend/.env.local`). Laakiin website-ka tooska ah wuu u baahan yahay si gooni ah:

**Vercel** → project-kaaga → **Settings** → **Environment Variables** → **Add New**

| Key | Value |
|---|---|
| `VITE_GOOGLE_PLACES_KEY` | key-gaaga (`AIza...`) |

Calaamadi **Production**, **Preview**, iyo **Development**. Ka dib **Save** oo **Redeploy**.

---

## Sidee ku ogaanaya inuu shaqaynayo?

1. Dib u bilow server-ka:
   ```bash
   cd "/mnt/c/Users/hassa/OneDrive/Documents/A2 Projects/All in 1/frontend"
   npm run dev
   ```
2. Fur bogga rakaabka, ku qor sanduuqa **"Where to?"**: `SW1A 1AA`
3. Haddii ay soo baxdo **Buckingham Palace** — Google waa uu shaqaynayaa. (Nominatim postcode-yada UK si liidata ayuu u yaqaan; tani waa tijaabada ugu wanaagsan.)

Ka dib hubi: **Google Cloud Console → Google Maps Platform → Metrics**, group-ka u dhig **SKU**. Waa inaad aragto wicitaanno.

---

## Haddii ay cilad dhacdo

| Waxa aad aragto | Sababta | Xalka |
|---|---|---|
| 403 wax walba | API lama shidin, ama xaddidaaddu ma habboona | Dib u eeg tallaabada 1 iyo 2. Sug 5 daqiiqo. |
| 403 website-ka kaliya | Domain-ka production-ka lagama darin | Tallaabada 2a |
| 429 | Quota cap waa la gaaray — sida loo qorsheeyay | App-ku wuu sii shaqaynayaa (OpenStreetMap). Kor u qaad oo keliya haddii aad damacsan tahay inaad bixiso. |
| Raadintu way shaqaynaysaa laakiin tayadu waa liidataa | OpenStreetMap ayuu isticmaalayaa | Key ma jiro, ama quota waa la gaaray. Eeg Metrics. |

---

## Liiska hubinta

- [ ] Project-ka saxda ah ayaa la doortay
- [ ] Billing waa la shiday
- [ ] Places API **(New)** — ENABLED
- [ ] Geocoding API — ENABLED
- [ ] Routes API — ENABLED
- [ ] Maps JavaScript API — ENABLED
- [ ] Key: Websites restrictions — `http://localhost:3000/*` OO KU JIRA
- [ ] Key: API restrictions — afarta oo keliya
- [ ] **Quota 300/maalintii — afarta dhan** ← tan ayaa lacagta joojinaysa
- [ ] Budget alert £10
- [ ] Key-ga Vercel lagu daray
- [ ] La tijaabiyay `SW1A 1AA`
