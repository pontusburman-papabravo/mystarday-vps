# Refaktoreringsplan — Min Stjärndag (v4.2 master plan)

> **Status:** Låst master-plan v4.2 (ingen kod ändrad ännu).
> **Syfte:** Renodla och modularisera hela kodbasen. Stripe avvecklas till förmån för Apple/Google IAP (RevenueCat).
> **Mål:** Exekverbar plan med tydliga go/no-go-gates, bättre riskisolering och färre onödiga blockerare.

**Patch i v4.2 (vs v4.1) — sista hålen före exekvering:**
- **G4b:** revoked-fallet är nu **obligatoriskt** (giltig access + nekad `revoked_at`-access), inte "helst" — D1-serien vilar på det.
- **D2:** multi-audience normativt (web/android/ios client-ID:n via `verifyIdToken`, tomma filtreras) + test för web- och native-audience, så mobilinloggning inte havererar vid release.
- **B1:** explicit FK/constraint/trigger/seed-förkontroll (`information_schema`/`pg_catalog`), inte bara grep; acceptans utökad till tom + dev-lik + fresh-reset-DB.
- **E0:** route-snapshotens innehåll spikat (metod, path/prefix, ägande routerfil, middleware-kedja, global middleware-order för auth/maintenance/paywall/CSRF).
- **G4c:** explicit maintenance-policy för `/api/iap`-webhooken (default: undantas från blockering).
- **A6:** skarpare smoke-acceptans (paket/IAP-UI rätt, inga brutna billing-listeners, SW-bump).
- **G3b:** app-export (`app.js` + `server.js`) tillåten vid behov så test/route-dump kan köras utan att binda port.

**Putsningar i v4.1 (vs v4):**
- **G3c omdefinierad** från "första riktiga DB-integrationstest" till **schema/migrations-gate** (migrate + up/down-rollback mot tom + dev-liknande DB) inför A5c/B1 — rollen som "första integrationstest" fylls redan av G4a/G4b.
- **E0 (baseline route-inventory/route-dump)** tillagd som obligatorisk förberedelse före backend-split, även inskriven i **Gate G**.
- **C2b-beslutet normativt:** default = ta bort den globala mounten; global gate är ett undantag, inte ett jämställt alternativ.
- **G2 framdragen i "första uppgifter"** (direkt efter G1) om deploy-loopen är aktiv; formellt kvar i Fas 10.
- **"Fas 0-golv" → `Gate A`** i spårningstabellen och `E1`-beroendet gjort explicit.

**Viktiga korrigeringar i v4 (vs v3):**
- **Ingen cykel** mellan `C2b` och `G4d`: `G4d` är ett **kontraktstest som skrivs före** `C2b` (`G4d → C2a + G3b`; `C2b → C2a + G4d`).
- **A1–A3 frikopplade från `C2b`** — verifierad dödkod ska inte ligga på paywall-policyns kritiska väg.
- **A7 (docs) flyttad efter A6 (admin-UI)** så docs speglar slutläget.
- **D4 (CSRF `/messages/`) uppdragen** till en tidig säkerhetsfas (Fas 3) med eget test (`G4e`).
- **D1c (daily-logs authz) ligger i Fas 2** (med övriga D1) → `E3c` blir ofta en **skipbar/N/A** uppgift.
- **Risknivåer kalibrerade** så att "hög" betyder något: bara `A5c`, `B1`, `C2b`, `E2`, `F4` sticker ut som verkligt tunga.

---

## Bakgrund

- **Stripe är redan i praktiken vilande/dödkod.** `stripe-checkout.js`, `stripe-webhook.js`, `stripe-setup.js`, `admin/setup-stripe.js` och `payment.js` är inte monterade någonstans.
- **RevenueCat (`src/routes/iap.js`) är den aktiva betalvägen** (monterad på `/api/iap`) och hanterar webhook-body korrekt med `express.raw` på route-nivå.
- Det gör Stripe-borttagningen **lågrisk** (utom A5c DB-dropp och A6 admin-UI — se per-uppgift-risk).

---

## Designprinciper (gäller varje uppgift)

1. **En uppgift = en avgränsad ändring** med explicit fillista och acceptanskriterier.
2. **Kör alltid efter varje uppgift:** `npm run lint` + `npm test` (Node 20). Stanna om något går rött.
3. **Ingen beteendeförändring** om inte uppgiften uttryckligen säger det (rena flyttar/omdöpningar).
4. **Bryt aldrig publika API-kontrakt** (route-paths, JSON-fält) utan att det står i uppgiften.
5. **Respektera large-file-reglerna:** grep + chunk-läs, max 1 stor fil/tur.
6. **Uppdatera `CLAUDE.md` "Recent changes"** + bumpa `public/sw.js`-versionen när klient-JS ändras.
7. **Varje uppgift = egen commit/PR** med tydlig titel.
8. **E-grundregel (gäller hela Workstream E):** en uppgift får inte både flytta routes mellan filer **och** ändra authz/query-logik — dela i separata commits/PR:er.

---

## Metadata-förklaring (gäller alla uppgiftsspecar)

- **Risk:** `låg` / `låg/medel` / `medel` / `medel/hög` / `hög` / `mycket hög` — regressionsrisk/blast radius.
- **Beror på:** uppgifter som måste vara gröna först (blockerare). `—` = ingen.
- **Utförare:** `Composer 2.5` (mekanisk, väl avgränsad) eller `Manuell review` (Claude Sonnet / människa pga blast radius eller designbeslut).

---

## Workstreams (översikt)

| ID | Workstream | Mål | Risk |
|----|-----------|-----|------|
| **A** | Ta bort Stripe / legacy-betalning | Renodla till Apple/Google IAP (RevenueCat) | Låg → Hög (A5c) |
| **B** | Röj dödkod & legacy (Polsia) | Mindre yta, mindre förvirring | Medel → Hög (B1) |
| **C** | Fixa middleware-ordning i `server.js` | Korrekt paywall/maintenance | Medel → Hög (C2b) |
| **D** | Säkerhetshärdning (snabba fixar) | `revoked_at`, XSS, Google `aud`, CSRF | Medel, hög prioritet |
| **E** | Bryt upp backend-monoliter | `daily-logs.js`, `family.js`, `auth.js` | Hög → Mycket hög (E2) |
| **F** | Bryt upp frontend-monoliter + Tailwind-bygge | `dashboard.js`/`schedule.js`, CDN→build | Hög → Mycket hög (F4) |
| **G** | Test- & CI-förstärkning | DB-integration, CI-gate, lint på `public/` | Låg/Medel, hög hävstång |

---

## Fasindelning (v4)

| Fas | Innehåll | Syfte |
|-----|----------|-------|
| **Fas 0** | G1 → G3a → G3b → G4a → G4b → B2 → B3 → C1 → C2a → G4c | CI/test-DB + request-pipeline-bas |
| **Fas 1** | A1 → A2 → A3 → A5a | Lågrisk Stripe-/legacy-rensning (ej aktiv betalväg) |
| **Fas 2** | D1a → D1b → D1c → D1d → D1e → D2 → D5 | Authz-härdning + Google auth + cookie-konsistens |
| **Fas 3** | G4e → D4 | Tidig säkerhetsfas för messages/CSRF |
| **Fas 4** | G4d → C2b | Paywall-policy och subscription-gating |
| **Fas 5** | A4 → A5b → A6 → A7 | Levande subscription-/billing-kod + admin-UI (ej schema) |
| **Fas 6** | G3c → A5c → B1 | Destruktiv schemafas (reversibilitet krävs) |
| **Fas 7** | E3a → E3b → E3c → E4 → E1 → E2 | Backend-monoliter |
| **Fas 8** | F1 → F2/F3 | Frontend-modularisering (utan Tailwind-bygget) |
| **Fas 9** | F4a → F4b → F4c → F5 | Tailwind build pipeline + cache |
| **Fas 10** | G2 → B4 → D3 → G5 | Övrigt CI/housekeeping (låg störning) |

> **Not om G2:** `G2` (gate deploy på grön CI) ligger formellt i Fas 10 eftersom den inte blockerar något. **Om ni har en aktiv deploy-loop, kör den direkt efter `G1`** — den minskar risken att någon deployar mitt i ett halvfärdigt refaktorsteg och rör ingen appkod.
> **Not om D3:** `D3` (onboarding-XSS) är lågrisk och kan flyttas upp till Fas 3 om ni vill samla alla säkerhetsfixar i ett fönster.

---

# Detaljerade uppgiftsspecar

> **Så här använder du detta:** kopiera en hel uppgiftsruta (t.ex. "A1") till Composer 2.5 (eller en människa om märkt **Manuell review**). Varje ruta är självständig. Radnummer är **ungefärliga** — kör alltid `grep`/`rg` för att hitta exakt rad innan ändring. Kör testkommandot efter varje uppgift och stanna vid rött.

## Gemensamt testkommando (kör efter varje uppgift)

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"   # Node 20
npm run lint
NODE_ENV=test DATABASE_URL="postgresql://localhost/mock_test" JWT_SECRET="test-secret-at-least-32-chars-long-xx" REQUIRE_EMAIL_VERIFICATION=false npm test
```

Om en uppgift rör klient-JS: bumpa även `CACHE_NAME` i `public/sw.js` och lägg en rad i `CLAUDE.md` under "Recent changes".

---

## Fas 0 — Skyddsnät + request-pipeline-bas

Kör i ordning: **G1 → G3a → G3b → G4a → G4b → B2 → B3 → C1 → C2a → G4c**.

### G1 — Fixa CI npm ci
- **Risk:** låg · **Beror på:** — · **Utförare:** Composer 2.5
- **Fil:** `.github/workflows/ci.yml`.
- **Steg:** byt `npm ci` → `npm ci --legacy-peer-deps`; ta bort separat `npm install --no-save eslint@^9.0.0` (verifiera först att eslint finns i lockfilen; om inte, behåll men flagga).
- **Acceptans:** CI grön på en testbranch.
- **Commit:** `ci: install with --legacy-peer-deps, drop redundant eslint step`

### G3a — PostgreSQL-service + migrate i CI
- **Risk:** medel · **Beror på:** G1 · **Utförare:** Composer 2.5
- **Fil:** `.github/workflows/ci.yml`.
- **Steg:** lägg `services: postgres:` (Postgres 16) med healthcheck; sätt `DATABASE_URL` mot tjänsten; kör `npm run migrate` före `npm test`. Behåll mock-DB-värdet för mock-tester tills riktiga DB-tester finns (G4a/G4b via `setupTestDb()`).
- **Acceptans:** `npm run migrate` grönt mot CI-Postgres; befintliga tester gröna.
- **Commit:** `ci: add postgres service + run migrate in CI`

### G3b — Implementera setupTestDb()
- **Risk:** medel · **Beror på:** G3a · **Utförare:** Composer 2.5
- **Fil:** `test/helpers/setup.js` (idag endast `injectMockDb`, `makeFakeRes`, `runMiddleware` — `setupTestDb()` saknas).
- **Steg:** lägg `setupTestDb()` som ansluter mot riktig `DATABASE_URL`, kör migrering/truncation, returnerar städ-funktion med stabil cleanup. Bryt inte `injectMockDb`-användarna.
- **App-export (vid behov):** om integrationstester eller route-dump (E0) kräver det, exportera Express-appen separat från server-start (t.ex. `app.js` + `server.js`) så att test/introspektion kan köras **utan att binda port**. Gör detta som ren flytt utan beteendeändring.
- **Acceptans:** en triviell `SELECT 1`-integrationstest kan använda `setupTestDb()` lokalt + i CI.
- **Commit:** `test: add setupTestDb() helper for real-DB integration tests`

### G4a — Integrationstest auth/login eller session-refresh
- **Risk:** medel · **Beror på:** G3b · **Utförare:** Composer 2.5
- **Mål:** äkta integrationstest för auth/login **eller** session-refresh.
- **Skyddar:** B3, C1, D2 och senare auth-split (E2).
- **Acceptans:** grönt mot test-DB.
- **Commit:** `test: add auth/session integration test`

### G4b — Integrationstest child-access / daily-log
- **Risk:** medel · **Beror på:** G3b · **Utförare:** Composer 2.5
- **Mål:** integrationstest för ett child-access-/daily-log-flöde mot riktig test-DB.
- **Måste täcka minst två fall (obligatoriskt, inte "helst"):**
  1. parent med giltig access får 200/korrekt payload,
  2. parent vars `parent_child.revoked_at IS NOT NULL` nekas enligt nuvarande kontrakt (403/404 beroende på befintligt beteende).
- **Skyddar:** B2, C1, D1a–D1e, och E3 — hela D1-serien förutsätter att revoked-fallet är ett förstaklass-testfall här.
- **Acceptans:** båda fallen gröna mot test-DB.
- **Commit:** `test: add child-access/daily-log integration test (incl. revoked case)`

### B2 — Fixa dubbelmonterade routers
- **Risk:** medel · **Beror på:** G4a, G4b · **Utförare:** Composer 2.5
- **Fil:** `src/routes/index.js` — `ratings.childRouter` mountas på `/api/me` rad ~22 och ~75; behåll **en**. `public-pages` mountas i `index.js` rad ~204 och `server.js` rad ~195; behåll **en** (föredra `server.js`-mounten, eller dokumentera valet).
- **Acceptans:** berörda routes svarar som tidigare (smoke `/api/me/...` + en publik sida); lint+test grönt.
- **Commit:** `refactor: remove duplicate router mounts (ratings, public-pages)`

### B3 — Ta bort dubbel optionalAuth
- **Risk:** medel · **Beror på:** G4a · **Utförare:** Composer 2.5
- **Fil:** `server.js` — `optionalAuth` på **rad ~78** (krävs så `globalLimiter` kan skippa autentiserade) och igen på **rad ~157** (`app.use('/api', restoreParentSession, optionalAuth, …)`).
- **Steg:** verifiera vilken som behövs och ta bort den redundanta; kommentera varför den kvarvarande behövs.
- **Acceptans:** integrationstest verifierar (1) autentiserad, (2) oautentiserad, (3) limiter-skip för auth; `test/auth.test.js` + authz-tester grönt.
- **Commit:** `refactor: drop redundant second optionalAuth pass`

### C1 — Flytta checkMaintenanceMode före routes
- **Risk:** medel · **Beror på:** G4a, G4b · **Utförare:** Composer 2.5
- **Fil:** `server.js` — `checkMaintenanceMode` ligger idag på **~rad 173**, dvs **efter** `registerRoutes(app)` på **~rad 160** (bug). Flytta `app.use(checkMaintenanceMode)` **före** `registerRoutes(app)`, efter auth/rate-limit men före routes.
- **Acceptans:** se G4c-testet nedan; lint+test grönt.
- **Commit:** `fix: run maintenance mode before routes`

### C2a — Inventera faktisk paywall-modell (ingen kodändring)
- **Risk:** låg · **Beror på:** — · **Utförare:** Composer 2.5
- **Steg:** `rg -n "requireComponent" src/` (kanonisk paywall = `src/middleware/require-component.js`) och `rg -n "requireActiveSubscription" src/ server.js` (`src/middleware/subscription.js`). Producera `docs/paywall-inventory.md`: vilka routes som faktiskt är paywallade, vilka som **borde** vara det.
- **Obs:** global `requireActiveSubscription`-mount i `server.js` (~rad 178–191) ligger **efter** `registerRoutes` (~160) → i praktiken **no-op**. Bekräfta detta.
- **Acceptans:** `docs/paywall-inventory.md` skapad; inga kodändringar.
- **Commit:** `docs: inventory of actual per-route paywall coverage`

### G4c — Maintenance + middleware-order-test
- **Risk:** medel · **Beror på:** C1, G3b · **Utförare:** Composer 2.5
- **Mål:** regressionstest `test/maintenance-order.test.js` som verifierar **fyra** fall efter C1:
  1. vanlig API-route ger 503 i maintenance,
  2. admin-bypass fungerar,
  3. health endpoint påverkas enligt önskat beteende,
  4. webhook-route (`/api/iap`-RevenueCat) påverkas enligt önskat beteende.
- **Beslut (dokumentera explicit):** under maintenance ska RevenueCat-webhooken `/api/iap` **undantas från maintenance-blockering** (default-rekommendation inför skarp prenumerationslansering — en entitlement/betal-webhook är dyr att råka blockera och kan tappa prenumerationshändelser). Om ni medvetet vill blockera den, skriv ner skälet. `health` + `admin` enligt plan.
- **Acceptans:** alla fyra fall gröna; `/api/iap`-policyn dokumenterad i kodkommentar + `CLAUDE.md`.
- **Commit:** `test: add maintenance/middleware-order regression test`

---

## Fas 1 — Lågrisk Stripe-/legacy-rensning

Kör i ordning: **A1 → A2 → A3 → A5a**. (A1–A3 beror **bara** på **Gate A** (Fas 0-golvet), **inte** på C2b.)

### A1 — Radera omonterade Stripe-routefiler
- **Risk:** låg · **Beror på:** Gate A (Fas 0-golv) · **Utförare:** Composer 2.5
- **Verifiera först:** `rg -n "stripe-checkout|stripe-webhook|stripe-setup|setup-stripe|upgrade-success" src/ server.js scripts/ docs/`.
- **Radera:** `src/routes/stripe-checkout.js`, `src/routes/stripe-webhook.js`, `src/routes/stripe-setup.js`, `src/routes/admin/setup-stripe.js`, `src/routes/upgrade-success.js`.
- **Acceptans:** grep ovan ger 0 träffar; lint+test grönt.
- **Commit:** `chore: remove unmounted Stripe route files (dead code)`

### A2 — Radera Polsia-betalningsrester
- **Risk:** låg · **Beror på:** A1 · **Utförare:** Composer 2.5
- **Verifiera först:** `rg -n "require\('\./payment'\)|create-stripe-product" src/ server.js scripts/`.
- **Radera:** `src/routes/payment.js`, `scripts/create-stripe-product.js`.
- **Obs:** `src/routes/index.js` har inline-handlers för `/payment-success`, `/upgrade`, `/upgrade/success` (redirect via `isBillingUiEnabled()`) — **rör dem inte**.
- **Acceptans:** inga kvarvarande referenser; lint+test grönt.
- **Commit:** `chore: remove legacy Polsia payment route + stripe product script`

### A3 — Avlägsna stripe-beroendet
- **Risk:** låg/medel · **Beror på:** A1, A2 · **Utförare:** Composer 2.5
- **Steg:** `npm uninstall stripe --legacy-peer-deps`.
- **Verifiera:** `rg -n "require\('stripe'\)|from 'stripe'" src/` = 0; `npm ls stripe` tomt; `rg -in "stripe" docs/ .github/` ger inga CLI/webhook-secret-referenser.
- **Acceptans:** `npm ci --legacy-peer-deps` fungerar; lint+test grönt.
- **Commit:** `chore: drop unused stripe dependency`

### A5a — Stripe-env-rensning
- **Risk:** låg · **Beror på:** A1 · **Utförare:** Composer 2.5
- **Steg:** ta bort alla `STRIPE_*`-rader ur `.env.example`. Ingen kod, ingen DB.
- **Acceptans:** `rg -n "STRIPE" .env.example` = 0; lint+test grönt.
- **Commit:** `chore: remove Stripe env vars from .env.example`

---

## Fas 2 — Authz-härdning + Google auth + cookie-konsistens

Kör i ordning: **D1a → D1b → D1c → D1d → D1e → D2 → D5**. (D1c ligger här så `daily-logs` splittas **efter** att authz är centraliserad.)

### D1a — Authz-helper först
- **Risk:** medel · **Beror på:** G4b · **Utförare:** Composer 2.5
- **Fil:** `src/middleware/authz.js`.
- **Steg:** inför/komplettera helper (`getChildAccess` el. motsv.) som **alltid** inkluderar `AND pc.revoked_at IS NULL` i `parent_child`-JOIN. Ingen call-site ändras ännu.
- **Acceptans:** authz-test verifierar att helpern nekar återkallad (`revoked_at` satt) access.
- **Commit:** `feat(authz): add revoked-aware getChildAccess helper`

### D1b — children.js → authz-helper
- **Risk:** medel · **Beror på:** D1a · **Utförare:** Composer 2.5
- **Fil/rader (grep):** `src/routes/children.js` (~437, ~498).
- **Acceptans:** revoked-test grönt; befintliga tester grönt.
- **Commit:** `fix(authz): use revoked-aware access check in children.js`

### D1c — daily-logs.js → authz-helper
- **Risk:** medel · **Beror på:** D1a · **Utförare:** Composer 2.5
- **Fil/rader (grep):** `src/routes/daily-logs.js` (~44).
- **Steg:** ersätt rå `parent_child`-JOIN med helpern. Endast authz, ingen route-flytt. **Detta gör senare `E3c` ofta skipbar.**
- **Acceptans:** `test/daily-log-*.test.js` + revoked-test grönt.
- **Commit:** `fix(authz): use revoked-aware access check in daily-logs.js`

### D1d — goals.js → authz-helper
- **Risk:** medel · **Beror på:** D1a · **Utförare:** Composer 2.5
- **Fil/rader (grep):** `src/routes/goals.js` (~99, ~112, ~145).
- **Acceptans:** revoked-test grönt; befintliga tester grönt.
- **Commit:** `fix(authz): use revoked-aware access check in goals.js`

### D1e — observations.js → authz-helper
- **Risk:** medel · **Beror på:** D1a · **Utförare:** Composer 2.5
- **Fil/rader (grep):** `src/routes/observations.js` (~26).
- **Acceptans:** revoked-test grönt; befintliga tester grönt.
- **Commit:** `fix(authz): use revoked-aware access check in observations.js`

### D2 — Validera Google aud
- **Risk:** medel/hög · **Beror på:** G4a · **Utförare:** Composer 2.5
- **Fil:** `src/routes/auth.js` (~rad 1731–1747, Google Sign In).
- **Steg:** byt `tokeninfo` mot `google-auth-library` `verifyIdToken`. **`audience` ska (normativt) vara en lista av flera tillåtna client-ID:n** — annars riskeras login-haveri på mobil vid release:
  ```js
  const { OAuth2Client } = require('google-auth-library');
  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: [
      process.env.GOOGLE_WEB_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean), // tomma env-vars filtreras bort
  });
  ```
- **Acceptans:** test måste täcka: (1) fel audience → 401, (2) korrekt web audience → ok, (3) korrekt native/mobile audience → ok (om appen använder det flödet).
- **Commit:** `fix(auth): validate Google ID token audience (multi-client)`

### D5 — Harmonisera secure-cookie
- **Risk:** låg/medel · **Beror på:** — · **Utförare:** Composer 2.5
- **Filer:** `src/routes/auth.js` (~947), `src/routes/family.js` (~1911, ~2177).
- **Steg:** byt rå `NODE_ENV === 'production'` mot `config.cookieSecure`.
- **Acceptans:** `rg -n "secure:\s*process.env.NODE_ENV" src/` = 0; tester grönt.
- **Commit:** `refactor: use config.cookieSecure consistently`

---

## Fas 3 — Tidig säkerhetsfas för messages/CSRF

Kör i ordning: **G4e → D4**.

### G4e — Messages read/update integrationstest (inkl. CSRF-negativfall)
- **Risk:** medel · **Beror på:** G3b · **Utförare:** Composer 2.5
- **Mål:** integrationstest för hela `PUT /api/messages/:id/read`-flödet, inkl. CSRF-negativfall, och dokumentera hur klienten skickar token idag.
- **Acceptans:** testet grönt; klientens token-flöde dokumenterat.
- **Commit:** `test: add messages read/CSRF integration test`

### D4 — CSRF för /messages/
- **Risk:** hög · **Beror på:** G4e · **Utförare:** **Manuell review**
- **Fil:** `src/middleware/csrf.js` (~rad 74, exempt-prefix).
- **Steg:** ta bort `/messages/`-undantaget (eller kräv `X-CSRF-Token`). Kontrollera att klienten skickar CSRF.
- **Go/no-go:** om klienten **inte** skickar token korrekt idag → **stanna** och lös klient/server-kontraktet innan vidare refaktorering.
- **Acceptans:** `test/` för messages grönt + nytt CSRF-negativtest.
- **Commit:** `fix(csrf): enforce CSRF on /messages routes`

---

## Fas 4 — Paywall-policy och subscription-gating

Kör i ordning: **G4d → C2b**. Acykliskt: C2a inventerar, G4d uttrycker målmodell, C2b implementerar.

### G4d — Paywall-kontraktstest (målmodell, skrivs först)
- **Risk:** medel · **Beror på:** C2a, G3b · **Utförare:** Composer 2.5
- **Mål:** ett `package-access`-test som beskriver den **beslutade** paywall-modellen. Får vara **rött** innan C2b.
- **Täck minst:** aktiv familj, lifetime/free om relevant, oåtkommen komponent.
- **Acceptans:** testet finns och uttrycker målmodellen.
- **Commit:** `test: add paywall model contract test (target model)`

### C2b — Ta bort/flytta global requireActiveSubscription-mount
- **Risk:** hög · **Beror på:** C2a, G4d · **Utförare:** **Manuell review**
- **Fil:** `server.js` (~rad 178–192).
- **Beslutsregel (normativ):** **default = ta bort den globala mounten** — per-route gating via `require-component.js` är **kanonisk** modell. Global `requireActiveSubscription` får **endast** behållas/flyttas (före `registerRoutes`) om C2a-inventeringen visar en medveten uppsättning skyddade routes som inte rimligen kan uttryckas per-route. Global gate är alltså ett **undantag**, inte ett jämställt alternativ — två parallella modeller får inte leva kvar.
- **Acceptans:** `G4d` blir grönt; lifetime-free + aktiva familjer når skyddade routes; `test/package-access.test.js` grönt.
- **Commit:** `refactor: remove no-op global subscription paywall (per-route gating is canonical)`

---

## Fas 5 — Levande subscription-/billing-kod + admin-UI (ej schema)

Kör i ordning: **A4 → A5b → A6 → A7**. (Dessa rör **aktiv** subscription-domän → efter paywall-beslutet i Fas 4.)

### A4 — Byt namn på STRIPE_COMPONENT_MAP → COMPONENT_PRICE_MAP
- **Risk:** medel · **Beror på:** C2b, A3 · **Utförare:** Composer 2.5
- **Fil:** `config/subscription-components.js` — döp om exporten, ta bort `stripe_price_id`-fältet och `STRIPE_ENABLED`.
- **Konsument:** `src/routes/subscription.js` (~rad 23 import, ~rad 159 prisuppslag).
- **Verifiera:** `rg -n "STRIPE" src/ config/` = 0.
- **Acceptans:** prislogik i `/api/subscription` oförändrad (samma SEK-värden); lint+test grönt.
- **Commit:** `refactor: rename STRIPE_COMPONENT_MAP to COMPONENT_PRICE_MAP`

### A5b — app_settings-rensning (getStripePriceId)
- **Risk:** medel · **Beror på:** A4 · **Utförare:** Composer 2.5
- **Steg:** `rg -n "getStripePriceId|stripe_price_id" src/ db/` — om endast `db/app-settings.js` kvarstår och inget anropar efter A1/A4, ta bort `getStripePriceId`.
- **Acceptans:** grep = 0 utanför ev. historik; lint+test grönt.
- **Commit:** `chore: remove dead getStripePriceId from app-settings`

### A6 — Frontend: ta bort Stripe-UI
- **Risk:** medel/hög · **Beror på:** A4, A5b · **Utförare:** **Manuell review**
- **Filer:** `public/admin/admin-subscription-settings.js`, `public/admin/index.html`, `public/css/platform-native.css`.
- **Steg:** ta bort Stripe-knappar/setup-paneler/CSS; **behåll** RevenueCat/paket-UI. Var vaksam på delade conditionals, event listeners och CSS.
- **Verifiera:** `rg -in stripe public/` = 0 (docs undantagna); grep efter orefererade funktioner.
- **Acceptans (smoke-mål):**
  - admin-prenumerationssidan laddar utan JS-fel,
  - visar nuvarande paket-/IAP-relaterad UI korrekt,
  - inga brutna event listeners i billing/settings-panelen,
  - `rg -in stripe public/` = 0,
  - service worker-version (`public/sw.js`) bumpad.
- **Commit:** `refactor(admin): remove Stripe payment UI`

### A7 — Uppdatera dokumentation
- **Risk:** låg · **Beror på:** A6 · **Utförare:** Composer 2.5
- **Filer:** `CLAUDE.md`, `README.md`, `docs/app-store-iap.md`, ev. `docs/ARKIVERAT-*`.
- **Steg:** beskriv RevenueCat/IAP som enda aktiva betalväg; flytta Stripe-historik till arkiv-doc; lägg rad i `CLAUDE.md` "Recent changes". Docs ska spegla **slutläget** (efter A6).
- **Acceptans:** `CLAUDE.md` nämner inte Stripe som aktivt.
- **Commit:** `docs: mark Stripe removed, IAP as sole payment path`

---

## Fas 6 — Destruktiv schemafas (reversibilitet krävs)

Kör i ordning: **G3c → A5c → B1**. Gate F gäller hela fasen (se nedan).

### G3c — Schema/migration-gate inför destruktiva ändringar
- **Risk:** medel · **Beror på:** G3b · **Utförare:** Composer 2.5
- **Obs:** rollen "första riktiga DB-integrationstest" fylls redan av `G4a`/`G4b` (de kör mot `setupTestDb()`). G3c är därför **inte** ett nytt generellt integrationstest, utan en **migrations-gate** specifikt för A5c/B1.
- **Mål:** verifiera att `npm run migrate` (inkl. up/down-rollback) fungerar mot (1) **tom DB** och (2) **dev-liknande DB**, som förberedelse för de destruktiva migrationerna.
- **Acceptans:** migrate + rollback grönt mot båda DB-lägena i CI.
- **Obs:** **blockerar A5c och B1.**
- **Commit:** `test: add migration/rollback gate for destructive schema phase`

### A5c — DB-migration: droppa Stripe-kolumner
- **Risk:** hög · **Beror på:** G3c, A5b · **Utförare:** **Manuell review**
- **Steg (villkorat):** `rg -n "stripe_customer_id|stripe_subscription_id" src/ db/ migrations/` — om inget läser dem, skapa **ny** migration `migrations/<timestamp>_drop_stripe_columns.js` (`DROP COLUMN IF EXISTS` på `family`). Annars hoppa över och notera i commit. **Rollback-plan (up/down) krävs.**
- **Acceptans:** `npm run migrate` rent mot tom DB + test-DB i CI; lint+test grönt.
- **Commit:** `chore(db): drop unused stripe columns from family`

### B1 — Ta bort legacy users-tabell + Polsia core-migrationer
- **Risk:** hög · **Beror på:** G3c, A5c · **Utförare:** **Manuell review**
- **Verifiera först (grep):** `rg -n "\busers\b" src/ db/ test/ scripts/ migrations/` — bekräfta att varken app, testfixtures, seed-scripts eller migrations använder `users`.
- **FK/constraint/trigger-förkontroll (utöver grep):** inventera alla referenser mot `users` via:
  - migrations-historiken,
  - `information_schema` / `pg_catalog` i en dev-liknande DB (FK, constraints, index, triggers som pekar på `users`),
  - testfixtures/seeds/bootstrapkod som implicit förutsätter tabellen eller en viss skapelseordning.
- **Fil:** `migrate.js` (~rad 79–106, "core tables"/Polsia).
- **Steg:** ta bort skapandet av `users` (behåll `schedule_date_exclusion` om den används — grep). **Egen rollback-plan krävs.**
- **Acceptans:**
  - verifierat att inga aktiva FK/constraints/triggers eller seed/test-beroenden kräver `users`,
  - `npm run migrate` grönt på (1) tom DB, (2) befintlig dev-liknande DB, (3) **fresh reset + seed/test-setup** om sådan finns,
  - schema utan `users`; lint+test grönt.
- **Commit:** `chore: drop legacy Polsia users table from migrate bootstrap`

---

## Fas 7 — Backend-monoliter

> **Mönster:** skapa katalog enligt `src/routes/schedules/`-modellen, flytta route-grupper oförändrat, behåll publika paths via en `index.js`. Verifiera identiska routes före/efter med en route-dump.
> **Grundregel:** ingen E-uppgift får i samma commit både flytta routes **och** ändra authz/query-logik.

Kör i ordning: **E0 → E3a → E3b → E3c → E4 → E1 → E2**.

### E0 — Baseline route inventory / route snapshot
- **Risk:** låg · **Beror på:** Gate G · **Utförare:** Composer 2.5
- **Mål:** dumpa alla Express-routes + mounts **före** backend-split och spara i `docs/route-inventory-pre-split.md` (eller en test-fixture).
- **Snapshoten måste innehålla (annars är den värdelös vid diff):**
  1. **HTTP-metod**,
  2. **full path / mount-prefix**,
  3. **vilken routerfil som äger routen** (om det går att extrahera),
  4. **middleware-kedja per route**,
  5. **global middleware-order** runt känsliga routes: auth/session, maintenance, paywall, CSRF där relevant.
- **Verktyg (exempel):** ett litet `scripts/dump-routes.js` som traverserar `app._router.stack` (kräver att appen kan laddas utan att binda port — se G3b app-export) och skriver en markdown-tabell.
- **Använd som:** obligatorisk före/efter-jämförelse efter varje `E3b`/`E1`/`E2`-steg. Diffen måste fånga: borttappade endpoints, ändrade paths/metoder, ändrad middleware-kedja, **ändrad mount-order för auth/maintenance/paywall-känsliga routes**.
- **Acceptans:** route-dump sparad; reproducerbar (samma kommando ger samma output); täcker punkterna 1–5 ovan.
- **Commit:** `docs: snapshot baseline Express route inventory pre-split`

### E3a — daily-logs: extrahera helpers
- **Risk:** medel · **Beror på:** D1c · **Utförare:** Composer 2.5
- **Steg:** flytta fil-lokala helpers/shared queries till `src/routes/daily-logs/helpers.js` utan att flytta routes. Ingen beteendeändring.
- **Acceptans:** route-dump identisk; `test/daily-log-*.test.js` grönt.
- **Commit:** `refactor(daily-logs): extract shared helpers (no route move)`

### E3b — daily-logs: flytta en router i taget
- **Risk:** hög · **Beror på:** E3a · **Utförare:** Composer 2.5
- **Mål:** `src/routes/daily-logs/` med `parent`, `child-self`, `items`, `logs` i egna filer; `index.js` monterar och re-exporterar samma routrar.
- **Steg:** **en router per commit.** Ingen authz/query-ändring.
- **Acceptans:** route-dump identisk efter varje steg; alla fyra routers exporteras som tidigare; tester grönt.
- **Commit:** `refactor(daily-logs): move <router> to own file`

### E3c — daily-logs: authz-konsolidering (VILLKORAD / ofta N/A)
- **Risk:** låg/medel · **Beror på:** E3b · **Utförare:** Composer 2.5
- **Villkor:** **endast om** `daily-logs` fortfarande har lokala authz-kontroller kvar efter D1c/E3b. Annars markeras uppgiften **"N/A"** — hitta inte på en ändring bara för att uppgiften står här.
- **Acceptans:** revoked-test + `test/daily-log-*.test.js` grönt, eller uppgift markerad N/A.
- **Commit:** `refactor(daily-logs): confirm authz helper usage` (om relevant)

### E4 — Dela account.js (1007 r) & surveys.js (873 r)
- **Risk:** medel · **Beror på:** E3b · **Utförare:** Composer 2.5
- **Mål:** dela vid tydliga domängränser om värdefullt; annars hoppa över och dokumentera. Bra mellansteg innan `family.js`.
- **Acceptans:** route-dump identisk; berörda tester grönt.
- **Commit:** `refactor: split account.js / surveys.js`

### E1 — Dela family.js (2198 r)
- **Risk:** hög · **Beror på:** E0 + E3a + E3b (E3c om relevant) · **Utförare:** **Manuell review**
- **Förarbete (obligatoriskt):** **endpoint-karta** — member management, invites, PIN, settings; delade helpers; cookie/session-sidoeffekter; onboardingkopplingar. Jämför mot `E0`-route-snapshoten efter splittet.
- **Mål:** `src/routes/family/index.js` + `members.js`, `invites.js`, `pin.js`, `settings.js`. Behåll `require('./family')` → katalogens `index.js`.
- **Acceptans:** route-dump identisk; `test/family-*.test.js` grönt.
- **Commit:** `refactor(family): split family.js into src/routes/family/`

### E2 — Dela auth.js (1764 r)
- **Risk:** mycket hög · **Beror på:** E1 klar (+ D2 klar) · **Utförare:** **Manuell review**
- **Steg (två nivåer, separata commits):** (1) verifierings-/token-/cookie-helpers; (2) routegrupper → `src/routes/auth/` med `login.js`, `register.js`, `oauth-apple.js`, `oauth-google.js`, `child-login.js`, `refresh.js`, `email.js`.
- **Acceptans:** `test/auth.test.js` + Apple/Google-tester grönt; refresh-flöde oförändrat.
- **Commit:** `refactor(auth): split auth.js into src/routes/auth/`

---

## Fas 8 — Frontend-modularisering (utan Tailwind-bygget)

Kör i ordning: **F1 → F2/F3**. En funktionsgrupp per PR; ingen uppgift får samtidigt flytta delad schemalogik, ändra rendering, ändra state och ändra events.

### F1 — Extrahera schedule-core.js
- **Risk:** medel · **Beror på:** — · **Utförare:** Composer 2.5
- **Mål:** `public/js/schedule-core.js` med gemensamt mellan `dashboard.js` och `schedule.js`.
- **Tillåtna symboler (exakt lista):** `DAYS`, `SECTIONS`, schemarendering, `updateBirthdayHidden`. **Förbjudet** att samtidigt städa orelaterad kod.
- **Steg:** flytta funktionerna, exponera via `window.ScheduleCore`; ladda före båda i `dashboard.html` + `schedule.html`.
- **Acceptans:** DOM-rök/snapshot-test för **båda** sidorna; bumpa `sw.js`.
- **Commit:** `refactor(frontend): extract shared schedule-core.js`

### F2 — Magra dashboard.js (per funktionsgrupp)
- **Risk:** hög · **Beror på:** F1 · **Utförare:** Composer 2.5
- **Regel:** varje deluppgift (F2a, F2b…) gör **exakt ett** av: bara SSE / bara summary-rendering / bara filter-/search-state / bara dialog/modals. Mål: kärnfil < ~1500 r.
- **Acceptans:** dashboard fungerar; snapshots uppdaterade vid behov; bumpa `sw.js`.
- **Commit:** `refactor(dashboard): extract <grupp> into dashboard-<x>.js`

### F3 — Magra schedule.js & child-dashboard.js
- **Risk:** hög · **Beror på:** F1 · **Utförare:** Composer 2.5
- Samma regel som F2 — exakt en funktionsgrupp per uppgift.
- **Commit:** `refactor(schedule|child-dashboard): extract <grupp>`

---

## Fas 9 — Tailwind build pipeline + cache

Kör i ordning: **F4a → F4b → F4c → F5**. Gate E gäller (pilot + offline-verifiering innan tunga sidor).

### F4a — Tailwind-byggsteg: pilot
- **Risk:** mycket hög · **Beror på:** F1 · **Utförare:** **Manuell review**
- **Steg:** `tailwindcss` + `postcss` (devDep), `tailwind.config.js` med `content`-globs över `public/**/*.{html,js}`, byggskript `"css:build": "tailwindcss -i public/css/tw-input.css -o public/css/tailwind.build.css --minify"`; byt CDN-`<script>` mot byggd CSS på **1–2 lågkritiska sidor**. Verifiera offline + layout + purge (dynamiska klasser → `safelist`).
- **Acceptans:** pilotsidorna identiska mot CDN; offline fungerar.
- **Commit:** `build(css): add Tailwind build pipeline + migrate pilot pages`

### F4b — Tailwind: mellantung sidgrupp
- **Risk:** mycket hög · **Beror på:** F4a · **Utförare:** **Manuell review**
- **Commit:** `build(css): migrate <grupp> to built stylesheet`

### F4c — Tailwind: tunga sidor sist
- **Risk:** mycket hög · **Beror på:** F4b · **Utförare:** **Manuell review**
- **Steg:** byt dashboard/schedule/admin sist.
- **Acceptans (hela F4):** sidor identiska; offline fungerar; `rg -n "cdn.tailwindcss.com" public/` = 0.
- **Commit:** `build(css): migrate dashboard/schedule/admin to built stylesheet`

### F5 — Cache-versionsstädning
- **Risk:** medel · **Beror på:** F4 · **Utförare:** Composer 2.5
- **Steg:** version-konstant (build-stamp), synka `public/sw.js` `CACHE_NAME` med filheaderns version, harmonisera `?v=`-strängar.
- **Acceptans:** en källa för version; SW-header = `CACHE_NAME`.
- **Commit:** `chore(sw): unify cache version source`

---

## Fas 10 — Övrigt CI/housekeeping (låg störning)

Kör i ordning: **G2 → B4 → D3 → G5**. (Inget här blockerar tidigare kärnrefaktorering. **G2 kan köras direkt efter G1** om deploy-loopen är aktiv.)

### G2 — Gate deploy på CI
- **Risk:** låg · **Beror på:** G1 · **Utförare:** Composer 2.5
- **Fil:** `.github/workflows/deploy.yml` (+ ev. branch protection).
- **Steg:** lägg `needs:`/`workflow_run`-beroende så deploy bara körs efter grön `ci.yml` på `main`.
- **Acceptans:** deploy triggas inte vid röd CI.
- **Commit:** `ci: require green CI before VPS deploy`

### B4 — Inventera övrig dödkod (ingen radering)
- **Risk:** låg · **Beror på:** — · **Utförare:** Composer 2.5
- **Steg:** `rg`-svep efter oanvända lib-/script-filer; lista i `docs/dead-code-inventory.md` med bevis (0 referenser).
- **Acceptans:** dokument skapat; **inga** kodfiler raderade.
- **Commit:** `docs: add dead-code inventory (candidates only)`

### D3 — Escapa childName i onboarding
- **Risk:** låg · **Beror på:** — · **Utförare:** Composer 2.5
- **Fil:** `public/js/onboarding.js` (~rad 241, ~468).
- **Steg:** kör `childName` och `groupMeta.name` genom `escapeHtml()` (`public/js/dom-utils.js`) innan `innerHTML`.
- **Acceptans:** utöka `test/xss.test.js`; bumpa `sw.js`.
- **Commit:** `fix(xss): escape childName/groupMeta.name in onboarding`

### G5 — Lint på public/
- **Risk:** medel · **Beror på:** F-arbetet i huvudsak klart · **Utförare:** Composer 2.5
- **Filer:** ny `eslint.config` för `public/**` med browser-globals; `package.json`-script `lint:public`.
- **Steg:** börja med högt `--max-warnings`, dra ner stegvis.
- **Acceptans:** `npm run lint:public` kör utan fel.
- **Commit:** `ci: add eslint coverage for public/ client JS`

---

# Go/no-go-gates (obligatoriska kontrollpunkter)

## Gate A — innan Fas 1 (Stripe cleanup)
Krav: `G1`, `G3a`, `G3b`, `G4a`, `G4b`, `B2`, `B3`, `C1`, `C2a`, `G4c` gröna.
**Om inte:** inga filraderingar i A.

## Gate B — innan Fas 2 (authz-hardening)
Krav: minst ett fungerande child/daily-log-test (`G4b`) · maintenance-flytten (`C1`) grön · inga auth/session-regressioner efter `B3`.

## Gate C — innan Fas 3 (CSRF messages)
Krav: messages-flödet reproducerat i test (`G4e`) · verifierat hur klienten skickar CSRF-token.
**Om klienten inte skickar token:** stoppa och fixa klient/server-kontraktet först.

## Gate D — innan Fas 4 (paywall policy)
Krav: `C2a` färdig · `G4d` skrivet och verifierar önskat kontrakt · tydligt beslut dokumenterat (**per-route canonical** eller **global gate**).

## Gate E — innan Fas 5 (levande billing cleanup)
Krav: `C2b` klart · inga öppna oklarheter i paywall-modellen · `/api/subscription`-kontrakt verifierat.

## Gate F — innan Fas 6 (destruktiv schemafas)
Krav: `G3c` grönt i CI · rollback-plan för varje migration · migrate testat på tom DB · migrate testat på dev-liknande DB för `B1`.

## Gate G — innan Fas 7 (backend split)
Krav: D1-serien klar · D4 klar · paywall-policyn spikad · destruktiva schemaändringar klara eller uttryckligen uppskjutna · **`E0` baseline route-inventory tagen** (route-dump sparad för före/efter-jämförelse).

---

# Första 16 uppgifter (v4.1, exakt körordning)

1. **G1** — Fixa CI `npm ci --legacy-peer-deps`
2. **G2** — Gate deploy på grön CI *(dra fram hit i praktiken om deploy-loopen är aktiv; minskar risk att halvfärdiga steg deployas)*
3. **G3a** — PostgreSQL-service + `npm run migrate` i CI
4. **G3b** — Implementera `setupTestDb()`
5. **G4a** — Integrationstest för auth/login eller session-refresh
6. **G4b** — Integrationstest för child-access eller daily-log-flöde
7. **B2** — Ta bort dubbelmonterade routers
8. **B3** — Ta bort redundant `optionalAuth`
9. **C1** — Flytta `checkMaintenanceMode` före routes
10. **C2a** — Dokumentera faktisk paywall-täckning
11. **G4c** — Maintenance-order-test (admin/health/webhook-beteende)
12. **A1** — Radera omonterade Stripe-routefiler
13. **A2** — Radera legacy payment/Stripe-script
14. **A3** — Avlägsna `stripe`-dependency
15. **A5a** — Rensa Stripe-env ur `.env.example`
16. **D1a** — Inför revoked-aware authz-helper

**Därefter:** D1b → D1c → D1d → D1e → D2 → D5 → G4e → D4 → G4d → C2b → A4 → A5b → A6 → A7 → G3c → A5c → B1 → (E0 → E3a → E3b → E3c → E4 → E1 → E2) → (F1 → F2/F3) → (F4a/b/c → F5) → (B4 → D3 → G5).

---

# Spårningstabell (bocka av vid utförande)

| Uppgift | Fas | Risk | Beror på | Utförare | Status | PR/Commit |
|---------|-----|------|----------|----------|--------|-----------|
| G1 | 0 | låg | — | Composer | ☐ | |
| G3a | 0 | medel | G1 | Composer | ☐ | |
| G3b | 0 | medel | G3a | Composer | ☐ | |
| G4a | 0 | medel | G3b | Composer | ☐ | |
| G4b | 0 | medel | G3b | Composer | ☐ | |
| B2 | 0 | medel | G4a, G4b | Composer | ☐ | |
| B3 | 0 | medel | G4a | Composer | ☐ | |
| C1 | 0 | medel | G4a, G4b | Composer | ☐ | |
| C2a | 0 | låg | — | Composer | ☐ | |
| G4c | 0 | medel | C1, G3b | Composer | ☐ | |
| A1 | 1 | låg | Gate A | Composer | ☐ | |
| A2 | 1 | låg | A1 | Composer | ☐ | |
| A3 | 1 | låg/medel | A1, A2 | Composer | ☐ | |
| A5a | 1 | låg | A1 | Composer | ☐ | |
| D1a | 2 | medel | G4b | Composer | ☐ | |
| D1b | 2 | medel | D1a | Composer | ☐ | |
| D1c | 2 | medel | D1a | Composer | ☐ | |
| D1d | 2 | medel | D1a | Composer | ☐ | |
| D1e | 2 | medel | D1a | Composer | ☐ | |
| D2 | 2 | medel/hög | G4a | Composer | ☐ | |
| D5 | 2 | låg/medel | — | Composer | ☐ | |
| G4e | 3 | medel | G3b | Composer | ☐ | |
| D4 | 3 | hög | G4e | Manuell | ☐ | |
| G4d | 4 | medel | C2a, G3b | Composer | ☐ | |
| C2b | 4 | hög | C2a, G4d | Manuell | ☐ | |
| A4 | 5 | medel | C2b, A3 | Composer | ☐ | |
| A5b | 5 | medel | A4 | Composer | ☐ | |
| A6 | 5 | medel/hög | A4, A5b | Manuell | ☐ | |
| A7 | 5 | låg | A6 | Composer | ☐ | |
| G3c | 6 | medel | G3b | Composer | ☐ | |
| A5c | 6 | hög | G3c, A5b | Manuell | ☐ | |
| B1 | 6 | hög | G3c, A5c | Manuell | ☐ | |
| E0 | 7 | låg | Gate G | Composer | ☐ | |
| E3a | 7 | medel | D1c, E0 | Composer | ☐ | |
| E3b | 7 | hög | E3a | Composer | ☐ | |
| E3c | 7 | låg/medel (ofta N/A) | E3b | Composer | ☐ | |
| E4 | 7 | medel | E3b | Composer | ☐ | |
| E1 | 7 | hög | E0, E3a, E3b (E3c om relevant) | Manuell | ☐ | |
| E2 | 7 | mycket hög | E1, D2 | Manuell | ☐ | |
| F1 | 8 | medel | — | Composer | ☐ | |
| F2 | 8 | hög | F1 | Composer | ☐ | |
| F3 | 8 | hög | F1 | Composer | ☐ | |
| F4a | 9 | mycket hög | F1 | Manuell | ☐ | |
| F4b | 9 | mycket hög | F4a | Manuell | ☐ | |
| F4c | 9 | mycket hög | F4b | Manuell | ☐ | |
| F5 | 9 | medel | F4 | Composer | ☐ | |
| G2 | 10 | låg | G1 | Composer | ☐ | |
| B4 | 10 | låg | — | Composer | ☐ | |
| D3 | 10 | låg | — | Composer | ☐ | |
| G5 | 10 | medel | F mestadels klar | Composer | ☐ | |
