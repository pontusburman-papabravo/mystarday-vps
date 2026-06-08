# Google Sign In — native Android (Sprint 18)

Repo innehåller **UI + backend + Capacitor-plugin**. Native Android-projektet (`android/`) genereras lokalt.

## 1. Installera plugin (redan i package.json)

```bash
npm install
```

Paket: `@codetrix-studio/capacitor-google-auth`

## 2. Google Cloud Console

Skapa **två** OAuth 2.0-klienter i samma projekt som Firebase:

| Klient | Typ | Värde |
|--------|-----|-------|
| Web | Web application | → `GOOGLE_WEB_CLIENT_ID` |
| Android | Android | Paket `se.mystarday.app` + SHA-1 från release-keystore |

SHA-1 för release:

```bash
keytool -list -v -keystore mystarday-release.keystore -alias mystarday
```

För debug-byggen, lägg även till debug-keystore SHA-1 (`~/.android/debug.keystore`).

## 3. Server-env

Sätt på Render/Polsia:

```
GOOGLE_WEB_CLIENT_ID=….apps.googleusercontent.com
```

Backend: `POST /api/auth/google` verifierar `idToken` och loggar in **befintliga** konton (samma e-post).

## 4. Capacitor sync

```bash
export GOOGLE_WEB_CLIENT_ID="….apps.googleusercontent.com"
npm run cap:sync:android
```

Detta injicerar `server_client_id` i `android/.../strings.xml` och patchar manifest.

`capacitor.config.ts` har redan `GoogleAuth.serverClientId` från samma env vid build-time.

## 5. Test

1. Bygg och installera på fysisk Android
2. Logga in med ett konto som **redan finns** (registrerat med samma e-post)
3. Google-knappen visas **endast** på native Android — inte iOS, inte webb

`Platform.googleSignIn.signIn()` → `Capacitor.Plugins.GoogleAuth` → `/api/auth/google`

## Felsökning

| Problem | Kontroll |
|---------|----------|
| "Plugin saknas" | `npm run cap:sync:android` |
| `GOOGLE_ACCOUNT_NOT_FOUND` | Registrera med e-post först, sedan Google |
| `401 Ogiltig token` | Fel Web Client ID |
| Google dialog stängs direkt | SHA-1 matchar inte keystore i Cloud Console |

Se [`google-play-checklist.md`](google-play-checklist.md) för full Play Store-process.
