# Engineering task — Release OS Sprint 1–26 Deploy

**Målgrupp:** Polsia `polsia_infra` / engineering-agent (Render + GitHub)  
**Repo:** `https://github.com/pontusburman-papabravo/MyStarday-Polsia`  
**Branch:** `main`  
**Prod:** `https://stjarndag.polsia.app` · `https://mystarday.se`

---

## Scope (EN uppgift)

1. Deploy `main` till Render (full repo sync — inte cherry-pick)
2. Kör på server efter deploy:
   ```bash
   npm run migrate
   npm run test
   npm run polsia:gate0
   curl -sSf https://stjarndag.polsia.app/health
   ```
3. Bekräfta att **Service Worker v167** är live (`public/sw.js` → `CACHE_NAME = 'stjarndag-v167'`)
4. Rapportera commit-hash + testresultat tillbaka till chat

**Gör INTE i denna task:** ny feature-kod, Android APK-build, Gate 24 signering (separat manuell fas)

---

## Varför ingen ny kod?

Cursor har redan mergat sprint 1–26 till `main`. Se `docs/polsia-release-os/04-redan-klart-i-repo.md`.

---

## Env (sätts i Polsia/Render — inte i denna fil)

Pontus sätter env via Polsia Dashboard (se `ENV_FOR_POLSIA_DASHBOARD.md` eller tabell i `POLSIA_DEPLOY_PROMPT.md`). Engineering-agent: **flagga om variabel saknas**, deploya ändå.

| Variabel | Krävs för |
|----------|-----------|
| `SENTRY_DSN` | Sprint 14 crash |
| `PARENTAL_GATE_ENABLED=true` | Session gate |
| `NATIVE_TABBAR_ENABLED=true` | Tab bar |
| `FCM_SERVER_KEY` | Android push |
| `GOOGLE_WEB_CLIENT_ID` | Android Google |
| `ANDROID_SHA256_CERT_FINGERPRINT` | App Links |
| `ANDROID_PACKAGE_NAME` | `se.mystarday.app` |
| `APPLE_TEAM_ID` | Universal Links |
| Befintliga `APNS_*`, `DATABASE_URL`, `JWT_SECRET` | Oförändrat |

---

## Verifiering efter deploy (engineering-agent signerar)

```bash
# Förväntat:
# tests: 152 pass (eller aktuellt antal på main)
# polsia:gate0: OK
# health: {"status":"healthy",...}
```

Post-deploy API smoke (curl):

```bash
curl -sS https://stjarndag.polsia.app/api/app-config | head -c 500
curl -sS https://stjarndag.polsia.app/.well-known/assetlinks.json | head -c 300
curl -sS -o /dev/null -w "%{http_code}" https://stjarndag.polsia.app/login
# Förväntat login: 200
```

---

## Röktest (browser-agent / Pontus — ej blocking för deploy)

| # | Test | Förväntat |
|---|------|-----------|
| 1 | `/login` laddar | 200, rollval synligt i app/PWA |
| 2 | `/api/app-config` | JSON med `parental_gate_enabled`, `release` |
| 3 | SW version | DevTools → Application → sw.js v167 |
| 4 | Barnläge | manuell: barn-PIN → child-dashboard; omstart → child-login |
| 5 | Native tab bar | manuell på TestFlight/Android |

---

## Svarformat till Pontus

```
DEPLOY RELEASE OS — KLAR / BLOCKERAD

Commit: <hash>
Render deploy: <tid>
npm test: <pass/fail>
polsia:gate0: <OK/fail>
health: <OK/fail>
SW v167 live: ja/nej
Saknade env: <lista eller "inga">
Blocker: <text eller "ingen">
```

---

## Referenser

- `docs/polsia-deploy-manifest.md` — fillista
- `docs/polsia-release-os/POLSIA_DEPLOY_PROMPT.md` — masterinstruktion
- `docs/MAIN-RELEASE-OS-STATUS.md` — vad som finns på main
