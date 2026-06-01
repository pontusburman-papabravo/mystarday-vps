# Polsia — Sprint-kö (copy-paste)

**Källor:** [`app2.md`](../app2.md) v2.3 · [`ios-städ.md`](ios-städ.md) v2.1 · [`android.md`](../android.md) v1.4  
**Regel:** En task = ett deploy. Max scope i listan. Inga refactors.

**Styrning:** Vid konflikt gäller **`app2.md`**. `android.md` är endast Android-tillägg — se [`android.md`](../android.md) § Styrning.

---

## FULL KÖ — 27 tasks (Polsia UI = sanning)

**Splittar:** Sprint 2 → 2a+2b · Sprint 3 → 3a+3b+3c · Sprint 5 → 5a+5b+5c · Sprint 22 → 22a+22b  
**Sprint 4:** en task i Polsia (innehåll = tidigare 4a+4b+4c i ett deploy).  
**Android:** 1 task per sprint (backend+klient i samma task där det är filpar).  
**Obs köordning Fas A:** UI-gating (2a–2b) **före** PG (3a–3c) i Polsia — `ios-städ` rekommenderade PG först; följ **denna tabell** i Polsia.

### FAS A — iOS + universal (kör först)

| # | Sprint | Polsia task | P0 | h |
|---|--------|-------------|-----|---|
| 1 | 1.1 | #2141408 Backend auth | P0.2 | 2 |
| 2 | 1.2 | #2141409 platform.js | P0.2 | 3 |
| 3 | 1.3 | #2141410 login + register UI | P0.2 | 3 |
| 4 | 1.4 | #2141411 CSS scaffold + SW | P0.3 | 1 |
| 5 | 2a | #2141905 platform-gating full | P0.3 | 2 |
| 6 | 2b | #2141914 pwa-install isNeeded | P0.3 | 1 |
| 7 | 3a | #2141844 device_mode + Session Gate | P0.1 | 2 |
| 8 | 3b | #2141848 PG-modal + PIN + biometri | P0.1 | 2 |
| 9 | 3c | #2141855 Server 403 + feature flag | P0.1 | 2 |
| 10 | **4** | #2141717 Native tab bar vuxen | P0.4 | 3 |
| 11 | 5a | #2141868 login rollval | P1 | 1 |
| 12 | 5b | #2141884 barnväljare + PIN-tavla | P1 | 2 |
| 13 | 5c | #2141897 add-child redirect | P1 | 1 |

### FAS B — Android-spår (efter Fas A; delvis ‖ 9A)

| # | Sprint | Polsia task | P0 | h |
|---|--------|-------------|-----|---|
| 14 | **0** | #2142916 Gate 0 audit | — | 2 |
| 15 | 16 | #2142930 Capacitor Android smoke | — | 4 |
| 16 | 17 | #2142967 Google backend | — | 2 |
| 17 | 18 | #2142973 Google native client | — | 2 |
| 18 | 19 | #2142979 FCM server | — | 2 |
| 19 | 20 | #2142983 FCM client | — | 2 |
| 20 | **P0.6** | #2142922 Crashlytics/Sentry (iOS+Android) | P0.6 | 2 |
| 21 | 20.5 | #2142988 Android observability | P0.6 | 2 |
| 22 | 21 | #2142994 Android PG-härdning | — | 2 |
| 23 | 22a | #2142999 Deep links server | P0.5 | 2 |
| 24 | 22b | #2143005 Deep links client | P0.5 | 2 |
| 25 | 23 | #2143009 Android smoke gate | — | 3 |
| 26 | **Gate 24** | #2143012 iOS↔Android parity | — | 1 |
| 27 | — | #2143015 Dashboard polish | — | 2 |

**Efter 27 (ej task i Polsia):** 9A smoke → 9B → SSE → barn-wow → **Gate 25** (20 familjer × 4–6 v). Se [`android.md`](../android.md).

**Blockerar 9B:** Gate 24 (#2143012) grön. **Gate 0** blockerar sprint 16+.

**Makro (app2):** Fas A (1–13) → Fas B (14–26) → Dashboard (#27) → 9A → Gate 24 → 9B → SSE → wow → Gate 25.

**Raw / dela:** https://raw.githubusercontent.com/pontusburman-papabravo/MyStarday-Polsia/cursor/polsia-sprint-koordinering-1a8b/docs/polsia-sprint-koordinering.md

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

## SPRINT 22a — Deep links server · Polsia #2142999

```
Uppgift: Sprint 22a — Deep links server (assetlinks + routes)

Polsia: #2142999
Läs: android.md sprint 22, app2 P0.5

Gör endast:
1. /.well-known/assetlinks.json på mystarday.se (SHA256 signing key)
2. Capacitor/AndroidManifest intent filters: invite, confirm-email, pedagog-invite
3. Server/static: route-stöd för cold-start URLs (samma paths som iOS Universal Links där möjligt)
4. iOS AASA paritet om ändringar i well-known

Gör INTE: @capacitor/app klient-routing (22b), Play public, SSE

TEST:
□ assetlinks.json validerar (Google Statement List Tester eller adb)
□ Intent filter dokumenterat i PR

Release-gate: Deep links server (del av P0.5)
```

---

## SPRINT 22b — Deep links client · Polsia #2143005

```
Uppgift: Sprint 22b — Deep links client + push-tap routing

Polsia: #2143005
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

## SPRINT 23 — Android smoke gate · Polsia #2143009

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

Release-gate: Android release readiness (~8,5–9/10) — Gate 24 krävs för 9B
```

---

## P0.6 — Crashlytics/Sentry (iOS + Android) · Polsia #2142922

```
Uppgift: P0.6 — Crashlytics/Sentry i native (iOS + Android)

Polsia: #2142922
Läs: app2 P0.6, app2 §14.11

Gör endast:
1. Sentry ELLER Firebase Crashlytics — Capacitor native iOS + Android builds
2. release: app-version + git commit i varje event
3. Test-crash på BÅDA plattformar — syns i dashboard
4. Ingen PII i breadcrumbs

Gör INTE: Android-only symbolisering (→ sprint 20.5), PG, deep links

TEST:
□ iOS test-crash + Android test-crash inom 5 min
□ Version + commit syns

Release-gate: P0.6 delad ✓ (före 9B)
```

---

## SPRINT 20.5 — Android observability · Polsia #2142988

```
Uppgift: Sprint 20.5 — Android observability (P0.6 Android-del)

Polsia: #2142988
Läs: android.md sprint 20.5, app2 P0.6

Gör endast:
1. Verifiera Android stack traces / symbolisering (Sentry eller Crashlytics)
2. GDPR: ingen PII i Android-specifik config
3. Ev. separat Android DSN/project om krävs

Förutsättning: P0.6 #2142922 redan deployad.

Gör INTE: iOS-only ändringar, PG, deep links

TEST:
□ Android test-crash stack trace läsbar
□ Ingen e-post/barnnamn i payload

Release-gate: P0.6 Android ✓
```

---

## GATE 24 — Native parity verification · Polsia #2143012

```
Uppgift: Gate 24 — Native parity verification (före 9B)

Polsia: #2143012

Läs: android.md § Gate 24, app2 §9B, ios-städ Release-gate

Gör endast:
1. Revisionslista — signera ✅ per rad på BÅDE iPhone OCH Android (billig platta):
   - Feature-paritet (schema, belöningar, barnvy, inställningar)
   - Onboarding (samma slutläge; Apple iOS / Google Android)
   - Push (token, test-notis, tap → samma route)
   - PG / device_mode (barnläge, PIN, back/switcher)
   - Child mode (barnlogin, avbockning, stjärnor)
   - Analytics (samma event-typer vid samma åtgärder)
2. Dokumentera avvikelser i kommentar — fixa ENDAST parity-buggar (ingen ny feature)
3. Parity-matris: modell iOS + modell Android per rad

Gör INTE: ny funktionalitet, SSE, barn-wow, Play upload, fältstudie

TEST:
□ 6/6 områden ✅ på båda plattformar ELLER dokumenterad fix + re-test
□ Inga kända "fungerar bara på iPhone"-blockers kvar

Release-gate: 9B tillåten (iOS + Android testfamiljer)
```

---

## Dashboard polish · Polsia #2143015

```
Uppgift: Dashboard polish — skeletons · transitions · polish

Polsia: #2143015
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
| 2026-05-28 | FULL KÖ 27 tasks + Polsia IDs; Sprint 4 en task; 22a/22b; P0.6+#2142922; Dashboard #2143015 |
| 2026-05-28 | v1.4: Gate 25 Family Delight (10/10 fält); ej Android-specifik |
| 2026-05-28 | v1.3: Gate 24 iOS↔Android parity före 9B; blockerar testfamiljer |
| 2026-05-28 | v1.2: Sprint 0 Gate 0 före 16; makro SSE/wow före fältstudie |
| 2026-05-28 | v1.1: 20.5 observability, 21 PG, 22 deep links före 9B, 23 smoke; app2-styrning |
| 2026-05-28 | Sprint 16–21 Android + android.md; Release-gate Android |
| 2026-05-28 | Första koordineringsdoc — 15 tasks, PG före gating, Sprint 4 tillagd |
