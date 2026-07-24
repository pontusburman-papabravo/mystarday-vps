# Fysisk mobil-QA — PR #713 (P-i18n-Home-Today-C)

**Datum:** 2026-07-24 (uppdaterad efter nav-fix)  
**Build under test:** PR #713 branch `cursor/i18n-today-home-shell-b8ba`  
**Nav-fix commit:** `2959ce42`  
**Förväntad SW:** `stjarndag-v668` (efter nav-fix; tidigare `v667`)  
**Testmiljö cloud agent:** Emulerad mobilviewport — **inga fysiska enheter**

---

## Beslut

# QA BLOCKERAD — fysisk mobil-QA ej genomförd

PR #713 **får inte mergas** förrän fysisk mobil-QA är godkänd på staging/preview enligt `docs/i18n-pr713-staging-qa.md`.

**Inte** "QA UNDERKÄND" — testmatrisen kunde inte bedömas fullt ut.

---

## Klassificering av observationer

### 1. Ej testat (obligatoriskt kvarstår)

| Område | Orsak |
|--------|-------|
| iOS Safari, iOS WebView, Android Chrome, Android WebView | Ingen fysisk hårdvara i cloud agent |
| Kallstart / varmstart / native appomstart | Kräver fysisk enhet |
| Slutför/ångra aktivitet, ratingmodal, offline/sync | Kräver fysisk QA på staging med schema |
| Session restore efter force-quit | Kräver fysisk enhet |

### 2. Ej relevant — prod användes felaktigt för #713-bedömning

| Observation | Förklaring |
|-------------|------------|
| Prod visar svensk Home/Today för review-konto | Förväntat — prod kör `main` @ `e73bfe8c`, inte PR #713 |
| `nav-en-GB.json` saknas på VPS | Förväntat — #713 ej mergad/deployad |
| Prod kan inte signera av #713 en-GB | Prod ≠ PR #713 build |

### 3. Misstänkt verklig defekt i PR-builden (åtgärdad)

| Problem | Rotorsak | Fix |
|---------|----------|-----|
| en-GB-familj visade svensk bottom nav (Hem, Planering, …) | `native-tab-bar.js` cachade `activeTabs = NavConfig.primaryNavForTabs()` vid **script parse** (före `I18n.init`). `parent-i18n-ready` anropade `remount()` men uppdaterade inte `activeTabs`. | `syncActiveTabs()` anropas före mount/remount och på `parent-i18n-ready` / `locale-changed`. |

**Verifiering:** `parent-magic-shell.js` anropar redan `primaryNavForTabs()` vid varje render — race gällde främst `native-tab-bar` på mobilviewport.

**Testfamilj-risk:** Tidigare QA använde konton utan barn/schema — Journey-coach och vissa Home-ytor kan fortfarande visa svensk DB-copy även med korrekt nav. Fysisk QA ska använda familjer med aktiviteter (se staging-doc).

### 4. Prodobservation utanför #713-scope

| Observation | Utredning | Status |
|-------------|-----------|--------|
| Prod visade `Planning` bland svenska nav-labels | Prod `nav-config.js` @ `e73bfe8c` har **ingen** `labelKey` — hårdkodad `label: 'Planering'`. Ingen `nav-sv-SE.json` på main. | **Ej reproducerbar** som main-regression i nuvarande kod. Troligen stale SW/cache från partiella artefakter, eller emuleringsmisstolkning. **Monitorera** efter staging-deploy. |

---

## Testmatris per plattform

| Plattform | OS/appversion | sv-SE | en-GB | Resultat |
|-----------|---------------|-------|-------|----------|
| iOS Safari | Ej testad | — | — | **EJ UTFÖRD** |
| iOS Capacitor WebView | Ej testad | — | — | **EJ UTFÖRD** |
| Android Chrome | Ej testad | — | — | **EJ UTFÖRD** |
| Android Capacitor WebView | Ej testad | — | — | **EJ UTFÖRD** |
| Chrome DevTools (prod, emulerad) | Linux VM | Delvis | N/A | Prod ≠ #713 |
| Puppeteer (lokal PR #713) | Linux VM | Delvis | Ofullständig före fix | Se §3 |

---

## Locale-resurser (PR #713 build)

| Resurs | Status |
|--------|--------|
| `config/i18n/nav-en-GB.json` | Finns i branch |
| `config/i18n/nav-sv-SE.json` | Finns i branch |
| `/api/i18n/en-GB` → `nav.primary.*` | Verifierat efter server-omstart |
| `/api/i18n/sv-SE` → `nav.primary.planning` = `Planering` | Verifierat i tester |

---

## Staging / preview

Se **`docs/i18n-pr713-staging-qa.md`** för:

- Lokal preview med `scripts/setup-pr713-qa-accounts.mjs`
- VPS staging-sökväg (separat från prod)
- QA-kontokonfiguration (sv-SE + en-GB + `english_app`)
- Fysisk QA-checklista

**Prod ska inte användas** för #713-sign-off.

---

## Mergebeslut

| Beslut | Tillåtet |
|--------|----------|
| Merge PR #713 | **Nej** — fysisk QA saknas |
| Tekniskt redo för staging QA | **Ja** (efter nav-fix + SW v668) |
| Deploy till prod | **Nej** |

---

## Kvarvarande fysisk QA-matris

Alla punkter i användarens testmatris (start/session, Home, Today, completion, undo, tom schema, offline, ratingmodal, visuell QA) — **både sv-SE och en-GB** — på alla fyra plattformar mot staging/preview.

---

## Bilagor

| Fil | Beskrivning |
|-----|-------------|
| `docs/i18n-pr713-staging-qa.md` | Staging + QA-konto |
| `scripts/setup-pr713-qa-accounts.mjs` | SQL-seed sv/en familjer |
| `manual-prod-*.png` (artifacts/) | Prod-emulering (ej #713) |
