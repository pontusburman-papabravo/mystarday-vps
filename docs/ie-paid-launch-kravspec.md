# Irland — betald lansering (kravspecifikation)

**Status:** GO — IE P0 implementation in this PR (2026-09-14). Flags remain OFF.  
**Amendment:** expansionssekvens §3.3–3.7 (samma dag) — UK deferred, NL parallell förberedelse. §0 och A1–A13 oförändrade.  
**Nästa beslut:** fysisk IE-enhet (köp + restore) + founder-godkännande innan `market_ie_open`. NL förblir förberedelse ([`docs/nl-market-prep.md`](nl-market-prep.md)) tills NL:s egna gates är låsta.  
**Oföränderligt:** launch-gate §0 · kommersiell modell §3.1 · IE-experiment §3.2 · acceptans A1–A13  
**Authority:** detta dokument + [`docs/adr/ADR-023-market-commercial-policy.md`](adr/ADR-023-market-commercial-policy.md)  
**POS:** Constitution 2 (ingen överraskning trial→betalt), Constitution 5 (färdig registrering), R-02 (stjärnor inte köpbara), PA-01 (ingen ny coachyta), P-04 (ingen parent dashboard på Hem)

Tre låsta nivåer: **förbereda** · **bygga** · **öppna**. Denna PR **bygger** IE-spåret. Den **öppnar** inget land.

1. **Affärsmodell (nya marknader):** 7-dagars trial + betalningsvalidering. Sverige undantaget (grandfather + intro-år).
2. **Expansion:** förbered nästa marknad innan föregående är bevisad; öppna när **den marknadens** gates är klara. IE P0. NL parallell förberedelse. UK deferred. Inte en landkö.
3. **Localization:** skalning efter **export-signal** (First Success utanför Sverige) — inte krav för IE, inte D30-krav, inte arkitektur-först.

Slå **inte** på `market_ie_open`, `market_fi_open`, `market_uk_open`, `market_nl_open` eller `market_eu_open` från detta dokument.

---

## 0. Det enda kommersiella launch-gate som räknas

> **Ingen `market_ie_open` förrän en ny irländsk familj kan registrera sig, använda hela produkten i exakt 7 dagar, träffa paywall på dag 8, och genomföra ett verkligt köp på en fysisk enhet.**

Kortet krävs **inte** vid registrering. Funneln är:

```
annons → registrering → First Success → paywall → köp
```

Diagnos (segmenterat på `family.country_code`):

| Symptom | Titta på |
|---------|----------|
| Få registreringar | annons / store / landning |
| Få når First Success | produkt / onboarding |
| First Success men få betalar | pris / värde / paywall |

Primära mått: **CAC**, **trial→paid**, **tidig retention**. Inte “antal registrerade familjer”.

First Success = befintlig produktdefinition i [`docs/FIRST-SUCCESS.md`](FIRST-SUCCESS.md): första gången familjen upplever att appen hjälpte i vardagen. Ingen ny coachyta (PA-01).

---

## 1. Mål

Irland är ett **betalt kommersiellt experiment** på engelska, inte en “öppna landet gratis”-lansering och inte ett i18n-projekt.

1. Bevisa att en ny marknad kan ge **exportbar First Success** och en **riktig betalningssignal**.
2. Hålla Sveriges modell orörd (grandfather + intro-år + IAP 2026-10-01).
3. Göra kommersiell policy **policy-driven** (per marknad), inte `if (country === 'IE')` utspritt i koden.
4. Inte skapa konton som familjen inte kan använda (Constitution 5).

Sveriges IAP-go-live **får inte blockera** Irland. Irland och NL **får inte blockera** SE. UK-juridik **får inte** dra resurser nu (UK är deferred).

---

## 2. Icke-mål (denna spec)

| Inte | Varför |
|------|--------|
| Slå på `market_ie_open` | Launch-gate §0; fysisk enhet kvar |
| Öppna FI, NO, DK, NL, DE, AT, FR, ES, GB, US | Separata gates + evidens. NL-**förberedelse** är tillåten; NL-**öppning** är det inte från denna PR |
| `market_eu_open` | Skulle öppna flera länder på en gång. Teknisk skuld, inte genväg |
| Lokaliseringsplattform / `de-DE` / `nl-NL` före export-signal | Skalning efter First Success utanför SE — inte IE-krav |
| UK legal sprint / representative / GB storefront / GBP | Founder: UK deferred |
| Finsk UI (`fi-FI`) | FI-produktpolicy är `sv-SE` om/när FI öppnas |
| Star-IAP, syskon-leaderboard, fjärde coach, Activation-expansion | Forbidden utan ADR |
| Stacka 7 dagars produkttrial **plus** Apples 14-dagars IAP-intro på IE-SKU | Första dragningen skulle landa ~dag 21 |
| FX-konvertera 59/590 SEK till euro | Portalmål redan €5.99 / €59.99 |
| Kräva kort vid signup | Paid social: prova produkten först |
| Röra grandfatherade / svenska intro-års-familjer | SE-spåret är separat |

---

## 3. Strategi — parallell förberedelse, egna gates

> **Förbered nästa marknad innan föregående är bevisad. Öppna nästa marknad när dess egna gates är klara. Investera tungt i ett nytt språk först när vi sett att produkten exporterar.**

Detta **försvagar inte** IE:s launch-gate i §0.

| Spår | Vad | När |
|------|-----|-----|
| **SE** | Nuvarande modell. IAP go-live **2026-10-01**. Grandfather + intro-år oförändrade. | Separat. Får inte blockera IE/NL. |
| **IE (P0)** | Första betalda internationella experimentet. 7-dagars trial. | Implementation mot spec efter founder GO. Flagga efter §0. |
| **NL (parallell förberedelse)** | Gap-analys, egen `market_nl_open` (när den byggs), store/legal/pricing, ev. `en-GB` som första test. **Inte** automatisk öppning. | Parallellt med IE P0. Öppna när **NL:s** gates är klara. Inte D30 från IE. |
| **Locale / DE+AT** | Localization foundation + `de-DE` efter export-signal (First Success i IE och/eller NL). | Efter export-signal, inte efter perfekt IE-kohort. |
| **UK** | **Deferred** by founder (Children’s Code, UK GDPR, representative, ICO, consumer law). | Återupptas bara via senare explicit founder-beslut. |
| **FI / NO / DK** | Inget arbete bara för geografi eller språknärhet. | — |

Inte en serialiserad landkö. ADR-018:s `SE → IE → NO/DK → bulk EU → UK` är **delvis ersatt** av ADR-023. Jurisdiktion (land ≠ språk) i ADR-018 gäller fortfarande.

Acceptanskriterierna A1–A13 (§15) är oförändrade. Launch-gaten i §0 är oförändrad.

### 3.1 Kommersiell princip för nya marknader

Syftet med internationell expansion har ändrats från primärt produktfeedback till **kommersiell validering**.

Sveriges historiska modell med grandfathering och intro-år är därför **inte default för nya marknader**.

För varje ny marknad som öppnas efter Sverige gäller, om inte en separat ADR uttryckligen beslutar annat:

- Gratis appnedladdning.
- Ingen kortuppgift vid registrering.
- Full produktåtkomst under en kort produkttrial.
- Default trial = **7 dagar**.
- Efter trial krävs Premium för fortsatt full åtkomst.
- Billing måste vara verifierad och användbar innan registrering tillåts i en öppen trial-marknad.
- Store-priser ska vara lokala kommersiella priser, inte mekanisk FX-konvertering från SEK.
- Store `priceString` är runtime source of truth.
- Apple/Google store-intro får inte staplas ovanpå produkttrial om det skjuter första möjliga betalningssignal utan uttryckligt beslut.

#### Varför

Sverige användes initialt för att få in familjer, feedback och produktlärande.

Nya marknader ska i stället svara på en annan fråga:

> Kan produkten skapa First Success utanför Sverige och konvertera verkliga familjer till betalande kunder?

Därför är ett långt gratisintro fel experimentdesign för IE och kommande marknader.

Vi ska kunna skilja mellan:

1. **Acquisition-problem** — Få registreringar → annons, storefront, landing, budskap eller CAC.
2. **Activation-problem** — Registrering sker men få når First Success → produkt, onboarding, barninloggning, schema eller språk.
3. **Monetization-problem** — First Success sker men få betalar → pris, value proposition, paywall, planmix eller checkout.

Huvudfunneln för nya marknader är därför:

```
Ad / Store
→ Signup
→ Child created
→ Schedule
→ Child login
→ First Success
→ Trial end
→ Paywall shown
→ Purchase
→ Early retention
```

Primära KPI:

- CAC
- Signup → First Success
- First Success → paywall
- Trial → paid
- Monthly vs yearly mix
- D7 retention
- D30 retention

`number_of_signups` är diagnostik, inte huvudsakligt framgångsmått.

### 3.2 Irland är första betalda marknadsexperimentet

Irland ska **inte** öppnas med Sveriges intro-år.

`market_ie_open` får endast slås på när hela den kommersiella vägen är verifierad:

```
Ny IE-familj
→ registrering utan kort
→ exakt 7 dagars full access
→ ingen intro_year-entitlement
→ paywall från trial expiry
→ riktigt StoreKit/Play-köp
→ RevenueCat/backend entitlement
→ restore fungerar
```

Det räcker inte att:

- App Store-listningen är live.
- IAP-produkter finns i portalen.
- RevenueCat offering finns.
- Signup fungerar.
- Trial fungerar i unit/integration test.

Ett **verkligt köp på fysisk enhet** och fungerande restore är launch blocker.

IE-annonsbudget får inte starta innan denna väg är verifierad.

### 3.3 Expansion — inte en seriell landlista

Ersätter:

```
IE → vänta → bevisa allt → NL → vänta → platform → DE
```

med:

```
                ┌─ IE paid launch → acquisition + revenue data
SE ─────────────┤
                └─ NL preparation → NL launch when NL gates pass
                                      │
                                      └─ export signal
                                           ↓
                                  localization foundation
                                           ↓
                                        de-DE
                                           ↓
                                         DE
                                           ↓
                                         AT
```

UK ligger **utanför** detta flöde tills founder återaktiverar det.

Var offensiv i **parallellisering**, inte i att hoppa över gates.

#### UK — deferred

Founder har beslutat att **vänta med UK** på grund av juridisk komplexitet (Children’s Code, UK GDPR, UK representative, ICO, consumer law).

- Ingen UK legal sprint nu.
- Ingen UK representative procurement nu.
- Ingen GB storefront-launch nu.
- Ingen GBP pricing-implementation nu.
- Ingen `market_uk_open`.
- Status: **deferred by founder decision**.
- Återupptas bara genom ett senare explicit founder-beslut.

Historisk UK-dokumentation raderas inte. Prioritet/status ändras.

#### NL — parallell förberedelse med Irland

Vi ska **inte** vänta på 7–14 dagars full IE-data innan NL-arbete får börja.

När IE P0-implementationen pågår får följande NL-arbete ske parallellt:

- inventera nuvarande NL market-routing
- identifiera vad som krävs för `market_nl_open`
- verifiera att `market_eu_open` inte används för staged NL-launch
- App Store / Play availability-gaps
- legal country-gap
- storefront-copy
- pricing/billing readiness
- analytics-segmentering
- landing/register routing
- supportberedskap

Detta är **förberedelse**, inte automatiskt tillstånd att öppna NL.

NL får öppna när **NL:s egna gates** är klara. IE behöver inte först ha D30-retention eller ett statistiskt perfekt paid-case.

Första NL-testet ska inte automatiskt kräva `nl-NL`.

Hypotes: Nederländerna kan vara en billig andra engelskspråkig datapunkt innan vi investerar i ny locale.

NL initialt **kan** använda:

- `en-GB`
- NL-specific market gate
- NL-specific store/legal/pricing
- befintlig English product

Detta är ett **explicit experiment**, inte en permanent slutsats om nederländsk locale. Ingen `market_eu_open`. NL ska få egen gate när implementationen görs.

### 3.4 Vad localization platform inte får bli

Localization platform är ett skalningsprojekt, inte ett prerequisite för första internationella intäkten.

Den får **inte** byggas före IE bara för arkitekturens skull, och **inte** införas i IE paid-launch-scope.

Den ska **inte** kräva att IE först har komplett trial→paid-statistik eller lång D30-data.

**Gate för att börja investera** i localization platform / `de-DE`:

- genuina IE och/eller NL-familjer använder produkten,
- några når First Success,
- engelska produkten visar ingen fundamental export-blocker,
- support/språk är inte uppenbart ohanterligt.

En faktisk betalningssignal är stark evidens men **inte** ett krav på lång D30-data innan nästa språk.

Skillnad:

- **Förbered NL:** får ske direkt parallellt med IE P0.
- **Bygg tung localization platform / `de-DE`:** först när faktisk exportbar produktanvändning (First Success) är synlig.

När plattformen senare byggs ska målbilden vara:

```
new market =
  market policy
  + country gate
  + supported locale
  + translation pack
  + localized default content
  + legal package
  + store package
  + analytics
  + tests
```

och inte hundratals landsspecifika kodgrenar.

AI kan användas för huvuddelen av generell locale-produktion och teknisk QA.

AI är **inte ensam release authority** för:

- barnets centrala copy,
- juridisk text,
- betalningscopy,
- annonser,
- storefront-copy som påverkar kommersiella eller juridiska claims.

Dessa kräver lämplig mänsklig/native/legal review beroende på yta.

### 3.5 Tyskland + Österrike — nästa stora locale-våg

Efter export-signal från IE/NL:

1. bygg nödvändig localization foundation,
2. implementera `de-DE`,
3. native review på kritiska ytor,
4. DE-specific legal/store/gate,
5. öppna DE när DE:s gates är klara,
6. AT därefter med samma språk men egen market/store/legal-bedömning.

Tyskland ska **inte** vänta på perfekta irländska kohorter. Målet är att kunna börja `de-DE` medan IE/NL fortfarande samlar kommersiella data, så länge First Success-exporten är bekräftad.

### 3.6 Operativ roadmap (planeringsdatum, inte launch-gates)

Dessa datum är **målbild**, inte normativa gates och inte override av §0 eller respektive market gate.

**14–20 september 2026**

IE: storefront fix · named IAP SKU/priser · RevenueCat · market commercial policy · SE-only intro-year · IE 7-day trial · day-8 paywall · billing-ready registration invariant · country analytics · tester.

NL parallellt: market gate design / gap analysis · store availability · legal/store/pricing assessment · möjlighet att lansera på `en-GB` · analytics/support readiness.

SE: fortsatt preparation inför IAP 1 oktober.

**Cirka 20–23 september**

IE: physical-device purchase · restore · backend entitlement · full launch-gate PASS. Först därefter får founder besluta `market_ie_open`.

**Efter IE launch**

Starta IE paid acquisition. Mät signup → First Success → paywall → paid. CAC / trial→paid / early retention. NL-förberedelsen fortsätter.

**Sen september / tidig oktober**

Om NL:s egna gates är klara kan NL öppnas på `en-GB`. Det krävs **inte** att IE har D30-resultat.

**1 oktober**

SE IAP go-live enligt separat runbook. IE/NL får inte blockera SE och SE får inte blockera IE/NL.

**Oktober**

När IE/NL visar exportbar First Success: starta localization platform i begränsad, konkret form · förbered `de-DE` · bygg DE store/legal/market gate parallellt.

**Slutet oktober / november**

Mål: DE launch när dess egna gates är PASS · AT därefter. Målbild, inte löfte.

### 3.7 Releaseprincip och risk

Ingen marknad öppnas för att den är geografiskt nära Sverige eller för att språket är lätt att översätta.

En marknad öppnas när:

1. landsgate finns,
2. store är korrekt,
3. legal är accepterad för jurisdiktionen,
4. billing är verifierad om policyn kräver det,
5. locale/support är tillräckliga,
6. analytics kan isolera marknaden,
7. launch owner uttryckligen godkänner öppning.

Det gäller IE, NL, DE, AT, GB (när UK återaktiveras) och framtida marknader.

Sverige är uttryckligen undantaget från defaultmodellen eftersom befintliga grandfather- och intro-årsåtaganden ska bevaras.

**Tillåtet**

- förbereda nästa marknad tidigt
- göra storefront/legal/gate-arbete parallellt
- börja nästa experiment innan föregående har D30
- starta locale-arbete när exportbar First Success är synlig

**Inte tillåtet**

- öppna IE utan fysisk purchase + restore
- öppna NL via `market_eu_open`
- starta `de-DE` bara för att Tyskland är attraktivt om ingen internationell familj når First Success
- låta UK-juridik dra resurser nu
- ändra Sveriges kommersiella löften
- slå på market flags som del av dokumentationsändring

---

## 4. Marknadspolicy (normativ)

Policy, inte land-if i UI. Default för **varje ny öppen marknad** (om/när den öppnas) är samma som IE.

| Marknad | `entitlement` | `trial_days` | `requires_billing_ready` | Gate | Kommentar |
|---------|--------------|--------------|---------------------------|------|-----------|
| **SE** | `intro_year` | `0` | `false` | `market_se_open` (ON) | Signup tillåten via intro-år. `payment_start` = 2026-10-01. |
| **IE** | `trial` | `7` | `true` | `market_ie_open` (OFF tills launch-gate) | Ingen intro-år. Ingen prebilling-år. |
| **NL** | `trial` | `7` | `true` | `market_nl_open` **när den byggs** (OFF; finns inte som egen nyckel än) | Parallell förberedelse. Första test **kan** vara `en-GB`. **Inte** `market_eu_open`. |
| **GB** | `trial` | `7` | `true` | `market_uk_open` (OFF) | **Deferred.** Samma kommersiella modell *när* UK återaktiveras. |
| **FI, DE, AT, …** (om någonsin öppna) | `trial` | `7` | `true` | Per-land-flagga; **inte** `market_eu_open` | Inte Sveriges intro-år. Inte IE/FI-prebilling-året. |

`requires_billing_ready = true` betyder: öppen marknad + publik billing oanvändbar → **avvisa signup** (`MARKET_BILLING_NOT_READY`). Befintlig EN-sträng:

> Purchases are not available yet in this country, so we cannot create an account you would be unable to use.

Sverige får **inte** den guarden. Intro-året gör kontot användbart utan köpväg.

---

## 5. Varför `market_ie_open` inte får slås på idag

**FACT (kod, 2026-09-14):** att öppna Irland med nuvarande resolver ger irländska familjer **Sveriges intro-år**, inte 7 dagars trial.

| Mekanism | Vad koden gör idag |
|----------|-------------------|
| `isFamilyEligibleForIntroYear()` | Landsblind. Alla efter `lifetime_free_until` (2026-09-14T00:00:00+02:00) får intro-år. `src/lib/payment-settings.js` |
| `grantIntroYearOnCreate` / lazy backfill | Skriver `source = 'intro_year'` oavsett land. `src/lib/family-entitlements.js` |
| `evaluateSignupCompleteness()` | Öppen marknad efter grandfather-cutoff → `reason: 'intro_year'`. Billing-ready ignoreras. `src/lib/market-launch-invariants.js` |
| IE/FI prebilling | Bara om `created_at < market_*_payment_start_at`. De datumen är **unset** → prebilling är **inte** live-sökvägen. |
| `family_subscriptions` | Insertar fortfarande 14-dagars `trial` vid register — men entitlements **vinner** och döljer paywall i ett år. |

Prebilling-året i [`docs/ie-fi-prebilling-access.md`](ie-fi-prebilling-access.md) är **inte** Irlands lanseringsmodell. Implementera det inte för IE.

---

## 6. Entitlement-ordning

Resolvern ska fortsätta vara server-auktoritativ. Klienten får inte hitta på access.

**Vinnarordning** (aktiv rad slår beräknad trial):

1. `grandfathered`
2. `admin`
3. `apple`
4. `google`
5. `gift`
6. `intro_year` — **endast familjer som policy säger är intro-år** (SE efter cutoff; aldrig ny IE)
7. Beräknad `trial` — `access_kind = 'trial'`, `premium.source` i enlighet därmed, **ingen** `intro_year`-rad
8. Annars `limited` + paywall

Store/admin/gift slår trial. Grandfather/intro-år för **befintliga** rader lämnas orörda (även om en sandlåde-IE-familj skulle ha en manuell rad).

`family.is_lifetime_free` sätts **inte** av IE-trial.

Global `iap_paid_rollout_ready` / `payment_enabled` får **inte** överraska svenska grandfather/intro-år-användare: de källorna vinner fortfarande.

---

## 7. Registrering

### 7.1 Invariant (ska återställas för trial-marknader)

```
publicBillingUsable =
  payment_enabled && !BILLING_UI_DISABLED && iap_paid_rollout_ready

signup_allowed =
  market_open && (
    (policy.requires_billing_ready === false)   // SE: intro-år gör kontot användbart
    || publicBillingUsable
  )
```

Öppen trial-marknad + billing oanvändbar → **403** `MARKET_BILLING_NOT_READY`. Skapa aldrig register → 402 → kan-inte-köpa-konton.

Gäller e-postregistrering **och** Apple/Google OAuth (`assertRegistrationMarketOpen` / `src/lib/registration-market-context.js`).

### 7.2 Vad familjen får vid IE-signup (när gate är ON och billing redo)

- Full Premium-ekvivalent access medan `now < trial_ends_at`
- Ingen kortuppgift
- Tydlig copy att det är **7 dagars** full access, därefter prenumeration (Constitution 2)
- Land `IE`, locale default `en-GB`, timezone `Europe/Dublin` (befintlig `market-config`)
- Legal: `/en/eea/privacy`, `/en/eea/terms`, `/en/eea/child-privacy`, kontakt `/en/contact` — **inte** svenska `/privacy`

Engelsk landning får retargeta waitlist → `/register` när `signup_allowed.IE` är true (befintligt `public/js/landing-market-state.js`). Det är avsiktligt **efter** launch-gate, inte en genväg att öppna marknaden.

---

## 8. Trial — exakt 7 dagar

| Regel | Låsning |
|-------|---------|
| Längd | `trial_ends_at = created_at + 7 days` via Luxon `plus({ days: 7 })` i **familjens timezone** (IE-default `Europe/Dublin`) |
| “Dag 8” | `now >= trial_ends_at` |
| Klocka | Serverklocka. Inte klient. Inte civil midnatt-avrundning. |
| Extra grace | **Ingen** |
| Access under trial | Full produkt, samma ytor som betald Premium |
| Lagring | **Beräknad** access (som gammalt prebilling), **inte** `intro_year`-rad. `access_kind = 'trial'` |
| Admin 14-dagars `basic_trial_days` | Får **inte** styra IE. IE-policy är 7. |
| `family_subscriptions` 14-dagars insert | Får inte vinna över IE-policy. Implementation får sluta inserta den för trial-marknader eller ignorera den i resolver — beteendet är 7 dagar. |

Under trial: paywall **dold**. Ingen “subscribe now”-tryck som blockerar First Success. En diskret nedräkning/status är tillåten (Constitution 2: ingen överraskning på dag 8).

---

## 9. Paywall dag 8

Sessioner **dödas inte**. Nästa request och nästa app-lansering ser nytt läge.

| Event | Beteende |
|-------|----------|
| `now >= trial_ends_at` och ingen store/admin/gift | `requires_paywall: true`, `access_kind: limited`, `upgrade_url: /paywall` |
| Aktiv föräldrasession | Cookies kvar. Ingen forced logout. |
| Aktiv barnsession | Child-cookies kvar. Ingen forced logout. |
| Nästa API-anrop | Befintlig limited-account-gate (`src/middleware/require-premium.js`) |
| `GET /api/subscription/status` | Allowlistad. Klient **måste** visa paywall från payload, inte från session-reset. |
| Köp lyckas | RC webhook / `/api/iap/sync` skriver `apple`/`google`. Store slår trial. `access_kind = paid` |
| Restore | Samma `/api/iap/sync`. Misslyckad sync lämnar limited/trial orörd. |
| RC nere | Resolverfel → `503` (retry), aldrig tyst 402 som ser ut som “access slut” |
| Avbokning medan perioden gäller | Access kvar som paid tills perioden slutar |

### 9.1 Förälder i limited

Allowlist oförändrad i *policy* mot dagens prefix: `/api/auth/`, `/api/subscription/`, `/api/iap/`, `/api/account/`, `/api/gifts/`, `/api/consent/`, analytics/push/notifications/feedback/market/public/landing/i18n, `DELETE` family account.

Allt annat Premium → `402 PREMIUM_REQUIRED`, `limited_account: true`, `paywall_url: /paywall`.

### 9.2 Barn i limited

Ingen IAP i barnytan (R-02). Bara first-star-prefix:

- `/api/me/daily-log` (inkl. items via prefix)
- `/api/me/weekly-schedule`
- `/api/me/view-type`
- auth, subscription-read, consent, restore-parent / adult-privilege / PIN-picker

**Inte** brett `/api/me/`. Rewards, garden, family hall, universe, journey, goal, collectibles → `402`.

Ingen ny Hem-dashboard för förälder (P-04). Ingen barn-inställningsform (C-01).

---

## 10. IAP, pris, store intro

| Regel | Låsning |
|-------|---------|
| Produkt | Befintligt PAYMENTS V1-kontrakt: monthly + yearly auto-renew. `config/iap-product-contract.js` |
| Portalmål IE | **€5.99 / månad**, **€59.99 / år**. Inte FX från SEK. |
| Runtime-UI | Store `priceString`. Aldrig hårdkodat eurobelopp i klienten. |
| Yearly | Måste fortsätta vara den attraktiva planen |
| IE-SKU store intro offer | **Ingen.** Inte Apples 14-dagars intro på detta experiment. |
| SE 1 okt | Sverige **får** ha 14-dagars IAP-intro på SE-SKU. Separat från IE. |
| Appnedladdning | **Gratis** + prenumeration. Inte betald app-download som “betalmodell”. |
| Stjärnor | Inte köpbara. R-02. |
| Physical path | StoreKit/Play → RevenueCat/backend → entitlement → restore. **Launch blocker**, inte “nice to have”. |
| Evidensfil | `config/ie-fi-release-evidence.json` är **inte** live-flagga. `founder_open_approved_ie` stannar `false` tills ops-beslut efter launch-gate. |

RevenueCat/device-verifiering krävs **före** första irländska annonsvisning.

---

## 11. Analytics (måste finnas före trafik)

All kommersiell diagnostik **per `country_code`**. Dagens activation-funnel (`db/activation-funnel.js`) har **ingen** `country_code`-filter — det är ett gap mot denna spec.

Minst:

| Steg | Vad |
|------|-----|
| Ad / store in | källa, land |
| Signup completed | `country_code = IE` |
| First Success | befintlig milestone, per land |
| Trial start / trial end | 7-dagars fönster |
| Paywall shown | dag 8+ |
| Purchase / restore | store, plan (monthly/yearly) |
| Early retention | t.ex. D1/D7, per land |

Primära KPI: se §3.1 (CAC, Signup → First Success, First Success → paywall, Trial → paid, monthly/yearly mix, D7/D30). `number_of_signups` är diagnostik, inte huvudsakligt framgångsmått. Allt segmenterat på `country_code`.

---

## 12. Storefront — människa / App Store Connect (P0 före flagga)

Kod kan inte rätta listingcopy. Detta är **launch blocker**.

**FACT (publik iTunes lookup `id=6774493098`, 2026-09-14):**

| Storefront | Status |
|------------|--------|
| **IE** | Listad. **Gratis.** Namn `My Starday: Family Routines`. EN+SV. `hasInAppPurchases: true`. Beskrivning säger fortfarande *“My Starday is currently available in Sweden.”* Screenshot-filnamn `Min_Stjarndag_V3_*` (kan fortfarande vara svensk UI). |
| **FI** | Samma mönster som IE. **Inte** detta experiments öppning. |
| **SE** | Gratis. Svenskt listingnamn (oförändrat). |
| **GB, NL, DE, AU, US** | Inte listade (`resultCount: 0`). |

Äldre [`docs/ie-fi-billing-external-matrix.md`](ie-fi-billing-external-matrix.md) (2026-08-31) som påstår **€5.99 betald nedladdning** är **inaktuell**. Kör om `node scripts/verify-storefront-billing.mjs` före GO. ASC-konsolen är source of truth för SKU-priser.

### Mänsklig checklista (IE)

1. [ ] IE listing på engelska. Ta bort “currently available in Sweden”.
2. [ ] Screenshots visar **engelsk** UI, inte svensk.
3. [ ] App är **gratis** att ladda ner.
4. [ ] Named monthly/yearly SKU live i IE till **€5.99 / €59.99** (store-sanning vinner över portalmål om de skiljer sig; då uppdateras evidens, inte tyst kod).
5. [ ] Ingen 14-dagars intro offer på IE-SKU.
6. [ ] Yearly synlig och tydligt fördelaktig.
7. [ ] Play IE: named plans, inte bara publikt spann. Portalmål yearly €59.99; Play har historiskt visat övre spann €59.00 — **inte** ändra kommers från scrape; verifiera named SKU i Play Console.
8. [ ] RevenueCat offerings kopplade; webhook tar emot IE-köp.
9. [ ] Fysiskt köp + restore på IE-konfigurerad enhet (iOS minst; Android sandbox enligt befintlig payments-runbook).
10. [ ] Privacy/support-URL för IE: `/en/eea/privacy` och `/en/contact`.

---

## 13. Legal (reuse, inte omskrivning)

| Item | Status i denna spec |
|------|---------------------|
| IE Track 1 intern sign-off | 2026-08-20. **Inte** extern counsel. [`docs/p-ie-launch/track-1-legal-compliance/`](p-ie-launch/track-1-legal-compliance/) |
| Lawful basis, DPIA-utkast, LDRA-A1, parent-kontrakt + Art. 8-narrow | Återanvänd. Bygg inte om produkten. |
| IE Art. 27-representant | N/A (EU-etablering, Papa Bravo AB). Overlay redan accepterad. |
| UK Art. 27 | **Deferred.** Aktiv UK-annons talar emot “occasional”-undantag. Representant är UK-gate när UK återupptas, inte IE-arbete nu. |
| UK ICO-avgift | **Deferred.** Self-assessment när UK återupptas. **Inte** “registrering alltid krävs”. |
| Children’s Code (UK) | **Deferred.** Gäller ISS som barn sannolikt använder. Mall: IE Track 1. Ingen UK-sprint nu. |
| Extern legal review `/en/eea/*` | Fortfarande REVIEW_REQUIRED tills counsel. Blockerar inte *specen*; founder äger risk (Track 1-modellen). |

---

## 14. P0-ordning (implementation — **senare**, inte denna PR)

1. IE App Store-listing korrekt (människa).
2. IE SKU/priser live (€5.99 / €59.99), ingen store-intro.
3. Landpolicy: **inget intro-år i IE** (och default trial-policy för nya marknader).
4. 7 dagars full produkt-trial utan kort.
5. Dag-8-paywall (parent + barn enligt §9).
6. Payment-ready signup-invariant för `requires_billing_ready`.
7. Fysiskt köp + restore i IE-konfig.
8. Analytics per `country_code`.
9. **Därefter** `market_ie_open`.
10. Därefter trafik.

Sverige 1 okt och **NL-förberedelse** får löpa parallellt så länge de inte tar IE-betalflödet (§3.3, §3.6). UK-sprint **inte**. Annonsbudget efter steg 9, inte före (§3.2). Releaseprincip: §3.7.

Planeringsdatum (inte gates): §3.6.

Release-states i [`docs/ie-fi-release-gates.md`](ie-fi-release-gates.md) får **inte** tolkas som att `PREBILLING_MARKET_READY` är tillstånd att öppna IE. För IE krävs trial+billing-path + device + explicit founder-godkännande.

---

## 15. Testbara acceptanskriterier (när kod får byggas)

Dessa är **låsta krav**. Denna PR implementerar kodspåret mot dem. Ingen market-flagga slås på här.

| ID | Givet | När | Så |
|----|-------|-----|-----|
| A1 | `market_ie_open=false` | Familj väljer IE vid register | Signup avvisas (marknad stängd). |
| A2 | IE öppen, billing **av** | Register / Apple / Google | 403 `MARKET_BILLING_NOT_READY`. Ingen familjerad. |
| A3 | IE öppen, billing **på** | Ny IE-familj | Ingen `intro_year`-rad. `access_kind=trial`. Full access. |
| A4 | Ny IE-familj, `now = created_at + 7d − 1s` | Status | Paywall dold. Premium-ytor 200. |
| A5 | Samma familj, `now = created_at + 7d` | Status / API | `requires_paywall=true`. Session kvar. |
| A6 | Limited förälder | Anrop utanför allowlist | 402 + `/paywall`. `/api/iap/*` fungerar. |
| A7 | Limited barn | Rewards / universe / garden | 402. Daily-log first-star fungerar. Ingen IAP-yta. |
| A8 | SE-familj efter `lifetime_free_until` | Register | Fortfarande intro-år. Billing-ready **inte** krav. Grandfather orörd. |
| A9 | IE-familj med apple-rad | Trial utgången | `access_kind=paid`. Ingen paywall. |
| A10 | Restore på fysisk IE-enhet | Befintligt kvitto | Entitlement återställs. |
| A11 | Aktiverings-/funnel-query | Filter `country_code=IE` | Siffror isolerade från SE. |
| A12 | Global IAP go-live 1 okt | SE grandfather / intro-år | Ingen oväntad paywall. |
| A13 | `market_eu_open` förblir OFF | NL/DE-register | Fortfarande stängt. |

---

## 16. Kodkarta (implementation i denna PR)

| Område | Sökväg |
|--------|--------|
| Intro-år eligibility | `src/lib/payment-settings.js` |
| Grant / lazy backfill | `src/lib/family-entitlements.js` |
| Signup-gate | `src/lib/market-launch-invariants.js` → `src/lib/registration-market-context.js` |
| Register-kommentar (föråldrad IE/FI-prebilling) | `src/routes/auth/register.js` |
| Market flags | `src/lib/market-region.js` — NL/DE/AT/FR/ES via bulk `market_eu_open` idag; **NL ska få egen `market_nl_open` vid implementation, aldrig via `market_eu_open`** |
| Legal IE | `src/lib/legal-routing.js` |
| IAP-kontrakt | `config/iap-product-contract.js` |
| Paid transition | `src/lib/paid-transition.js` (behöver `trial`-kind, inte bara prebilling T1/hold) |
| Limited API | `src/middleware/require-premium.js` |
| Tester som kommer ljuga mot denna spec | `test/market-launch-invariants.test.js`, `test/payments-v1-entitlements.test.js`, `test/prebilling-market-e2e.test.js` |

---

## 17. Öppna frågor (inte påhittade)

Endast detta är **öppet**. Allt annat i detta dokument är beslutat.

| ID | Fråga | Ägare | Får inte |
|----|-------|-------|----------|
| Q1 | Extern counsel-signoff av `/en/eea/*` före första IE-annons? Track 1 är intern riskacceptans. | Founder | Agent får inte “anta ja” eller skriva ny legal copy |
| Q2 | Play named yearly exakt €59.99 vs historiskt publikt spann €59.00 | Människa i Play Console | Kod gissar inte pris; store `priceString` |
| Q3 | Finns det någon prod-IE-familj från tidigare sandbox-toggle? | Ops före GO | Agent raderar inte prod-familjer |

Inget av Q1–Q3 blockerar att **låsa specen**. Q2 blockerar **flaggan** tills named SKU är verifierade. Q1 är founder-risk. Q3 är ops-check.

---

## 18. Dokumentkarta

| Dokument | Roll efter denna spec |
|---------|------------------------|
| **Detta dokument** | Normativ kravspec. Läs först. Kommersiell princip §3.1–3.2. Expansion §3.3–3.7. |
| [`ADR-023`](adr/ADR-023-market-commercial-policy.md) | Beslut: intro-år SE-only; nya marknader 7-dagars trial + billing-ready |
| [`ADR-018`](adr/ADR-018-family-market-jurisdiction.md) | Land ≠ språk, gates. Lanserings**ordning** delvis ersatt. |
| [`docs/ie-fi-prebilling-access.md`](ie-fi-prebilling-access.md) | Historisk IE/FI-prebilling-modell. **Inte** IE launch authority. |
| [`docs/ie-fi-release-gates.md`](ie-fi-release-gates.md) | States får inte kollapsas. IE-öppning ≠ prebilling-ready. |
| [`docs/ie-fi-billing-external-matrix.md`](ie-fi-billing-external-matrix.md) | 2026-08-31 scrape — **stale** för download-pris. |
| [`docs/p-ie-launch/track-1-legal-compliance/`](p-ie-launch/track-1-legal-compliance/) | IE legal reuse |
| [`docs/runbooks/PAYMENTS-GO-LIVE-2026-10-01.md`](runbooks/PAYMENTS-GO-LIVE-2026-10-01.md) | SE IAP 1 okt. Öppnar inte IE. |
| [`docs/FIRST-SUCCESS.md`](FIRST-SUCCESS.md) | First Success-definition |
| [`docs/nl-market-prep.md`](nl-market-prep.md) | NL prepare-only: gap + gates. Öppnar inte NL. |
)
