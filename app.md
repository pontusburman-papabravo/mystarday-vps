# Min Stjärndag — Native app (iOS + Android)

Plan och copy-paste-prompter för att publicera Min Stjärndag som native app i **App Store** och **Google Play**.

Klistra in **en prompt i taget** till en AI-utvecklare. Vänta tills steget är klart och verifierat innan nästa.

---

## Relaterad dokumentation

| Dokument | Innehåll |
|----------|----------|
| **[`app2.md`](app2.md)** | **Masterplan — allt samlat (design, plattform, städ, krav, native)** |
| [`docs/plattform-webb-ios-android.md`](docs/plattform-webb-ios-android.md) | Plattformsmatris (kortversion) |
| [`docs/ios-städ.md`](docs/ios-städ.md) | Teknisk städning efter native-steg 1–10 + webb-fixar |
| [`docs/polsia-kontohantering-a-f.md`](docs/polsia-kontohantering-a-f.md) | Föräldrakonto: e-post, Apple, lösenord |
| [`docs/polsia-barnlogin-design.md`](docs/polsia-barnlogin-design.md) | Barnlogin 3 skärmar + selfie |

**Läs [`app2.md`](app2.md) först** — den samlar produkt, design, städning och native. Denna fil (`app.md`) fokuserar på Capacitor-build steg 1–10.

---

## Lanseringserbjudande & betalning (webb, nuvarande fas)

**Produktbeslut (2026-05-28):**

| # | Beslut | Val |
|---|--------|-----|
| 1 | Lanseringserbjudande | De **första 200 familjerna** som registrerar sig får appen **kostnadsfritt** — obegränsat antal barn, ingen bindningstid |
| 2 | Nuvarande läge | Ca **100 familjer** registrerade (maj 2026) — **ca 100 platser kvar** |
| 3 | Betalning på webben | **Inte aktiv än** — betalningslösningen (Stripe) kommer på plats **efter** att de 200 platserna fyllts eller enligt separat produktbeslut |
| 4 | Betalning i native-appar | **IAP via RevenueCat** (Steg 8) — aktiveras vid App Store / Google Play-lansering, inte före |
| 5 | Env-flaggor | `PAYMENT_ENABLED=false` och `STRIPE_ENABLED=false` ska förbli av tills produktägaren explicit aktiverar betalning |

### Vad som gäller för användare idag

- Alla kan registrera sig och använda appen **utan betalning**
- Landningssidan marknadsför **"De första 200 familjerna — kostnadsfritt"**
- Ingen Stripe-checkout, inget upgrade-flöde, inget trial-banner syns så länge `PAYMENT_ENABLED=false`
- Nya konton får tekniskt `subscription_status: 'trial'` (14 dagar) i DB — men paywall är **avstängd** tills betalning aktiveras

### Kända gaps i kodbasen (ska fixas innan betalning aktiveras)

| Gap | Nuvarande kod | Ska vara |
|-----|---------------|----------|
| Räknare-gräns | `src/routes/landing.js` returnerar `limit: 100` | `limit: 200` |
| Räknare-JS | `public/index.html` har `var LIMIT = 100` | `LIMIT = 200` |
| Progressbar | `(capped / 100) * 100` i animateCounter | `(capped / 200) * 100` |
| DB-kommentar | `db/family-stats.js` refererar till "X/100" | "X/200" |
| Registrering | Nya familjer får 14-dagars trial | Grundarfamiljer (nr 1–200) bör få `lifetime_free` eller `beta` — beslut innan betalning slås på |
| Välkomstmail | "14 dagar gratis" i `src/lib/welcome-mailer.js` | Ska matcha grundarerbjudandet ("kostnadsfritt som grundarfamilj") |

**Marknadsföringstexten (200 familjer) i `public/index.html` är redan korrekt** — backend och räknare är fel (100).

---

## Definition of Done (global)

En feature/steg räknas som **klart** först när alla punkter nedan är uppfyllda (utöver stegspecifika acceptanskriterier):

- [ ] Typecheck/lint passerar (där projektet har det)
- [ ] Inga `console.error` i native (iOS-simulator + Android-emulator/fysisk enhet)
- [ ] **iOS + Android** verifierade manuellt för steget
- [ ] Ingen regression i webb-PWA (samma sidor/flöden som påverkas)
- [ ] Native-specifika flöden gates via `Platform.isNative()` (inte bara user-agent)
- [ ] App Review-risker för steget dokumenterade om de introduceras eller ändras

---

## Versionspolicy

- Använd **stabila** versioner — undvik beta/RC/pre-release
- **Lås Capacitor** inom samma major (t.ex. Capacitor 6.x) — uppgradera inte major utan explicit instruktion
- Uppgradera **inte** Express, Node, Vite, Webpack eller andra kärnberoenden utan explicit instruktion
- Vid `npm install`: välj versioner som matchar befintlig `package-lock.json` om den finns
- Dokumentera avvikelser i commit-meddelande om produktägaren ber om commit

---

## App Review-risk: Remote WebView

Appen använder **Capacitor med remote URL** (`https://mystarday.se`) — ingen bundled app-kopia. Det är tillåtet, men Apple kan avvisa om appen upplevs som "bara en webbplats" (Guideline **4.2**).

För att uppfylla App Store / Play Store-krav ska appen ha **tillräcklig native integration**:

| Krav | Steg |
|------|------|
| Native inloggning (Apple Sign In på iOS) | 3 |
| Native push (APNs / FCM) | 4–5 |
| Native IAP (inte Stripe i app) | 8 |
| Native loading states (skeleton) | 6 |
| Native UX-anpassningar (inga PWA-flöden) | 6 |
| E-post/lösenord som fallback på iOS | 3 |

### Gör INTE i native (4.2 / 3.1.1-risk)

Dessa leder ofta till App Review-avslag:

- Visa **"Öppna i webbläsare"** eller liknande
- Visa **PWA-installguider** ("Lägg till på hemskärmen")
- Länka till **Stripe-checkout** eller extern betalning
- Referera till **webbversionen som alternativ betalväg** ("köp på mystarday.se")
- Framhäva att användaren kan undvika IAP via webben

---

## F0 — Beslut (klara)

| # | Beslut | Val |
|---|--------|-----|
| 1 | Lanseringserbjudande (webb) | **200 grundarfamiljer gratis** — se avsnittet ovan |
| 2 | Betalning (webb, efter grundarfas) | Stripe ~59 kr/mån — **aktiveras senare**, inte nu |
| 3 | Betalning (native-appar) | **IAP via RevenueCat** (StoreKit iOS, Google Play Billing Android) — Steg 8, vid butikslansering |
| 4 | App Store-kategori | **Lifestyle** (Google Play: Family / Lifestyle) |
| 5 | Språk i butiker | **Svenska** vid launch — engelska i senare version |
| 6 | iPad / surfplatta | **Telefon-primary** — fungerar på iPad/Android-platta i kompatibilitetsläge, ingen surfplatte-optimering vid launch |
| 7 | IAP-abstraktion | **RevenueCat** för iOS + Android (StoreKit + Google Play Billing under huven) — inte rå StoreKit/Billing direkt om inte stark skäl |

### Plattformssammanfattning

| Område | iOS (App Store) | Android (Google Play) |
|--------|-----------------|------------------------|
| Wrapper | Capacitor iOS | Capacitor Android |
| App ID | `se.mystarday.app` | `se.mystarday.app` |
| Inloggning | Apple Sign In (krav) + e-post | E-post (+ ev. Google Sign In senare) |
| Push | APNs | FCM (Firebase Cloud Messaging) |
| Betalning | RevenueCat → StoreKit 2 | RevenueCat → Google Play Billing |
| Butik | App Store Connect | Google Play Console |

---

## Teknisk utgångspunkt

- **Stack:** Express + PWA, Capacitor-wrapper
- **Prod:** WebView laddar `https://mystarday.se` (remote URL)
- **Dev:** `CAP_DEV=true` → `http://localhost:3000`
- **Befintlig kod (delvis klart — se Status per steg):**
  - `capacitor.config.ts` — appId, plugins, server URL
  - `public/js/platform.js` — `isNative()`, `isIOS()`, `isAndroid()`, haptics, share, push, appleSignIn
  - `public/js/skeleton.js` — laddningsskelett för native (App Review)
  - Backend: Apple Sign In, native push-token API (`/api/push/register-native`)
  - Push server: APNs + FCM stubs i `src/lib/push-notifications.js`
  - npm-scripts: `cap:sync`, `cap:ios`, `cap:android`, `cap:dev`
- **Saknas än:** `@capacitor/*`-paket, `ios/`/`android/`-projekt (Steg 1)
- **Gitignored:** `ios/`, `android/` — genereras lokalt via `npx cap add`

---

## Globala guardrails (gäller alla steg)

- Svenska UI-texter
- Minimera diff — ändra bara det som behövs för steget
- Bumpa `public/sw.js` `CACHE_NAME` vid frontend-ändringar
- Committa **inte** `ios/` eller `android/` om inte explicit bett
- Committa endast om produktägaren ber om det
- **Webben är GRATIS under grundarfasen** (200 familjer) — `PAYMENT_ENABLED=false` tills produktägaren aktiverar
- **Native ska använda IAP** (iOS + Android) — inte Stripe i apparna
- **Räknare och registrering ska använda gräns 200**, inte 100 (se gaps-tabellen ovan)
- **HTTPS endast** — lägg inte till ATS-undantag i iOS om inte absolut nödvändigt (remote URL kräver TLS)
- Läs `CLAUDE.md` för projektkontext
- Uppfyll **Definition of Done (global)** innan steget markeras klart

---

## Beroendegraf

```
F0 (beslut) ✓
F0b (grundarerbjudande 200) ◐ — kan köras parallellt, före betalning
    ↓
Steg 1 — Capacitor iOS + Android
    ↓
Steg 2 — platform.js på alla sidor
    ↓
Steg 3 — Apple Sign In (iOS)          Steg 3B — Android auth (valfritt/senare)
Steg 4 — Native push (klient) ──→ Steg 5 — APNs + FCM (server)
Steg 2 → Steg 6 — Native UX-polish
Steg 7 — Juridik & butiksmetadata (parallellt)
Steg 8 — IAP iOS + Google Play Billing
Steg 9 — TestFlight + Play Internal Testing
Steg 10 — Review & launch
```

**Parallellt möjligt:** Steg 7 när som helst efter steg 1. Steg 3 och 4 efter steg 2.

---

## Status per steg (2026-05-28)

Verifierat mot kodbasen efter synk med produktion. Acceptanskriterierna i varje steg nedan är fortfarande `[ ]` om inget annat anges.

| Steg | Status | Detaljer |
|------|--------|----------|
| **F0** | ✓ Beslut | 200 grundarfamiljer gratis · betalning senare · IAP via RevenueCat i native (Steg 8) |
| **F0b** | ◐ Delvis | Landningssida säger 200 — backend/räknare har fortfarande 100 · registrering ger trial, inte lifetime_free |
| **1** | ○ Ej påbörjat | `capacitor.config.ts` + npm-scripts (`cap:sync` m.fl.) finns · **inga** `@capacitor/*`-paket i `package.json` · inga `ios/`/`android/`-projekt |
| **2** | ◐ Delvis | `platform.js` laddas på: dashboard, child-dashboard, child-login, family-week · **saknas** på login, register, onboarding, settings, schedule, reports |
| **3** | ◐ Delvis | Backend (`/api/auth/apple`, `/link`) + UI på login/register + `platform.js` `appleSignIn` · login/register saknar `platform.js` → native Apple Sign In fungerar inte där än · `docs/app-store-apple-sign-in.md` saknas · kontoradering kräver lösenord (blockerar Apple-only) |
| **3B** | ○ Ej påbörjat | Valfritt — e-post fungerar på Android |
| **4** | ○ Ej påbörjat | `push-manager.js` = enbart Web Push (VAPID) · native token-API finns men klienten anropar det inte |
| **5** | ○ Ej påbörjat | `sendAPNs` / `sendFCM` är stubs i `push-notifications.js` |
| **6** | ◐ Delvis | `skeleton.js` på dashboard + child-dashboard · PWA-install/analytics-gating ej gjort |
| **7** | ○ Ej påbörjat | `/privacy` finns · `/terms` saknas · inga butiksmetadata-dokument |
| **8–10** | ○ Ej påbörjat | IAP, TestFlight/Internal Testing, review-guider |

**Nästa rekommenderade steg:** Steg 1 → Steg 2 → Steg 3 (i den ordningen).

### Not: F0 webb gratis vs nuvarande kod

**Webben är gratis idag** — `PAYMENT_ENABLED=false` döljer all betalnings-UI (trial-banner, upgrade-länkar). Stripe-kod finns (`upgrade.html`, webhooks) men är **inaktiv**.

**Tidslinje:**
1. **Nu (grundarfas):** 200 familjer gratis, ~100 registrerade, ingen betalning
2. **Senare (webb):** Stripe aktiveras när produktägaren sätter `PAYMENT_ENABLED=true` — troligen efter att 200-platserna fyllts
3. **Senare (native):** IAP via RevenueCat vid App Store / Google Play-lansering (Steg 8) — gate:a bort Stripe i native

Steg 8 ska aldrig visa Stripe i native-apparna (Apple 3.1.1 / Google Play policy).

### Not: `platform.js` vs `capacitor.config.ts`

`platform.js` har redan shims (haptics, push, appleSignIn) via dynamiska imports. `capacitor.config.ts` kommenterar att vissa plugins är "deferred" — det betyder att **Capacitor-paketen inte är installerade än** (Steg 1), inte att klientkoden saknas.

---

## F0b — Synka grundarerbjudande (200 familjer)

**Prioritet:** Hög — ska fixas innan betalning aktiveras. Kan köras parallellt med native-stegen.

```
Uppgift: F0b — Synka grundarerbjudandet (200 familjer gratis)

Kontext (produktbeslut 2026-05-28):
- De första 200 familjerna får appen kostnadsfritt
- Ca 100 familjer registrerade idag — ca 100 platser kvar
- Betalning (Stripe) är INTE aktiv — PAYMENT_ENABLED=false
- Marknadsföringstexten i public/index.html säger redan "200 familjer"
- Backend och räknare har felaktigt gräns 100

Gör:
1. src/routes/landing.js — ändra limit: 100 → limit: 200 (både success och fail-safe)
2. public/index.html — ändra var LIMIT = 100 → LIMIT = 200
3. public/index.html — fixa animateCounter: (capped / 100) → (capped / 200)
4. db/family-stats.js — uppdatera kommentar till "X/200 familjer"
5. Verifiera att founderCta/familyCounter visar "X/200" och progressbar skalar mot 200
6. Bumpa public/sw.js CACHE_NAME om index.html ändras

Gör INTE (vänta på separat beslut):
- Aktivera PAYMENT_ENABLED eller Stripe
- Ändra registreringslogik till lifetime_free/beta (kräver produktägarens beslut)
- Ändra välkomstmail-text

Acceptanskriterier:
- [ ] GET /api/landing/stats returnerar { count: N, limit: 200 }
- [ ] Landningssidan visar "X/200 familjer har redan gått med"
- [ ] Progressbar når 50% vid 100 familjer (inte 100%)
- [ ] Founder-CTA döljs först vid count >= 200
- [ ] Inga betalningsflöden aktiverade

Filer: src/routes/landing.js, public/index.html, db/family-stats.js, public/sw.js
```

---

## Steg 1 — Capacitor & native-projekt (iOS + Android)

```
Uppgift: Steg 1 — Capacitor & native-projekt (iOS + Android)

Kontext:
Min Stjärndag är en svensk familjeapp (Express + PWA). Vi ska wrappa den i Capacitor för App Store och Google Play.
- App ID: se.mystarday.app
- App Name: Min Stjärndag
- Prod laddar https://mystarday.se i WebView (remote URL, ingen bundled copy)
- Dev: CAP_DEV=true → http://localhost:3000
- capacitor.config.ts finns redan
- public/js/platform.js finns (native abstraction layer)
- ios/ och android/ är gitignored — genereras lokalt

Gör:
1. Installera Capacitor-paket i package.json:
   @capacitor/core, @capacitor/cli, @capacitor/ios, @capacitor/android,
   @capacitor/splash-screen, @capacitor/status-bar, @capacitor/keyboard,
   @capacitor/haptics, @capacitor/share, @capacitor/push-notifications,
   @sign-in-with-apple/native
2. Kör npx cap add ios och npx cap add android
3. Kör npx cap sync
4. Verifiera att båda projekten bygger:
   - iOS: Xcode simulator
   - Android: emulator eller fysisk enhet
5. Konfigurera app-ikon och splash (generate-icons.js, apple-touch-icon.png, icon-512.png finns)
6. iOS: TARGETED_DEVICE_FAMILY = iPhone (1) — fungerar på iPad i kompatibilitetsläge
7. Android: phone-primary — fungerar på surfplatta i kompatibilitetsläge, ingen tablet-optimering
8. Android: **targetSdk** = senaste som Google Play kräver vid build; **minSdk** endast om explicit kompatibilitetskrav finns — dokumentera val i capacitor.config / build.gradle
9. iOS: **App Transport Security** — endast HTTPS till mystarday.se; lägg inte till `NSAllowsArbitraryLoads` eller ATS-undantag utan produktägarens godkännande
10. Dokumentera npm-scripts i capacitor.config.ts (cap:sync, cap:ios, cap:android, cap:dev)
11. Följ **Versionspolicy** — stabila Capacitor-paket, samma major

Gör INTE:
- Store-signering, TestFlight, Play Console-uppladdning
- Ändra backend eller betalningslogik
- Commit om jag inte ber om det

Acceptanskriterier:
- [ ] npm install fungerar med alla Capacitor-paket
- [ ] npx cap sync utan fel
- [ ] iOS Xcode-projekt bygger och laddar mystarday.se
- [ ] Android-projekt bygger och laddar mystarday.se
- [ ] window.Capacitor och window.Platform.isNative() returnerar true i båda apparna

Filer: package.json, package-lock.json, capacitor.config.ts, ios/ (lokal), android/ (lokal)
```

---

## Steg 2 — platform.js på alla sidor

```
Uppgift: Steg 2 — Ladda platform.js på alla relevanta sidor

Kontext:
public/js/platform.js exponerar window.Platform (isNative, isIOS, isAndroid, haptics, share, push, appleSignIn).
Den laddas idag på: dashboard.html, child-dashboard.html, child-login.html, family-week.html.
Den saknas på login.html och register.html trots att Apple Sign In-knappar finns där.

Gör:
1. Ladda platform.js tidigt i <head> (före andra app-scripts) på minst:
   login.html, register.html, onboarding.html, settings.html, schedule.html, reports.html
2. Verifiera att inga sidor som anropar window.Platform saknar scriptet
3. Bumpa cache-bust-version på platform.js där det ändras
4. Bumpa public/sw.js CACHE_NAME om du ändrar statiska assets

Gör INTE:
- Implementera Apple Sign In-logik (steg 3)
- Ändra backend
- Commit om jag inte ber om det

Acceptanskriterier:
- [ ] platform.js laddas på login, register och alla inloggade föräldrasidor
- [ ] Inga JS-fel "window.Platform is undefined" på centrala sidor
- [ ] Apple Sign In-sektionen kan visas i native iOS (Platform.isIOS/isNative)
- [ ] isAndroid() fungerar i Android-appen

Filer: public/login.html, public/register.html, public/onboarding.html, public/settings.html, public/schedule.html, public/reports.html, public/sw.js
```

---

## Steg 3 — Apple Sign In end-to-end (iOS)

```
Uppgift: Steg 3 — Apple Sign In end-to-end (iOS)

Kontext:
Backend är delvis klart:
- POST /api/auth/apple — verifierar JWT mot Apple JWKS, skapar/länkar parent
- POST /api/auth/apple/link — länkar Apple ID till befintligt konto
- Migration: apple_user_id, apple_email på parent-tabellen
- public/js/platform.js har appleSignIn.signIn() med @sign-in-with-apple/native
- login.html och register.html har UI + handleAppleLogin/handleAppleRegister
- clientId: se.mystarday.app, redirectUri: se.mystarday.app://oauth-callback

Gör:
1. Konfigurera Xcode-projektet:
   - Sign in with Apple capability
   - URL scheme: se.mystarday.app (för OAuth callback)
2. Skriv docs/app-store-apple-sign-in.md med exakt Apple Developer-konfiguration:
   App ID, Service ID, domänverifiering mystarday.se, .p8-nyckel, redirect URIs
3. Verifiera att native appleSignIn.signIn() returnerar idToken och att POST /api/auth/apple fungerar
4. Testa flöden: ny användare, befintlig Apple-användare, APPLE_EMAIL_EXISTS → länkningsprompt
5. Undersök kontoradering för Apple-only-konton (settings kräver lösenord idag) — fixa om det blockerar
6. **Fallback auth:** E-post/lösenord ska alltid fungera på iOS (Apple Sign In kan faila i simulator/TestFlight/review) — visa båda vägarna tydligt

Gör INTE:
- Push (steg 4–5), StoreKit (steg 8)
- Google Sign In (steg 3B, senare)
- Commit om jag inte ber om det

Acceptanskriterier:
- [ ] Apple Sign In fungerar i iOS-appen
- [ ] E-post/lösenord fungerar som fallback på iOS (review + support)
- [ ] Ny + befintlig användare + länkningsflöde fungerar
- [ ] docs/app-store-apple-sign-in.md komplett

Filer: public/js/platform.js, public/login.html, public/register.html, src/routes/auth.js, docs/app-store-apple-sign-in.md, ios/ (lokal)
```

---

## Steg 3B — Android auth (senare / valfritt)

```
Uppgift: Steg 3B — Android-inloggning (valfritt, ej blockerande för launch)

Kontext:
- iOS kräver Apple Sign In (Guideline 4.8) — redan i steg 3
- Android har inget motsvarande krav
- E-post/lösenord fungerar redan på båda plattformar
- Google Sign In kan läggas till senare för bättre UX

Gör (om scope inkluderas):
1. Utvärdera om Google Sign In behövs vid launch eller kan vänta
2. Om ja: backend POST /api/auth/google + platform.js googleSignIn shim
3. Visa Google-knapp på login/register endast på Android (Platform.isAndroid())
4. Dokumentera i docs/android-google-sign-in.md

Gör INTE:
- Blockera Android-launch om detta inte hinner med

Acceptanskriterier:
- [ ] Beslut dokumenterat: Google Sign In vid launch ja/nej
- [ ] E-post/lösenord fungerar i Android-appen oavsett

Filer: docs/android-google-sign-in.md (om implementerat: src/routes/auth.js, public/js/platform.js)
```

---

## Steg 4 — Native push (klient, iOS + Android)

```
Uppgift: Steg 4 — Native push-notiser (iOS + Android klient)

Kontext:
- public/js/platform.js har push.register/unregister via @capacitor/push-notifications
- public/js/push-manager.js använder ENBART Web Push (VAPID) — fungerar INTE i Capacitor
- Backend: POST /api/push/register-native, POST /api/push/unregister-native
- db/push-subscriptions.js: native_token + platform ('ios'|'android')
- Server stubs: sendAPNs (iOS), sendFCM (Android) — steg 5 fixar

Gör:
1. Uppdatera push-manager.js:
   - Platform.isNative() → Platform.push.register/unregister
   - Web → behåll VAPID-flöde
2. Uppdatera settings.html push-UI — dölj PWA-installationskrav i native
3. iOS Xcode: Push Notifications + Background Modes → Remote notifications
4. Android: google-services.json, Firebase-projekt, FCM setup i android/app/
5. Verifiera token-registrering: platform=ios respektive platform=android
6. **Push-token lifecycle:**
   - Re-registrera token vid app launch (efter tillstånd beviljat)
   - Hantera token refresh/rotation från OS (ersätt gammal token i DB)
   - Ta bort token vid logout (`unregister-native` + rensa lokalt state)

Gör INTE:
- Server-side APNs/FCM (steg 5)
- Commit om jag inte ber om det

Acceptanskriterier:
- [ ] Push kan aktiveras/avaktiveras i native på båda plattformar
- [ ] Token sparas i push_subscriptions med rätt platform
- [ ] Token re-registreras vid launch; borttagen vid logout
- [ ] Web-push oförändrat i PWA
- [ ] Ingen PWA-installationsprompt för push i native

Filer: public/js/push-manager.js, public/js/platform.js, public/settings.html, public/sw.js, ios/ (lokal), android/ (lokal)
Dokumentation: docs/android-fcm-setup.md
```

---

## Steg 5 — Push backend (APNs + FCM)

```
Uppgift: Steg 5 — Push backend (APNs iOS + FCM Android)

Kontext:
src/lib/push-notifications.js har sendAPNs() och sendFCM() som stubs.
Web push via web-push/VAPID fungerar redan.

Gör:
1. Implementera sendAPNs (t.ex. node-apn) — env: APNs_KEY_ID, APNs_TEAM_ID, APNs_KEY_PATH
2. Implementera sendFCM (firebase-admin eller FCM HTTP v1) — env: FCM_SERVICE_ACCOUNT eller FCM_SERVER_KEY
3. Payload med title, body, deep link URL för båda plattformar
4. Hantera ogiltiga tokens — rensa från push_subscriptions
5. Dev/admin test-endpoint för test-push (env-gated)
6. Dokumentera: docs/app-store-apns.md, docs/android-fcm-backend.md

Gör INTE:
- Ändra klient (steg 4 ska vara klart)
- Commit om jag inte ber om det

Acceptanskriterier:
- [ ] Push skickas till iOS (APNs) och Android (FCM) när env är konfigurerat
- [ ] Ogiltiga tokens rensas
- [ ] Web push oförändrat
- [ ] Dokumentation komplett för båda plattformar

Filer: src/lib/push-notifications.js, package.json, docs/app-store-apns.md, docs/android-fcm-backend.md
```

---

## Steg 6 — Native UX-polish (iOS + Android)

```
Uppgift: Steg 6 — Native UX-polish (App Review / Play Review-vänligt)

Kontext: Se avsnittet **App Review-risk: Remote WebView** (4.2) — detta steg är centralt för att appen inte upplevs som "bara en webbplats".

Kontext (F0):
- Telefon-primary, fungerar på iPad/surfplatta i kompatibilitetsläge
- Lifestyle, svenska UI
- Webb gratis, IAP i native

Gör:
1. Gate pwa-install.js: isNeeded()=false när Platform.isNative()
2. Dölj PWA-guider i dashboard, settings, onboarding, login (native)
3. Native: stäng av eller gate cookie-banner analytics/marketing (GA4, Meta Pixel)
   - iOS: ATT om tracking kvarstår — dokumentera Privacy Labels
   - Android: GDPR consent, ingen tracking utan samtycke i native
4. Säkerställ skeleton-laddning i native (dashboard, child-dashboard)
5. Offline: visa /offline.html eller vänligt fel vid nätverksfel
6. Förbered APP_STORE_LIVE / PLAY_STORE_LIVE flagga (default false) för FAQ-uppdatering efter launch

Gör INTE:
- IAP (steg 8)
- Commit om jag inte ber om det

Acceptanskriterier:
- [ ] Ingen "Lägg till på hemskärmen" i native (iOS + Android)
- [ ] Analytics/tracking beteende dokumenterat per plattform
- [ ] Nätverksfel visar vänligt meddelande
- [ ] Skeleton vid laddning i native

Filer: public/js/pwa-install.js, public/js/cookie-banner.js, public/index.html, public/login.html, public/onboarding.html, public/js/skeleton.js, public/sw.js
```

---

## Steg 7 — Juridik & butiksmetadata (iOS + Android)

```
Uppgift: Steg 7 — Juridik & butiksmetadata

Kontext (F0):
- Lifestyle / Family
- Svenska vid launch
- /privacy finns, /terms saknas
- Kontoradering: Inställningar → Radera konto

Gör:
1. Skapa /terms (användarvillkor) — svenska
2. Länka terms från register.html, settings.html, footer
3. Uppdatera /privacy:
   - push tokens (APNs + FCM)
   - Apple ID (Sign in with Apple)
   - IAP via Apple/Google, webben gratis
4. docs/app-store-connect-metadata.md (iOS, svenska)
5. docs/google-play-metadata.md (Android, svenska)
6. Privacy/data safety för båda:
   - App Store Nutrition Labels
   - Google Play Data safety form
7. docs/app-store-demo-konto.md — testkonto för Apple Review och Google Play review

Gör INTE:
- IAP-kod (steg 8)
- Commit om jag inte ber om det

Acceptanskriterier:
- [ ] /terms live och länkad
- [ ] /privacy uppdaterad för native + IAP
- [ ] Metadata-dokument för App Store Connect och Google Play Console
- [ ] Demo-konto-spec för båda plattformar

Filer: public/terms.html, public/privacy.html, public/register.html, public/settings.html, docs/app-store-connect-metadata.md, docs/google-play-metadata.md, docs/app-store-demo-konto.md
```

---

## Steg 8 — In-App Purchase (iOS StoreKit + Android Google Play Billing)

```
Uppgift: Steg 8 — IAP iOS (StoreKit) + Android (Google Play Billing)

Kontext (F0 — KRITISKT):
- Native-appar: betalning via respektive butiks IAP
- Grundarfas: 200 familjer gratis (F0b) · betalning på webben aktiveras senare via Stripe
- family_subscriptions (tier: lifetime_free|trial|paid, components JSONB)
- Stripe finns — får INTE användas i native-apparna

Gör:
1. IAP-lösning (F0-beslut): **RevenueCat** SDK för iOS + Android
   - Under huven: StoreKit 2 (iOS) + Google Play Billing (Android)
   - RevenueCat hanterar subscription state, restore purchases, server-verifiering
   - Avvik till rå StoreKit/Billing endast om produktägaren uttryckligen instruerar annat
2. Skapa produkter i App Store Connect och Google Play Console (produktägaren) — koppla till RevenueCat:
   - "Min Stjärndag Basic" månadsabonnemang (~59 SEK, matcha subscription-components.js)
   - Samma product/logic-ID på båda plattformar om möjligt
3. Native: upgrade/trial-UI via IAP — INTE Stripe
4. Gate ALL Stripe/upgrade-UI:
   - Platform.isNative() → visa IAP
   - Web → inget betalningsflöde under grundarfasen (PAYMENT_ENABLED=false)
5. Backend webhooks:
   - App Store Server Notifications → uppdatera family_subscriptions
   - Google Play Real-time developer notifications → samma
6. Server-side köpverifiering för båda plattformar
7. Hantera befintliga lifetime_free/trial utan att bryta dem
8. docs/app-store-iap.md + docs/google-play-billing.md

Gör INTE:
- Stripe checkout i native-appar (Apple 3.1.1, Google Play policy)
- Länka till extern betalning från native-appar
- Aktivera betalning på webben utan produktägarens explicit beslut
- Commit om jag inte ber om det

Acceptanskriterier:
- [ ] IAP-köp fungerar i Sandbox (iOS) och test (Android)
- [ ] family_subscriptions uppdateras efter köp på båda plattformar
- [ ] Ingen Stripe-länk i native-apparna
- [ ] Webben utan betalningsflöden
- [ ] Dokumentation komplett för båda plattformar

Filer: ny src/routes/iap.js eller apple-iap.js + google-play.js, db/family-subscriptions.js, public/js/dashboard.js, public/upgrade.html, config/subscription-components.js, docs/app-store-iap.md, docs/google-play-billing.md
```

---

## Steg 9 — Testdistribution (TestFlight + Play Internal Testing)

```
Uppgift: Steg 9 — TestFlight (iOS) + Play Internal Testing (Android)

Kontext:
Steg 1–8 klara. Kräver Apple Developer + Google Play Developer-konto (produktägare).

Gör:
1. docs/app-store-testflight-checklist.md — Archive → Upload → TestFlight
2. docs/google-play-internal-testing-checklist.md — AAB upload → Internal testing
3. docs/native-app-test-checklist.md — gemensam testmatris (minst 25 testfall):
   - Apple Sign In (iOS), e-post login (båda)
   - Barn-PIN, schema, stjärnor, belöningar
   - Push aktivera → ta emot notis (iOS + Android)
   - IAP Sandbox/test-köp (båda)
   - Kontoradering
   - Offline/nätverksfel
   - iPad/surfplatta kompatibilitetsläge
4. Review Notes-mall för Apple (engelska) och Google Play (engelska)

Gör INTE:
- Ny funktionalitet om inte test avslöjar buggar
- Commit om jag inte ber om det (dokumentation OK)

Acceptanskriterier:
- [ ] Testflight-checklista (iOS)
- [ ] Play Internal Testing-checklista (Android)
- [ ] Gemensam testmatris med plattformskolumn (iOS/Android/Båda)
- [ ] Review Notes för båda butiker

Filer: docs/app-store-testflight-checklist.md, docs/google-play-internal-testing-checklist.md, docs/native-app-test-checklist.md
```

---

## Steg 10 — Review & launch (App Store + Google Play)

```
Uppgift: Steg 10 — Review & launch-förberedelse (iOS + Android)

Kontext (F0):
- Lifestyle, svenska, telefon-primary
- IAP i native, webb gratis
- Demo-konto i docs/app-store-demo-konto.md

Gör:
1. docs/app-store-review-guide.md:
   - 4.2, 4.8, 3.1.1, 5.1 (iOS)
   - Review Notes engelska
2. docs/google-play-review-guide.md:
   - Families policy (app för barn — föräldrakontrollerad)
   - Billing policy, Data safety
   - Review Notes engelska
3. docs/native-app-launch-checklist.md:
   - Uppdatera index.html FAQ → App Store + Google Play länkar
   - Butiks-badges på landningssida
   - APP_STORE_LIVE / PLAY_STORE_LIVE flaggor (default false)
   - Verifiera demo-konto i prod
4. Vanliga avslag och svar-mallar för båda plattformar

Gör INTE:
- Skicka in till review (produktägaren)
- Commit om jag inte ber om det

Acceptanskriterier:
- [ ] Review-guide för App Store och Google Play
- [ ] Launch-checklista med båda butiker
- [ ] Review Notes engelska redo
- [ ] Store-länkar dolda tills godkännande (flaggor)

Filer: docs/app-store-review-guide.md, docs/google-play-review-guide.md, docs/native-app-launch-checklist.md, public/index.html
```

---

## Produktägaren gör (ej AI)

### AI-agenten får INTE

- Skapa eller konfigurera **Apple Developer**-resurser (App ID, certificates, provisioning)
- Skapa eller konfigurera **Google Play Console**-resurser (app-post, signing keys)
- Acceptera **avtal** (Apple, Google, RevenueCat)
- Ändra **skatt/bank** eller utbetalningsinställningar
- Ladda upp **produktionsbuilds** till App Store Connect / Play Console utan explicit instruktion
- Skicka in app till **review** eller publicera i butik
- Skapa **IAP-produkter** i butikerna (endast dokumentera vad som behövs)

### Produktägaren gör manuellt

| Uppgift | Plattform |
|---------|-----------|
| Apple Developer Program (99 USD/år) | iOS |
| Google Play Developer (engångsavgift) | Android |
| App Store Connect — app-post, IAP-produkter, RevenueCat-koppling | iOS |
| Google Play Console — app-post, subscriptions, RevenueCat-koppling | Android |
| RevenueCat-projekt + API-nycklar (iOS + Android apps) | Båda |
| APNs .p8-nyckel | iOS |
| Firebase-projekt + google-services.json | Android |
| Bank/skatteinfo för IAP-intäkter | Båda |
| Skapa demo-konto i prod | Båda |
| Skicka in till review | Båda |
| Skärmdumpar (iPhone 6.7", 6.5"; Android phone) | Båda |

---

## Ordning (sammanfattning)

| # | Steg | iOS | Android | Komplexitet |
|---|------|-----|---------|-------------|
| 1 | Capacitor-projekt | ✓ | ✓ | Medel |
| 2 | platform.js | ✓ | ✓ | Låg |
| 3 | Apple Sign In | ✓ | — | Hög |
| 3B | Google Sign In | — | ○ senare | Medel |
| 4 | Push klient | ✓ | ✓ | Hög |
| 5 | Push server | ✓ | ✓ | Hög |
| 6 | Native UX | ✓ | ✓ | Medel |
| 7 | Juridik/metadata | ✓ | ✓ | Medel |
| 8 | IAP | ✓ | ✓ | Hög |
| 9 | Testdistribution | ✓ | ✓ | Medel |
| 10 | Review & launch | ✓ | ✓ | Medel |

---

*Senast uppdaterad: 2026-05-28 · Grundarerbjudande (200 familjer) + betalning senare · Review-feedback (DoD, versionspolicy, Remote WebView, RevenueCat, release ownership) · iOS + Android*
