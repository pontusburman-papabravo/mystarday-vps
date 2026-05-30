# iOS-städ — Frysa plattformsarkitekturen (webb + native)

**Skapad:** 2026-05-29  
**Syfte:** Städa upp efter att alla 10 steg i [`app.md`](https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/cursor/create-app-md-1c33/app.md) körts, följt av snabba webb-fixar medan appen inte är släppt i App Store än.  
**Mål:** En kodbas där **webb (desktop/mobil/PWA)** och **native app (Capacitor)** samexisterar utan att varje release kräver om-skrivning.

---

## Bakgrund — varför det blev grötigt

```
Steg 1–10 (native-plan)     →  Optimerat för TestFlight / App Store
Appen inte publicerad än    →  Alla använder mystarday.se i webbläsare
Snabba webb-fixar           →  Native-gates skrivs över med web-logik
```

**Symptom:** Apple-knapp på fel plattform, PWA-guider syns i iOS-appen, samma navigation överallt, middleware blockerar lifetime-konton, Apple Sign In trasigt på vissa vägar.

**Grundregel framåt:** Webb-fixar får **aldrig ta bort** native-logik — bara lägga till `if (Platform.isNative()) { … } else { … }`.

---

## Tre lägen (inte två)

| Läge | Detektering | Användarupplevelse |
|------|-------------|-------------------|
| **Desktop webb** | `Platform.isWeb()` + bred viewport | Sidomeny, PWA-callout valfritt, e-post/lösenord |
| **Mobil webb / PWA** | `Platform.isWeb()` + smal viewport / standalone | Hamburger (`mobile-nav.js`), PWA-installguide, Web Push (VAPID) |
| **Native app** | `Platform.isNative()` | Tab bar, APNs, Apple Sign In (iOS), **ingen** PWA-text, IAP (senare) |

**Använd aldrig** enbart `window.innerWidth` eller user-agent för att skilja **app från webb**. User-agent får användas **inuti webb-grenen** (t.ex. visa Apple JS på iPhone Safari).

---

## Fryst arkitektur (målbild)

### 1. `platform.js` = enda sanningen

All plattformslogik ska gå via `window.Platform`:

| API | Betydelse |
|-----|-----------|
| `Platform.isNative()` | Capacitor iOS/Android-app |
| `Platform.isIOS()` | Native iOS **endast** (inte Safari) |
| `Platform.isAndroid()` | Native Android **endast** |
| `Platform.isWeb()` | Allt som inte är native |
| `Platform.isAppleSignInAvailable()` | *(ny)* Native iOS **eller** iOS Safari — styr **synlighet** för Apple-knapp |
| `Platform.appleSignIn.signIn()` | Väljer automatiskt Capacitor-plugin (native) vs Apple JS (webb) |

Vid app-start (native):

```javascript
// Mål — körs en gång i platform.js
document.body.classList.add('is-native');           // alla native
document.documentElement.classList.add('is-native-ios'); // om iOS
```

CSS-gating utifrån klass — **inte** spridd `if (Platform…)` i varje HTML-fil.

### 2. CSS-gating (global)

```css
/* Göm webb-only i native-appen (App Store 4.2) */
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
| Webb (mobil + desktop) | Befintlig `mobile-nav.js` (hamburger) |
| Native app | **Tab bar** längst ner (Översikt / Schema / Inställningar) + dölj hamburger |

Tab bar är viktig för **Guideline 4.2** (appen ska inte kännas som inramad webb).

---

## Städ-uppgifter (prioriterad ordning)

### Prio 1 — Universal Auth (Apple Sign In)

**Problem idag (kända buggar i spegel-kod):**

| Bug | Fil | Fix |
|-----|-----|-----|
| Apple-knapp på Android-native | `login.html`, `register.html` | Visa knapp endast när `isAppleSignInAvailable()` — **inte** `isNative()` alone |
| JWKS/PEM trasig | `src/routes/auth.js` `_jwkToPem` | Byt till `crypto.createPublicKey` |
| CSRF 403 på Apple | `src/middleware/csrf.js` | Exempt: `/auth/apple`, `/auth/apple/link` |
| 409 email_conflict triggas inte | `login.html` | Backend skickar `error: 'email_conflict'`, inte `code` |
| Apple-länkning fel payload | `login.html` `handleAppleLink` | Skicka `idToken`, inte `identityToken`; kräv lösenord-login först |
| Ny Apple-användare → fel redirect | `login.html` | Server returnerar 200; kolla `onboarding_completed === false` → `/onboarding` |

**Flödesmatris:**

| Kontext | Apple-knapp | Implementation |
|---------|-------------|----------------|
| Native iOS | ✅ | `Platform.appleSignIn` → Capacitor `@sign-in-with-apple/native` |
| iOS Safari (webb) | ✅ | Apple JS (`appleid.apple.com/auth/js`) |
| Android native | ❌ | E-post/lösenord |
| Android webb | ❌ | E-post/lösenord |
| Desktop webb | ❌ (eller valfritt Safari-only) | E-post/lösenord |

**Acceptans:**
- [ ] iOS TestFlight: Apple login → dashboard/onboarding
- [ ] iOS Safari: Apple login fungerar
- [ ] Android app: **ingen** Apple-knapp
- [ ] Chrome desktop: e-post login, ingen Apple-knapp

---

### Prio 2 — UI-gating (dölj app-reklam i appen)

**Problem:** PWA-guider, install-banners och "ladda ner app"-texter syns i Capacitor → **vanligaste 4.2-avslagsorsaken**.

**Filer att gate:a:**

| Element | Var | Native |
|---------|-----|--------|
| PWA-installguide | `pwa-install.js`, `settings.html`, `dashboard.html` | `isNeeded()` = false (redan delvis) |
| PWA-callout | `index.html` `.pwa-callout` | CSS `.is-native` |
| Cookie/marketing | `cookie-banner.js` | Dölj/reducera i native |
| PWA-sektion inställningar | `settings.html` `#pwaInstallGuide` | Dölj helt i native |

**Acceptans:**
- [ ] Öppna appen i TestFlight → **ingen** "lägg till på hemskärmen"
- [ ] Öppna mystarday.se i Safari mobil → PWA-guide **syns** (om inte standalone)

---

### Prio 3 — Betalnings-middleware (lifetime free)

**Problem:** `requireActiveSubscription` i `src/middleware/subscription.js` kollar **inte** `is_lifetime_free` → grundarfamiljer kan få 402 efter trial.

**Fix:**

```sql
SELECT subscription_status, trial_ends_at, is_lifetime_free FROM family …
```

- Om `is_lifetime_free === true` → `next()` alltid
- Annars befintlig logik (beta / trial / active / grace_period)

**Acceptans:**
- [ ] Review-konto `review@mystarday.se` → full API-access utan paywall
- [ ] Familj #1–200 med `is_lifetime_free=true` → ingen 402

---

### Prio 4 — Navigation (hamburger vs tab bar)

**Webb:** Oförändrat — `mobile-nav.js`.

**Native:** Ny `native-tab-bar.js` (eller motsvarande):

- Fast bottenmeny: Översikt (`/dashboard`), Schema (`/schedule`), Inställningar (`/settings`)
- `body.is-native.has-native-tab-bar` → dölj `.mobile-topbar` / hamburger
- Safe-area padding för iOS home indicator

**Acceptans:**
- [ ] Native: tab bar syns, hamburger borta på föräldrasidor
- [ ] Webb mobil: hamburger kvar, ingen tab bar
- [ ] Barnvy (`child-dashboard`) — separat (ingen föräldra-tab bar)

---

### Prio 5 — Parental PIN (ej i original 10 steg, men kritiskt)

Barn kan idag lämna barnläge utan PIN (`sessionRestored` → dashboard direkt). Se separat spec / task **PG**.

---

## Var ska vi börja?

| Om detta stör mest | Börja här | Varför |
|--------------------|-----------|--------|
| **Inloggning / Apple** | Prio 1 | Blockerar TestFlight + App Review |
| **PWA-text i appen** | Prio 2 | Snabb vinst, minskar 4.2-risk |
| **Konton blockeras** | Prio 3 | Demo/review-konto + grundarfamiljer |
| **Appen känns som webb** | Prio 4 | 4.2 långsiktigt |
| **Barn säkerhet** | Prio 5 | Efter auth + gating |

**Rekommenderad ordning:** **1 → 2 → 3** (samma Polsia-deploy), sedan **4**, sedan **PG**.

---

## Polsia-uppdrag (copy-paste)

### Uppdrag A — Plattforms-frys + Auth (Prio 1–3)

```
Uppgift: iOS-städ fas 1 — Universal Auth + UI-gating + lifetime_free middleware

Läs: docs/ios-städ.md

Gör:
1. platform.js: body-klasser is-native / is-native-ios; isAppleSignInAvailable()
2. public/css/platform-gating.css + länka från platform.js
3. login.html + register.html: Apple-knapp enligt ios-städ.md matris
4. auth.js: fix _jwkToPem (crypto.createPublicKey)
5. csrf.js: exempt /auth/apple och /auth/apple/link
6. login.html: fix email_conflict, handleAppleLink (idToken + lösenord först)
7. subscription.js middleware: respektera is_lifetime_free
8. SW bump

Gör INTE: tab bar (fas 2), barnlogin-redesign, kontohantering A–F (separata tasks)

Test:
- iOS native: Apple login, ingen PWA-banner
- Android native: ingen Apple-knapp
- Safari mobil: Apple JS login, PWA-guide syns
- review@mystarday.se: ingen 402 paywall
```

### Uppdrag B — Native tab bar (Prio 4)

```
Uppgift: iOS-städ fas 2 — Native tab bar (Guideline 4.2)

Läs: docs/ios-städ.md § Navigation

Gör:
1. public/js/native-tab-bar.js — endast Platform.isNative()
2. CSS: fast bottenmeny, safe-area, dölj hamburger när .has-native-tab-bar
3. Montera på dashboard, schedule, settings (föräldrasidor)
4. SW bump

Gör INTE: ändra webb-navigation (mobile-nav.js)

Test: TestFlight → tab bar; Chrome mobil → hamburger kvar
```

---

## Checklista före App Store-submit

### Native (TestFlight)

- [ ] Apple Sign In fungerar på fysisk iPhone
- [ ] Ingen PWA-/install-text anywhere i appen
- [ ] Push: tillstånd → token i DB → test-notis
- [ ] Radera konto (Inställningar → RADERA)
- [ ] Privacy + Terms länkar fungerar
- [ ] Review-konto testat enligt `docs/app-store-review-notes.md`

### Webb (produktion under väntan)

- [ ] Registrering + e-post login
- [ ] PWA-install på iOS Safari (om önskat)
- [ ] Ingen IAP/Stripe-blockering (`PAYMENT_ENABLED=false`)
- [ ] Barn-PIN → barnvy fungerar

### Gemensamt

- [ ] `platform.js` laddad på login, register, onboarding, settings, dashboard
- [ ] Senaste SW deployad (cache-bust)
- [ ] GitHub-spegel synkad med Polsia-ZIP efter städ

---

## Gör INTE (orsakar regression)

| ❌ Fel mönster | ✅ Rätt mönster |
|---------------|----------------|
| Ta bort native push för att web-push ska funka | `if (isNative()) Platform.push else VAPID` |
| Dölj Apple globalt | Gate per plattform (se matris) |
| En navigation för alla | Tab bar native, hamburger webb |
| Hårdkoda "webb-läge" i native-fixar | `body.is-native` + CSS |
| Synca bara GitHub utan Polsia-deploy | ZIP/prod = sanning; spegel för diff |

---

## Relaterade dokument

| Dokument | Innehåll |
|----------|----------|
| [`app.md`](https://github.com/pontusburman-papabravo/MyStarday-Polsia/blob/cursor/create-app-md-1c33/app.md) | Original 10-stegs native-plan |
| `docs/app-store-review-notes.md` | Review Notes till Apple |
| `docs/app-store-apple-sign-in.md` | Apple Sign In-arkitektur |
| `docs/polsia-kontohantering-a-f.md` | Kontohantering (Apple link modal, m.m.) |
| `docs/native-app-test-checklist.md` | Testmatris |

---

## Versionshistorik

| Datum | Ändring |
|-------|---------|
| 2026-05-29 | Första version — arkitektur-frys efter steg 1–10 + webb-backning |
