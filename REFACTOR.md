# Refaktoreringsplan — Min Stjärndag

> **Status:** Förslag (ingen kod ändrad ännu).
> **Syfte:** Renodla och modularisera hela kodbasen. Stripe avvecklas till förmån för Apple/Google IAP (RevenueCat).
> **Utförande:** Varje uppgift är storleksanpassad för att köras av Composer 2.5.

---

## Bakgrund

- **Stripe är redan i praktiken vilande/dödkod.** `stripe-checkout.js`, `stripe-webhook.js`, `stripe-setup.js`, `admin/setup-stripe.js` och `payment.js` är inte monterade någonstans.
- **RevenueCat (`src/routes/iap.js`) är den aktiva betalvägen** (monterad på `/api/iap`) och hanterar webhook-body korrekt med `express.raw` på route-nivå.
- Det gör Stripe-borttagningen **lågrisk**.

---

## Designprinciper (gäller varje uppgift Composer 2.5 kör)

Eftersom en billigare modell utför ändringarna måste varje uppgift vara **liten, entydig och självverifierande**:

1. **En uppgift = en avgränsad ändring** med explicit fillista och acceptanskriterier.
2. **Kör alltid efter varje uppgift:** `npm run lint` + `npm test` (Node 20). Stanna om något går rött.
3. **Ingen beteendeförändring** om inte uppgiften uttryckligen säger det (rena flyttar/omdöpningar).
4. **Bryt aldrig publika API-kontrakt** (route-paths, JSON-fält) utan att det står i uppgiften.
5. **Respektera large-file-reglerna:** grep + chunk-läs, max 1 stor fil/tur.
6. **Uppdatera `CLAUDE.md` "Recent changes"** + bumpa `public/sw.js`-versionen när klient-JS ändras.
7. **Varje uppgift = egen commit/PR** med tydlig titel.

---

## Workstreams (översikt)

| ID | Workstream | Mål | Risk |
|----|-----------|-----|------|
| **A** | Ta bort Stripe / legacy-betalning | Renodla till Apple/Google IAP (RevenueCat) | Låg |
| **B** | Röj dödkod & legacy (Polsia) | Mindre yta, mindre förvirring | Låg |
| **C** | Fixa middleware-ordning i `server.js` | Korrekt paywall/maintenance | Medel |
| **D** | Säkerhetshärdning (snabba fixar) | `revoked_at`, XSS, Google `aud`, CSRF | Medel |
| **E** | Bryt upp backend-monoliter | `family.js`, `auth.js`, `daily-logs.js` | Hög |
| **F** | Bryt upp frontend-monoliter + Tailwind-bygge | `dashboard.js`/`schedule.js`, CDN→build | Hög |
| **G** | Test- & CI-förstärkning | DB-integration, CI-gate, lint på `public/` | Medel |

**Rekommenderad ordning:** A → B → C → D → G(CI-delar) → E → F.
A–D är lågrisk "städa & härda" som ger snabb vinst och förenklar de tunga E/F-uppgifterna.

---

## Workstream A — Ta bort Stripe (→ Apple/Google IAP)

Stripe är inte monterat; detta är mest borttagning. Behåll RevenueCat/IAP orört.

- **A1 — Radera omonterade Stripe-routefiler.** Ta bort `src/routes/stripe-checkout.js`, `src/routes/stripe-webhook.js`, `src/routes/stripe-setup.js`, `src/routes/admin/setup-stripe.js`, `src/routes/upgrade-success.js` (verifiera först att inget `require`:ar dem — grep visar att de inte mountas). *Acceptans:* `rg -i "stripe-checkout|stripe-webhook|stripe-setup|setup-stripe|upgrade-success" src/` ger 0 träffar; lint+test grönt.
- **A2 — Radera Polsia-betalningsrester.** Ta bort `src/routes/payment.js` och `scripts/create-stripe-product.js`. *Acceptans:* inga `require('./payment')`-träffar.
- **A3 — Avlägsna `stripe`-beroendet.** Ta bort `stripe` ur `package.json` + `package-lock.json` (`npm uninstall stripe --legacy-peer-deps`). *Acceptans:* `rg "require\('stripe'\)" src/` = 0.
- **A4 — Byt namn på `STRIPE_COMPONENT_MAP`.** I `config/subscription-components.js` döp om till `COMPONENT_PRICE_MAP`, ta bort `stripe_price_id`-fält och `STRIPE_ENABLED`; uppdatera enda konsumenten `src/routes/subscription.js` (rad ~23, ~159). *Acceptans:* grep efter `STRIPE` i `src/` + `config/` = 0.
- **A5 — Städa Stripe-env & app_settings.** Ta bort `STRIPE_*` ur `.env.example`; ta bort `getStripePriceId` ur `db/app-settings.js` om oanvänt efter A1. Ta bort Stripe-kolumner via **ny migration** (`stripe_customer_id`, `stripe_subscription_id` på `family`) — *endast om* inget läser dem (grep först). *Acceptans:* dokumenterat i migration-kommentar.
- **A6 — Frontend: ta bort Stripe-UI.** I `public/admin/admin-subscription-settings.js`, `public/admin/index.html`, `public/css/platform-native.css` — ta bort Stripe-knappar/setup-UI; behåll RevenueCat/paket-UI. *Acceptans:* `rg -i stripe public/` = 0 (utom ev. historiska docs).
- **A7 — Uppdatera docs.** Markera Stripe som borttaget i `CLAUDE.md`, `README.md`, `docs/app-store-iap.md`; flytta Stripe-historik till `docs/ARKIVERAT-*`. *Acceptans:* `CLAUDE.md` nämner endast IAP/RevenueCat som aktiv betalväg.

---

## Workstream B — Röj dödkod & Polsia-legacy

- **B1 — Ta bort legacy `users`-tabell + Polsia core-migrationer** i `migrate.js` (rad ~79–106) om `parent`/`family` är kanon. Grep verifierar att `users` inte används i `src/`. *Acceptans:* migrate kör rent lokalt mot tom DB.
- **B2 — Fixa dubbelmonteringar:** `ratings.childRouter` (`index.js` rad 22 + 75) och `public-pages` (`index.js` rad 204 + `server.js` rad 195) — behåll en. *Acceptans:* en mount var; smoke-test av berörda routes.
- **B3 — Ta bort dubbel `optionalAuth`** i `server.js` (rad 78 + 157) — behåll den som krävs för `globalLimiter`-skip, dokumentera varför. *Acceptans:* auth-tester grönt.
- **B4 — Inventera & flagga övrig dödkod** (Polsia release-os scripts, oanvända lib-filer) i ett kort `docs/dead-code-inventory.md` — *radera inte* utan godkännande. *Acceptans:* dokument skapat.

---

## Workstream C — Middleware-ordning i `server.js`

- **C1 — Flytta `checkMaintenanceMode`** före `registerRoutes(app)`. *Acceptans:* nytt test som verifierar att API ger 503 i maintenance-läge.
- **C2 — Flytta/bekräfta `requireActiveSubscription`.** Antingen flytta före routes, eller — om paywall medvetet sker per-route via `requireComponent` — **ta bort den globala mounten** och dokumentera. (Föredra det senare: mindre risk, matchar nuvarande verklighet.) *Acceptans:* beslut dokumenterat; inga route-regressioner.
- **C3 — Lägg `asyncHandler` runt async-routes** som saknar felfångst — gör detta **per route-fil** som separata småuppgifter (C3a, C3b…), inte allt på en gång. *Acceptans:* per fil, inga ohanterade rejections; tester grönt.

---

## Workstream D — Säkerhetshärdning (snabba, avgränsade fixar)

- **D1 — `revoked_at IS NULL` i legacy-ägarskapskontroller.** En uppgift per fil: `children.js` (rad ~437, ~498), `daily-logs.js` (~44), `goals.js` (~99, 112, 145), `observations.js` (~26). Helst: ersätt med `authz.js`-helpers. *Acceptans:* nytt authz-test som verifierar att återkallad pedagog nekas.
- **D2 — Validera Google `aud`** mot `GOOGLE_WEB_CLIENT_ID` i `auth.js` (~1736). *Acceptans:* test med fel-aud → 401.
- **D3 — Escapa `childName`/`groupMeta.name`** i `public/js/onboarding.js` (rad 241, 468) via `escapeHtml`. *Acceptans:* xss-test utökat.
- **D4 — CSRF för `/messages/`** — ta bort undantaget i `csrf.js` (rad 74) eller kräv custom header. *Acceptans:* befintliga message-tester grönt + nytt CSRF-test.
- **D5 — Harmonisera `secure`-cookie** till `config.cookieSecure` (`auth.js:947`, `family.js:1911, 2177`). *Acceptans:* grep visar ingen rå `NODE_ENV==='production'` för cookies.

---

## Workstream E — Backend-monoliter (tung, sekvensera sist bland backend)

Mönster: **extrahera utan att ändra beteende**, en sammanhängande domän i taget, behåll publika paths.

- **E1 — `family.js` (2198 r) →** `src/routes/family/` med `index.js` (mount) + delfiler: `members.js`, `invites.js`, `pin.js`, `settings.js`. Följ befintligt mönster i `src/routes/schedules/`.
- **E2 — `auth.js` (1764 r) →** `src/routes/auth/` med `login.js`, `register.js`, `oauth-apple.js`, `oauth-google.js`, `child-login.js`, `refresh.js`, `email.js`.
- **E3 — `daily-logs.js` (1100 r) →** dela per router (`parent`, `child-self`, `items`, `logs`) och konsolidera ägarskapskontrollen till `authz.js` (knyter ihop med D1).
- **E4 — `account.js` (1007 r)** och **`surveys.js` (873 r)** → dela vid behov.

*Acceptans per uppgift:* identiska routes (verifiera med en route-dump före/efter), lint+test grönt, ingen diff i JSON-svar.

---

## Workstream F — Frontend-monoliter + Tailwind-bygge (tyngst)

- **F1 — Extrahera delad schemalogik:** skapa `public/js/schedule-core.js` med det som är gemensamt mellan `dashboard.js` och `schedule.js` (`DAYS`, `SECTIONS`, schemarendering, `updateBirthdayHidden`). Ladda den före båda. *Acceptans:* båda sidorna fungerar; SW-version bumpad.
- **F2 — Magra ur `dashboard.js`** (3760 r): flytta hub-/summary-/SSE-logik till redan befintliga `dashboard-*.js`-moduler tills kärnfilen < ~1500 r.
- **F3 — Magra ur `schedule.js`** och **`child-dashboard.js`** stegvis (en funktionsgrupp per uppgift).
- **F4 — Tailwind-byggsteg:** inför PostCSS + Tailwind CLI med `content`-purge, en delad `tailwind.config.js`, generera `public/css/tailwind.build.css`, byt CDN-`<script>` mot byggd CSS på alla ~38 sidor (en sidgrupp per uppgift). Lägg byggsteget i `package.json` + deploy. *Acceptans:* sidor ser identiska ut; offline-styling fungerar; ingen `cdn.tailwindcss.com` kvar.
- **F5 — Cache-versionsstädning:** centralisera `?v=`-strängar (ett bygg-/versionskonstant), synka `sw.js` `CACHE_NAME` med filheadern. *Acceptans:* en källa för version.

---

## Workstream G — Test & CI

- **G1 — Fixa CI:** lägg `--legacy-peer-deps` på `npm ci` i `.github/workflows/ci.yml`; ta bort redundant separat eslint-install. *Acceptans:* CI grön.
- **G2 — Gate deploy på CI:** lägg branch protection/`needs:` så `deploy.yml` kräver grön `ci.yml`. *Acceptans:* deploy triggas ej vid röd CI.
- **G3 — Riktig DB i CI:** lägg PostgreSQL-service + `npm run migrate` i CI; implementera `setupTestDb()` i `test/helpers/setup.js`. *Acceptans:* minst ett äkta integrationstest kör mot DB.
- **G4 — Route-integrationstester** för otäckta kärnflöden (onboarding, schedules, daily-log, iap-webhook) — en testfil per flöde. *Acceptans:* nya tester grönt.
- **G5 — Lint på `public/`** (separat eslint-config för browser-globals) — börja med `--max-warnings` högt och dra ner. *Acceptans:* `public/`-lint kör utan fel.

---

## Förslag på leverans till Composer 2.5

Kör **A → B → C → D + G1/G2** först (allt lågrisk-städning och härdning, snabb vinst), och ta **E och F** som separata, noggrant specade omgångar därefter. Varje enskild uppgift nedan (A1, A2, …) är storleksanpassad för en Composer-2.5-körning.

---

# Detaljerade uppgiftsspecar

> **Så här använder du detta:** kopiera en hel uppgiftsruta (t.ex. "A1") till Composer 2.5. Varje ruta är självständig. Radnummer är **ungefärliga** — Composer ska alltid `grep`/`rg` för att hitta exakt rad innan ändring (filerna kan ha glidit). Kör testkommandot efter varje uppgift och stanna vid rött.

## Gemensamt testkommando (kör efter varje uppgift)

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"   # Node 20
npm run lint
NODE_ENV=test DATABASE_URL="postgresql://localhost/mock_test" JWT_SECRET="test-secret-at-least-32-chars-long-xx" REQUIRE_EMAIL_VERIFICATION=false npm test
```

Om en uppgift rör klient-JS: bumpa även `CACHE_NAME` i `public/sw.js` och lägg en rad i `CLAUDE.md` under "Recent changes".

---

## Workstream A — Ta bort Stripe

### A1 — Radera omonterade Stripe-routefiler
- **Mål:** ta bort dödkod-routes för Stripe.
- **Verifiera först:** `rg -n "stripe-checkout|stripe-webhook|stripe-setup|setup-stripe|upgrade-success" src/ server.js` — bekräfta att ingen `require()`/`app.use()` refererar dem.
- **Radera:** `src/routes/stripe-checkout.js`, `src/routes/stripe-webhook.js`, `src/routes/stripe-setup.js`, `src/routes/admin/setup-stripe.js`, `src/routes/upgrade-success.js`.
- **Acceptans:** grep ovan ger 0 träffar; lint+test grönt.
- **Commit:** `chore: remove unmounted Stripe route files (dead code)`

### A2 — Radera Polsia-betalningsrester
- **Verifiera först:** `rg -n "require\('\./payment'\)|create-stripe-product" src/ server.js scripts/`.
- **Radera:** `src/routes/payment.js`, `scripts/create-stripe-product.js`.
- **Obs:** `src/routes/index.js` har egna inline-handlers för `/payment-success`, `/upgrade`, `/upgrade/success` som redirectar till `/settings#prenumeration` via `isBillingUiEnabled()` — **rör dem inte** i A2.
- **Acceptans:** inga kvarvarande referenser; lint+test grönt.
- **Commit:** `chore: remove legacy Polsia payment route + stripe product script`

### A3 — Avlägsna stripe-beroendet
- **Steg:** `npm uninstall stripe --legacy-peer-deps` (uppdaterar `package.json` + `package-lock.json`).
- **Verifiera:** `rg -n "require\('stripe'\)|from 'stripe'" src/` = 0.
- **Acceptans:** `npm ci --legacy-peer-deps` fungerar; lint+test grönt.
- **Commit:** `chore: drop unused stripe dependency`

### A4 — Byt namn på STRIPE_COMPONENT_MAP → COMPONENT_PRICE_MAP
- **Fil:** `config/subscription-components.js` — döp om exporten, ta bort fältet `stripe_price_id` ur varje komponent och ta bort `STRIPE_ENABLED`.
- **Konsument:** `src/routes/subscription.js` (~rad 23 import, ~rad 159 prisuppslag) — uppdatera namnet.
- **Verifiera:** `rg -n "STRIPE" src/ config/` = 0.
- **Acceptans:** prislogik i `/api/subscription` oförändrad (samma SEK-värden); lint+test grönt.
- **Commit:** `refactor: rename STRIPE_COMPONENT_MAP to COMPONENT_PRICE_MAP`

### A5 — Städa Stripe-env, app_settings & DB-kolumner
- **Steg 1:** ta bort alla `STRIPE_*`-rader ur `.env.example`.
- **Steg 2:** `rg -n "getStripePriceId|stripe_price_id" src/ db/` — om endast `db/app-settings.js` kvarstår och inget anropar den efter A1, ta bort `getStripePriceId`.
- **Steg 3 (villkorat):** `rg -n "stripe_customer_id|stripe_subscription_id" src/ db/ migrations/` — om inget läser dem, skapa **ny** migration `migrations/<timestamp>_drop_stripe_columns.js` som `DROP COLUMN IF EXISTS` på `family`. Annars hoppa över och notera i commit.
- **Acceptans:** `npm run migrate` kör rent mot lokal tom DB; lint+test grönt.
- **Commit:** `chore: remove Stripe env/app_settings + drop stripe columns`

### A6 — Frontend: ta bort Stripe-UI
- **Filer:** `public/admin/admin-subscription-settings.js`, `public/admin/index.html`, `public/css/platform-native.css`.
- **Steg:** ta bort Stripe-specifika knappar/setup-paneler/CSS; **behåll** RevenueCat/paket-UI och prenumerationsöversikt.
- **Verifiera:** `rg -in stripe public/` = 0 (docs undantagna).
- **Acceptans:** admin-prenumerationsvyn laddar utan JS-fel; bumpa `sw.js`.
- **Commit:** `refactor(admin): remove Stripe payment UI`

### A7 — Uppdatera dokumentation
- **Filer:** `CLAUDE.md`, `README.md`, `docs/app-store-iap.md`, ev. `docs/ARKIVERAT-*`.
- **Steg:** beskriv RevenueCat/IAP som enda aktiva betalväg; flytta Stripe-historik till arkiv-doc; lägg rad i `CLAUDE.md` "Recent changes".
- **Acceptans:** `CLAUDE.md` nämner inte Stripe som aktivt.
- **Commit:** `docs: mark Stripe removed, IAP as sole payment path`

---

## Workstream B — Dödkod & Polsia-legacy

### B1 — Ta bort legacy users-tabell + Polsia core-migrationer
- **Verifiera först:** `rg -n "\busers\b" src/ db/` — bekräfta att appen använder `parent`/`family`, inte `users`.
- **Fil:** `migrate.js` (~rad 79–106, "core tables"/Polsia).
- **Steg:** ta bort skapandet av `users` (behåll `schedule_date_exclusion` om den fortfarande används — grep).
- **Acceptans:** `npm run migrate` mot tom DB skapar schema utan `users`; lint+test grönt.
- **Commit:** `chore: drop legacy Polsia users table from migrate bootstrap`

### B2 — Fixa dubbelmonterade routers
- **Fil:** `src/routes/index.js` — `ratings.childRouter` mountas på `/api/me` rad ~22 och ~75; behåll **en**. `public-pages` mountas i `index.js` rad ~204 och `server.js` rad ~195; behåll **en** (föredra `server.js`-mounten som är sist i kedjan, eller dokumentera valet).
- **Acceptans:** berörda routes svarar som tidigare (smoke-testa `/api/me/...` + en publik sida); lint+test grönt.
- **Commit:** `refactor: remove duplicate router mounts (ratings, public-pages)`

### B3 — Ta bort dubbel optionalAuth
- **Fil:** `server.js` (~rad 78 och ~157).
- **Steg:** behåll den `optionalAuth` som krävs så `globalLimiter` kan skippa autentiserade (rad ~78); ta bort den andra. Lägg en kommentar om varför den första behövs.
- **Acceptans:** `test/auth.test.js` + authz-tester grönt.
- **Commit:** `refactor: drop redundant second optionalAuth pass`

### B4 — Inventera övrig dödkod (ingen radering)
- **Steg:** `rg`-svep efter oanvända lib-/script-filer (t.ex. `polsia-*`, oanvända `scripts/`); lista i ny `docs/dead-code-inventory.md` med "kandidat för borttagning" + bevis (0 referenser).
- **Acceptans:** dokument skapat; **inga** kodfiler raderade.
- **Commit:** `docs: add dead-code inventory (candidates only)`

---

## Workstream C — Middleware-ordning

### C1 — Flytta checkMaintenanceMode före routes
- **Fil:** `server.js` — flytta `app.use(checkMaintenanceMode)` (~rad 173) till **före** `registerRoutes(app)` (~rad 160), efter auth/rate-limit men före routes.
- **Acceptans:** nytt test `test/maintenance-order.test.js` som sätter `feature_flag.maintenance_mode` (mock-db) och verifierar 503 på en API-route + admin-bypass; lint+test grönt.
- **Commit:** `fix: run maintenance mode before routes`

### C2 — Bekräfta/ta bort global requireActiveSubscription
- **Fil:** `server.js` (~rad 179–192).
- **Beslut (föredraget):** ta bort den globala mounten eftersom paywall sker per-route via `require-component.js`; dokumentera i kodkommentar + `CLAUDE.md`. Alternativt flytta före `registerRoutes` om global paywall önskas.
- **Verifiera:** `rg -n "requireComponent|requireActiveSubscription" src/` för att bekräfta per-route-täckning.
- **Acceptans:** lifetime-free + aktiva familjer når skyddade routes; `test/package-access.test.js` grönt.
- **Commit:** `refactor: remove no-op global subscription paywall (per-route gating is canonical)`

### C3 — asyncHandler runt async-routes (per fil)
- **Fil per deluppgift** (C3a `family.js`, C3b `auth.js`, …): wrappa `async (req,res)=>{}`-handlers i `asyncHandler` (`src/middleware/asyncHandler.js`) eller säkerställ `try/catch → next(err)`.
- **Regel:** en route-fil per uppgift, ingen logikändring.
- **Acceptans:** inga ohanterade promise rejections; befintliga tester för filen grönt.
- **Commit:** `refactor(<fil>): wrap async handlers with asyncHandler`

---

## Workstream D — Säkerhetshärdning

### D1 — revoked_at IS NULL i ägarskapskontroller (per fil)
- **Filer/rader (verifiera med grep):** `src/routes/children.js` (~437, ~498), `src/routes/daily-logs.js` (~44), `src/routes/goals.js` (~99, ~112, ~145), `src/routes/observations.js` (~26).
- **Steg:** lägg `AND pc.revoked_at IS NULL` i `parent_child`-JOIN, eller byt till `authz.js`-helper (`getChildAccess`).
- **Acceptans:** nytt test som verifierar att återkallad pedagog (`revoked_at` satt) nekas läs/skriv; befintliga tester grönt.
- **Commit:** `fix(authz): exclude revoked parent_child links in <fil>`

### D2 — Validera Google aud
- **Fil:** `src/routes/auth.js` (~rad 1731–1747, Google Sign In).
- **Steg:** verifiera att `aud` i Google-token matchar `process.env.GOOGLE_WEB_CLIENT_ID` (byt helst `tokeninfo` mot `google-auth-library` `verifyIdToken`).
- **Acceptans:** nytt test — token med fel `aud` → 401; korrekt → ok.
- **Commit:** `fix(auth): validate Google ID token audience`

### D3 — Escapa childName i onboarding
- **Fil:** `public/js/onboarding.js` (~rad 241, ~468).
- **Steg:** kör `childName` och `groupMeta.name` genom `escapeHtml()` (`public/js/dom-utils.js`) innan `innerHTML`.
- **Acceptans:** utöka `test/xss.test.js`; bumpa `sw.js`.
- **Commit:** `fix(xss): escape childName/groupMeta.name in onboarding`

### D4 — CSRF för /messages/
- **Fil:** `src/middleware/csrf.js` (~rad 74, exempt-prefix).
- **Steg:** ta bort `/messages/`-undantaget (eller kräv `X-CSRF-Token`). Kontrollera att klienten skickar CSRF på `PUT /api/messages/:id/read`.
- **Acceptans:** `test/` för messages grönt + nytt CSRF-negativtest.
- **Commit:** `fix(csrf): enforce CSRF on /messages routes`

### D5 — Harmonisera secure-cookie
- **Filer:** `src/routes/auth.js` (~947), `src/routes/family.js` (~1911, ~2177).
- **Steg:** byt rå `NODE_ENV === 'production'` mot `config.cookieSecure`.
- **Acceptans:** `rg -n "secure:\s*process.env.NODE_ENV" src/` = 0; tester grönt.
- **Commit:** `refactor: use config.cookieSecure consistently`

---

## Workstream E — Backend-monoliter

> **Mönster för alla E-uppgifter:** skapa katalog enligt `src/routes/schedules/`-modellen, flytta route-grupper oförändrat, behåll publika paths via en `index.js` som `require`:ar delfilerna. Verifiera identiska routes före/efter med en route-dump.

### E1 — Dela family.js (2198 r)
- **Mål:** `src/routes/family/index.js` + `members.js`, `invites.js`, `pin.js`, `settings.js`.
- **Steg:** flytta endpoints per domän; `index.js` monterar och re-exporterar samma router. Uppdatera `src/routes/index.js`-import om sökväg ändras (helst behåll `require('./family')` → katalogens `index.js`).
- **Acceptans:** route-dump identisk; `test/family-*.test.js` grönt.
- **Commit:** `refactor(family): split family.js into src/routes/family/`

### E2 — Dela auth.js (1764 r)
- **Mål:** `src/routes/auth/index.js` + `login.js`, `register.js`, `oauth-apple.js`, `oauth-google.js`, `child-login.js`, `refresh.js`, `email.js`.
- **Acceptans:** `test/auth.test.js` + Apple/Google-tester grönt; refresh-flöde oförändrat.
- **Commit:** `refactor(auth): split auth.js into src/routes/auth/`

### E3 — Dela daily-logs.js (1100 r)
- **Mål:** dela per router (`parentRouter`, `childSelfRouter`, `itemRouter`, `logRouter`) i `src/routes/daily-logs/`; konsolidera ägarskapskontroll till `authz.js` (knyter ihop med D1).
- **Acceptans:** `test/daily-log-*.test.js` grönt; alla fyra routers exporteras som tidigare.
- **Commit:** `refactor(daily-logs): split into module + use authz helpers`

### E4 — Dela account.js (1007 r) & surveys.js (873 r)
- **Mål:** dela vid tydliga domängränser om värdefullt; annars hoppa över och dokumentera.
- **Acceptans:** route-dump identisk; berörda tester grönt.
- **Commit:** `refactor: split account.js / surveys.js`

---

## Workstream F — Frontend-monoliter + Tailwind

### F1 — Extrahera schedule-core.js
- **Mål:** `public/js/schedule-core.js` med gemensamt mellan `dashboard.js` och `schedule.js` (`DAYS`, `SECTIONS`, schemarendering, `updateBirthdayHidden`).
- **Steg:** flytta funktionerna, exponera via `window.ScheduleCore`; ladda `schedule-core.js` före båda i `dashboard.html` + `schedule.html`.
- **Acceptans:** manuell rök: dashboard + schema renderar identiskt; bumpa `sw.js`. Lägg ett snapshot-test i `test/` som verifierar att båda filerna refererar `ScheduleCore`.
- **Commit:** `refactor(frontend): extract shared schedule-core.js`

### F2 — Magra dashboard.js (per funktionsgrupp)
- **Mål:** flytta hub/summary/SSE-logik till befintliga `dashboard-*.js`-moduler; kärnfil < ~1500 r.
- **Regel:** en funktionsgrupp per uppgift (F2a, F2b…), ingen beteendeändring.
- **Acceptans:** dashboard fungerar; `test/meny-*`/`magic-*`-snapshots uppdaterade vid behov; bumpa `sw.js`.
- **Commit:** `refactor(dashboard): extract <grupp> into dashboard-<x>.js`

### F3 — Magra schedule.js & child-dashboard.js
- Samma mönster som F2, en funktionsgrupp per uppgift.
- **Commit:** `refactor(schedule|child-dashboard): extract <grupp>`

### F4 — Tailwind-byggsteg (ersätt CDN)
- **Steg:** lägg `tailwindcss` + `postcss` (devDep), `tailwind.config.js` med `content`-globs över `public/**/*.{html,js}`, byggскript `"css:build": "tailwindcss -i public/css/tw-input.css -o public/css/tailwind.build.css --minify"`; byt `<script src="cdn.tailwindcss.com">` mot `<link rel="stylesheet" href="/css/tailwind.build.css?v=…">` på sidorna (en sidgrupp per deluppgift F4a, F4b…). Lägg `css:build` i deploy + `npm run build`.
- **Acceptans:** sidorna ser identiska ut (jämför mot CDN-version); `rg -n "cdn.tailwindcss.com" public/` = 0 när klart; offline-styling fungerar.
- **Commit:** `build(css): replace Tailwind CDN with built stylesheet (<grupp>)`

### F5 — Cache-versionsstädning
- **Steg:** inför en version-konstant (t.ex. via build-stamp), synka `public/sw.js` `CACHE_NAME` med filheaderns version, harmonisera `?v=`-strängar.
- **Acceptans:** en källa för version; SW-header = `CACHE_NAME`.
- **Commit:** `chore(sw): unify cache version source`

---

## Workstream G — Test & CI

### G1 — Fixa CI npm ci
- **Fil:** `.github/workflows/ci.yml`.
- **Steg:** byt `npm ci` → `npm ci --legacy-peer-deps`; ta bort separat `npm install eslint` (eslint finns i lockfilen).
- **Acceptans:** CI grön på en testbranch.
- **Commit:** `ci: install with --legacy-peer-deps, drop redundant eslint step`

### G2 — Gate deploy på CI
- **Fil:** `.github/workflows/deploy.yml` (+ ev. branch protection).
- **Steg:** lägg `needs:`/`workflow_run`-beroende så deploy bara körs efter grön `ci.yml` på `main`.
- **Acceptans:** deploy triggas inte vid röd CI.
- **Commit:** `ci: require green CI before VPS deploy`

### G3 — Riktig DB i CI + setupTestDb()
- **Filer:** `.github/workflows/ci.yml` (PostgreSQL-service + `npm run migrate`), `test/helpers/setup.js` (implementera `setupTestDb()`).
- **Acceptans:** minst ett äkta DB-integrationstest kör i CI.
- **Commit:** `test: add postgres service + setupTestDb for integration tests`

### G4 — Route-integrationstester
- **Mål:** en testfil per kärnflöde — onboarding, schedules, daily-log, `iap`-webhook (signaturverifiering).
- **Acceptans:** nya tester grönt mot test-DB (G3).
- **Commit:** `test: add route integration tests for <flöde>`

### G5 — Lint på public/
- **Filer:** ny `eslint.config` för `public/**` med browser-globals; `package.json`-script `lint:public`.
- **Steg:** börja med högt `--max-warnings`, dra ner stegvis.
- **Acceptans:** `npm run lint:public` kör utan fel.
- **Commit:** `ci: add eslint coverage for public/ client JS`

---

## Spårningstabell (bocka av vid utförande)

| Uppgift | Status | PR/Commit |
|---------|--------|-----------|
| A1–A7 | ☐ | |
| B1–B4 | ☐ | |
| C1–C3 | ☐ | |
| D1–D5 | ☐ | |
| E1–E4 | ☐ | |
| F1–F5 | ☐ | |
| G1–G5 | ☐ | |
