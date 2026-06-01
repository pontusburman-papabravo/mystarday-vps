# Polsia deploy — filer att ladda ner till produktion

**Branch:** `cursor/release-os-sprints-1a8b` (eller senaste `main` efter merge)  
**Datum:** 2026-05-28  
**Syfte:** Ge Polsia en **komplett fillista** efter att Cursor kört Release OS sprint 1–26 i repo.

---

## Innan deploy

```bash
npm run migrate    # om nya migrationer finns (denna batch: inga nya DB-migrationer)
npm run test       # ska vara grönt (147+ tester)
npm run polsia:gate0
```

## Env-variabler (Polsia Dashboard — ej i repo)

| Variabel | Sprint | Beskrivning |
|----------|--------|-------------|
| `SENTRY_DSN` | 14 | Crash reporting (WebView). Tom = av. |
| `RENDER_GIT_COMMIT` | 14 | Auto på Render → `release` i Sentry |
| `PARENTAL_GATE_ENABLED` | 3c | `false` endast nödfall |
| `NATIVE_TABBAR_ENABLED` | 4 | `false` = webb-hamburger kvar i native |
| `FIREBASE_*` / FCM | 19 | Redan planerat — befintlig `sendFCM` |
| `APNS_*` | 20 | Befintlig `sendAPNs` |

---

## Filer att deploya (denna batch)

### Backend

| Fil | Sprint |
|-----|--------|
| `server.js` | 3c |
| `src/routes/public.js` | 3c, 14, 4 |
| `src/routes/auth.js` | 17 |
| `src/middleware/csrf.js` | 17 |
| `src/middleware/platform-html.js` | 1.2, 14, 3a, 4 |
| `src/middleware/child-parent-api-block.js` | 3c |
| `src/middleware/securityHeaders.js` | 14 |

### Klient (nya)

| Fil | Sprint |
|-----|--------|
| `public/js/device-mode.js` | 3a |
| `public/js/session-gate.js` | 3a, 3c |
| `public/js/parental-gate.js` | 3b |
| `public/js/crash-reporter.js` | 14 |
| `public/js/native-tab-bar.js` | 4 |

### Klient (ändrade)

| Fil | Sprint |
|-----|--------|
| `public/js/platform.js` | 1.2, 18 |
| `public/js/platform-theme.js` | (oförändrad injektion) |
| `public/js/login-magic.js` | 3a, 3b, 5a |
| `public/js/child-login.js` | 3a, 3b |
| `public/js/auth.js` | 3a |
| `public/js/pwa-install.js` | 2b (redan klar) |
| `public/login.html` | 1.3 |
| `public/css/platform-gating.css` | 2a |
| `public/css/platform-native.css` | 2a, 4 |
| `public/sw.js` | **v166** — obligatorisk |

### Tester (valfritt på Polsia, bra för CI)

| Fil |
|-----|
| `test/release-os.test.js` |

### Dokumentation (behöver inte deployas till prod)

| Fil |
|-----|
| `docs/cursor-release-os-sprints.md` |
| `docs/polsia-deploy-manifest.md` (denna fil) |
| `docs/polsia-release-os/04-redan-klart-i-repo.md` |

---

## Redan i prod / minimal Polsia-insats

| Sprint | Status |
|--------|--------|
| 1.1 | ✅ JWKS, CSRF Apple, lifetime_free |
| 1.2 | ✅ platform.js |
| 1.4 | ✅ platform-gating scaffold |
| 2b | ✅ pwa-install isNeeded |
| Gate 0 | ✅ `npm run polsia:gate0` |
| 19–20 | ◐ FCM/APNs backend finns — verifiera prod-env |
| 5a–5c | ◐ login rollval + child-login 3-vy finns — polish kvar |

---

## Efter deploy — manuell röktest (Polsia)

1. **Barnläge:** Login → Jag är barn → PIN → `/child-dashboard`. Stäng app, öppna → ska till `/child-login`, inte dashboard.
2. **PG:** Barnläge → Jag är vuxen → föräldra-PIN → dashboard.
3. **Native:** Ingen PWA-install-banner i appen.
4. **Tab bar (native):** 5 flikar på dashboard/schedule/settings/family.
5. **Sentry:** Sätt `SENTRY_DSN`, trigga test via konsol `CrashReporter.testCrash()` (endast staging).
6. **Google:** `POST /api/auth/google` med giltig idToken (befintligt konto) — Android sprint 18 plugin separat.

---

## Meddelande till Polsia (copy-paste)

```
Deploy branch cursor/release-os-sprints-1a8b (eller main efter merge).

Ladda upp ALLA filer i docs/polsia-deploy-manifest.md under "Filer att deploya".

Kör: npm run migrate && npm run test

Sätt env: SENTRY_DSN (valfritt), PARENTAL_GATE_ENABLED=true, NATIVE_TABBAR_ENABLED=true.

SW v166 — tvinga PWA-uppdatering efter deploy.

Signera: barnläge redirect, PG, ingen PWA-text i native, tab bar 5 flikar.
```
