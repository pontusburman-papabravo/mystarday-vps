# Google Play — Checklista för Min Stjärndag

**Paket:** `se.mystarday.app` · **App-namn:** Min Stjärndag  
**Senast uppdaterad:** 2026-06-08 · **Hosting:** egen VPS (`mystarday.se`)

Detta dokument är er **steg-för-steg-guide** från nuvarande kodbas till Play Store (Internal testing → Production). Teknisk Android-plan finns i [`android.md`](../android.md).

---

## Var ni står idag

| Område | Repo-status | Kräver er åtgärd |
|--------|-------------|------------------|
| Capacitor Android | ✅ `@capacitor/android` + config | Lokal `android/`-mapp (`gitignore`) |
| Google Sign In backend | ✅ `POST /api/auth/google` | `GOOGLE_WEB_CLIENT_ID` i prod |
| Google Sign In native | ✅ Plugin + `platform.js` | OAuth-klienter i Google Cloud |
| FCM server | ✅ `sendFCM()` | `FCM_SERVER_KEY` i prod |
| FCM klient | ✅ `@capacitor/push-notifications` | `google-services.json` i `android/app/` |
| App Links | ✅ `assetlinks.json` route | `ANDROID_SHA256_CERT_FINGERPRINT` |
| Deep links klient | ✅ `deep-link-router.js` | Manifest + SHA256 (patch-skript) |
| Crash reporting | ✅ `crash-reporter.js` | `SENTRY_DSN` i prod |
| Play Console-listing | ○ | Metadata, screenshots, data safety |

**Kort sagt:** Koden är i stort sett klar. Det som återstår är **konton, nycklar, signering och Play Console-setup**.

---

## Översikt — rekommenderad ordning

```
1. Google Play Developer-konto ($25 engångs)
2. Firebase-projekt → FCM + google-services.json
3. Google Cloud OAuth → Web + Android-klienter
4. Prod-env på servern (FCM, Google, SHA256)
5. Lokal build: cap sync → signera AAB
6. Play Console: Internal testing
7. Test på fysisk Android (billig platta!)
8. Gate 24 parity (iOS ↔ Android)
9. Closed/Open testing → Production
```

Internal testing kan starta **före** Gate 25 (fältstudie). Public launch rekommenderas **efter** Gate 24 + 9B enligt [`android.md`](../android.md).

---

## Steg 1 — Google Play Developer-konto

1. Gå till [Google Play Console](https://play.google.com/console)
2. Skapa utvecklarkonto (engångsavgift ~$25)
3. Fyll i utvecklarprofil (företag/privat, kontakt, webbplats `https://mystarday.se`)
4. Skapa app → **Create app** → namn **Min Stjärndag**, språk Svenska, app/spel = App, gratis

---

## Steg 2 — Firebase (push + google-services.json)

FCM kräver ett Firebase-projekt kopplat till samma Google Cloud-projekt som OAuth.

1. [Firebase Console](https://console.firebase.google.com/) → **Add project** (eller använd befintligt)
2. **Add app** → Android → paketnamn `se.mystarday.app`
3. Ladda ner **`google-services.json`**
4. Kopiera till `android/app/google-services.json` (lokalt, committas **inte**)
5. **Project settings → Cloud Messaging** → kopiera **Legacy server key** → `FCM_SERVER_KEY` i prod-env

> **OBS:** Legacy FCM API fungerar med nuvarande `sendFCM()`-implementation. Migrera till HTTP v1 senare om Google stänger legacy.

Verifiera att Gradle plockar upp filen — `android/app/build.gradle` applicerar `google-services`-plugin automatiskt om filen finns.

---

## Steg 3 — Google Cloud OAuth-klienter

I [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials:

| Klient | Typ | Användning |
|--------|-----|------------|
| **Web client** | OAuth 2.0 Web | `GOOGLE_WEB_CLIENT_ID` — backend verifierar idToken, Android plugin `serverClientId` |
| **Android client** | OAuth 2.0 Android | SHA-1 från **release-keystore** + paket `se.mystarday.app` |

### SHA-1 / SHA-256 för release-keystore

```bash
keytool -list -v -keystore mystarday-release.keystore -alias mystarday
```

- **SHA-1** → Google Cloud Android OAuth-klient
- **SHA-256** → `ANDROID_SHA256_CERT_FINGERPRINT` på servern (för App Links)

För **debug**-byggen (lokal test): hämta debug-SHA1 med:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Lägg till debug-SHA1 som extra Android OAuth-klient om ni testar Google login i debug-build.

---

## Steg 4 — Server-env (egen VPS)

Sätt i `.env` på servern (eller motsvarande secrets-hantering) och starta om Node-processen efter ändring:

| Variabel | Exempel | Syfte |
|----------|---------|-------|
| `GOOGLE_WEB_CLIENT_ID` | `123….apps.googleusercontent.com` | Google login |
| `FCM_SERVER_KEY` | `AAAA….` | Android push |
| `ANDROID_SHA256_CERT_FINGERPRINT` | `AA:BB:CC:…` | App Links i `assetlinks.json` |
| `ANDROID_PACKAGE_NAME` | `se.mystarday.app` | (default i kod) |
| `SENTRY_DSN` | `https://…` | Crash-rapportering |

Efter deploy, verifiera:

```bash
curl -sS https://mystarday.se/.well-known/assetlinks.json | jq .
curl -sS https://mystarday.se/api/app-config | jq .googleWebClientId
```

`assetlinks.json` ska innehålla `android_app` med er release-SHA256 (inte bara `web`-fallback).

---

## Steg 5 — Lokal Android-build

### Förutsättningar

- [Android Studio](https://developer.android.com/studio) (senaste stabila)
- JDK 17+
- Node 18+

### Sync + patch

```bash
npm install
npx cap add android          # första gången
export GOOGLE_WEB_CLIENT_ID="….apps.googleusercontent.com"
npm run cap:sync:android
```

`cap:sync:android` kör: `cap sync android` → manifest-patch (App Links, permissions) → strings-patch (`server_client_id`).

### Release-keystore (engång)

```bash
keytool -genkey -v -keystore mystarday-release.keystore \
  -alias mystarday -keyalg RSA -keysize 2048 -validity 10000
```

**Spara keystore + lösenord säkert** — förlorar ni den kan ni inte uppdatera appen på Play.

Lägg i `android/keystore.properties` (lokalt, committas **inte**):

```properties
storeFile=../mystarday-release.keystore
storePassword=DITT_LÖSENORD
keyAlias=mystarday
keyPassword=DITT_LÖSENORD
```

Uppdatera `android/app/build.gradle` med signing config (Android Studio: **Build → Generate Signed Bundle** guidar er).

### Bygg AAB

1. `npm run cap:android` → öppnar Android Studio
2. **Build → Generate Signed Bundle / APK** → **Android App Bundle**
3. `versionCode` / `versionName` i `android/app/build.gradle` (öka `versionCode` varje upload)
4. Output: `app-release.aab`

Nuvarande SDK: `targetSdk 35`, `compileSdk 35` (se `android/variables.gradle`).

---

## Steg 6 — Play Console: Internal testing

1. Play Console → **Testing → Internal testing** → Create release
2. Ladda upp `app-release.aab`
3. Release notes (svenska): t.ex. *"Första interna testversion — inloggning, schema, belöningar, push."*
4. Lägg till testare (e-postlista eller Google Group)
5. Testare får länk att installera via Play Store

### Review-konto för Google

Använd samma konto som iOS:

| Fält | Värde |
|------|-------|
| E-post | `review@mystarday.se` |
| Lösenord | `AppReview2026!` |
| Barn-PIN | `4455` |

Detaljer: [`google-play-review-notes.md`](google-play-review-notes.md)

---

## Steg 7 — Test på fysisk enhet (obligatoriskt)

Kör på **minst en billig/mellanplatta** (inte bara emulator) — se [`android.md`](../android.md) §9A.

| # | Test | Förväntat |
|---|------|-----------|
| 1 | App startar, login laddar | Ingen vit skärm |
| 2 | E-post login | Dashboard |
| 3 | Google Sign In | Dashboard (befintligt konto) |
| 4 | Ingen Apple-knapp | Endast Google + e-post |
| 5 | Push: tillåt → testnotis | Notis <60 s |
| 6 | Push-tap | Rätt skärm (deep link) |
| 7 | Barnläge + PIN | PG fungerar |
| 8 | Hardware/gesture back | Kringgår inte barnläge |
| 9 | App switcher → tillbaka | PG eller korrekt läge |
| 10 | Kamera (profilbild) | Permission-dialog på svenska |

Signera modell + Android-version i testlogg.

---

## Steg 8 — Play Console metadata

**App content (policy-formulär):** [`google-play-app-content.md`](google-play-app-content.md) — svar för varje sektion i "Konfigurera appen".

Kopiera butikstext från [`google-play-metadata.md`](google-play-metadata.md) (baserat på iOS-listing).

Obligatoriskt i Play Console:

- **Short description** (max 80 tecken)
- **Full description** (max 4000)
- **App icon** 512×512 PNG
- **Feature graphic** 1024×500
- **Screenshots** — telefon 16:9 eller 9:16, minst 2 st
- **Privacy policy URL:** `https://mystarday.se/privacy` (eller `/privacy.html`)
- **Kategori:** Family / Education
- **Målgrupp:** Familjer med barn — fyll i **Target audience** ärligt (barn under 13 → Families policy)

### Data safety form

| Datatyp | Samlas in? | Delas? | Krypterat? |
|---------|------------|--------|------------|
| E-post, namn | Ja (konto) | Nej | Ja (HTTPS) |
| Barnprofil (namn, emoji) | Ja | Nej (förälder valt delning till pedagog) | Ja |
| Crash logs (Sentry) | Ja, anonymiserat | Sentry | Ja |
| Push-token | Ja | Nej | Ja |
| Annonser | Nej | — | — |

Ingen PII i crash-breadcrumbs (se P0.6 i app2).

---

## Steg 9 — App Links-verifiering

Efter release-SHA256 är satt på servern:

1. [Statement List Generator and Tester](https://developers.google.com/digital-asset-links/tools/generator)
2. Eller på enhet med appen installerad:

```bash
adb shell pm get-app-links se.mystarday.app
```

Status ska vara `verified` för `mystarday.se`.

---

## Steg 10 — Production

Först när:

- [ ] Internal/Closed testing grön
- [ ] Gate 24 parity signerad (iOS ↔ Android)
- [ ] 9A-testlogg med billig platta
- [ ] Data safety + content rating klara
- [ ] (Rekommenderat) 9B testfamiljer + Gate 25 för full launch

**Promote** release från Internal → Closed → Open → Production i Play Console.

---

## Vanliga problem

| Symptom | Lösning |
|---------|---------|
| Vit WebView | Kontrollera `capacitor.config.ts` server URL, internet-tillgång |
| Google login failar | SHA-1 matchar inte keystore; fel `GOOGLE_WEB_CLIENT_ID` |
| Push kommer inte | `google-services.json` saknas; `FCM_SERVER_KEY` ej satt |
| Deep links öppnar webbläsare | `ANDROID_SHA256_CERT_FINGERPRINT` fel; kör manifest-patch |
| `GOOGLE_ACCOUNT_NOT_FOUND` | Förväntat för nya Google-användare — registrera med e-post först |
| Upload avvisad (targetSdk) | Uppdatera `android/variables.gradle` till senaste Play-krav |

---

## Relaterade dokument

| Fil | Innehåll |
|-----|----------|
| [`VPS-ANDROID-ENV.md`](VPS-ANDROID-ENV.md) | Deploy + env på egen server |
| [`android.md`](../android.md) | Sprint 16–23, Gate 24, parity |
| [`docs/capacitor-android-smoke.md`](capacitor-android-smoke.md) | Sprint 16 smoke |
| [`docs/capacitor-google-auth-setup.md`](capacitor-google-auth-setup.md) | Google Auth plugin |
| [`docs/google-play-review-notes.md`](google-play-review-notes.md) | Review-instruktioner |
| [`docs/google-play-metadata.md`](google-play-metadata.md) | Butikstext |
| [`docs/android-gate-23-checklist.md`](android-gate-23-checklist.md) | Release readiness |
