# Min Stjärndag — android.md (Android native)

## Version 1.3

**Skapad:** 2026-05-28 · **Dokumentversion:** `1.3`

---

## Styrning (läs först)

**`android.md` är ett tilläggsdokument till [`app2.md`](app2.md).**

| Regel | |
|-------|---|
| **Konflikt** | Vid motsägelse gäller **`app2.md`** |
| **Scope** | Detta dokument beskriver **endast** Android-specifika implementationer som **inte** redan täcks av app2 |
| **Gemensam produkt** | Sprint **1–15** + all logik i app2 (Fas A+, push, 9A/9B, 10/10) är **styrande** |
| **Gate 0** | Native parity freeze — **före** sprint 16 (se nedan) |
| **Android-spår** | Sprint **16–23** = Android-specifika luckor ovanpå den gemensamma basen |
| **Gate 24** | Native parity verification — **efter** sprint 23, **före** 9B (revisionslista, ingen ny kod) |

Utan denna ordning riskerar Android-planen att leva sitt eget liv.

> **Plattformsstäd:** [`docs/ios-städ.md`](docs/ios-städ.md) v2.1 · **Capacitor:** [`app.md`](app.md) · **Polsia:** [`docs/polsia-sprint-koordinering.md`](docs/polsia-sprint-koordinering.md)

---

## Uppdelning (det som fungerar i små team)

| Spår | Sprint | Dokument |
|------|--------|----------|
| **Gemensam produktutveckling** | 1–15 | `app2.md` + `ios-städ.md` |
| **Arkitektur-gate** | **0** (Gate 0) | `ios-städ.md` Arkitekturregel + detta avsnitt |
| **Android-specifika luckor** | 16–23 | `android.md` (detta dokument) |
| **Parity-gate** | **24** (Gate 24) | iOS ↔ Android revisionslista före testfamiljer |

Sprint **1–15** bygger **samma kod** för `Platform.isNative()`. Android är **inte** Play-klar när bara iOS/TestFlight är grön.

**Beredskapsnivåer (inte samma som 10/10 produkt):**

| Steg | Nivå | Vad det betyder |
|------|------|-----------------|
| Sprint **23** | ~**8,5–9/10** | **Release readiness** — Google, push, deep links, PG Android, crash |
| **Gate 24** | Parity signerad | Samma produktbeteende iOS ↔ Android — fångar *"fungerar på iPhone men inte Android"* |
| Live-synk (efter 9B) | ~**9,5** | Vuxen-wow, schema synkas |
| Barn-wow | ~**9,5–10** | Formellt app2-krav per session |
| **20 familjer × 4–6 v** | **Verklig 10/10** | Fältvalidering — inte bara att tekniken startar |

Google login + push + deep links = **release readiness**, inte produkt-10/10. Se [§ Vad saknas för 10/10](#vad-saknas-för-1010-enligt-app2).

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
Gate 24                    ← iOS ↔ Android parity (revisionslista, ingen ny kod)
    ↓
9B (testfamiljer)
    ↓
Live-synk (SSE)            ← app2 §16.4 — första version före lång fält
    ↓
Barn-wow-polish            ← app2 §16.5 — minst en wow/session
    ↓
20 familjer × 4–6 veckor   ← app2 §16.6 — mät produkten som ska bli 10/10
```

**Varför SSE/wow före fält:** Annars blir feedback *"man måste uppdatera"* / *"det känns statiskt"* — saker ni redan planerar att lösa. Fältstudien ska validera **nästan-10/10**, inte MVP-gap.

**Skillnad 8,5 → 10:** robusthet, synk, push, barnläge och **verklig användning** — inte fler skärmar.

---

## Förutsättningar (måste vara klart först)

| Gate | Var |
|------|-----|
| Sprint 1–15 gröna | `docs/polsia-sprint-koordinering.md` Del A |
| **Sprint 0 / Gate 0** | Native parity freeze — **obligatorisk före sprint 16** |
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

## Sprint 0 — Gate 0: Native parity freeze

**Före sprint 16.** Låter litet — vanligaste orsaken till hybridapp-röra om den hoppas över.

| Mål | Detalj |
|-----|--------|
| **Enda sanning** | Plattforms-API:er **endast** i `public/js/platform.js` |
| **Tillåtna exports** (minimum) | `isNative()`, `isIOS()`, `isAndroid()`, `isAppleSignInAvailable()`, `isGoogleSignInAvailable()` (+ befintliga wrappers: push, PG, session — inga nya utan PR-motivering) |
| **Förbjudet i vyer/HTML** | `if (window.Capacitor)`, `Capacitor.isNativePlatform()`, `navigator.userAgent.includes(...)`, `if (Android)`, egna iOS/Android-grenar |

**Audit (Polsia sprint 0):**
1. `rg` / grep i `public/` efter mönster ovan — lista träffar
2. Flytta eller wrappa till `platform.js` — **ingen** ny feature
3. Signera: *0 otillåtna träffar* i view-filer (`.html`, `dashboard.js`, `schedule.js`, …)

**Om regeln bryts senare:** Android-fixar hamnar i HTML, iOS-specialfall i `login.html`, regressions varje sprint.

Se `ios-städ.md` Arkitekturregel 1–2. Polsia: [`docs/polsia-sprint-koordinering.md`](docs/polsia-sprint-koordinering.md) — **Sprint 0**.

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

Kör full [Release-gate](#release-gate--android-redo) (Android-rader) på **låg/mellanpris-enhet** + signera TESTLOGG. Inga nya features — endast buggar.

**Nivå efter 23:** ~8,5–9/10 **teknisk release readiness** — inte 9B-klar utan Gate 24.

---

### Gate 24 — Native parity verification (före 9B)

**Efter sprint 23, före 9B.** Ingen ny kod — en **revisionslista** signerad på **både** iPhone och Android (gärna billig platta).

Vanligaste felet i hybridappar är inte crash — det är: *"Det fungerar på iPhone men inte på Android."*

| Område | Verifiera (iOS **och** Android) |
|--------|----------------------------------|
| **Feature-paritet** | Samma kärnfunktioner tillgängliga (schema, belöningar, barnvy, inställningar — inga iOS-only-gaps) |
| **Onboarding** | Samma flöde: registrering → onboarding → dashboard (Google vs Apple per plattform, samma slutläge) |
| **Push** | Registrering, test-notis, tap → **samma** mål-route (efter sprint 22) |
| **Parental Gate** | Samma `device_mode`-regler: barnläge, PIN, back/switcher (Android sprint 21 + iOS) |
| **Child mode** | Barnlogin, barnvy, avbockning, stjärnor — samma beteende |
| **Analytics** | Samma `analytics_events` / event-typer avfyras vid samma användaråtgärder (ingen plattform tyst) |

**Signering:** Parity-matris i PR/kommentar — en rad per område, ✅/❌ + enhetsmodell per plattform.

**Gate:** **9B tillåten** först när Gate 24 är helt grön. Play Internal kan föregå 9B om 9A + sprint 23 är klara.

Polsia: [`docs/polsia-sprint-koordinering.md`](docs/polsia-sprint-koordinering.md) — **Gate 24**.

---

### Google Play (efter 9A + Gate 24 + 9B)

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

**Play Internal / teknisk RC** när alla ✅ (efter **sprint 23** + **9A**):

**9B (testfamiljer)** kräver dessutom **Gate 24** grön (se nedan).

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

### Gate 24 (före 9B — obligatorisk)

- [ ] Feature-paritet iOS ↔ Android signerad
- [ ] Onboarding-flöde paritet
- [ ] Push-flöde + tap-route paritet
- [ ] PG / `device_mode` paritet
- [ ] Child mode paritet
- [ ] Analytics-events paritet

**Därefter:** **9B** (iOS + Android) → SSE → barn-wow → fältstudie → Play public (full P0.5).

---

## Körordning (Android-spår)

```
Sprint 1–15 (gemensam, app2) — grön; verifiera på Android där möjligt
    ↓
0   Gate 0 — Native parity freeze (audit, 0 otillåtna träffar)
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
23  Android smoke gate (helhet)          ← ~8,5–9/10 release readiness
    ↓
24  Gate 24 — Native parity verification (iOS ↔ Android, ingen ny kod)
    ↓
9A  (obligatorisk billig platta) ‖ redan under 16–23
    ↓
9B  (testfamiljer) → SSE → barn-wow → 20 familjer
```

Polsia-prompter: [`docs/polsia-sprint-koordinering.md`](docs/polsia-sprint-koordinering.md) — Sprint **0**, **Gate 24**, 16–23.

---

## Vad saknas för 10/10 (enligt app2)

| Steg | Nivå | app2 |
|------|------|------|
| Sprint 23 | ~8,5–9/10 | Release readiness (login, push, links, crash) |
| Gate 24 | Parity klar | iOS ↔ Android — samma produkt, inte två appar |
| Live-synk | ~9,5 | §16.4 SSE/WebSocket |
| Barn-wow | ~9,5–10 | §16.5 — minst en wow/session |
| 20 familjer × 4–6 v | **Verklig 10/10** | §16.6 — fältvalidering |

För **10/10 produkt** krävs **inte** fler Android-menyer efter Gate 24:

**Ordning efter 9B (mät rätt produkt):** live-synk (första version) → barn-wow (första version) → **sedan** 20 familjer × 4–6 veckor. Fältstudien validerar nästan-10/10, inte kända MVP-gap.

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
| 2026-05-28 | 1.3 | Gate 24 iOS↔Android parity före 9B; beredskapsnivå-tabell |
| 2026-05-28 | 1.2 | Gate 0 native freeze; makro: SSE/wow före fältstudie |
| 2026-05-28 | 1.1 | app2-styrning; sprint 20.5/21/22/23; 9A billig platta; deep links före 9B; 10/10-gap |
| 2026-05-28 | 1.0 | Första android.md — Google, FCM, Play gate, sprint 16–21 |
