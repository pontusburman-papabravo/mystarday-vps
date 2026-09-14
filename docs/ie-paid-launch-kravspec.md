# Irland — betald lansering (kravspecifikation)

**Status:** DECIDED — 2026-09-14  
**Implementation:** FROZEN tills founder säger GO. Denna PR innehåller **ingen produktkod**.  
**Authority:** detta dokument + [`docs/adr/ADR-023-market-commercial-policy.md`](adr/ADR-023-market-commercial-policy.md)  
**POS:** Constitution 2 (ingen överraskning trial→betalt), Constitution 5 (färdig registrering), R-02 (stjärnor inte köpbara), PA-01 (ingen ny coachyta), P-04 (ingen parent dashboard på Hem)

Slå **inte** på `market_ie_open`, `market_fi_open`, `market_uk_open` eller `market_eu_open` från detta dokument.

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

Sveriges IAP-go-live **får inte blockera** Irland. Irlands betalflöde **får inte blockeras** av UK-juridik.

---

## 2. Icke-mål (denna spec)

| Inte | Varför |
|------|--------|
| Bygga entitlement/trial/paywall-kod i denna PR | Krav först |
| Slå på `market_ie_open` | Launch-gate ovan |
| Öppna FI, NO, DK, NL, DE, AT, FR, ES, GB, US | Separata gates + evidens |
| `market_eu_open` | Skulle öppna flera länder på en gång |
| Lokaliseringsplattform, `nb-NO`, `da-DK`, `de-DE`, `nl-NL` | Spår B efter IE-evidens |
| Finsk UI (`fi-FI`) | FI-produktpolicy är `sv-SE` om/när FI öppnas |
| Star-IAP, syskon-leaderboard, fjärde coach, Activation-expansion | Forbidden utan ADR |
| Stacka 7 dagars produkttrial **plus** Apples 14-dagars IAP-intro på IE-SKU | Första dragningen skulle landa ~dag 21 |
| FX-konvertera 59/590 SEK till euro | Portalmål redan €5.99 / €59.99 |
| Kräva kort vid signup | Paid social: prova produkten först |
| Röra grandfatherade / svenska intro-års-familjer | SE-spåret är separat |

---

## 3. Strategi — två parallella spår, inte en landlista

| Spår | Vad | När |
|------|-----|-----|
| **SE** | Nuvarande modell. IAP go-live **2026-10-01**. Grandfather + intro-år oförändrade. | Separat. Får inte blockera IE. |
| **A — English** | Irland live som **betalt** experiment. UK legal/store/representant **i parallell**, men UK får **inte** stjäla ingenjörstid från IE-betalflödet. UK får gå live när *UK:s* gates är klara, oberoende av NL/DE. | IE P0. UK P1 (docs/ops, inte produktomskrivning). |
| **B — Locale** | Ingen lokaliseringsplattform förrän Irland visar **exportbar First Success och en riktig betalningssignal**. Därefter per-land-gates (inte `market_eu_open`) → NL, gärna `en-GB` först → plattform → `de-DE` → DE+AT. | Efter IE-evidens, inte kalender. |
| **FI / NO / DK** | Inget arbete bara för geografi eller språknärhet. | — |

Detta är en **kommersiell experimentmaskin för nya marknader**, inte en översättningsplan.

ADR-018:s lanseringsordning `SE → IE → NO/DK → bulk EU → UK` är **delvis ersatt** av ADR-023 för kommers och prioritering. Jurisdiktion (land ≠ språk) i ADR-018 gäller fortfarande.

---

## 4. Marknadspolicy (normativ)

Policy, inte land-if i UI. Default för **varje ny öppen marknad** (om/när den öppnas) är samma som IE.

| Marknad | `entitlement` | `trial_days` | `requires_billing_ready` | Gate | Kommentar |
|---------|--------------|--------------|---------------------------|------|-----------|
| **SE** | `intro_year` | `0` | `false` | `market_se_open` (ON) | Signup tillåten via intro-år. `payment_start` = 2026-10-01. |
| **IE** | `trial` | `7` | `true` | `market_ie_open` (OFF tills launch-gate) | Ingen intro-år. Ingen prebilling-år. |
| **GB** | `trial` | `7` | `true` | `market_uk_open` (OFF) | Samma kommersiella modell när UK öppnas. Legal/store/representant är egna gates. |
| **FI, NL, DE, AT, …** (om någonsin öppna) | `trial` | `7` | `true` | Per-land-flagga; **inte** `market_eu_open` | Inte Sveriges intro-år. Inte IE/FI-prebilling-året. |

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

Primära KPI: CAC, trial→paid, tidig retention. Inte vanity signup-count.

---

## 12. Storefront — människa / App Store Connect (P0 före flagga)

Kod kan inte rätta listingcopy. Detta är **launch blocker**.

**FACT (publik iTunes lookup `id=6774493098`, 2026-09-14):**

| Storefront | Status |
|------------|--------|
| **IE** | Listad. **Gratis.** Namn `My Starday: Family Routines`. EN+SV. `hasInAppPurchases: true`. Beskrivning säger fortfarande *“My Starday is currently available in Sweden.”* Screenshot-filnamn `Min_Stjarndag_V3_*` (kan fortfarande vara svensk UI). |
| **FI** | Samma mönster som IE. **Inte** detta experiments öppning. |
| **SE** | Gratis. Svenskt listingnamn (oförändrat).
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
| UK Art. 27 | Aktiv UK-annons talar emot “occasional”-undantag. Representant är UK-gate, inte IE-kod. |
| UK ICO-avgift | Self-assessment; betala om inte undantagen (småbolagsband ofta £52/£78). **Inte** “registrering alltid krävs”. |
| Children’s Code (UK) | Gäller ISS som barn sannolikt använder, även om förälder skapar barnet. Mall: IE Track 1. Ingen produktskrivning i IE-spåret. |
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

Sverige 1 okt och UK-dokumentation får löpa parallellt så länge de inte tar IE-betalflödet.

Release-states i [`docs/ie-fi-release-gates.md`](ie-fi-release-gates.md) får **inte** tolkas som att `PREBILLING_MARKET_READY` är tillstånd att öppna IE. För IE krävs trial+billing-path + device + explicit founder-godkännande.

---

## 15. Testbara acceptanskriterier (när kod får byggas)

Dessa är **låsta krav**, inte ett OK att implementera nu.

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

## 16. Kodkarta (för senare implementation)

| Område | Sökväg |
|--------|--------|
| Intro-år eligibility | `src/lib/payment-settings.js` |
| Grant / lazy backfill | `src/lib/family-entitlements.js` |
| Signup-gate | `src/lib/market-launch-invariants.js` → `src/lib/registration-market-context.js` |
| Register-kommentar (föråldrad IE/FI-prebilling) | `src/routes/auth/register.js` |
| Market flags | `src/lib/market-region.js` — NL/DE/AT/FR/ES via bulk `market_eu_open` |
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
| **Detta dokument** | Normativ kravspec. Läs först. |
| [`ADR-023`](adr/ADR-023-market-commercial-policy.md) | Beslut: intro-år SE-only; nya marknader 7-dagars trial + billing-ready |
| [`ADR-018`](adr/ADR-018-family-market-jurisdiction.md) | Land ≠ språk, gates. Lanserings**ordning** delvis ersatt. |
| [`docs/ie-fi-prebilling-access.md`](ie-fi-prebilling-access.md) | Historisk IE/FI-prebilling-modell. **Inte** IE launch authority. |
| [`docs/ie-fi-release-gates.md`](ie-fi-release-gates.md) | States får inte kollapsas. IE-öppning ≠ prebilling-ready. |
| [`docs/ie-fi-billing-external-matrix.md`](ie-fi-billing-external-matrix.md) | 2026-08-31 scrape — **stale** för download-pris. |
| [`docs/p-ie-launch/track-1-legal-compliance/`](p-ie-launch/track-1-legal-compliance/) | IE legal reuse |
| [`docs/runbooks/PAYMENTS-GO-LIVE-2026-10-01.md`](runbooks/PAYMENTS-GO-LIVE-2026-10-01.md) | SE IAP 1 okt. Öppnar inte IE. |
| [`docs/FIRST-SUCCESS.md`](FIRST-SUCCESS.md) | First Success-definition |
)
