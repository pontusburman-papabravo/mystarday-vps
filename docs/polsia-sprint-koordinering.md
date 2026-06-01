# Polsia — Sprint-kö (copy-paste)

**Källor:** [`app2.md`](../app2.md) v2.3 · [`ios-städ.md`](ios-städ.md) v2.1  
**Regel:** En task = ett deploy. Max scope i listan. Inga refactors.

---

## Körordning (15 tasks)

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

**Efter 15:** Push → P0.6 Crash → 9A → 9B → Dashboard-polish → Deep links (app2).

**Ändring mot tidigare 12-kö:** PG (3) **före** UI-gating (2). Tab bar (4) tillagd.

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

→ Då: TestFlight → 9A
```

---

## Versionshistorik

| Datum | Ändring |
|-------|---------|
| 2026-05-28 | Första koordineringsdoc — 15 tasks, PG före gating, Sprint 4 tillagd |
