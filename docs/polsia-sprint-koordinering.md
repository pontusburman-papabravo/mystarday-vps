# Polsia — Sprint-kö (copy-paste)

**Källor:** [`app2.md`](../app2.md) v2.3 · [`ios-städ.md`](ios-städ.md) v2.1 · [`android.md`](../android.md) v1.1  
**Regel:** En task = ett deploy. Max scope i listan. Inga refactors.

**Styrning:** Vid konflikt gäller **`app2.md`**. `android.md` är endast Android-tillägg — se [`android.md`](../android.md) § Styrning.

---

## Körordning (24 tasks — 15 gemensam + 9 Android)

### Del A — Gemensam native (iOS + Android WebView)

| Pos | Sprint | P0 | Tim |
|-----|--------|-----|-----|
| 1 | 1.1 Backend auth | P0.2 | 2 |
| 2 | 1.2 platform.js | P0.2 | 3 |
| 3 | 1.3 login + register | P0.2 | 3 |
| 4 | 1.4 CSS scaffold + SW | P0.3 | 1 |
| 5 | 3a device_mode + Session Gate | P0.1 | 2 |
| 6 | 3b PG-modal + biometri | P0.1 | 2–4 |
| 7 | 3c Server 403 + feature flag | P0.1 | 2 |
| 8 | 2a platform-gating full | P0.3 | 2 |
| 9 | 2b pwa-install isNeeded | P0.3 | 1 |
| 10 | 4a native-tab-bar.js kärna | P0.4 | 2 |
| 11 | 4b montera + dölj hamburger | P0.4 | 2 |
| 12 | 4c haptik + safe-area + SW | P0.4 | 1 |
| 13 | 5a login rollval | P1 | 1 |
| 14 | 5b child-login tavla | P1 | 2–4 |
| 15 | 5c add-child redirect | P1 | 1 |

### Del B — Android-spår (efter 15 grön på kod; testa iOS under Del A)

| Pos | Sprint | P0 | Tim |
|-----|--------|-----|-----|
| 16 | 16 Capacitor Android smoke | — | 2 |
| 17 | 17 Google backend `/api/auth/google` | P0.2 | 2–3 |
| 18 | 18 Google native klient + login UI | P0.2 | 3 |
| 19 | 19 FCM server `sendFCM` | Push | 2–3 |
| 20 | 20 FCM klient Android | Push | 2 |
| 21 | 20.5 Android observability (Sentry/Crashlytics) | P0.6 | 2 |
| 22 | 21 Android PG-härdning (back, switcher…) | P0.1 | 2–3 |
| 23 | 22 Deep Links (före 9B) | P0.5 | 2–3 |
| 24 | 23 Android smoke gate | RC | 2 |

**Makro (app2 styr):** Fas A+ → Barnlogin P1 → Push → Dashboard → **20.5** → **9A** (billig Android-platta obligatorisk) ‖ sprint 16–23 parallellt → **22 Deep Links** → **9B** → 20 familjer × 4–6 v → live-synk → barn-wow.

**Ändring v1.1:** Sprint **20.5** crash, **21** PG Android, **22** deep links **före 9B**, **23** smoke. Se [`android.md`](../android.md) v1.1.

---

## SPRINT 1.1 — Backend auth

```
Uppgift: Sprint 1.1 — Backend auth (JWKS, CSRF, lifetime_free)

Läs: ios-städ.md v2.1 Prio 1, app2.md §14.8

Gör endast:
1. src/routes/auth.js: fixa _jwkToPem med crypto.createPublicKey
2. src/middleware/csrf.js: exempt POST /api/auth/apple och /api/auth/apple/link
3. src/middleware/subscription.js: om is_lifetime_free === true → next() alltid

Gör INTE: login.html, platform.js, PG, tab bar, SW

TEST (signera i kommentar):
□ review@mystarday.se / grundarfamilj får inte 402
□ Apple JWT-verifiering kraschar inte (manuell POST /api/auth/apple om möjligt)

Release-gate (ios-städ): Subscription ✓ lifetime_free
```

---

## SPRINT 1.2 — platform.js

```
Uppgift: Sprint 1.2 — platform.js frys + ladda på alla sidor

Läs: ios-städ.md §1 platform.js, § Arkitekturregel 2, app2 P0.2

Gör endast:
1. public/js/platform.js:
   - Vid Capacitor: body.is-native, is-native-ios på <html>
   - Platform.isNative(), isIOS(), isAndroid(), isWeb()
   - Platform.isAppleSignInAvailable() (native iOS ELLER iOS Safari)
   - Platform.isGoogleSignInAvailable() (native Android — stub OK om plugin ej klart)
   - INGEN Capacitor.isNativePlatform() exporterad till views
2. Ladda platform.js i <head> på: login, register, onboarding, settings, schedule, dashboard
   (lista saknade i commit-meddelande)
3. Skelett för Platform.session / Session Gate (tom funktion OK — 3a fyller i)

Gör INTE: login Apple-knapp, PG, tab bar, full gating

TEST:
□ Desktop: isWeb() beteende
□ Ingen ny plattformscheck i dashboard.js utanför platform.js

Release-gate: Auth förberedd (plattform)
```

---

## SPRINT 1.3 — login.html + register.html

```
Uppgift: Sprint 1.3 — login.html + register.html Universal Auth

Läs: ios-städ.md plattformsmatris Apple+Google, app2 §14.3

Gör endast:
1. Apple-knapp ENDAST om Platform.isAppleSignInAvailable() — INTE isNative() alone
2. Android native: INGEN Apple-knapp; Google-knapp om isGoogleSignInAvailable()
3. 409 email_conflict: data.error === 'email_conflict' → modal (INTE prompt())
4. handleAppleLink: skicka idToken; kräv lösenord-login först
5. Efter Apple 200: onboarding_completed === false → /onboarding, annars dashboard
6. E-post/lösenord: regression — ska fungera oförändrat

Gör INTE: PG, Session Gate routing, barnlogin, tab bar

TEST:
□ iOS Safari: Apple JS login
□ Desktop Chrome: e-post, ingen Apple
□ Android Chrome: ingen Apple-knapp

Release-gate Auth:
□ Apple native iOS (TestFlight ELLER "ej testbar — saknar ios/")
□ Google native Android (om scope)
□ E-post login webb
```

---

## SPRINT 1.4 — CSS scaffold + SW

```
Uppgift: Sprint 1.4 — platform-gating.css scaffold + SW bump

Läs: ios-städ.md Sprint 1.4 vs 2a-scope

Gör endast:
1. Skapa public/css/platform-gating.css med MINIMAL struktur (kommentar: full regler i Sprint 2a)
2. Länka CSS från platform.js eller login/register
3. public/sw.js version bump

Gör INTE: full PWA-dölj (det är 2a), tab bar, PG

TEST:
□ SW ny version laddar på login efter hård refresh

Release-gate: Drift ✓ SW deployad
```

---

## SPRINT 3a — device_mode + Session Gate

```
Uppgift: Sprint 3a — device_mode + Session Gate kärna (P0.1)

Läs: ios-städ.md §2 Parental Gate = plattformsregel, app2 §5.2.1, §14.1

Gör endast:
1. Persistens: stjarndag_device_mode ('child'|'parent') — localStorage webb / Preferences native
2. Platform.session.resolveInitialRoute() (eller liknande CENTRAL funktion):
   - Om device_mode === 'child' → /child-login (ALDRIG dashboard)
   - Om 'parent' eller saknas → normal vuxen-flöde
3. device_mode='child' vinner över sessionRestored (inga dashboard-redirects)
4. Körs vid app-start på: login, child-login, dashboard (minimal hook)

Gör INTE: PG-modal UI, biometri, server middleware, tab bar

TEST:
□ Force close simulering: sätt device_mode child → reload → landar på /child-login
□ Direkt URL /dashboard med device_mode child → redirect child-login

Release-gate PG:
□ Force close → PIN-skärm (delvis — fullt med 3b)
□ Session restore → inte dashboard i barnläge
```

---

## SPRINT 3b — PG-modal + PIN + biometri

```
Uppgift: Sprint 3b — PG-modal + app-lås-PIN + biometri (P0.1)

Läs: app2 §14.1, ios-städ Session Gate

VIKTIGT — två PIN-typer (blanda INTE):
- Barn-PIN = child-login, befintlig /api/auth/child-login
- App-lås-PIN = PG, Secure Storage, endast förälder på denna enhet

Gör endast:
1. "Jag är vuxen" / ut ur barnläge → PG-modal (app-lås-PIN)
2. Rätt PIN → device_mode='parent' → dashboard
3. Fel PIN → stanna i barnläge, tydligt fel, lockout befintlig logik om möjligt
4. Biometri: @capacitor-community/biometric (iOS + Android native)
5. "Glömt PIN" → FULL logout + tvinga re-auth (e-post/Apple/Google) — INTE bypass
6. Endast PG sätter device_mode='parent'
7. OS back / history: ska inte kringgå PG (Capacitor App backButton där native)

Gör INTE: barnlogin redesign, tab bar, server 403 (det är 3c)

TEST:
□ 8-åring-test planerat (manuell)
□ Glömt PIN → hamnar på login, inte dashboard

Release-gate PG:
□ Back gesture kringgår inte PG
□ Token refresh behåller barnläge (testa om refresh finns)
```

---

## SPRINT 3c — Server 403 + feature flag

```
Uppgift: Sprint 3c — Server barn-JWT 403 + parental_gate_enabled (P0.1)

Läs: ios-städ.md Rollback-plan, app2 §14.1

Gör endast:
1. Barn-session/JWT: blockera /api/family/*, /api/account/* och vuxen-mutationer (403)
2. Klient: barn i barnläge kan inte nå /settings, /family, /schedule (vuxen), /reports
3. Feature flag parental_gate_enabled:
   - Klient: läs från GET /api/config eller features (default true efter staging-test)
   - Om false: dokumentera risk — endast nödfall
4. SW bump om klientändringar

Gör INTE: PG-modal UI, tab bar, push

TEST:
□ Barn-JWT mot /api/family/members → 403
□ Flagga av i staging → Session Gate beteende dokumenterat

Release-gate PG: alla rader gröna tillsammans med 3a+3b
```

---

## SPRINT 2a — platform-gating.css full

```
Uppgift: Sprint 2a — platform-gating.css (full) + settings/landing

Läs: ios-städ.md Prio 3, app2 §14.7

Gör endast:
1. Fyll i platform-gating.css — dölj ALLT webb-only när .is-native:
   [data-pwa-guide], .pwa-callout, .pwa-install-banner, .download-app-callout
2. settings.html: dölj/redigera PWA-push-sektion i native
3. index.html / landing: dölj .pwa-callout, cookie-banner reducera i native
4. Förbered dölj .mobile-topbar på föräldrasidor (fullt med 4b)

Gör INTE: pwa-install.js logik (2b), tab bar, PG

TEST:
□ body.is-native i DevTools/simulering → inga PWA-element synliga
□ Safari mobil webb → PWA kan fortfarande synas

Release-gate UI:
□ Ingen PWA-text i native
□ Ingen webb-banner i native
```

---

## SPRINT 2b — pwa-install.js

```
Uppgift: Sprint 2b — pwa-install.js isNeeded() = false i native

Läs: ios-städ.md Prio 3

Gör endast:
1. pwa-install.js: isNeeded() returnerar false när Platform.isNative()
2. Verifiera ingen PWA-installguide triggas i native
3. SW bump

Gör INTE: tab bar, PG, login redesign

TEST:
□ Native (eller is-native sim): isNeeded() === false
□ Webb PWA: isNeeded() beteende oförändrat

Release-gate UI: ✓ (tillsammans med 2a)
```

---

## SPRINT 4a — native-tab-bar.js kärna

```
Uppgift: Sprint 4a — native-tab-bar.js kärna (P0.4)

Läs: app2.md §4 P0.4, §14.6, ios-städ Uppdrag E

Gör endast:
1. public/js/native-tab-bar.js — ENDAST if (Platform.isNative())
2. Flikar: Hem / Schema / Bibliotek / Familj / Inställningar
3. position: fixed; bottom: 0; env(safe-area-inset-bottom)
4. Exportera init() som monteras i 4b

Gör INTE: ändra mobile-nav.js, montera på sidor (4b), haptik (4c), PG

TEST:
□ Fil laddas inte på desktop (guard isNative)

Release-gate Navigation: tab bar finns (delvis)
```

---

## SPRINT 4b — montera + dölj hamburger

```
Uppgift: Sprint 4b — Tab bar montera + dölj hamburger (P0.4)

Läs: app2 §14.6

Gör endast:
1. Montera native-tab-bar på: dashboard, schedule, settings, family (föräldrasidor)
2. body.has-native-tab-bar → dölj .mobile-topbar / hamburger på dessa sidor
3. child-dashboard: INGEN föräldra-tab bar (barn har egen nav senare)
4. Routing: flik → rätt path

Gör INTE: haptik (4c), ändra mobile-nav.js på webb

TEST:
□ Native/TestFlight: tab bar syns, hamburger borta på dashboard
□ Mobil webb Chrome: hamburger KVAR

Release-gate Navigation:
□ Native tab bar
□ Webb hamburger
```

---

## SPRINT 4c — haptik + SW

```
Uppgift: Sprint 4c — Tab bar haptik + safe-area polish + SW (P0.4)

Läs: app2 §18.1.3 haptik-tabell

Gör endast:
1. Platform.haptics.light() vid flikbyte
2. Verifiera safe-area iPhone SE och större skärm
3. SW bump
4. Feature flag native_tabbar_enabled (ios-städ rollback) — läs vid init, default true

Gör INTE: PG, push, barnlogin

TEST:
□ Flikbyte ger haptik på fysisk enhet
□ prefers-reduced-motion respekteras om redan implementerat

Release-gate Fas A+:
Alla Auth + UI + Subscription + Navigation + PG rader gröna → TestFlight tillåten
(se ios-städ.md Release-gate — Fas A+)
```

---

## SPRINT 5a — login rollval

```
Uppgift: Sprint 5a — login.html rollval "Jag är barn" / "Jag är vuxen"

Läs: docs/polsia-barnlogin-design.md, app2 §14.2 (delvis)

Gör endast:
1. login.html: tydlig rollval UI (magic-natt-tema om befintlig CSS)
2. "Jag är barn" → /child-login
3. "Jag är vuxen" → om device_mode==='child' → PG-modal (3b), annars normal login
4. Integrera med Session Gate — ingen bypass

Gör INTE: barnväljare, siffertavla (5b), tab bar

TEST:
□ Barn-val går till child-login
□ Vuxen-val respekterar device_mode

Release-gate: Golden Path del (ej Fas A+)
```

---

## SPRINT 5b — child-login tavla

```
Uppgift: Sprint 5b — child-login.html barnväljare + siffertavla + haptik

Läs: app2 §14.2, §2.3 mockup, docs/polsia-barnlogin-design.md

Gör endast:
1. Barnväljare (lista med avatar/emoji) — INTE fritext namn
2. Selfie/avatar visas direkt vid val av barn i listan
3. Egen siffertavla — INTE systemets tangentbord
4. Platform.haptics.light() per siffra
5. Befintlig pin_lockout ska fungera
6. Safe-area på iPhone med notch

Gör INTE: PG-modal, tab bar, dashboard mockup

TEST:
□ Ingen systemtangentbord vid PIN
□ Lockout efter fel PIN

Acceptans: app2 §14.2
```

---

## SPRINT 5c — add-child redirect

```
Uppgift: Sprint 5c — "+ Lägg till barn" → onboarding?flow=add-child

Läs: app2 §5.3.1, §14.2

Gör endast:
1. child-login eller login: knapp "+ Lägg till barn"
2. Redirect till /onboarding?flow=add-child
3. Onboarding tillåter wizard trots onboarding_completed (om ej redan fixat — minimal fix)

Gör INTE: smart copy syskon, tab bar

TEST:
□ Knapp når onboarding add-child-flöde

SW bump om HTML/JS ändrats
```

---

## Förbjudna mönster (lägg i VARJE task)

```
FÖRBJUDET i denna task:
❌ Capacitor.isNativePlatform() i view-filer
❌ Plattformscheck utanför platform.js
❌ Blanda barn-PIN och app-lås-PIN
❌ Scope utanför listan "Gör endast"
❌ Refactor av orelaterade filer
```

---

## Release-gate Fas A+ (klipp in vid Sprint 4c klar)

```
Fas A+ KLAR endast om alla ✅:

Auth: Apple iOS native | Google Android | E-post webb
UI: Ingen PWA native | Ingen webb-banner native
Subscription: lifetime_free
Navigation: Native tab bar | Webb hamburger
PG: Force close | Back gesture | Session restore | Token refresh | Direkt URL

→ Då: TestFlight → 9A (iOS)
```

---

## Release-gate — Android redo (klipp in vid Sprint 23 klar)

```
ANDROID REDO (Play Internal) endast om alla ✅:

Delad (sprint 1–15): UI-gating, tab bar, lifetime_free — verifierat PÅ ANDROID
Android-specifik (sprint 16–23):
□ Capacitor android/ bygger
□ Google native login → dashboard/onboarding
□ INGEN Apple-knapp på Android
□ E-post login på Android
□ FCM token + test-notis inom 60s
□ Sprint 20.5: Sentry/Crashlytics — test-crash, stack traces, version+commit, ingen PII
□ Sprint 21: PG — hardware back, gesture back, app switcher, force close, cold start, token refresh
□ Sprint 22: Push-tap → deep link → rätt route
□ 9A: minst en FYSISK låg/mellanpris-platta (Lenovo Tab, Samsung A…) — inte bara Pixel-flaggskepp

→ Då: Play Internal + 9B tillåten på Android
```

Full spec: [`android.md`](../android.md) Release-gate.

---

## SPRINT 16 — Capacitor Android smoke

```
Uppgift: Sprint 16 — Capacitor Android smoke (bygg + isNative)

Läs: android.md §1, app.md Steg 1

Gör endast:
1. Verifiera @capacitor/android installerat; npx cap sync android
2. Android Studio: bygg debug, starta mot mystarday.se (prod URL)
3. Verifiera window.Capacitor och Platform.isNative() === true
4. Verifiera body.is-native vid start (platform.js sprint 1.2)
5. Dokumentera eventuella android/build.gradle targetSdk

Gör INTE: Google login, FCM, store-upload

TEST:
□ App öppnas utan vit WebView-crash
□ Login-sida laddar

Release-gate Android: Capacitor bygger
```

---

## SPRINT 17 — Google backend

```
Uppgift: Sprint 17 — POST /api/auth/google (backend)

Läs: android.md §2 Backend, app2 §4 P0.2, auth.js Apple-mönster

Gör endast:
1. POST /api/auth/google — verifiera Google idToken (google-auth-library eller JWT)
2. Skapa/länka parent + session cookies (samma som Apple/e-post)
3. Returnera onboarding_completed för redirect-beslut
4. csrf.js: exempt /api/auth/google om CSRF blockerar
5. 409 email_conflict om e-post redan finns med annan metod

Gör INTE: login.html UI, Capacitor plugin, PG, push

Env: GOOGLE_CLIENT_ID (dokumentera i .env.example om finns)

TEST:
□ Postman/curl med test-idToken → 200 + Set-Cookie
□ Ogiltig token → 401

Release-gate: Google backend (del av P0.2)
```

---

## SPRINT 18 — Google native klient

```
Uppgift: Sprint 18 — Google Sign In native klient + login/register UI

Läs: android.md §2 Klient, ios-städ plattformsmatris, app2 §14.3

Gör endast:
1. platform.js: Platform.isGoogleSignInAvailable() — true endast native Android
2. Platform.googleSignIn.signIn() — Capacitor Google Auth plugin (dokumentera paket)
3. login.html + register.html: Google-knapp endast isGoogleSignInAvailable()
4. Android native: INGEN Apple-knapp (isAppleSignInAvailable false)
5. Redirect: onboarding vs dashboard efter svar
6. SW bump

Gör INTE: FCM, PG, tab bar

TEST (fysisk Android eller emulator):
□ Google login → dashboard eller onboarding
□ Ingen Apple-knapp synlig
□ E-post login regression OK

Release-gate: Google native Android ✓
```

---

## SPRINT 19 — FCM server

```
Uppgift: Sprint 19 — Implementera sendFCM (server)

Läs: android.md §3 Server, src/lib/push-notifications.js, app.md Steg 5

Gör endast:
1. Implementera sendFCM() — FCM HTTP v1 (firebase-admin) ELLER server key
2. Env: FCM_SERVICE_ACCOUNT_JSON eller FCM_SERVER_KEY — dokumentera
3. Vid ogiltig token: rensa push_subscriptions (samma som APNs-mönster)
4. Logga fel utan PII

Gör INTE: klient push-manager, Google login

TEST:
□ Enhetstest eller manuell send till test-token från sprint 20
□ Utan env: tydlig warn, ingen crash

Release-gate: FCM server
```

---

## SPRINT 20 — FCM klient Android

```
Uppgift: Sprint 20 — FCM klient + push-manager Android

Läs: android.md §3 Klient, app2 §14.4, push-manager.js

Gör endast:
1. @capacitor/push-notifications — Android permissions i manifest (via cap sync)
2. push-manager.js: Platform.push.subscribe() på native Android
3. POST token till backend med platform=android, native_token=…
4. Re-register vid app start; remove vid logout
5. SW bump om klient ändrad

Gör INTE: sendFCM server (sprint 19), APNs-ändringar

TEST:
□ Token syns i push_subscriptions platform=android
□ Test-push från admin/test-endpoint når enheten <60s

Release-gate: FCM klient ✓
```

---

## SPRINT 20.5 — Android observability

```
Uppgift: Sprint 20.5 — Android observability (P0.6)

Läs: android.md sprint 20.5, app2 P0.6

Gör endast:
1. Installera Sentry ELLER Firebase Crashlytics på Android Capacitor-build
2. Konfigurera release: app-version + git commit (eller build-id) i varje event
3. Avsiktlig test-crash — verifiera i Sentry/Crashlytics-dashboard
4. Verifiera Android stack traces (symbolikering)
5. GDPR: ingen PII i breadcrumbs/user context (e-post, barnnamn, PIN)

Gör INTE: PG, deep links, Play upload, iOS-ändringar (om inte delad init)

TEST:
□ Test-crash syns inom 5 min
□ Stack trace läsbar
□ Version + commit syns
□ Ingen e-post/barnnamn i payload

Release-gate: P0.6 Android ✓ (före 9B)
```

---

## SPRINT 21 — Android PG-härdning

```
Uppgift: Sprint 21 — Android PG-härdning (device_mode)

Läs: android.md sprint 21, ios-städ Session Gate, app2 P0.1

Gör endast:
1. Testmatris på FYSISK Android (gärna billig platta) — signera varje rad:
   - Hardware Back (barnläge / PG aktiv)
   - Gesture Back
   - App switcher (recents) → tillbaka
   - Force close → cold start
   - Cold start: device_mode + Session Gate
   - Token refresh: ingen redirect-loop, PG vid behov
2. Fixa endast buggar i PG/session-gate/platform.js — inga nya features

Gör INTE: Google login, FCM, deep links, crash SDK (sprint 20.5)

TEST (alla mot device_mode barn/förälder):
□ Back kringgår inte PG
□ App switcher läcker inte föräldravy i barnläge
□ Force close → korrekt gate vid återöppning

Release-gate: Android PG-härdning ✓
```

---

## SPRINT 22 — Deep Links (före 9B)

```
Uppgift: Sprint 22 — Android Deep Links (App Links)

Läs: android.md sprint 22, app2 P0.5, app2 §4

Gör endast:
1. /.well-known/assetlinks.json på mystarday.se (SHA256 från signing key)
2. Capacitor/AndroidManifest intent filters för invite, confirm-email, pedagog-invite
3. Route-hantering i app/web vid cold start från länk
4. Test: FCM-notis (sprint 20) med URL → tap öppnar RÄTT skärm i native app
5. Fallback: webb om app ej installerad

Gör INTE: Play Console public, IAP, live-synk SSE

TEST:
□ adb am start -a android.intent.action.VIEW -d "https://mystarday.se/invite/TEST" → rätt vy
□ Push-tap → rätt route (inte bara dashboard root)

Release-gate: Deep links före 9B ✓
```

---

## SPRINT 23 — Android smoke gate

```
Uppgift: Sprint 23 — Android smoke gate (helhet)

Läs: android.md Release-gate, app2 §9A (billig platta obligatorisk)

Gör endast:
1. Kör full checklista android.md Release-gate på FYSISK låg/mellanpris-enhet
2. Signera TESTLOGG: modell, Android-version, alla sprint 16–22 rader
3. Google + e-post login, ingen Apple, tab bar, FCM+deep link, PG, crash SDK
4. Fixa endast bugs — inga nya features

Gör INTE: Play Console upload (kan förberedas separat)

TEST:
□ Alla rader android.md Release-gate ✅
□ Enhet = låg/mellansegment (inte endast emulator/flaggskepp)

Release-gate: Android redo → Play Internal tillåten
```

---

## Versionshistorik

| Datum | Ändring |
|-------|---------|
| 2026-05-28 | v1.1: 20.5 observability, 21 PG, 22 deep links före 9B, 23 smoke; app2-styrning |
| 2026-05-28 | Sprint 16–21 Android + android.md; Release-gate Android |
| 2026-05-28 | Första koordineringsdoc — 15 tasks, PG före gating, Sprint 4 tillagd |
