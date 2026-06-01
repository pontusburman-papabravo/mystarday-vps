# iOS-städ — Frysa plattformsarkitekturen (webb + native)

## Version 2.1

**Skapad:** 2026-05-29 · **Senast uppdaterad:** 2026-05-28 · **Dokumentversion:** `2.1`

> **Masterplan:** [`app2.md`](../app2.md) **v2.3** är huvudplan (P0, Fas A+, §14, §18).  
> Detta dokument är den **operativa styrspecifikationen** för plattformsstäd — problem → orsak → målarkitektur → åtgärd → acceptans.

**Relaterade dokument:**

| Dokument | Innehåll |
|----------|----------|
| **[`app2.md`](../app2.md)** | **Läs detta först** — P0.1–P0.4, Fas A+, TestFlight-gates |
| [`docs/plattform-webb-ios-android.md`](plattform-webb-ios-android.md) | Plattformsmatris (översikt) |
| [`app.md`](../app.md) | Native build-plan (10 steg) |

**Syfte:** Städa upp efter native-plan + snabba webb-fixar så **webb** och **Capacitor** samexisterar utan att varje release kräver om-skrivning.  
**Mål:** En kodbas där plattformslogik har **en sanning** (`platform.js`) och prioritering speglar **säkerhet före polish**.

---

## Bakgrund — varför det blev grötigt

```
Steg 1–10 (native-plan)     →  Optimerat för TestFlight / App Store
Appen inte publicerad än    →  Alla använder mystarday.se i webbläsare
Snabba webb-fixar           →  Native-gates skrivs över med web-logik
```

**Symptom:** Apple-knapp på fel plattform, PWA-guider syns i iOS-appen, samma navigation överallt, middleware blockerar lifetime-konton, Apple Sign In trasigt, barn lämnar barnläge → dashboard.

**Grundregel framåt:** Webb-fixar får **aldrig ta bort** native-logik — bara `if (Platform.isNative()) { … } else { … }`.

---

## Tre lägen (inte två)

Många gör misstaget *webb vs app*. Ni har **tre produkter** ur UX-synpunkt:

| Läge | Detektering | Användarupplevelse |
|------|-------------|-------------------|
| **Desktop webb** | `Platform.isWeb()` + bred viewport | Sidomeny, PWA-callout valfritt, e-post/lösenord |
| **Mobil webb / PWA** | `Platform.isWeb()` + smal / standalone | Hamburger, PWA-installguide, Web Push (VAPID) |
| **Native app** | `Platform.isNative()` | Tab bar, APNs, native login, **ingen** PWA-text |

**PWA och native är inte samma produkt.**

**Använd aldrig** `window.innerWidth` eller user-agent för att skilja **app från webb**. User-agent får användas **inuti webb-grenen** (t.ex. Apple JS på iPhone Safari).

---

## Fryst arkitektur (målbild)

### 1. `platform.js` = enda sanningen

Det viktigaste beslutet i hela dokumentet.

All plattformslogik ska gå via `window.Platform`:

| API | Betydelse |
|-----|-----------|
| `Platform.isNative()` | Capacitor iOS/Android-app |
| `Platform.isIOS()` | Native iOS **endast** (inte Safari) |
| `Platform.isAndroid()` | Native Android **endast** |
| `Platform.isWeb()` | Allt som inte är native |
| `Platform.isAppleSignInAvailable()` | Native iOS **eller** iOS Safari — Apple-knapp |
| `Platform.isGoogleSignInAvailable()` | *(mål)* Native Android — Google-knapp |
| `Platform.appleSignIn.signIn()` | Capacitor-plugin (native) vs Apple JS (webb) |
| `Platform.googleSignIn.signIn()` | *(mål)* Native Android plugin |

Vid app-start (native):

```javascript
// Körs en gång i platform.js
document.body.classList.add('is-native');
document.documentElement.classList.add('is-native-ios'); // om iOS
```

CSS-gating utifrån klass — **inte** spridd `if (Platform…)` i varje HTML-fil.

#### Arkitekturregel 1 — `platform.js` = enda sanningen

> **Ingen ny plattformslogik får införas utanför `platform.js` utan särskilt skäl** (dokumenterat i PR).

Om ni sprider `Capacitor.isNativePlatform()` i views igen → samma röra om några månader.

#### Arkitekturregel 2 — Plattformsneutrala features

**Framtida funktioner måste vara plattformsneutrala.**

Feature-kod får **aldrig** fråga direkt:

- Är detta iOS?
- Är detta Android?
- Är detta webb?

Feature-kod frågar **endast** Platform API.

| ✅ OK | ❌ Inte OK |
|--------|----------|
| `Platform.push.subscribe()` | `if (Capacitor.isNativePlatform()) { … }` |
| `Platform.haptics.light()` | `if (/iPhone/.test(navigator.userAgent))` |
| `Platform.isNative() ? tabBar : hamburger` *(i platform.js)* | Plattformscheck i `dashboard.js`, `schedule.js`, … |

Detta avgör om projektet fortfarande är rent om ett år.

### 2. Parental Gate = plattformsregel

Parental Gate är **inte** en "säkerhetsfeature i kanten" — det är en **plattformsregel** på samma nivå som `platform.js` (se app2 P0.1).

När `device_mode = 'child'` **vinner det alltid** över:

| Genväg | Måste blockeras/styras |
|--------|----------------------|
| `sessionRestored` | Får **inte** skicka till dashboard |
| Deep links | Route via Session Gate → barnvy eller PG |
| Token refresh | Behåll barnläge efter refresh |
| Back navigation (OS/browser) | Kringgår **inte** PG |
| Direkt URL (`/dashboard`, `/settings`, …) | Redirect → `/child-login` eller PG |

**Ingen route får avgöra detta själv.**  
All routing vid app-start och navigering ska gå via **`Platform` / Session Gate** (t.ex. `Platform.session.resolveInitialRoute()` eller motsvarande central funktion i `platform.js`).

Det förhindrar framtida genvägar när nya sidor läggs till.

| Endast PG får sätta | `device_mode = 'parent'` |
|---------------------|-------------------------|
| Persistent lagring | `@capacitor/preferences` / Secure Storage (native), localStorage (webb) |

**Spec:** app2 §5.2.1, §14.1, Fas A+ DEL 2.

### 3. CSS-gating (global)

```css
.is-native [data-pwa-guide],
.is-native .pwa-callout,
.is-native .pwa-install-banner,
.is-native .download-app-callout {
  display: none !important;
}
```

**Gör INTE i native:** "Ladda ner appen", "Lägg till på hemskärmen", Stripe-checkout, länkar till webb-betalning.

### 4. Navigation

| Plattform | Navigation |
|-----------|------------|
| Webb (mobil + desktop) | `mobile-nav.js` (hamburger) |
| Native app | Tab bar + dölj hamburger (Guideline 4.2) |

---

## Plattformsmatris — inloggning (Apple + Google)

| Kontext | Apple-knapp | Google-knapp | Implementation |
|---------|-------------|--------------|----------------|
| **Native iOS** | ✅ Native Apple | Valfritt / senare | Capacitor `@sign-in-with-apple` |
| **Native Android** | ❌ | ✅ Native Google | Capacitor Google plugin + `/api/auth/google` |
| **iOS Safari** | ✅ Apple JS | ❌ | `appleid.apple.com/auth/js` |
| **Android Chrome** | ❌ | ❌ eller webb-OAuth | E-post/lösenord (undvik WebView-OAuth) |
| **Desktop webb** | Valfritt (Safari-only) | Valfritt | E-post/lösenord primärt |

**Regel:** Inte web-wrapper-flöde (WebView → Safari OAuth → tillbaka). Se [`app2.md`](../app2.md) P0.2.

---

## Städ-uppgifter (prioriterad ordning)

> **Ändring v2.0:** Parental Gate flyttad från Prio 5 → **Prio 2**.  
> *Barn → dashboard utan PG* är allvarligare än *hamburger istället för tab bar*.

### Prio 1 — Universal Auth (Apple + Google)

**Problem idag (kända buggar):**

| Bug | Fil | Fix |
|-----|-----|-----|
| Apple-knapp på Android-native | `login.html`, `register.html` | `isAppleSignInAvailable()` — **inte** `isNative()` alone |
| JWKS/PEM trasig | `src/routes/auth.js` `_jwkToPem` | `crypto.createPublicKey` |
| CSRF 403 på Apple | `src/middleware/csrf.js` | Exempt: `/auth/apple`, `/auth/apple/link` |
| 409 email_conflict | `login.html` | `data.error === 'email_conflict'` + modal (ej `prompt()`) |
| Apple-länkning fel payload | `login.html` | `idToken`; kräv lösenord-login först |
| Fel redirect efter Apple | `login.html` | `onboarding_completed === false` → `/onboarding` |
| Google Android | *(saknas delvis)* | Native plugin + backend — se app2 P0.2 |

**Acceptans:** [§14.3 + §14.8 i app2.md](../app2.md#14-acceptanskriterier-per-feature)

---

### Prio 2 — Parental Gate (plattformsregel)

**Implementerar:** [§ Parental Gate = plattformsregel](#2-parental-gate--plattformsregel) ovan.

**Varför direkt efter auth:** Största säkerhets- och förtroenderisken inför externa familjer — viktigare än tab bar eller dashboard-polish.

```
❌ Idag:   Barn lämnar barnläge → dashboard (sessionRestored)
✅ Mål:    device_mode = 'child' → Session Gate → /child-login → PIN → barnvy
```

| Krav | Spec |
|------|------|
| Session Gate | All initial routing + deep links + refresh |
| Persistent `device_mode` | Force close → fortfarande barnläge |
| PG vid barn → vuxen | App-lås-PIN + biometri |
| Server | Barn-JWT → 403 på vuxen-API |

**Polsia:** Uppdrag B. **Acceptans:** app2 §14.1, 8-års iPad-test.

---

### Prio 3 — UI-gating (dölj webbspår i native)

**Varför före polish:** Apple bryr sig mer om *"Lägg till på hemskärmen"* i appen än dashboard-spacing.

| Element | Var | Native |
|---------|-----|--------|
| PWA-installguide | `pwa-install.js`, settings | `isNeeded()` = false |
| PWA-callout | `index.html` | `.is-native` CSS |
| Cookie/marketing | `cookie-banner.js` | Dölj/reducera |
| Webb-hamburger | föräldrasidor | Dölj när tab bar (Prio 5) |

**Acceptans:** TestFlight → **ingen** PWA-/install-text. Safari mobil → PWA-guide **syns**.

---

### Prio 4 — Betalnings-middleware (`is_lifetime_free`)

**Varför tidigt:** Felaktig `requireActiveSubscription()` låser review-konto och grundarfamiljer — **värre än saknad tab bar**.

**Fix:** `src/middleware/subscription.js` — om `is_lifetime_free === true` → `next()` alltid.

**Acceptans:**
- [ ] `review@mystarday.se` → ingen 402
- [ ] Familjer med `is_lifetime_free=true` → full access

*Kan deployas tillsammans med Prio 1 (liten diff).*

---

### Prio 5 — Navigation (tab bar native)

**Webb:** Oförändrat — `mobile-nav.js`.

**Native:** `native-tab-bar.js` — Hem · Schema · Bibliotek · Familj · Inställningar; safe-area; haptik vid flikbyte.

**Acceptans:** Native → tab bar, hamburger borta. Webb → hamburger kvar. Barnvy → egen nav.

---

## Slutgiltig prioritering (externa familjer / release-styrande)

Om målet är **externa familjer** (9B), kör i denna ordning. Samma riktning som app2 — med **PG på absolut toppnivå** efter auth.

| # | Leverabel | Gate / deploy |
|---|-----------|----------------|
| 1 | **Platform.js-frys** | `is-native`, API, Session Gate-skelett |
| 2 | **Native auth** | Prio 1 — Apple iOS, Google Android, e-post webb |
| 3 | **Parental Gate** | Prio 2 — plattformsregel, `device_mode` |
| 4 | **UI-gating** | Prio 3 — noll PWA/webb i native |
| 5 | **Lifetime free** | Prio 4 — middleware |
| 6 | **Native tab bar** | Prio 5 |
| 7 | **Push** | Token + APNs/FCM (app2 — före dashboard) |
| 8 | **Crashlytics/Sentry** | P0.6 — före 9B |
| 9 | **9A** | Intern QA (§18) |
| 10 | **9B** | Testfamiljer |
| 11 | Dashboard-polish | Efter RC |
| 12 | Deep links | Före public launch (P0.5) |

**Fas A+** i app2 = steg **1–6**. Markeras **inte** klar förrän [Release-gate Fas A+](#release-gate--fas-a) är helt grön.

---

## Rekommenderad körordning (Polsia, vertikalt)

| Steg | Innehåll | Deploy |
|------|----------|--------|
| 1 | Platform.js-frys + Uppdrag A (auth + ev. lifetime) | Ett |
| 2 | Uppdrag B (PG + Session Gate) | Eget — **direkt efter auth** |
| 3 | Uppdrag C (UI-gating) | Eget |
| 4 | Uppdrag E (tab bar) | Eget |
| 5 | Push, P0.6, 9A, 9B | Enligt app2 |

**Synk med app2:** Fas A+ super-uppdrag endast om Polsia håller strikt scope; annars steg-för-steg ovan.

---

## Polsia-uppdrag (copy-paste)

### Uppdrag A — Auth (Prio 1)

```
Uppgift: iOS-städ Uppdrag A — Universal Auth (Prio 1)

Läs: docs/ios-städ.md v2.1, app2.md §4 P0.2, §14.8

Gör:
1. platform.js: is-native-klasser, isAppleSignInAvailable(), isGoogleSignInAvailable() (Android native)
2. auth.js: _jwkToPem (crypto.createPublicKey)
3. csrf.js: exempt /auth/apple, /auth/apple/link
4. login.html + register.html: Apple/Google enligt matris; email_conflict modal; handleAppleLink idToken
5. Ladda platform.js på login, register, onboarding, settings, schedule, dashboard
6. SW bump

Gör INTE: PG, tab bar, full pwa-gating, barnlogin redesign, kontohantering A–F

Test: se "Definition of Done — Uppdrag A" i ios-städ.md
```

#### Definition of Done — Uppdrag A

Klart när **alla** är signerade (av dig, inte bara Polsia):

- [ ] Apple fungerar i **TestFlight** (native plugin) — eller noterat "ej testbar" om inget ios/-projekt
- [ ] Apple fungerar i **iOS Safari** (Apple JS)
- [ ] **Android native:** ingen Apple-knapp; Google om P0.2 scope ingår
- [ ] **Desktop Chrome:** e-post login, ingen Apple-knapp
- [ ] `email_conflict` → modal, inte `prompt()`
- [ ] `is_lifetime_free` passerar middleware (om Prio 4 ingår i samma deploy)
- [ ] **SW deployad** till prod
- [ ] Testmatris i PR/kommentar ifylld

---

### Uppdrag B — Parental Gate (Prio 2)

```
Uppgift: iOS-städ Uppdrag B — Parental Gate + Session Gate (Prio 2)

Läs: ios-städ.md § "Parental Gate = plattformsregel", app2.md §5.2.1, §14.1

Gör:
1. device_mode persistent (child/parent)
2. Platform.session / Session Gate: ALL initial routing + deep link + token refresh
   - device_mode=child vinner över sessionRestored, direkt URL, back
3. PG-modal vid utpassage; biometri; glömt PIN = full logout
4. Server: barn når inte vuxen-API/routes
5. Feature flag: parental_gate_enabled (se Rollback-plan)
6. SW bump

Gör INTE: tab bar, dashboard mockup, barnlogin redesign

Test: §14.1 + Release-gate Parental Gate
```

---

### Uppdrag C — UI-gating (Prio 3)

```
Uppgift: iOS-städ Uppdrag C — UI-gating (Prio 3)

Läs: docs/ios-städ.md § CSS-gating, app2 §14.7

Gör:
1. public/css/platform-gating.css
2. pwa-install.js isNeeded() false i native
3. Dölj cookie/PWA på settings, index callouts

Test: TestFlight ingen PWA-text; Safari mobil PWA syns
```

---

### Uppdrag D — Lifetime free (Prio 4)

```
Uppgift: iOS-städ Uppdrag D — is_lifetime_free (Prio 4)

Läs: subscription.js, app2 grundarfas 200 familjer

Gör: requireActiveSubscription respekterar is_lifetime_free

Test: review@mystarday.se + grundarfamilj ingen 402
```

---

### Uppdrag E — Native tab bar (Prio 5)

```
Uppgift: iOS-städ Uppdrag E — Native tab bar (Prio 5)

Läs: app2.md §4 P0.4, §14.6

Gör: native-tab-bar.js, safe-area, haptik, dölj hamburger

Gör INTE: ändra mobile-nav.js på webb

Test: TestFlight tab bar; mobil webb hamburger kvar
```

---

## Checklista före App Store-submit

Se även [`app2.md` §18](../app2.md#18-native--app-store--väg-610) master-checklista.

### Native (TestFlight)

- [ ] Apple Sign In på fysisk iPhone
- [ ] Ingen PWA-/install-text
- [ ] PG + barnläge persistent
- [ ] Push: token + test-notis
- [ ] Review-konto enligt app2 §18.2

### Webb (produktion)

- [ ] Registrering + e-post login
- [ ] Barn-PIN → barnvy

### Gemensamt

- [ ] `platform.js` på alla auth-sidor
- [ ] SW deployad
- [ ] Polsia-prod = sanning; GitHub speglad

---

## Förbjudna mönster

Dessa ska **aldrig** introduceras (code review / Polsia-prompt):

| ❌ Förbjudet | ✅ Rätt |
|-------------|--------|
| `window.innerWidth` för native-detektering | `Platform.isNative()` |
| `userAgent` för app vs webb-val | `Platform.*` i `platform.js` |
| `Capacitor.isNativePlatform()` direkt i views | Wrapper i `platform.js` |
| Apple-knapp utan `isAppleSignInAvailable()` | Plattformsmatris |
| Google-knapp på iOS native utan spec | Matris |
| PWA-banner utan `.is-native`-gating | `platform-gating.css` |
| Stripe-/webb-betalningslänkar i native app | IAP senare; nu `PAYMENT_ENABLED=false` |
| Ta bort native push för web-push | `if (isNative()) … else VAPID` |
| En navigation för alla plattformar | Tab bar native, hamburger webb |
| Blanda PG + auth + tab bar i ett deploy | Vertikala sprintar |
| Route som ignorerar `device_mode` | Session Gate i `platform.js` |
| `sessionRestored` → dashboard i barnläge | Session Gate redirect |

---

## Rollback-plan

När **9B-familjer** kör produktion måste kritiska Fas A+-ändringar kunna stängas av **utan ny App Store-release**.

### Rollback-regel

Alla ändringar i Fas A+ (steg 1–6) ska kunna disable:as via **feature flags** (server och/eller klient).

| Flagga | Styr | Vid kritisk bug |
|--------|------|----------------|
| `native_auth_enabled` | Native Apple/Google-flöden | Av → e-post-login only |
| `parental_gate_enabled` | Session Gate + PG | Av → endast vid nöd; dokumentera risk |
| `native_tabbar_enabled` | `native-tab-bar.js` | Av → webb-hamburger i native |
| `native_ui_gating_enabled` | `platform-gating.css` / PWA-dölj | Av → temporärt (review-risk) |

**Implementering (förslag):**

- Klient: läs från `GET /api/config` eller befintlig `features` / `family_features`
- Server: env-override `FEATURE_PARENTAL_GATE=false` för snabb prod-toggle
- Default: **på** i prod efter 9A grön

### Vid kritisk bug

```
1. Stäng feature flag (admin eller env)
2. Deploy config / server — ingen App Store-build krävs för klient-flaggor som läses vid start
3. Om klient-cache: SW bump + tvinga reload
4. Postmortem → fix → flagga på igen
```

**PG-flagga:** Stäng **inte** `parental_gate_enabled` lättvindigt i produktion med barn på delad iPad — endast nödfall.

---

## Release-gate — Fas A+

**Fas A+ får inte markeras klar** förrän alla rader nedan är ✅. Därefter: **TestFlight → 9A**.

### Auth

- [ ] Apple native **iOS** (TestFlight eller noterat blocker)
- [ ] Google native **Android** (om Android i scope)
- [ ] E-post login **webb** (desktop + mobil)

### UI (native)

- [ ] Ingen PWA-text i native
- [ ] Ingen webb-banner / cookie som avslöjar webb i native

### Subscription

- [ ] `is_lifetime_free` fungerar (review-konto + grundarfamiljer)

### Navigation

- [ ] Native tab bar (vuxen, native only)
- [ ] Webb hamburger kvar (ingen regression)

### Parental Gate (plattformsregel)

- [ ] **Force close** → fortfarande barnläge → PIN
- [ ] **Back gesture** kringgår inte PG
- [ ] **Session restore** → inte dashboard i barnläge
- [ ] **Token refresh** → fortfarande barnläge
- [ ] **Direkt URL** till vuxen-sida blockeras i barnläge

### Drift

- [ ] Feature flags deployade och testade (minst av/på i staging)
- [ ] SW deployad till prod

### Före Android-spår (Gate 0)

- [ ] **Sprint 0 / Gate 0:** Native parity freeze — 0 otillåtna `Capacitor` / `userAgent` / `Android`-grenar i views ([`android.md`](../android.md) § Sprint 0, Polsia sprint 0)

**Alla gröna → TestFlight tillåten.** Android sprint **16+** kräver Gate 0 grön. **9B** kräver även **Gate 24** (iOS ↔ Android parity — [`android.md`](../android.md) § Gate 24).

Full launch-checklista: [`app2.md` §18](../app2.md#18-native--app-store--väg-610).

---

## Relaterade dokument

| Dokument | Innehåll |
|----------|----------|
| [`app2.md`](../app2.md) v2.3 | Masterplan, P0, Fas A+, 10/10 |
| [`app.md`](../app.md) | 10-stegs native-plan |
| `docs/app-store-review-notes.md` | Review Notes |
| `docs/polsia-kontohantering-a-f.md` | Kontohantering (efter Uppdrag A) |
| `docs/polsia-barnlogin-design.md` | Barnlogin P1 (efter PG) |

---

## Versionshistorik

| Datum | Version | Ändring |
|-------|---------|---------|
| 2026-05-28 | **2.1** | PG som plattformsregel + Session Gate; plattformsneutrala features; rollback-plan; Release-gate Fas A+; slutgiltig prio för 9B |
| 2026-05-28 | **2.0** | PG → Prio 2; Google-matris; förbjudna mönster; DoD Uppdrag A; platform.js-regel; koppling app2 v2.3 |
| 2026-05-29 | 1.0 | Första version — arkitektur-frys efter steg 1–10 + webb-backning |
