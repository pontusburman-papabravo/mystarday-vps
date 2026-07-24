# Fysisk mobil-QA — PR #713 (P-i18n-Home-Today-C)

**Datum:** 2026-07-24 (uppdaterad efter staging-deploy)  
**Branch:** `cursor/i18n-today-home-shell-b8ba`  
**App-SHA (staging):** `8f0bce14` (i18n/nav-fix; identisk appkod som `d6b3df0e` + staging-skript)  
**Nav-fix commit:** `2959ce42`  
**SW/cache:** `stjarndag-v668`

---

## Beslut

# QA BLOCKERAD — fysisk mobil-QA ej genomförd

PR #713 **får inte mergas** förrän fysisk mobil-QA är godkänd på staging enligt `docs/i18n-pr713-staging-qa.md`.

Chrome-emulering, Puppeteer och desktop-viewport **räknas inte** som fysisk mobil-QA.

---

## Stagingmiljö (deployad)

| Fält | Värde |
|------|-------|
| VPS path | `/home/deploy/pr713-staging` |
| Process | `node server.js` (deploy-användare, **ej** systemd prod-tjänst) |
| Port | `3001` (prod kvar på `3000`) |
| Health | `{"status":"healthy","version":"2.3.1"}` @ `127.0.0.1:3001/health` |
| Deploy-SHA | `8f0bce14` (app i18n = `d6b3df0e`; staging-skript i `8f0bce14`–`d2fc6eeb`) |
| SW | `stjarndag-v668` |
| Publik URL | **Ej exponerad** — port 3001 blockeras externt; se åtkomst nedan |

### Åtkomst för fysisk QA (mänsklig testare)

1. På Mac/Linux med SSH till VPS:
   ```bash
   ssh -L 0.0.0.0:3001:127.0.0.1:3001 deploy@188.66.60.93
   ```
2. Telefon på **samma Wi‑Fi** som datorn: öppna `http://<datorns-lan-ip>:3001`
3. Hämta QA-lösenord via SSH (committas **aldrig**):
   ```bash
   ssh deploy@188.66.60.93 'cat /home/deploy/pr713-staging/.qa-password'
   ```
4. Barn-PIN: standard `7137` (override med `QA_CHILD_PIN` vid omseed)

**Alternativ (kräver sudo/nginx):** staging-subdomän via projektägare — se `docs/i18n-pr713-staging-qa.md`.

---

## QA-konton (verifierade i DB)

| Familj | E-post | `preferred_locale` | `english_app` | Barn |
|--------|--------|-------------------|---------------|------|
| Svensk kontroll | `qa-pr713-sv@example.com` | `sv-SE` | OFF | QA Barn (`qabarn`) |
| Engelsk test | `qa-pr713-en@example.com` | `en-GB` | ON | QA Child (`qachild`) |

Båda har `onboarding_completed=true`, `parent_child`-länk, aktiviteter (inkl. delsteg) och dagens veckoschema.

Lösenord: VPS-fil `.qa-password` (se ovan). **Skriv aldrig lösenord i denna rapport.**

---

## API-verifiering (staging @ port 3001)

| Endpoint | Resultat |
|----------|----------|
| `/api/i18n/sv-SE` | `home=Hem`, `planning=Planering`, `rewards=Belöningar`, `forYou=För dig`, `family=Familj` |
| `/api/i18n/en-GB` | `home=Home`, `planning=Planning`, `rewards=Rewards`, `forYou=For you`, `family=Family` |
| `/api/i18n/xx-YY` | `400` (korrekt) |
| MIME `application/json` | Ja |
| `nav-en-GB.json` / `nav-sv-SE.json` i artefakt | Ja |
| `/sw.js` | `200`, `application/javascript`, cache `stjarndag-v668` |
| Auth `/api/auth/me` en-GB | `preferred_locale=en-GB`, `children` populated |

---

## Testmatris per plattform

| Plattform | Enhet/OS | sv-SE | en-GB | Resultat |
|-----------|----------|-------|-------|----------|
| iOS Safari | — | — | — | **EJ UTFÖRD** (ingen fysisk enhet) |
| iOS Capacitor WebView | — | — | — | **EJ UTFÖRD** |
| Android Chrome | — | — | — | **EJ UTFÖRD** |
| Android Capacitor WebView | — | — | — | **EJ UTFÖRD** |
| Desktop Chrome (emulerad viewport) | Cloud agent VM | Ej signerbar | Ej signerbar | **Ogiltig** för mergebeslut |

### Observationer från ogiltig emulering (ej mergegrund)

| Observation | Förklaring |
|-------------|------------|
| Nyregistrering fastnar i onboarding | Gäller **inte** QA-kontona (`onboarding_completed=true`). Emulering använde fel testväg. |
| API-login med `qa-pr713-*` | Fungerar på staging. |

---

## Klassificering

### 1. Ej testat (obligatoriskt kvarstår)

Alla punkter i fysisk testmatris: start/session, bottom nav, Home, Today, completion, undo, tom dag, rating, offline/reconnect, visuell QA — **båda locales, alla fyra plattformar**.

### 2. Ej relevant — prod

Prod (`main` @ `e73bfe8c`, port 3000) ska **inte** användas för #713-sign-off.

### 3. PR-defekt (åtgärdad före staging)

en-GB bottom nav visade svenska labels → `native-tab-bar.js` stale `activeTabs` före `I18n.init` → fix `syncActiveTabs()` @ `2959ce42`.

### 4. Prodobservation (utanför #713)

Svensk `Planning` på prod — ej reproducerbar på `main`-kod; monitorera efter merge.

---

## Mergebeslut

| Beslut | Status |
|--------|--------|
| Merge PR #713 | **Nej** |
| Staging redo för fysisk QA | **Ja** |
| Deploy till prod | **Nej** |

---

## Instruktioner till mänsklig testare

1. SSH-tunnel enligt tabellen ovan.
2. Logga in som `qa-pr713-sv@example.com` → verifiera nav: Hem, Planering, Belöningar, För dig, Familj.
3. Logga ut, logga in som `qa-pr713-en@example.com` → Home, Planning, Rewards, For you, Family.
4. Kör full matris i `docs/i18n-en-gb-home-today.md` på alla fyra plattformar.
5. Bekräfta SW `stjarndag-v668` i DevTools → Application.
6. Uppdatera denna rapport med plattform/resultat/skärmdumpar.

---

## Bilagor

| Fil | Beskrivning |
|-----|-------------|
| `docs/i18n-pr713-staging-qa.md` | Staging-deploy + åtkomst |
| `scripts/deploy-pr713-staging.sh` | VPS deploy (port 3001) |
| `scripts/setup-pr713-qa-accounts.mjs` | QA-familjer |
