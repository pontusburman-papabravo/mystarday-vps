# Fysisk mobil-QA — PR #713 (P-i18n-Home-Today-C)

**Datum:** 2026-07-24  
**Build under test:** `81c39654` (branch `cursor/i18n-today-home-shell-b8ba`)  
**Förväntad SW:** `v667` (per PR #713)  
**Testmiljö cloud agent:** Emulerad mobilviewport (390×844) — **inga fysiska enheter**

---

## Beslut

# QA UNDERKÄND — PR #713 ska inte mergas utifrån denna rapport

**Skäl:**
1. **Ingen av de fyra obligatoriska fysiska plattformarna** (iOS Safari, iOS Capacitor, Android Chrome, Android Capacitor) kunde testas — cloud agent saknar hårdvara.
2. **PR #713 är inte mergad eller fullt deployad** på prod (`origin/main` @ `e73bfe8c`; PR #713 `OPEN`).
3. **en-GB-testmatrisen kunde inte köras fullt** mot målbuild på prod; QA-kontot enligt docs/qa-test-account.md visar svensk upplevelse (förväntat om preferred_locale = sv-SE).
4. Emulerad lokal test mot PR #713 HEAD gav **ofullständiga resultat** (timeouts, stale server-cache vid första körning).

---

## Testmatris per plattform

| Plattform | OS/appversion | sv-SE | en-GB | Resultat |
|-----------|---------------|-------|-------|----------|
| iOS Safari | Ej testad (ingen fysisk enhet) | — | — | **EJ UTFÖRD** |
| iOS Capacitor WebView | Ej testad | — | — | **EJ UTFÖRD** |
| Android Chrome | Ej testad | — | — | **EJ UTFÖRD** |
| Android Capacitor WebView | Ej testad | — | — | **EJ UTFÖRD** |
| Chrome DevTools iPhone-emulering (prod) | Linux VM, Chrome headless | Delvis OK | Ej konfigurerat | **Ofullständig** |
| Puppeteer iPhone-emulering (lokal PR #713) | Linux VM, Node 20 | Delvis OK | Ofullständig | **Ofullständig** |

---

## Vad som faktiskt testades

### A. Produktion (prod URL) — emulerad iPhone-viewport

- **Deploy-SHA:** `e73bfe8c` (main, **inte** PR #713)
- **SW på prod:** `stjarndag-v667` (bekräftat via VPS)
- **Konto:** QA test account documented in `docs/qa-test-account.md` (sannolikt `sv-SE`)
- **Prod saknar:** `config/i18n/nav-en-GB.json` (fil finns inte på VPS trots SW v667)

**sv-SE (förväntat beteende för review-kontot):**
- Home: svensk Journey/readiness-copy, svensk bottom nav (utom en anomali)
- Today: svensk shell ("Daglig logg", tips, VÄLJ BARN)
- Flöde Home → Today fungerar

**en-GB:** Ej testbart på prod utan att konfigurera familj + `english_app` på deployad build.

**Skärmbilder:**
- `manual-prod-home-full.png`
- `manual-prod-home-bottom.png`
- `manual-prod-planning-hub.png`
- `manual-prod-today-daily-log.png`

### B. Lokal PR #713 HEAD (`http://127.0.0.1:3000`) — emulerad iPhone-viewport

- **SHA:** `81c39654`
- **SW:** `stjarndag-v667`
- **Testkonton:** SQL-seedade `qa-en-fe5c4013@example.com` (en-GB + `english_app`) och `qa-sv-3132c24b@example.com` (sv-SE)

**sv-SE:** Home renderar svensk Journey-kort och svensk nav (Hem, Planering, …) — skärmbild `ios-safari-sv-home.png`.

**en-GB:** Efter omstart av dev-server (stale `loadLocales` utan nav-fragment) visade Home fortfarande svensk bottom nav och svensk Journey-copy. Nav-API `/api/i18n/en-GB` returnerar korrekt `nav.primary.home = "Home"` efter omstart, men UI uppdaterades inte verifierat i denna session.

---

## Avvikelser

### 1. Ingen fysisk enhetstestning
| Fält | Värde |
|------|-------|
| Plattform | Alla fyra |
| Sida/flöde | Hela testmatrisen |
| Locale | sv-SE + en-GB |
| Synlig text | — |
| Förväntat | Fysisk QA på iOS/Android |
| Faktiskt | Endast emulerad viewport i cloud VM |
| Skärmbild | — |
| **Blockerande** | **Ja** |

### 2. PR #713 inte deployad på prod
| Fält | Värde |
|------|-------|
| Plattform | Prod |
| Sida/flöde | Hela Home/Today |
| Locale | en-GB |
| Synlig text | Svensk systemcopy |
| Förväntat | Engelsk Home/Today enligt PR #713 |
| Faktiskt | Main-deploy utan PR #713-merge; `nav-en-GB.json` saknas på VPS |
| Skärmbild | `manual-prod-today-daily-log.png` |
| **Blockerande** | **Ja** (kan inte godkänna deploy av omergad PR) |

### 3. Blandad nav-label på prod (sv-SE-konto)
| Fält | Värde |
|------|-------|
| Plattform | Prod (emulerad iPhone) |
| Sida/flöde | Home bottom nav |
| Locale | sv-SE (sannolikt) |
| Synlig text | `Planning` (engelska) bland `Hem`, `Belöningar`, `För dig`, `Familj` |
| Förväntat | `Planering` (svenska) |
| Faktiskt | En engelsk label i annars svensk nav |
| Skärmbild | `manual-prod-home-bottom.png` |
| **Blockerande** | **Ej blockerande för sv-SE** — men regressionsrisk; bör verifieras på PR #713-build |

### 4. en-GB Home visar svensk nav (lokal PR #713, ej verifierat efter fix)
| Fält | Värde |
|------|-------|
| Plattform | Lokal emulering |
| Sida/flöde | Home |
| Locale | en-GB + english_app |
| Synlig text | `Hem`, `Planering`, `Belöningar`, `För dig`, `Familj` |
| Förväntat | `Home`, `Planning`, `Rewards`, `For you`, `Family` |
| Faktiskt | Svenska nav-labels |
| Skärmbild | `en-gb-home-debug.png` |
| **Blockerande** | **Potentiellt ja** — kräver omtest på fysisk enhet efter ren deploy |

---

## Flöden som INTE kunde verifieras

Följande kräver fysisk enhet + PR #713 preview/deploy + en-GB-flaggad familj:

- Kallstart / varmstart / appomstart (native)
- Session restore efter force-quit
- Slutför/ångra aktivitet + toast `⭐ Rating saved!`
- Offline/flygplansläge + reconnect utan språkblandning
- Ratingmodal alla fält
- Visuell QA landscape, tryckytor, textklippning på riktig hårdvara
- Journey 20/20 en-GB coach-states på fysisk enhet

---

## Rekommendationer innan merge

1. **Deploya PR #713** till staging/preview med SHA `81c39654` (eller merge + deploy).
2. **Konfigurera QA-familj för en-GB:**
   ```sql
   UPDATE family SET preferred_locale = 'en-GB' WHERE id = '<family_id>';
   INSERT INTO family_features (family_id, feature_slug) VALUES ('<family_id>', 'english_app') ON CONFLICT DO NOTHING;
   ```
3. **Fysisk QA** på alla fyra plattformer med checklistan i `docs/i18n-en-gb-home-today.md` § Manual QA checklist.
4. **Verifiera** att `nav-en-GB.json` finns i deploy-artefakt och att `/api/i18n/en-GB` returnerar `nav.primary.*`.
5. **Utreda** varför prod visar `Planning` på sv-SE-konto (partiell deploy eller cache?).

---

## Bilagor

| Fil | Beskrivning |
|-----|-------------|
| `qa-findings.md` | Detaljerad prod-emulering |
| `qa-report.json` | Automatiserad emuleringskörning (ofullständig) |
| `manual-prod-*.png` | Prod skärmbilder |
| `ios-safari-sv-home.png` | Lokal sv-SE Home |
| `en-gb-home-debug.png` | Lokal en-GB Home (svensk nav observerad) |

---

## Godkännandekriterier — status

| Kriterium | Status |
|-----------|--------|
| Alla fyra plattformar testade | ❌ |
| Ingen blockerande svensk systemcopy för en-GB | ❌ Ej verifierat |
| sv-SE fungerar som tidigare | ⚠️ Delvis (prod emulering) |
| Home → Today → completion | ❌ Ej testat (completion) |
| Reload/session restore locale | ❌ Ej testat fysiskt |
| Offline utan språkblandning | ❌ Ej testat |
| Inga blockerande visuella fel | ❌ Ej testat fysiskt |
| Inga completion/Journey-regressioner | ❌ Ej testat |
