# iOS-städ — Frysa plattformsarkitekturen (webb + native)

## Version 2.0

**Skapad:** 2026-05-29 · **Senast uppdaterad:** 2026-05-28 · **Dokumentversion:** `2.0`

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

#### Arkitekturregel (obligatorisk)

> **Ingen ny plattformslogik får införas utanför `platform.js` utan särskilt skäl** (dokumenterat i PR).

Om ni sprider `Capacitor.isNativePlatform()` i views igen → samma röra om några månader.

### 2. CSS-gating (global)

```css
.is-native [data-pwa-guide],
.is-native .pwa-callout,
.is-native .pwa-install-banner,
.is-native .download-app-callout {
  display: none !important;
}
```

**Gör INTE i native:** "Ladda ner appen", "Lägg till på hemskärmen", Stripe-checkout, länkar till webb-betalning.

### 3. Navigation

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

### Prio 2 — Parental Gate + persistent barnläge

**Varför Prio 2:** Största **säkerhets- och förtroenderisken** inför externa familjer och delad iPad (se app2 §5.2.1, P0.1).

```
❌ Idag:   Barn lämnar barnläge → dashboard (sessionRestored)
✅ Mål:    device_mode = 'child' → cold start → /child-login → PIN → barnvy
           Endast PG sätter device_mode = 'parent'
```

| Krav | Spec |
|------|------|
| Persistent `device_mode` | Överlever force close (§5.2.1) |
| PG vid barn → vuxen | App-lås-PIN + biometri |
| Skyddade routes | Barn når inte dashboard/settings/family |
| OS back | Kringgår inte PG |

**Implementering:** [`app2.md`](../app2.md) Fas A+ DEL 2, §14.1 — **eget Polsia-deploy**, inte blandat med auth om möjligt.

**Acceptans:**
- [ ] Force close i barnläge → omstart → PIN-skärm (inte dashboard)
- [ ] Smart 8-åring 30 min → når ingen vuxensida
- [ ] "Glömt PIN" → full logout + re-auth

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

## Rekommenderad körordning (Polsia)

| Steg | Prio | Deploy |
|------|------|--------|
| 1 | **1 Auth** (+ ev. **4 lifetime** i samma) | Ett deploy |
| 2 | **3 UI-gating** | Eget deploy |
| 3 | **2 Parental Gate** | Eget deploy — **inte** ihop med dashboard-polish |
| 4 | **5 Tab bar** | Eget deploy (helst med native build) |

**Synk med app2:** Fas A+ = Prio 1 + 2 + 3 + 5 i ett **super-uppdrag** endast om Polsia håller strikt scope; annars vertikalt enligt tabellen.

---

## Polsia-uppdrag (copy-paste)

### Uppdrag A — Auth (Prio 1)

```
Uppgift: iOS-städ Uppdrag A — Universal Auth (Prio 1)

Läs: docs/ios-städ.md v2.0, app2.md §4 P0.2, §14.8, plattformsmatris Apple+Google

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
Uppgift: iOS-städ Uppdrag B — Parental Gate + device_mode (Prio 2)

Läs: app2.md §5.2.1, §4 P0.1, §14.1, Fas A+ DEL 2

Gör: device_mode persistent, PG-modal, blockera vuxen-routes, OS back-gate, glömt PIN = logout

Gör INTE: tab bar, dashboard mockup, barnlogin 3-skärmar

Test: §14.1 + 8-års iPad-test (app2 §16.1)
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
| 2026-05-28 | **2.0** | PG → Prio 2; Google-matris; förbjudna mönster; DoD Uppdrag A; platform.js-regel; koppling app2 v2.3 |
| 2026-05-29 | 1.0 | Första version — arkitektur-frys efter steg 1–10 + webb-backning |
