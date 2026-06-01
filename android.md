# Min Stjärndag — android.md (Android native)

## Version 1.1

**Skapad:** 2026-05-28 · **Dokumentversion:** `1.1`

---

## Styrning (läs först)

**`android.md` är ett tilläggsdokument till [`app2.md`](app2.md).**

| Regel | |
|-------|---|
| **Konflikt** | Vid motsägelse gäller **`app2.md`** |
| **Scope** | Detta dokument beskriver **endast** Android-specifika implementationer som **inte** redan täcks av app2 |
| **Gemensam produkt** | Sprint **1–15** + all logik i app2 (Fas A+, push, 9A/9B, 10/10) är **styrande** |
| **Android-spår** | Sprint **16–23** = Android-specifika luckor ovanpå den gemensamma basen |

Utan denna ordning riskerar Android-planen att leva sitt eget liv.

> **Plattformsstäd:** [`docs/ios-städ.md`](docs/ios-städ.md) v2.1 · **Capacitor:** [`app.md`](app.md) · **Polsia:** [`docs/polsia-sprint-koordinering.md`](docs/polsia-sprint-koordinering.md)

---

## Uppdelning (det som fungerar i små team)

| Spår | Sprint | Dokument |
|------|--------|----------|
| **Gemensam produktutveckling** | 1–15 | `app2.md` + `ios-städ.md` |
| **Android-specifika luckor** | 16–23 | `android.md` (detta dokument) |

Sprint **1–15** bygger **samma kod** för `Platform.isNative()`. Android är **inte** Play-klar när bara iOS/TestFlight är grön.

**Beredskap efter sprint 23:** ungefär **8,5–9/10 Android-teknisk beredskap** (se [§ Vad saknas för 10/10](#vad-saknas-för-1010-enligt-app2) — det är främst fält, synk och barn-wow, inte fler menyer).

---

## Produktägare — rekommenderad makroordning

Följer **`app2.md`** (inte android.md):

```
Fas A+ (The Core)          ← sprint 1–15 / ios-städ Release-gate
    ↓
Barnlogin P1               ← sprint 5a–5c
    ↓
Push (APNs + FCM)          ← gemensam + sprint 19–20
    ↓
Dashboard                  ← app2 (efter push)
    ↓
Crashlytics/Sentry         ← sprint 20.5 (P0.6) — före 9B
    ↓
9A (intern QA)             ← obligatorisk billig Android-platta (nedan)
    ‖
Android sprint 16–23       ← kan köras parallellt med 9A-förberedelse på iOS
    ↓
Deep Links                 ← sprint 22 — före 9B (push + route måste testas ihop)
    ↓
9B (testfamiljer)
    ↓
20 familjer × 4–6 veckor   ← app2 §16.6 — i praktiken 10/10
    ↓
Live-synk (SSE)            ← app2 §16.4
    ↓
Barn-wow-polish            ← app2 §16.5
```

**Skillnad 8,5 → 10:** robusthet, synk, push, barnläge och **verklig användning** — inte fler skärmar.

---

## Förutsättningar (måste vara klart först)

| Gate | Var |
|------|-----|
| Sprint 1–15 gröna | `docs/polsia-sprint-koordinering.md` Del A |
| Fas A+ Release-gate | `docs/ios-städ.md` — Auth, UI, PG, Navigation |
| `platform.js` frys | `isAndroid()`, inga Capacitor-checks i views |
| PG + Session Gate | Samma `device_mode` på Android |
| UI-gating `.is-native` | Gäller Android WebView |

---

## 9A — obligatorisk enhet (Android)

**Minst en fysisk låg-/mellanprisenhet måste ingå i 9A** — inte bara emulator eller flaggskepp.

Målgruppen använder ofta:

- Lenovo Tab (A/M-serien)
- Samsung Galaxy Tab A / A-serien telefon
- Äldre Android-plattor (8–10″)

**Inte** Pixel 9 Pro / Galaxy S Ultra som enda Android-bevis.

| Krav | Detalj |
|------|--------|
| Enhetstyp | Minst **en** surfplatta eller telefon i låg/mellansegment |
| Tester | Login, PG, tab bar, push-tap → rätt route (efter sprint 22) |
| Signering | Modell + Android-version i 9A-testlogg |

Se `app2.md` Steg 9A.

---

## iOS vs Android — snabbmatris

| Område | iOS | Android |
|--------|-----|---------|
| **Store** | App Store / TestFlight | Google Play / Internal testing |
| **Vuxen login (P0.2)** | Native **Apple** Sign In | Native **Google** Sign In + e-post |
| **Apple-knapp** | Ja (native + Safari) | **Nej** — `isAppleSignInAvailable()` false |
| **Push** | APNs (`sendAPNs` ◐ implementerad) | **FCM** (`sendFCM` stub — måste implementeras) |
| **Deep links** | Universal Links + AASA | **App Links** + `assetlinks.json` — **sprint 22, före 9B** |
| **Review-konto** | `review@mystarday.se` | Samma konto — verifiera på Android |
| **Betalning (senare)** | StoreKit via RevenueCat | Google Play Billing via RevenueCat |
| **Biometri PG** | Face ID / Touch ID | Fingerprint / device credential |
| **Back / system** | Edge swipe | **Hardware back, gesture back, app switcher** — sprint **21** |

---

## Plattformsmatris — inloggning (obligatorisk)

| Kontext | Apple | Google | Implementation |
|---------|-------|--------|----------------|
| **Native Android** | ❌ | ✅ Native | Capacitor Google Auth plugin |
| **Native iOS** | ✅ Native | Valfritt | — |
| **Android Chrome (webb)** | ❌ | ❌ | E-post/lösenord |
| **Desktop webb** | Valfritt | Valfritt | E-post/lösenord |

**Förbjudet:** WebView → Safari/Chrome OAuth → tillbaka (web-wrapper-känsla).

---

## Vad som redan fungerar (delad kod)

Efter sprint 1–15 utan extra Android-arbete bör detta fungera på Android WebView:

- E-post/lösenord login
- Parental Gate + `device_mode` (om 3a–3c gröna)
- UI-gating (ingen PWA-text i native)
- Native tab bar (4a–4c)
- Barnlogin P1 (5a–5c)
- Offline-kö + barnvy
- `is_lifetime_free` middleware

**Verifiera alltid på fysisk enhet** — Android back och app switcher är aggressivare än iOS.

---

## Android-specifikt — måste byggas (sprint 16–23)

### Sprint 16 — Capacitor Android-projekt

| Krav | Detalj |
|------|--------|
| Paket | `@capacitor/android` + sync (se `app.md` Steg 1) |
| `android/` | Genereras lokalt (`gitignore`) — inte i repo |
| Prod URL | `https://mystarday.se` via `capacitor.config.ts` |
| Bygg | Android Studio — emulator + **fysisk** låg/mellan-enhet |
| SDK | `targetSdk` = senaste Play-krav vid release; dokumentera i build |

**Acceptans:**
- [ ] `npx cap sync android` utan fel
- [ ] App startar, `Platform.isNative()` === true
- [ ] `body.is-native` sätts vid start

---

### Sprint 17–18 — Google Sign In (P0.2 — Android-del)

**Status idag:** Apple finns delvis; **Google native + backend kan saknas.**

#### Backend (17)

| Endpoint | Spec |
|----------|------|
| `POST /api/auth/google` | Ta emot `idToken` från Google; verifiera mot Google certs |
| Session | Samma cookie/session-mönster som Apple/e-post |
| CSRF | Exempt om POST (likt `/auth/apple`) |
| Nya användare | `onboarding_completed` → `/onboarding` |

**Env:** `GOOGLE_CLIENT_ID` (+ ev. Android client ID i Google Cloud Console)

#### Klient (18)

```javascript
// Endast i platform.js
Platform.isGoogleSignInAvailable()  // true endast native Android
Platform.googleSignIn.signIn()
```

- Google-knapp **endast** när `Platform.isGoogleSignInAvailable()`
- **Ingen** Apple-knapp på Android native

**Acceptans (app2 §14.3):** Google + e-post på Android; ingen Apple-knapp.

---

### Sprint 19–20 — Push — FCM

**Status idag:** `sendFCM()` är **stub** i `src/lib/push-notifications.js`.

| Del | Krav |
|-----|------|
| Server (19) | FCM HTTP v1; env `FCM_SERVICE_ACCOUNT_JSON` eller `FCM_SERVER_KEY`; rensa ogiltiga tokens |
| Klient (20) | `@capacitor/push-notifications`; `push-manager.js` + `platform=android` |

**Acceptans (app2 §14.4):** Token i DB; test-notis <60 s på **fysisk** Android.

**Varför deep links före 9B:** Push ska testas med **deep link + rätt route** — inte bara banner i förgrund.

---

### Sprint 20.5 — Android observability (P0.6)

**Egen sprint** — annars skjuts crash SDK upp till release-gate utan implementation.

| Krav | Detalj |
|------|------|
| SDK | Sentry **eller** Firebase Crashlytics på Android build |
| Test | Avsiktlig test-crash verifierad i dashboard |
| Stack traces | Android-symbolikering fungerar |
| Release metadata | App-version + **git commit** (eller build-id) syns |
| GDPR | **Ingen PII** i breadcrumbs/extra (app2 P0.6) |

**Gate:** Före **9B** (app2) — kan ligga parallellt med 9A om sprint 20.5 är grön.

---

### Sprint 21 — Android PG-härdning

Android är **mer aggressivt** än iOS kring systemnavigering. Egen sprint — inte bara en rad i smoke gate.

Testa **mot `device_mode`** (barn vs förälder):

| Scenario | Förväntat |
|----------|-----------|
| **Hardware Back** | Kringgår inte PG / barnläge |
| **Gesture Back** | Samma |
| **App switcher** (recents) | Återkomst → PG eller korrekt läge |
| **Force close** | Cold start → Session Gate + PG |
| **Cold start** | `device_mode` bevarad eller korrekt omstart |
| **Token refresh** | Ingen redirect-loop; PG vid behov |

**Acceptans:** Alla sex scenarier signerade på **fysisk** Android (gärna billig platta).

---

### Sprint 22 — Deep links (före 9B)

**Flyttat före 9B** (inte efter). P0.5 i app2 gäller fortfarande **launch** för iOS Universal Links — men Android **måste** kunna testa push→route innan familje-beta.

| Krav | Detalj |
|------|------|
| `assetlinks.json` | `https://mystarday.se/.well-known/assetlinks.json` |
| Intent filters | AndroidManifest via Capacitor |
| Routes | `/invite/{token}`, pedagog-invite, confirm-email, ev. push-URL |
| Fallback | Webb om app ej installerad |
| **Push-test** | FCM-tap öppnar **rätt** skärm i app |

**Gate:** Före **9B** på Android. Play **public** kräver fortfarande full P0.5-paritet (app2 Steg 10).

---

### Sprint 23 — Android smoke gate (helhet)

Kör full [Release-gate](#release-gate--android-redo) på **låg/mellanpris-enhet** + signera TESTLOGG. Inga nya features — endast buggar.

---

### Google Play (efter 9A + 9B + sprint 23)

| Krav | Detalj |
|------|--------|
| Play Console | App-post `se.mystarday.app` |
| Internal testing | Parallellt med TestFlight |
| Data safety form | GDPR, barn-data, ingen PII i crash |
| Review-konto | `review@mystarday.se` |
| IAP (senare) | RevenueCat → Play Billing — **inte** Stripe i app |

---

## Miljövariabler (Android-relevanta)

| Variabel | Användning |
|----------|------------|
| `GOOGLE_CLIENT_ID` | Verifiera Google `idToken` |
| `FCM_SERVICE_ACCOUNT_JSON` eller `FCM_SERVER_KEY` | Push leverans |
| `FIREBASE_*` / `SENTRY_DSN` | FCM / Crashlytics eller Sentry |
| Befintliga | `VAPID_*` (webb), `APNS_*` (iOS) |

---

## Release-gate — Android redo

**Android redo för Play Internal** när alla ✅ (efter **sprint 23**):

### Delad (sprint 1–15, verifierat på Android)
- [ ] UI-gating: ingen PWA i native
- [ ] Tab bar + webb hamburger oförändrad
- [ ] `lifetime_free` fungerar

### Android-specifikt (sprint 16–23)
- [ ] Capacitor `android/` bygger och laddar mystarday.se
- [ ] Google Sign In native → dashboard/onboarding
- [ ] **Ingen** Apple-knapp på Android
- [ ] E-post login på Android
- [ ] FCM: token + test-notis (<60 s)
- [ ] **Sprint 20.5:** Crash SDK — test-crash, stack traces, version+commit, ingen PII
- [ ] **Sprint 21:** PG — hardware back, gesture back, app switcher, force close, cold start, token refresh
- [ ] **Sprint 22:** Deep link från push → rätt route
- [ ] **9A:** minst en **låg/mellanpris** fysisk Android-enhet signerad

**Därefter:** 9B (iOS + Android) → Play Internal → Steg 10 public (full P0.5 även iOS om ej redan).

---

## Körordning (Android-spår)

```
Sprint 1–15 (gemensam, app2) — grön; verifiera på Android där möjligt
    ↓
16  Capacitor Android smoke
    ↓
17  Google backend
    ↓
18  Google native klient + UI
    ↓
19  FCM server
    ↓
20  FCM klient
    ↓
20.5 Android observability (Sentry/Crashlytics)   ← P0.6, före 9B
    ↓
21  Android PG-härdning (back, switcher, cold start…)
    ↓
22  Deep Links (före 9B — push + route)
    ↓
23  Android smoke gate (helhet)
    ↓
9A  (obligatorisk billig platta) → 9B → Play Internal
```

Polsia-prompter: [`docs/polsia-sprint-koordinering.md`](docs/polsia-sprint-koordinering.md) — Sprint 16–23.

---

## Vad saknas för 10/10 (enligt app2)

Detta dokument + sprint 23 ≈ **8,5–9/10 Android-teknisk beredskap**. För **10/10 produkt** (app2 §16) krävs främst **inte** fler Android-menyer:

| Område | app2 | Typ |
|--------|------|-----|
| **Live-synk** | §16.4 SSE/WebSocket | När mamma ändrar schema ska pappa se det direkt — vuxen-wow |
| **Barn-wow** | §16.5 | Minst en wow per session (stjärnregn, raket, konfetti, high five, personlig feedback) — **formellt krav**, inte kosmetik |
| **Fältstudie** | §16.6 | **20 familjer × 4–6 veckor** — största steget; i praktiken 10/10 om det håller |

Implementationsordning efter 9B: **fält först** (signal), sedan **live-synk**, sedan **barn-wow-polish** — enligt produktägare ovan och app2.

---

## Relaterade filer

| Fil | Innehåll |
|-----|----------|
| `capacitor.config.ts` | `androidScheme`, plugins |
| `public/js/platform.js` | `isAndroid`, `googleSignIn` |
| `public/js/push-manager.js` | Native push detour |
| `src/routes/auth.js` | Apple + (Google) |
| `src/lib/push-notifications.js` | `sendFCM` |
| `db/push-subscriptions.js` | `platform`, `native_token` |

---

## Versionshistorik

| Datum | Version | Ändring |
|-------|---------|---------|
| 2026-05-28 | 1.1 | app2-styrning; sprint 20.5/21/22/23; 9A billig platta; deep links före 9B; 10/10-gap |
| 2026-05-28 | 1.0 | Första android.md — Google, FCM, Play gate, sprint 16–21 |
