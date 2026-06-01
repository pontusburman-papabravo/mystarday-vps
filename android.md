# Min Stjärndag — android.md (Android native)

## Version 1.0

**Skapad:** 2026-05-28 · **Dokumentversion:** `1.0`

> **Masterplan:** [`app2.md`](app2.md) v2.3 · **Plattformsstäd:** [`docs/ios-städ.md`](docs/ios-städ.md) v2.1  
> **iOS + gemensam native:** [`app.md`](app.md) · **Polsia-sprintar:** [`docs/polsia-sprint-koordinering.md`](docs/polsia-sprint-koordinering.md)

**Syfte:** Allt som krävs för att **Android-appen** (Capacitor + Google Play) ska fungera i paritet med iOS — utöver det som redan löses i sprint 1–15 (plattformsneutralt).

**Viktigt:** Sprint **1–15** i `polsia-sprint-koordinering.md` bygger **samma kod** för `Platform.isNative()`. Android är **inte klar** när bara iOS/TestFlight är grön — kör **Android-spåret (16–20)** nedan.

---

## Förutsättningar (måste vara klart först)

| Gate | Var |
|------|-----|
| Sprint 1–15 gröna | `docs/polsia-sprint-koordinering.md` |
| Fas A+ Release-gate | `docs/ios-städ.md` — Auth, UI, PG, Navigation |
| `platform.js` frys | `isAndroid()`, inga Capacitor-checks i views |
| PG + Session Gate | Samma `device_mode` på Android |
| UI-gating `.is-native` | Gäller Android WebView |

---

## iOS vs Android — snabbmatris

| Område | iOS | Android |
|--------|-----|---------|
| **Store** | App Store / TestFlight | Google Play / Internal testing |
| **Vuxen login (P0.2)** | Native **Apple** Sign In | Native **Google** Sign In + e-post |
| **Apple-knapp** | Ja (native + Safari) | **Nej** — `isAppleSignInAvailable()` false |
| **Push** | APNs (`sendAPNs` ◐ implementerad) | **FCM** (`sendFCM` stub — måste implementeras) |
| **Deep links** | Universal Links + AASA | **App Links** + `assetlinks.json` |
| **Review-konto** | `review@mystarday.se` | Samma konto — verifiera på Android |
| **Betalning (senare)** | StoreKit via RevenueCat | Google Play Billing via RevenueCat |
| **Biometri PG** | Face ID / Touch ID | Fingerprint / device credential |
| **Back-knapp** | Edge swipe | Android **hardware/back gesture** — extra PG-test |

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

**Verifiera alltid på fysisk enhet eller emulator** — layout och back-knapp skiljer sig från iOS.

---

## Android-specifikt — måste byggas

### 1. Capacitor Android-projekt

| Krav | Detalj |
|------|--------|
| Paket | `@capacitor/android` + sync (se `app.md` Steg 1) |
| `android/` | Genereras lokalt (`gitignore`) — inte i repo |
| Prod URL | `https://mystarday.se` via `capacitor.config.ts` |
| Bygg | Android Studio — minst en emulator + en fysisk enhet |
| SDK | `targetSdk` = senaste Play-krav vid release; dokumentera i build |

**Acceptans:**
- [ ] `npx cap sync android` utan fel
- [ ] App startar, `Platform.isNative()` === true
- [ ] `body.is-native` sätts vid start

---

### 2. Google Sign In (P0.2 — Android-del)

**Status idag:** Apple finns delvis; **Google native + backend kan saknas.**

#### Backend

| Endpoint | Spec |
|----------|------|
| `POST /api/auth/google` | Ta emot `idToken` från Google; verifiera mot Google certs |
| Session | Samma cookie/session-mönster som Apple/e-post |
| CSRF | Exempt om POST (likt `/auth/apple`) |
| Nya användare | `onboarding_completed` → `/onboarding` |

**Env (exempel):**
- `GOOGLE_CLIENT_ID` (Web client ID för token verify)
- Ev. separat Android client ID i Google Cloud Console

#### Klient (`platform.js`)

```javascript
// Mål — endast i platform.js
Platform.isGoogleSignInAvailable()  // true endast native Android
Platform.googleSignIn.signIn()      // @codetrix-studio/capacitor-google-auth eller motsvarande
```

#### UI (`login.html` / `register.html`)

- Google-knapp **endast** när `Platform.isGoogleSignInAvailable()`
- **Ingen** Apple-knapp på Android native
- `email_conflict`-modal om Google-e-post redan har lösenordskonto

**Acceptans (app2 §14.3):**
- [ ] Android native: Google → dashboard/onboarding
- [ ] Android native: e-post fallback fungerar
- [ ] Android native: **ingen** Apple-knapp

---

### 3. Push — FCM (obligatoriskt före Android-RC)

**Status idag:** `src/lib/push-notifications.js` — `sendFCM()` är **stub**.

#### Server

| Krav | Detalj |
|------|--------|
| Implementera `sendFCM()` | FCM HTTP v1 (rekommenderat) eller legacy server key |
| Env | `FCM_SERVICE_ACCOUNT_JSON` eller `FCM_SERVER_KEY` |
| Token | `push_subscriptions.platform = 'android'`, `native_token` |
| Fel | Ogiltig token → rensa (samma mönster som APNs BadDeviceToken) |

#### Klient

| Krav | Detalj |
|------|--------|
| `@capacitor/push-notifications` | Android permission + registrering |
| `push-manager.js` | `Platform.push.subscribe()` på native Android |
| Token vid app-start | Re-registrera |
| Logout | Ta bort token |

**Acceptans (app2 §14.4):**
- [ ] Tillstånd → token i DB med `platform=android`
- [ ] Test-notis inom 60 s på fysisk Android
- [ ] Förälder får notis vid barns avbockning (prod)

---

### 4. Android UX-verifiering (sprint 1–15 på enhet)

| Test | Varför |
|------|--------|
| PG + **Android back** | Back får inte kringgå PG |
| Tab bar safe-area | Navigation bar / gesture nav |
| Billig surfplatta | app2 §9A — målgruppens enhet |
| Haptik | PIN + tab bar (begränsat på vissa enheter) |
| Keep-awake barnläge | §5.7 — valfritt |

---

### 5. Deep links (före Play Store public)

| Krav | Detalj |
|------|--------|
| `assetlinks.json` | `https://mystarday.se/.well-known/assetlinks.json` |
| Intent filters | AndroidManifest via Capacitor |
| Invite-URL | `/invite/{token}`, pedagog-invite, confirm-email |
| Fallback | Webb om app ej installerad |

**Gate:** P0.5 i app2 — **före** public Play release, inte blocker för Internal testing med e-post-login.

---

### 6. Google Play (efter 9A/9B)

| Krav | Detalj |
|------|--------|
| Play Console | App-post `se.mystarday.app` |
| Internal testing | Parallellt med TestFlight |
| Data safety form | GDPR, barn-data, ingen PII i crash |
| Review-konto | Samma `review@mystarday.se` + lösenord i Review notes |
| Kategori | Family / Lifestyle |
| IAP (senare) | RevenueCat → Play Billing — **inte** Stripe i app |

---

## Miljövariabler (Android-relevanta)

| Variabel | Användning |
|----------|------------|
| `GOOGLE_CLIENT_ID` | Verifiera Google `idToken` |
| `FCM_SERVICE_ACCOUNT_JSON` eller `FCM_SERVER_KEY` | Push leverans |
| `FIREBASE_*` | Om firebase-admin används |
| Befintliga | `VAPID_*` (webb only), `APNS_*` (iOS only) |

---

## Release-gate — Android redo

**Android redo för Play Internal** när alla ✅:

### Delad (sprint 1–15)
- [ ] PG: force close, back, session restore, token refresh
- [ ] UI-gating: ingen PWA i native
- [ ] Tab bar + webb hamburger oförändrad
- [ ] `lifetime_free` fungerar

### Android-specifikt
- [ ] Capacitor `android/` bygger och laddar mystarday.se
- [ ] Google Sign In native → dashboard/onboarding
- [ ] **Ingen** Apple-knapp på Android
- [ ] E-post login på Android
- [ ] FCM: token + test-notis
- [ ] 9A: test på minst en **billig Android-platta** eller telefon
- [ ] P0.6 crash SDK på Android build

**Därefter:** 9B familjer (iOS + Android) → Play Internal → public (med P0.5 deep links).

---

## Körordning (Android-spår)

```
Sprint 1–15 (gemensam) — grön på iOS OCH verifierad på Android där möjligt
    ↓
Sprint 16 — Capacitor Android smoke (bygg + isNative)
    ↓
Sprint 17 — Google backend POST /api/auth/google
    ↓
Sprint 18 — Google native klient + login UI
    ↓
Sprint 19 — FCM server sendFCM
    ↓
Sprint 20 — FCM klient + push-manager Android
    ↓
Sprint 21 — Android smoke gate (PG, tab bar, back, login)
    ↓
9A / 9B (inkl. Android-enhet)
    ↓
Play Internal → Deep links (P0.5) → Public Play
```

Polsia-prompter: [`docs/polsia-sprint-koordinering.md`](docs/polsia-sprint-koordinering.md) — Sprint 16–21.

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
| 2026-05-28 | 1.0 | Första android.md — Google, FCM, Play gate, sprint 16–21 |
