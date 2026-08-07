# Android + native — env på egen VPS

**Prod:** `https://mystarday.se`  
Polsia används inte längre — alla variabler sätts direkt på servern.

## Deploy efter koduppdatering

```bash
# På VPS (exempel)
cd /path/to/mystarday
git pull origin main
npm install
npm run migrate
# starta om appen (systemd/pm2/docker — beroende på er setup)
```

Android- och iOS-apparna laddar **live-webben** från `mystarday.se`. De flesta kodändringar kräver **bara server-deploy**, inte ny AAB/IPA.

## Env för Android (lägg till i prod `.env`)

| Variabel | Syfte |
|----------|-------|
| `APP_URL` | `https://mystarday.se` |
| `GOOGLE_WEB_CLIENT_ID` | Google Sign In (Web client ID) |
| `ANDROID_KEYSTORE_PATH` | Path to upload keystore on build machine |
| `ANDROID_KEY_ALIAS` | Key alias inside upload keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Upload keystore password — **rotate before Play upload** if committed in local notes |
| `ANDROID_KEY_PASSWORD` | Key password if distinct from keystore password |
| `ANDROID_UPLOAD_CERT_SHA256` | Play App Signing / assetlinks fingerprint (upload cert) |
| `FCM_SERVER_KEY` | Push till Android (Firebase legacy key) |
| `ANDROID_SHA256_CERT_FINGERPRINT` | App Links (`assetlinks.json`) |
| `ANDROID_PACKAGE_NAME` | `se.mystarday.app` (default) |
| `SENTRY_DSN` | Kraschrapportering (valfritt) |

Befintliga variabler (redan på VPS): `DATABASE_URL`, `JWT_SECRET`, `VAPID_*`, `APNS_*`, `R2_*` eller lokal upload, `RESEND_API_KEY`, m.m.

## Verifiera efter deploy

```bash
curl -sS https://mystarday.se/api/health
curl -sS https://mystarday.se/api/app-config | jq .googleWebClientId
curl -sS https://mystarday.se/.well-known/assetlinks.json | jq .
```

## Lokal Android-build (på utvecklarmaskin)

```bash
npm install
export GOOGLE_WEB_CLIENT_ID="….apps.googleusercontent.com"
# google-services.json → android/app/  (från Firebase, committas inte)
npx cap add android          # första gången
npm run cap:sync:android
npm run cap:android          # Android Studio → Signed AAB
```

Full guide: [`google-play-checklist.md`](google-play-checklist.md)

## När behövs ny AAB?

| Ändring | Ny AAB? |
|---------|---------|
| Webb/JS/API på mystarday.se | **Nej** — deploy räcker |
| Ny Capacitor-plugin / targetSdk / manifest | **Ja** |
| Ny version i Play Console | **Ja** |
