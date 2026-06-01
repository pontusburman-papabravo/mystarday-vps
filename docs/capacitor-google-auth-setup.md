# Google Sign In — native Android (Sprint 18)

Repo innehåller **UI + backend**. Native plugin installeras i Polsia/Capacitor-projekt:

```bash
npm i @codetrix-studio/capacitor-google-auth --legacy-peer-deps
npx cap sync android
```

Sätt `GOOGLE_WEB_CLIENT_ID` i Render + `capacitor.config.ts` (redan scaffold).

`Platform.googleSignIn.signIn()` anropar `Capacitor.Plugins.GoogleAuth` när plugin finns.
