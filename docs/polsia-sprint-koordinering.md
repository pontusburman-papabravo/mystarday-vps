# Polsia — Sprint-kö (copy-paste)

**Källor:** [`app2.md`](../app2.md) v2.3 · [`ios-städ.md`](ios-städ.md) v2.1 · [`android.md`](../android.md) v1.4 · [`parity-manifest.md`](parity-manifest.md) (SPOT)  
**Regel:** En task = ett deploy. Max scope i listan. Inga refactors.

**Styrning:** Vid konflikt gäller **`app2.md`**. `android.md` = Android-tillägg.

---

## STJÄRNDAG RELEASE OS

**25 tasks · 3 gates (14, 23A, 24) · 4 failure policies · 2 kill switches**

```
Layer 1 — Core Product (Fas A: 1–1.4 + 14)
  1.1 → 1.2 → 1.3 → 1.4 → 14 (runtime safety / observability)

Layer 2 — Platform Bridge (2a–5c)
  2a → 2b → 3a → 3b → 3c → 4 → 5a → 5b → 5c

Layer 3 — Android Execution (16–22b)
  16 → 17 → 18 → 19 → 20 → 21 → 22a → 22b

Layer 4 — Control System
  14     MANDATORY RUNTIME LAYER (observability)
  22a    + FEATURE FREEZE + CI + ROLLBACK POLICY (vid deploy)
  23A    BINARY SMOKE GATE (6 pass/fail)
  23B    BUGFIX CONTAINMENT (23A GREEN först)
  Gate 24  PARITY + Parity Manifest + 72h + KILL_SWITCH_23A/24

Layer 5 — Product Reality
  9A → Dashboard polish → 9B → SSE → Barn-wow → Gate 25
```

### Operativa regler

| Händelse | Policy |
|----------|--------|
| **23A FAIL** | 23B blockerad · 48h · eskalering · `KILL_SWITCH_23A` överväg |
| **Gate 24 FAIL** | Re-open Gate 24 · [`parity-manifest.md`](parity-manifest.md) uppdateras |
| **Divergens** | Feature → owner · beteende-bugg → omedelbar fix |
| **Credits slut** | Fas A (1–1.4) + **Sprint 14** prioriteras |

**Parity Manifest SPOT:** Engineering underhåller [`docs/parity-manifest.md`](parity-manifest.md).

**Blockerare nu:** Company paused + 0 credits → kör **#2141408** först när löst.

---

## KÖRLISTA — inkrement-ID (rätt ordning)

| # | Sprint | Polsia ID |
|---|--------|-----------|
| 1 | Sprint 1.1 | **#2141408** |
| 2 | Sprint 1.2 | **#2141409** |
| 3 | Sprint 1.3 | **#2141410** |
| 4 | Sprint 1.4 | **#2141411** |
| 5 | Sprint 14 | **#2143272** |
| 6 | Sprint 2a | **#2141905** |
| 7 | Sprint 2b | **#2141914** |
| 8 | Sprint 3a | **#2141844** |
| 9 | Sprint 3b | **#2141848** |
| 10 | Sprint 3c | **#2141855** |
| 11 | Sprint 4 | **#2141717** |
| 12 | Sprint 5a | **#2141868** |
| 13 | Sprint 5b | **#2141884** |
| 14 | Sprint 5c | **#2141897** |
| 15 | Sprint 16 | **#2142930** |
| 16 | Sprint 17 | **#2143390** |
| 17 | Sprint 18 | **#2143391** |
| 18 | Sprint 19 | **#2143394** |
| 19 | Sprint 20 | **#2143395** |
| 20 | Sprint 21 | **#2143396** |
| 21 | Sprint 22a | **#2143403** |
| 22 | Sprint 22b | **#2143404** |
| 23 | Sprint 23A | **#2143273** |
| 24 | Sprint 23B | **#2143274** |
| 25 | Gate 24 | **#2143329** |

**Efter 25:** Dashboard polish **#2143405** → 9A → 9B → SSE → barn-wow → Gate 25

**Polsia Release OS (kanon — 25 sprintfiler + tester):** [`docs/polsia-release-os/README.md`](polsia-release-os/README.md)

**Raw:** https://raw.githubusercontent.com/pontusburman-papabravo/MyStarday-Polsia/cursor/polsia-sprint-koordinering-1a8b/docs/polsia-release-os/README.md

---

## SPRINT 1.1 — Backend auth · Polsia #2141408

```
Uppgift: Sprint 1.1 — Backend auth (JWKS, CSRF, lifetime_free)
Polsia: #2141408

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

## SPRINT 14 — Mandatory runtime layer · Polsia #2143272

```
Uppgift: Sprint 14 — Mandatory runtime layer (observability)

Polsia: #2143272
Läs: app2 P0.6, app2 §14.11, android.md sprint 20.5

Gör endast:
1. Sentry ELLER Crashlytics — Capacitor iOS + Android (runtime safety tidigt i kedjan)
2. release: app-version + git commit (build-id) i varje event
3. Test-crash iOS + Android — stack traces läsbara
4. GDPR: ingen PII i breadcrumbs
5. Dokumentera env i Polsia Dashboard (ej i repo)

Gör INTE: PG, tab bar, deep links, parity

TEST:
□ Test-crash syns <5 min på båda plattformar
□ Version + commit i dashboard

Release-gate: Runtime layer ✓ — prioriteras om credits slut
Kill switch: se parity-manifest.md (kopplas till 23A/24 senare)
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

## SPRINT 4 — Native tab bar vuxen · Polsia #2141717

**Kanonisk i Polsia-kön (en deploy).** Nedan 4a–4c = samma scope uppdelat om ni behöver tre mindre deploy.

```
Uppgift: Sprint 4 — Native tab bar vuxen (P0.4) — #2141717

Läs: app2.md §4 P0.4, §14.6, ios-städ Uppdrag E

Gör endast:
1. public/js/native-tab-bar.js — ENDAST Platform.isNative(); 5 flikar (Hem/Schema/Bibliotek/Familj/Inställningar)
2. Montera på dashboard, schedule, settings, family — INTE child-dashboard
3. body.has-native-tab-bar → dölj hamburger på dessa sidor; webb oförändrad
4. safe-area + Platform.haptics.light() vid flikbyte
5. Feature flag native_tabbar_enabled (default true) + SW bump

Gör INTE: PG, push, barnlogin, mobile-nav.js refactor på webb

TEST:
□ Native: tab bar, ingen hamburger på dashboard
□ Webb mobil: hamburger kvar
□ child-dashboard: ingen föräldra-tab bar

Release-gate Fas A+: Navigation native tab + webb hamburger (ios-städ)
```

---

## SPRINT 4a — native-tab-bar.js kärna (valfri uppdelning)

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
→ Innan Android sprint 16: Gate 0 (Sprint 0) grön
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

→ Då: Play Internal tillåten (teknisk RC)
→ 9B först efter Gate 24 (pos 26) grön
```

Full spec: [`android.md`](../android.md) Release-gate + Gate 24.

---

## SPRINT 0 — Gate 0: Native parity freeze

```
Uppgift: Sprint 0 — Gate 0: Native architecture freeze (före Android 16)

Läs: android.md § Sprint 0, ios-städ.md Arkitekturregel 1–2, app2 P0.2/P0.3

Gör endast:
1. Audit public/: rg/grep efter:
   - window.Capacitor / Capacitor.isNativePlatform()
   - navigator.userAgent (plattformsgrenar)
   - if (Android) / includes('Android') / includes('iPhone')
2. Tillåtna plattforms-API:er ska bo i platform.js:
   isNative(), isIOS(), isAndroid(), isAppleSignInAvailable(), isGoogleSignInAvailable()
3. Flytta kvarvarande träffar till platform.js wrappers — INGEN ny feature
4. Signera i PR-kommentar: antal filer fixade + "0 otillåtna träffar kvar"

Gör INTE: Capacitor android build, Google, FCM, PG-ändringar, tab bar

TEST:
□ rg Capacitor\.isNativePlatform public/js public/*.html → endast platform.js (ev. push-manager via Platform)
□ rg userAgent.*(Android|iPhone|iPad) public/ → 0 plattformsgrenar i views
□ Alla auth-sidor laddar platform.js

Release-gate: Gate 0 grön — Android sprint 16 tillåten
```

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

## SPRINT 21 — Android PG-härdning · Polsia #2142994

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

## SPRINT 22a — Deep links server · Polsia #2143403

```
Uppgift: Sprint 22a — Deep links server + FEATURE FREEZE + CI + ROLLBACK

Polsia: #2143403
Läs: android.md sprint 22, app2 P0.5

Gör endast:
1. /.well-known/assetlinks.json på mystarday.se (SHA256 signing key)
2. Capacitor/AndroidManifest intent filters: invite, confirm-email, pedagog-invite
3. Server/static: route-stöd för cold-start URLs (samma paths som iOS Universal Links där möjligt)
4. iOS AASA paritet om ändringar i well-known
5. FEATURE FREEZE: inga nya features i samma deploy — endast deep links + policy
6. Dokumentera CI-check + rollback (feature flags ios-städ) i PR

Gör INTE: @capacitor/app klient-routing (22b), Play public, SSE

TEST:
□ assetlinks.json validerar (Google Statement List Tester eller adb)
□ Intent filter dokumenterat i PR

Release-gate: Deep links server (del av P0.5)
```

---

## SPRINT 22b — Deep links client · Polsia #2143404

```
Uppgift: Sprint 22b — Deep links client + push-tap routing

Polsia: #2143404
Läs: app2 P0.5, push-manager.js

Gör endast:
1. @capacitor/app (eller motsvarande) — lyssna på appUrlOpen / deep link
2. Route-hantering: invite, confirm-email, pedagog-invite → rätt vy i WebView
3. FCM-notis (sprint 20): tap med URL → samma route-handler
4. Fallback: öppna webb-URL om path okänd
5. SW bump om klient ändrad

Gör INTE: assetlinks (22a), IAP, SSE

TEST:
□ adb VIEW https://mystarday.se/invite/TEST → rätt vy
□ Push-tap → rätt route (inte bara dashboard root)

Release-gate: Deep links före 9B ✓
```

---

## SPRINT 23A — Binary smoke gate · Polsia #2143273

```
Uppgift: Sprint 23A — Binary smoke gate (6 pass/fail)

Polsia: #2143273
Läs: android.md Release-gate, app2 §9A (billig platta)

Förutsättning: Sprint 16–22b deployade.

Gör endast — signera PASS/FAIL per rad på FYSISK låg/mellanpris-Android:
1. App startar native (Platform.isNative, ingen vit WebView-crash)
2. Login: Google ELLER e-post → dashboard/onboarding
3. Ingen Apple-knapp på Android
4. FCM: token i DB + test-notis <60s
5. PG: hardware/gesture back kringgår inte barnläge
6. Deep link: push-tap ELLER adb VIEW invite → rätt route

Gör INTE: nya features · Play upload · 23B om någon rad FAIL

VI HÄNDER 23A FAIL:
→ 23B #2143274 BLOCKERAD
→ 48h eskalering
→ Överväg KILL_SWITCH_23A (docs/parity-manifest.md)

TEST: 6/6 PASS = 23A GREEN

Release-gate: 23A GREEN krävs för 23B + Gate 24
```

---

## SPRINT 23B — Bugfix containment · Polsia #2143274

```
Uppgift: Sprint 23B — Bugfix containment (endast efter 23A GREEN)

Polsia: #2143274

BLOCKERAD om 23A #2143273 inte är GREEN.

Gör endast:
1. Fixa ENDAST rader som FAIL:ade i 23A
2. Re-kör 23A-matrisen — alla 6 ska bli PASS
3. Inga nya features, refactors, eller scope utanför FAIL-rader

Gör INTE: Gate 24, Dashboard, SSE, 9B

TEST:
□ 23A omkörd — 6/6 PASS
□ TESTLOGG: modell + Android-version i PR

Release-gate: Android ~8,5–9/10 → Gate 24 tillåten
```

---

## GATE 24 — Parity gate + Manifest · Polsia #2143329

```
Uppgift: Gate 24 — Parity gate + Parity Manifest + 72h + kill switches

Polsia: #2143329

Läs: docs/parity-manifest.md (SPOT), android.md § Gate 24, app2 §9B

Förutsättning: 23A #2143273 GREEN (23B om fixes behövdes).

Gör endast:
1. Fyll i docs/parity-manifest.md — alla 6 rader ✅ iOS OCH Android
2. Signering: datum, git commit, enhetsmodeller, signerad av
3. Parity Manifest = SPOT — engineering underhåller
4. Divergens: beteende → omedelbar fix · feature-gap → owner + ❌ i manifest
5. Gate 24 FAIL → re-open #2143329 · manifest uppdateras · re-test

72h-regel:
□ Varje ❌ har plan inom 72h (fix deploy eller godkänd undantag + owner)

Kill switch policy (dokumentera i manifest/PR):
□ KILL_SWITCH_23A — vid 23A FAIL/incident: blockerar 23B + bred Android-release
□ KILL_SWITCH_24 — endast produktägare + 72h remediation (parity bypass akut 9B)

Gör INTE: nya features, SSE, barn-wow, fältstudie

TEST:
□ parity-manifest.md 6/6 ✅
□ Kill switches AV om Gate 24 GREEN

VI HÄNDER Gate 24 FAIL:
→ Re-open #2143329 · manifest uppdateras · 9B blockerad

Release-gate: 9B tillåten
```

---

## Dashboard polish · Polsia #2143405

```
Uppgift: Dashboard polish — skeletons · transitions · polish

Polsia: #2143405
Läs: app2 (dashboard efter push), ej ny scope utan polish

Gör endast:
1. Dashboard: loading skeletons där det saknas
2. Mjuka transitions mellan tillstånd (CSS/JS, inga tunga libs)
3. Visuell polish på barnkort/rad — INGA nya features eller API

Gör INTE: SSE, barn-wow, ny navigation, PG-ändringar

TEST:
□ Native + webb: dashboard känns snabbare/renare utan regression
□ SW bump om CSS/JS ändrats

Release-gate: Dashboard polish (parallellt med 9A OK)
```

---

## GATE 25 — Family Delight Verification (verifierad 10/10)

**Ej Polsia-deploy.** Produktägare / fält — **efter** SSE + barn-wow. Ingen ny kod i denna gate.

```
Uppgift: Gate 25 — Family Delight Verification

Läs: android.md § Gate 25, app2 §16.5–16.6

Gör endast (4–6 veckor):
1. Rekrytera och följ 20 familjer (iOS och/eller Android — samma produkt)
2. Mät retention vecka 1 → vecka 4/6 (dokumentera metod + siffror)
3. Signera per kriterium:
   □ Barn använder appen frivilligt flera gånger/vecka
   □ Föräldrar behöver inte löpande support (PG, login, push, sync)
   □ Inga blockerande återkommande PG-/push-/sync-problem
4. Gate 25-rapport: retention, citat, kvarvarande P2/P3 — godkänd av produktägare

Gör INTE: nya stora features under perioden (riskerar att förstöra mätningen)

Förutsättningar (ska vara klart):
□ Live-synk (SSE) första version deployad
□ Barn-wow första version deployad
□ Gate 24 + 9B genomförd

TEST:
□ 20/20 familjer genomfört minst 4 veckor ELLER dokumenterat varför inte
□ Retention trend dokumenterad

Release-gate: "Min Stjärndag är 10/10" — först efter Gate 25 grön
```

---

## Versionshistorik

| Datum | Ändring |
|-------|---------|
| 2026-05-28 | RELEASE OS: 25 tasks; #2143329 Gate 24 + parity-manifest; 23A/23B; Sprint 14 #2143272 |
| 2026-05-28 | FULL KÖ 27 tasks + Polsia IDs; Sprint 4 en task; 22a/22b; P0.6+#2142922; Dashboard #2143015 |
| 2026-05-28 | v1.4: Gate 25 Family Delight (10/10 fält); ej Android-specifik |
| 2026-05-28 | v1.3: Gate 24 iOS↔Android parity före 9B; blockerar testfamiljer |
| 2026-05-28 | v1.2: Sprint 0 Gate 0 före 16; makro SSE/wow före fältstudie |
| 2026-05-28 | v1.1: 20.5 observability, 21 PG, 22 deep links före 9B, 23 smoke; app2-styrning |
| 2026-05-28 | Sprint 16–21 Android + android.md; Release-gate Android |
| 2026-05-28 | Första koordineringsdoc — 15 tasks, PG före gating, Sprint 4 tillagd |
