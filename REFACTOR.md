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

Kör **A → B → C → D + G1/G2** först (allt lågrisk-städning och härdning, snabb vinst), och ta **E och F** som separata, noggrant specade omgångar därefter. Varje enskild uppgift ovan (A1, A2, …) är redan storleksanpassad för en Composer-2.5-körning.

### Nästa steg

1. Skriv ut detaljerade per-uppgifts-specar (fillista, exakta rader, acceptanskriterier, testkommando) för **Workstream A** så de kan klistras rakt in i Composer 2.5, **eller**
2. Justera prioritering/omfattning först (t.ex. hoppa över Tailwind-bygget, eller ta E/F senare).
