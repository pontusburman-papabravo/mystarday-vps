# Min Stjärndag — app2.md (masterplan)

**Skapad:** 2026-05-31  
**Syfte:** **Ett dokument** som samlar produktkrav, ny design, plattformsregler, vad som **redan finns**, vad som **behöver städas**, och vägen till **iPhone-app**, **Android-app**, **mobil webbläsare** och **desktop webbläsare**.

**Produktion:** https://mystarday.se · https://stjarndag.polsia.app  
**Stack:** Node.js 20, Express, Neon PostgreSQL, Tailwind, PWA + Capacitor (remote WebView)

**Detaljerade under-specar** (Polsia-prompts med radnivå):  
[`docs/polsia-kontohantering-a-f.md`](docs/polsia-kontohantering-a-f.md) · [`docs/polsia-barnlogin-design.md`](docs/polsia-barnlogin-design.md) · [`docs/mockups/barnlogin-3-skarmar.png`](docs/mockups/barnlogin-3-skarmar.png)

**Designmockups (interaktiva HTML — öppna i webbläsare):**

| Mockup | Fil | Motsvarar |
|--------|-----|-----------|
| Vuxenvy (dashboard) | [`docs/mockups/foraldra.html`](docs/mockups/foraldra.html) | §2.1 |
| Barnvy (schema) | [`docs/mockups/barnvy.html`](docs/mockups/barnvy.html) | §2.2 |
| Belöningar | [`docs/mockups/beloningar.html`](docs/mockups/beloningar.html) | Skattkammaren |
| Firande | [`docs/mockups/celebration.html`](docs/mockups/celebration.html) | Mål uppnått-animation |
| Barnlogin | [`docs/mockups/barnlogin-3-skarmar.png`](docs/mockups/barnlogin-3-skarmar.png) | §2.3 |

**Designtokens (gemensamma):** navy `#1B2340`, gold `#F5A623`, lavender `#EDE7F6`, Outfit + Plus Jakarta Sans.

---

## Innehåll

1. [Fyra plattformslägen](#1-fyra-plattformslägen)
2. [Ny design (mockups)](#2-ny-design-mockups)
3. [Vad som redan finns ✅](#3-vad-som-redan-finns-)
4. [Vad som behöver städas 🔧](#4-vad-som-behöver-städas-)
5. [Produktkrav & funktioner](#5-produktkrav--funktioner)
6. [Behörigheter & separerade hushåll](#6-behörigheter--separerade-hushåll)
7. [Native polish (barnvy)](#7-native-polish-barnvy)
8. [Push-notiser](#8-push-notiser)
9. [Offline](#9-offline)
10. [Native build (Capacitor)](#10-native-build-capacitor)
11. [Implementeringsordning](#11-implementeringsordning)
12. [Polsia-uppdrag (copy-paste)](#12-polsia-uppdrag-copy-paste)
13. [Genomförandestrategi](#13-genomförandestrategi)
14. [Acceptanskriterier per feature](#14-acceptanskriterier-per-feature)
15. [Beredskapsbedömning](#15-beredskapsbedömning)

---

## 1. Fyra plattformslägen

**Grundregel:** All plattformslogik via `window.Platform` i `public/js/platform.js`.  
Webb-fixar får **aldrig ta bort** native-gates — bara `if (Platform.isNative()) { … } else { … }`.

```
                    ┌─────────────────────────────────────────┐
                    │           mystarday.se (samma kod)       │
                    └─────────────────────────────────────────┘
         ┌──────────────────┬──────────────────┬──────────────────┐
         │ Desktop webb     │ Mobil webb/PWA   │ Native app       │
         │ Chrome/Safari    │ Safari/Chrome    │ Capacitor iOS/And│
         ├──────────────────┼──────────────────┼──────────────────┤
         │ Sidomeny         │ Hamburger        │ Tab bar (vuxen)  │
         │ E-post login     │ + PWA-guide      │ APNs/FCM push    │
         │ DnD schema       │ Touch            │ Haptik, fullskärm│
         │ Ingen Apple*     │ Apple JS (iOS)   │ Apple Sign In iOS│
         └──────────────────┴──────────────────┴──────────────────┘
         * Apple valfritt desktop; prioritet = enkel e-post
```

| Dimension | iPhone **app** | Android **app** | Mobil **webb** | Desktop **webb** |
|-----------|----------------|-----------------|----------------|------------------|
| **Detektering** | `Platform.isNative()` + iOS | `Platform.isNative()` + Android | `Platform.isWeb()` + smal viewport | `Platform.isWeb()` + bred viewport |
| **Vuxen login** | Apple + e-post | E-post (Google v2) | Apple JS (iOS Safari) + e-post | E-post (+ ev. Apple) |
| **Barn login** | `/child-login` → PIN | samma | samma | samma |
| **Vuxen navigation** | Tab bar: Hem/Schema/Bibliotek/Familj/Inställningar | samma | Hamburger (`mobile-nav.js`) | Sidomeny vänster |
| **Barn navigation** | Bottennav: Schema / Skattkammaren / Min profil | samma | samma (mobilanpassat) | samma (centrerad kolumn) |
| **Push** | APNs | FCM | Web Push (VAPID, installerad PWA) | Web Push (begränsat) |
| **PWA-install** | ❌ Dölj | ❌ Dölj | ✅ Visa | Valfritt |
| **Offline** | IndexedDB + kö | samma | samma + SW-cache | samma |
| **Betalning** | IAP (RevenueCat, senare) | samma | Stripe (senare) | Stripe (senare) |

### CSS-gating (native)

```css
.is-native [data-pwa-guide],
.is-native .pwa-callout,
.is-native .pwa-install-banner { display: none !important; }
```

Vid native-start: `document.body.classList.add('is-native')`.

---

## 2. Ny design (mockups)

Designreferenser: **Reimagined Parent Dashboard** + **Reimagined Child View** (rymd-tema).  
Samma data (schema, stjärnor, belöningar) — **olika presentation** för vuxen vs barn.

### 2.0 Vy-jämförelse (samma app, olika roller)

| Aspekt | Vuxenvy | Barnvy |
|--------|---------|--------|
| **Tema** | Ljus, `#F0F4FF` bakgrund, vita kort | Mörk rymd, stjärnor, lila gradient |
| **Syfte** | Överblick, planera, snabbåtgärder | Motivation, bocka av, belöningar |
| **Header** | Kompakt: logo + profil (native) / "Dashboard" + share (webb) | Namn + ⭐ saldo; **Tillbaka** (PG) på delad enhet |
| **Primär nav** | Tab bar / sidomeny / hamburger | Bottennav: Schema · Skattkammaren · Min profil |
| **Aktiviteter** | Lista med NU/NÄSTA, tomma cirklar (förälder checkar åt barn) | Stora gula kort, grön bock, emojis |
| **Belöningar** | Gåva-ikon på barnkort (antal väntande) | Skattkammaren-flik, långsiktigt mål |

### 2.1 Vuxenvy — förälder (dashboard)

Wireframe (mobil/native):

```
┌─────────────────────────────────────┐
│ ⭐ Min Stjärndag              [👤]  │  ← kompakt header (safe-area)
├─────────────────────────────────────┤
│ Översikt                    ›       │
│ ┌──────────┐ ┌──────────┐          │
│ │ Astrid   │ │ Olle     │  →scroll │  ← horisontella barnkort
│ │ Idag 4/14│ │ Idag …   │          │
│ │ ⭐ 82    │ │ ⭐ …     │          │
│ │ ▓▓▓░░    │ │          │          │
│ │ 🎁 2     │ │          │          │
│ └──────────┘ └──────────┘          │
├─────────────────────────────────────┤
│ Dagens Quick Actions                │
│ [Ge extra stjärna] [Ledig dag] [+]  │
├─────────────────────────────────────┤
│ IDAG                                │
│ ○ Förskola/Skola        [NU]  +7⭐  │
│ ○ Mellanmål           [NÄSTA] +1⭐  │
│ ○ Läxor / Pyssel              +2⭐  │
│ ○ Fritidsaktivitet            +3⭐  │
├─────────────────────────────────────┤
│ 🏠  📅  📚  👨‍👩‍👧  ⚙️                    │  ← native tab bar
│ Hem Schema Bibl. Familj Inst.       │
└─────────────────────────────────────┘
```

| Element | Spec | Data/API | Plattform |
|---------|------|----------|-----------|
| **Kompakt header** | Navy bar, guld stjärna, vit titel, profilikon höger | `GET /api/auth/me` | Alla; native = ingen webbläsarfält |
| **Barnkort (scroll)** | Ett kort per barn: progress-ring/avatar, "Idag X/Y", "Totalt ⭐", progressbar, 🎁 antal väntande inlösen, senaste + nästa aktivitet | `GET /api/me/children`, daily-log summary | Alla |
| **Quick Actions** | 1) Ge extra stjärna → modal 2) Ledig dag → special day 3) **+** Lägg till aktivitet (primär mörk knapp i mockup v2) | befintliga routes | Touch ≥44px |
| **IDAG-lista** | Vertikal lista, tom checkbox vänster, aktivitetsnamn, stjärnvärde höger, gul **NU** / lila **NÄSTA** badge | `GET /api/me/daily-log` | Samma logik som idag, ny layout |
| **Share (webb)** | Dela-länk höger i header — valfritt native | share API | Webb mobil |
| **Navigation** | **Native:** tab bar — Hem · Schema · Bibliotek · Familj · Inställningar | routes | Se §1-matris |
| | **Desktop:** sidomeny | `mobile-nav.js` desktop-läge | Desktop |
| | **Mobil webb:** hamburger | `mobile-nav.js` | Mobil webb |

**Status idag:** `dashboard.html` + `dashboard.js` finns — **saknar** horisontella barnkort, quick actions-rad och native tab bar enligt mockup.

**Polsia-referens:** [`docs/mockups/foraldra.html`](docs/mockups/foraldra.html)

### 2.2 Barnvy — barn (child-dashboard)

Wireframe (mobil/native):

```
┌─────────────────────────────────────┐
│ ← Tillbaka    Dagens Schema    ☰   │  ← Tillbaka = PG på delad enhet
├─────────────────────────────────────┤
│        [ avatar ]                   │
│      Hej Astrid!          ⭐ 82     │  ← sticky vid scroll (krav)
├─────────────────────────────────────┤
│ Långsiktigt mål                     │
│ ▓▓▓░░░░░░░░  8 / 150  🎯 Utflykt…   │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ ✓  🛏️  Bädda sängen             │ │  ← stora gula kort
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ✓  🏫  Förskola / Skola         │ │
│ └─────────────────────────────────┘ │
│ … scroll …                          │
├─────────────────────────────────────┤
│ 📅 Dagens Schema │ 💎 Skattkamm. │ 👤 │  ← bottennav (mockup)
└─────────────────────────────────────┘
     ↔ swipe till Skattkammaren
```

| Element | Spec | Plattform |
|---------|------|-----------|
| **Rymd-tema** | Mörk gradient, stjärnor; bakgrund bakom status bar | Native: `@capacitor/status-bar` overlay |
| **Header** | "Dagens Schema" / aktiv flik; **Tillbaka** vänster (PG); hamburger höger (inställningar barn) | Alla |
| **Profilzon** | Stor avatar, "Hej {namn}!", ⭐ saldo — **sticky** | Alla — idag scrollar saldo bort |
| **Långsiktigt mål** | Progressbar + belöningsnamn + "X / Y stjärnor" | ✅ Finns |
| **Aktivitetskort** | Stora rundade kort, emoji/ikon, grön bock vid klar; delsteg som stora cirklar | ✅ Finns; animation polish §7 |
| **Skattkammaren** | Egen flik: belöningskort, parallax (native v2), mål-ceremoni | ✅ Grund; design → [`beloningar.html`](docs/mockups/beloningar.html) |
| **Bottennav** | Dagens Schema · Skattkammaren · Min profil (selfie här) | Mockup; idag mid-screen-flikar |
| **Swipe** | Horisontell pager Schema ↔ Skattkammaren | Planerat + haptik |
| **Tillbaka till vuxen** | ← knapp + dörr (håll inne 3 s) → Parental Gate | ❌ PG saknas |
| **Haptik/ljud** | Vid bock, stjärna, vybyte — se §7 | 🟡 Delvis |

**Samma aktiviteter som vuxenvyn** — t.ex. "Förskola / Skola" och "Mellanmål" — men barnvänlig presentation.

**Polsia-referens:** [`docs/mockups/barnvy.html`](docs/mockups/barnvy.html) · [`docs/mockups/beloningar.html`](docs/mockups/beloningar.html)

### 2.3 Barnlogin (3 skärmar)

| Skärm | Innehåll | Status |
|-------|----------|--------|
| 1 Rollval | "Jag är barn" / "Jag är vuxen" + login | Delvis (`login-magic` redesign) |
| 2 Välj barn | Lista + "Lägg till barn" | ❌ Fritext-namn idag |
| 3 PIN | Avatar, "Hej Astrid!", siffertavla, haptik | ❌ Systemtangentbord idag |

Mockup: [`docs/mockups/barnlogin-3-skarmar.png`](docs/mockups/barnlogin-3-skarmar.png)

### 2.4 Familje-fliken (separerade hushåll)

```
Familj
├── Mina barn          → barn jag har parent_child till
├── Dela åtkomst       → bjud in vuxen till specifikt barn (checkbox)
└── Pedagoger          → pedagog_invite (befintligt)
```

**Status:** API ✅ (`family_invite` + `childIds[]`); UI enligt mockup ❌

---

## 3. Vad som redan finns ✅

### Backend & databas

| Område | Detalj |
|--------|--------|
| **Auth vuxen** | E-post/lösenord, verifiering, glömt lösenord, refresh tokens |
| **Apple Sign In** | `POST /api/auth/apple`, `/link`; JWKS-verifiering (fix behövs i `_jwkToPem`) |
| **Auth barn** | `POST /api/auth/child-login`, PIN lockout, audit (`pin_audit_log`) |
| **Behörigheter** | `parent_child` (primary/shared/pedagog), `revoked_at`, `getChildrenForParent()` |
| **Medförälder** | `family_invite` med valfritt `childIds[]` — per-barn-inbjudan |
| **Pedagog** | `pedagog_invite`, pedagog_notes, pedagog-oversikt |
| **Onboarding** | 6-stegs wizard, standardschema från admin-bibliotek |
| **Schema & logg** | weekly/special schedules, daily_log, substeg, retroaktiv `completed_date` |
| **Belöningar** | rewards, redemption, Skattkammaren-API |
| **Push backend** | Scheduler (schedule, inactivity, milestones, backfill), event push vid avbockning |
| **APNs** | `sendAPNs()` HTTP/2 + ES256 (BadDeviceToken → auto-delete token) |
| **Native push API** | `POST /api/push/register-native`, `unregister-native` |
| **IAP backend** | RevenueCat webhook, `is_lifetime_free`, `subscription_status` |
| **GDPR** | Export data, radera konto (`DELETE /api/family/delete-account`) |
| **Offline API** | Server tar emot sync när klient kommer online |

### Frontend

| Område | Detalj |
|--------|--------|
| **platform.js** | `isNative()`, `isIOS()`, `isAndroid()`, `haptics`, `push`, `appleSignIn`, `share` |
| **Barnvy** | Schema, Skattkammaren, substeg, humör, konfetti, Web Audio "coin"-ljud |
| **Haptik barnvy** | `Platform.haptics` vid check-off, milstolpar, timer — **ej PIN-tavla** |
| **Offline** | `offline-queue.js` (COMPLETE, STARS, REDEEM…), IndexedDB-cache i barnvy |
| **Push klient** | `push-manager.js` — native detour till `Platform.push` på iOS/Android |
| **PWA** | Service Worker, `/offline.html`, safe-area CSS |
| **Login redesign** | "Magisk natt"-tema delvis (`login-magic.css/js`) |
| **Mobile nav** | `mobile-nav.js` hamburger för webb |
| **Skeleton** | `skeleton.js` på dashboard + child-dashboard |

### Capacitor / native (delvis)

| Område | Detalj |
|--------|--------|
| **capacitor.config.ts** | App ID `se.mystarday.app`, remote URL mystarday.se |
| **npm scripts** | `cap:sync`, `cap:ios`, `cap:android` |
| **Saknas** | `@capacitor/*`-paket installerade, `ios/`/`android/`-projekt i repo (Steg 1) |

### Produkt / drift

| Område | Detalj |
|--------|--------|
| **Grundarfas** | 200 familjer gratis; `PAYMENT_ENABLED=false` |
| **E-post** | Polsia proxy, välkomstmail, invites, PIN-varning |
| **Admin** | Impersonation, test-push, dagens nyhet, features |

---

## 4. Vad som behöver städas 🔧

### P0 — Blocker-lista (ingen TestFlight förrän allt är grönt)

**Regel:** Alla P0.x måste vara ✅ enligt [§14 Acceptanskriterier](#14-acceptanskriterier-per-feature) innan TestFlight / 9A.

| ID | Område | Varför blocker |
|----|--------|----------------|
| **P0.1** | Säkerhet & Gate | Barnläge utan lås = review-risk + föräldraförtroende |
| **P0.2** | Native identity | Apple (iOS) / Google (Android) — **inte** web-wrapper-login |
| **P0.3** | UI-gating | Guideline 4.2 — noll PWA/webb-känsla i native |
| **P0.4** | Native tab bar | Primärt visuellt bevis att det är en **app** |

---

#### P0.1 — Säkerhet & Gate (Parental Gate + delad enhet)

| Krav | Spec |
|------|------|
| PG vid barn → vuxen | App-lås-PIN + biometri (§5.2) |
| Persistent barnläge | `device_mode = 'child'` överlever force close (§5.2.1) |
| Skyddade routes | Barn når inte dashboard/settings/family (§14.1) |
| OS back-gest | Går **inte** att kringgå PG via iOS/Android "tillbaka" |

**Acceptans:** [§14.1](#141-parental-gate-p01)

---

#### P0.2 — Native identity (Apple iOS + Google Android)

| Plattform | Krav | Inte tillräckligt |
|-----------|------|-------------------|
| **iOS native** | Apple Sign In via Capacitor-plugin (`Platform.appleSignIn`) | Safari Apple JS i WebView |
| **Android native** | Google Sign In via native plugin/shim | Webb-OAuth i WebView |
| **Webb** | E-post + Apple JS (iOS Safari) | — |

Inkluderar ios-städ auth-fixar (JWKS, CSRF, `platform.js` på login, `email_conflict`).

**Obs:** Google backend (`POST /api/auth/google`) kan behöva skapas om saknas — minimalt scope för Android P0.

**Acceptans:** [§14.3](#143-native-identity-p02) + [§14.8](#148-ios-städ-auth-stöd)

---

#### P0.3 — UI-gating (`body.is-native`)

När `Platform.isNative()` === true ska **inget** av följande synas:

- PWA-installguider (`pwa-install.js`, settings)
- "Ladda ner app"-banners / `.pwa-callout`
- Webb-hamburger som primär nav (ersätts av P0.4)
- Cookie/marketing-banner (reducera eller dölj)

**Fix:** `platform-gating.css` + `body.is-native` vid app-start.

**Acceptans:** [§14.7](#147-ui-gating-p03)

---

#### P0.4 — Native tab bar (vuxen)

| Krav | Spec |
|------|------|
| Position | Fast i botten, oavsett scroll |
| Safe area | `env(safe-area-inset-bottom)` — notch + hem-indikator |
| Flikar | Hem · Schema · Bibliotek · Familj · Inställningar |
| Haptik | `Platform.haptics.light()` vid flikbyte |
| Scope | Endast `Platform.isNative()` — **rör inte** `mobile-nav.js` på webb |

**Acceptans:** [§14.6](#146-native-tab-bar-p04)

---

### Prio 1 — Auth-fixar (stöd till P0.2, tidigare fristående)

| Problem | Var | Fix |
|---------|-----|-----|
| Apple-knapp på Android | `login.html`, `register.html` | `Platform.isAppleSignInAvailable()` — inte `isNative()` alone |
| JWKS/PEM trasig | `src/routes/auth.js` | `crypto.createPublicKey` |
| CSRF 403 Apple | `src/middleware/csrf.js` | Exempt `/auth/apple`, `/auth/apple/link` |
| email_conflict | `login.html` | Kolla `data.error === 'email_conflict'` |
| Apple-länkning | `login.html` | Skicka `idToken`; kräv lösenord-login först |
| `platform.js` saknas | login, register, onboarding, settings, schedule | Ladda på alla sidor |
| Lifetime free ignoreras | `src/middleware/subscription.js` | Respektera `is_lifetime_free` |

### ~~Prio 2 — UI-gating~~ → **P0.3**

### Prio 3 — Kontohantering A–F (viktigt, ej P0)

| Del | Innehåll |
|-----|----------|
| A | Android dölj Apple + login-modal (ersätt `prompt()`) |
| B | Backend: `accountAuth`, `set-password` |
| C | Inställningar: "Lägg till lösenord" |
| D | Koppla / koppla bort Apple |
| E | Byt e-post (request + confirm) |
| F | Admin badges + audit |

Spec: [`docs/polsia-kontohantering-a-f.md`](docs/polsia-kontohantering-a-f.md)

> **Obs:** A–F viktigt för Android/Apple-only-konton men **blockerar inte** första TestFlight om e-post-login fungerar.

### ~~Prio 4 — Säkerhet barnläge~~ → **P0.1**

### Prio 5 — Design & UX-gap (efter P0 + Fas A+)

| Gap | Åtgärd |
|-----|--------|
| Dashboard ≠ mockup | Horisontella barnkort, quick actions, IDAG-lista |
| ~~Native tab bar~~ | → **P0.4** |
| Barnvy mid-flikar | Flytta till bottennav + swipe |
| Sticky ⭐ i barn-header | Flytta `#totalStarBalance` till sticky zon |
| Barnlogin 3 skärmar | Polsia P1/P2 |
| Familje-flik UI | Mina barn / Dela åtkomst per barn |
| `flow=add-child` | Tillåt onboarding wizard trots `onboarding_completed` |
| Räknare 100 vs 200 | `landing.js`, `index.html` → 200 |
| PIN haptik | `Platform.haptics.light()` på siffertavla |
| Block-milstolpar barnvy | "High five" när Morgon/Kväll-block klart (§7.1) |
| Personlig micro-copy | "Snyggt jobbat, Astrid! +1 ⭐" (§7.1) |
| Smart copy syskon | Kopiera schema vid add-child (§5.3.1) |

### Prio 6 — Native build (Steg 1–10)

Se [§10](#10-native-build-capacitor). Kort: Capacitor-paket, ios/android-projekt, push klient→server, IAP UI, TestFlight.

---

## 5. Produktkrav & funktioner

### 5.1 Autentisering vuxna

| Krav | v1.0 | Senare |
|------|------|--------|
| E-post + lösenord | ✅ Alla plattformar | — |
| Apple Sign In | iOS app + iOS Safari | — |
| Glömt lösenord | ✅ | — |
| Byta e-post | ❌ A–F | — |
| Apple ↔ lösenord | ❌ A–F | — |
| Magic link (webb) | — | v1.1 |
| Google (Android) | — | v2 |

**Princip:** Enkel webbinloggning = e-post primärt. Ingen PWA krävs för login.

### 5.2 Delad enhet & barnläge

```
Förälder loggar in → Aktivera barnläge → välj barn på enheten
  → sätt app-lås (PIN/Face ID) → /child-login → barn-PIN → barnvy
Barn använder appen → "Tillbaka till vuxen" → PG → dashboard
```

| Krav | Status |
|------|--------|
| Varje barn egen PIN | ✅ |
| Varje vuxen eget konto | ✅ |
| Spara föräldersession lokalt | Delvis (`stjarndag_parent_session`) |
| **Persistent barnläge (state)** | ❌ Se §5.2.1 |
| Barn kan inte nå inställningar | ❌ PG saknas |
| Selfie i barnläge (Min profil) | ❌ P2 — se §5.6 |
| Välj vilka barn på enheten | ❌ |

#### 5.2.1 State management — delad enhet (kritiskt UX)

**Problem idag:** Appen kan "glömma" barnläge efter force close eller omstart → förälder landar på dashboard utan att vilja.

**Målbeteende:**

```
Aktivera barnläge
  → localStorage/Secure Storage: device_mode = 'child'
  → allowed_child_ids[], last_child_id (valfritt)
  → parent_session_encrypted (för återställning efter PG)

App start / cold open
  → om device_mode === 'child'
      → Gå DIREKT till /child-login (välj barn → PIN)
      → ALDRIG dashboard utan Parental Gate
  → om device_mode === 'parent' eller saknas
      → Normal vuxen-flöde

Endast PG (app-lås-PIN / Face ID / full re-auth) sätter device_mode tillbaka till 'parent'
```

| Händelse | device_mode efter |
|----------|-------------------|
| Barn loggar in med PIN | `child` (behåll) |
| Force close / omstart | `child` (behåll) |
| Barn trycker logout | `child` → `/child-login` (inte dashboard) |
| Förälder passerar PG | `parent` → dashboard |
| Förälder loggar ut helt | rensa device_mode + parent session |

**Teknik:** Ny nyckel t.ex. `stjarndag_device_mode` + `stjarndag_device_children` i localStorage (webb) / `@capacitor/preferences` eller Secure Storage (native). Koppla till PG-task (§4 Prio 4).

**Acceptans:**
- [ ] iPad i barnläge → stäng app → öppna → PIN-skärm (inte dashboard)
- [ ] Endast korrekt PG bryter barnläge
- [ ] Förälder som öppnar appen på **egen** telefon (ej aktiverat barnläge) → normal login

### 5.3 Onboarding & schemaredigering (förälder)

| Flöde | Route | Status |
|-------|-------|--------|
| Ny familj | `/onboarding` (6 steg) | ✅ Backend; mobil-polish ❌ |
| Lägg till barn | `/onboarding?flow=add-child` | API ✅; JS-gate ❌ |
| Efter add-child | Redirect → `/child-login` | Spec ✅ |

**6 steg:** Barn+schema → barnvy → preview → 3 belöningar → barn-PIN → bjud in medförälder.

#### 5.3.1 Smart copy — syskon (effektivitet)

När förälder lägger till barn 2+ (`flow=add-child`), erbjud **innan steg 1**:

> *"Kopiera Astrids morgonrutin till [nytt barn]?"*

| Alternativ | Beteende |
|------------|----------|
| **Kopiera schema från syskon** | Klona `weekly_schedule` + items från valt barn; namn/belöningar/PIN fortfarande unika |
| **Börja från mall** | Befintligt flöde (förskola/skola/…) |
| **Tomt schema** | Minimal start |

**Varför:** Syskon har sällan helt olika morgonrutiner — sparar 5–10 min per barn.

**API-idé:** `POST /api/onboarding/copy-schedule-from-child` `{ sourceChildId, targetChildId }` eller i onboarding steg 1.

#### 5.3.2 Batch editing — schema (v1.1)

I schemavyn (`schedule.html`): förälder markerar **flera aktiviteter** → gemensam åtgärd:

| Åtgärd | Exempel |
|--------|---------|
| **Flytta tid** | +30 min på alla markerade |
| **Byt dag** | Flytta tisdag-aktiviteter till onsdag |
| **Ta bort** | Radera 5 valda på en gång |

**UX:** Long-press eller checkbox-läge; desktop = shift-klick. **Prioritet:** v1.1.

### 5.4 Föräldra-logg (v1.2)

Korta daganteckningar mellan vuxna om barnet — *"Trött vid hämtning, gav extra stjärna"*.  
Ny tabell `parent_day_note` eller utökning av `child_observation`. Push till medförälder.

### 5.5 Synk-konflikter & realtid (separerade hushåll)

**Scenario:** Mamma ändrar aktivitetstid kl. 07:30 → 08:00 medan pappa tittar på samma schema.

| Nivå | Beteende | Prioritet |
|------|----------|-----------|
| **MVP (v1.0)** | Optimistic UI + `updated_at` på schema; vid save-konflikt → "Schemat ändrades av [namn]. Ladda om?" | Launch |
| **Bäst i klassen (v1.1)** | **SSE eller WebSocket** per familj/barn: `schedule_updated`, `daily_log_updated` → vyn uppdateras utan full reload | v1.1 |

**Teknik (förslag):**

```
GET /api/events/stream?familyId=…   (SSE, auth cookie)
  → event: schedule_updated { childId, changedBy, at }
  → event: daily_log_updated { childId, … }
```

- Klient: `EventSource` på dashboard + schedule + barnvy (read-only refresh av data)
- Ingen PII i event-payload utöver föräldernamn + childId
- Fallback: polling var 60:e sek om SSE ej tillgänglig

**Acceptans:**
- [ ] Pappa ser mammas schemaändring inom ~5 s utan F5
- [ ] Samtidig redigering → tydlig konfliktmeddelande, ingen tyst dataförlust

### 5.6 Barnets integritet vs förälderns kontroll (selfie)

Gäller §5.2 selfie i **Min profil**:

| Krav | Spec |
|------|------|
| **Lagring** | Uppladdning via befintlig R2/Polsia proxy; HTTPS; URL i `child.avatar_url` |
| **Åtkomst** | Bild visas för barn + föräldrar med `parent_child` till barnet — **inte** publikt |
| **Barnets rättighet** | Barn kan byta selfie i barnläge (kamera) |
| **Förälderns kontroll** | Inställningar → Barn → **"Tillåt selfie/kamera i barnvyn"** (toggle, default på) |
| **Distraktion av** | Förälder stänger av → Min profil visar emoji/avatar, ingen kameraknapp |
| **Moderering** | Förälder kan återställa/radera bild i inställningar |

**Not:** Full "kryptering at rest" beror på R2/bucket-policy — dokumentera i integritetspolicy; app-lager ska inte exponera avatar-URL utan auth.

### 5.7 Batterioptimering & "bordsklocka"-läge

Barnvyn används ibland som **fast skärm** (iPad i kök, laddare i).

| Feature | Spec | Plattform |
|---------|------|-----------|
| **Keep awake** | När barnläge aktivt + skärm i barnvy → `@capacitor-community/keep-awake` eller `navigator.wakeLock` | Native + webb (Wake Lock API) |
| **Villkor** | Endast i barn-dashboard, inte i vuxenvy; valfri toggle "Håll skärmen tänd" i barninställningar (default **på** vid laddning) |
| **Batteri** | Auto-av efter 30 min på batteri utan laddare (med varning) — undvik urladdning |
| **Dimning** | Respektera systemets ljusstyrka; ingen extra animation i bakgrunden när inaktiv >2 min |

**Acceptans:**
- [ ] iPad i laddare + barnvy → skärmen slocknar inte
- [ ] På batteri → skärmen får slockna efter timeout

---

## 6. Behörigheter & separerade hushåll

### Datamodell

```
family ──< child
   └──< parent

parent_child (parent_id, child_id, role, revoked_at)
  role: primary | shared | pedagog
```

### Exempel

| Person | Ser | Hur |
|--------|-----|-----|
| Mamma | Astrid, Olle | primary |
| Pappa (bor annanstans) | Astrid | `family_invite` + `childIds: [astrid]` |
| Pedagog | Astrid | `pedagog_invite` |

Pappa ser **aldrig** Olle — `getChildrenForParent()` filtrerar automatiskt.

### Säkerhetsregler (alltid)

- All child-data: `JOIN parent_child WHERE revoked_at IS NULL`
- Barn-JWT: **ingen** `/api/family/*`
- Primary-only: radera barn, vissa familjeinställningar
- CSRF på vuxen-mutationer

### API (redan klart)

- `POST /api/family/invite` — `{ email, name, childIds? }`
- `GET /api/family/members`
- `DELETE /api/family/members/:parentId`

---

## 7. Native polish (barnvy)

Gäller **native app** primärt; delar funkar i mobil webb (haptik begränsat).

### 7.1 Visuell feedback & förutsägbarhet (struktur för barn)

**Kärnfråga för barnet:** *"När är jag klar?"*

| Feature | Spec | Status |
|---------|------|--------|
| **Dagblock** | Gruppera i Morgon · Skola · Kväll (befintliga `dagdel` i barnvy) — **inte** oändlig flat lista | 🟡 Finns delvis |
| **Block klart** | När alla aktiviteter i block bockats → **"High five"**-animation (kort, haptik + ljud) + blocket får grön kant / check-banner | ❌ |
| **Progress i block** | "Morgon 4/4" synligt i block-header | 🟡 Delvis |
| **Micro-copy** | Ersätt generiska toasts: ❌ "Aktiviteten sparad" → ✅ **"Snyggt jobbat, {namn}! +1 stjärna"** | ❌ |
| **Nästa steg** | Efter bock: markera tydligt **nästa** aktivitet (NU/NÄSTA redan i vuxenvy; samma i barnvy) | 🟡 |

**Animation:** Kort (≤1,5 s), avbrytbar, hoppa över om `prefers-reduced-motion`. Se [`docs/mockups/celebration.html`](docs/mockups/celebration.html) för firande-referens.

### 7.2 Teknisk polish

| Feature | Beskrivning | Status |
|---------|-------------|--------|
| **Haptik PIN** | `light()` per siffra | ❌ |
| **Haptik check-off** | `medium()` + fill-animation | 🟡 Delvis |
| **Fullskärm** | Status bar transparent, rymd bakom klocka | ❌ native config |
| **Swipe** | Schema ↔ Skattkammaren | ❌ |
| **Sticky ⭐** | Header alltid synlig | ❌ |
| **Mål-animation** | Konfetti/raket vid 100 % mål | 🟡 Konfetti finns |
| **Parallax kort** | Skattkammaren 3D-glans (native only) | ❌ v2 |
| **Ljud** | Web Audio pling; toggle i barninställningar | 🟡 `playCoinSound()` |
| **iOS swipe-back** | Edge gesture eller history per steg | ❌ |
| **Dörr-ikon** | Håll inne 3 s → PG | ❌ |

**Ljudpolicy:** Kort, opt-in, tyst läge = bara haptik, `AudioContext.resume()` vid första touch.

---

## 8. Push-notiser

### Fas 0 — v1.0 (fixa leverans)

| Typ | Mottagare | Backend |
|-----|-----------|---------|
| schedule_reminder | Förälder | ✅ |
| inactivity_nudge | Förälder | ✅ |
| star_milestone | Förälder | ✅ |
| backfill_reminder | Förälder | ✅ |
| reward_redemption | Förälder | ✅ |
| Aktivitet avklarad | Förälder | ✅ |
| weekly_summary | Förälder | ✅ |

**Gap:** APNs/FCM leverans i prod, native token-registrering i `push-manager.js`.

### Fas 1 — v1.1 (rikare text)

- "Astrid har klarat alla morgonens uppgifter! 🌟"
- "Dags att checka av kvällsmaten för Olle."
- "Din delade rapport till pedagogen går ut om 24 h."
- Medförälder-logg (§5.4)

### Fas 2 — v1.2 (barn-push)

- "God morgon! Ditt schema är redo."
- "5 stjärnor kvar till målet!"

**Kräver:** push-token kopplad till barn/enhet — barn har idag ingen `push_subscriptions`-rad.

---

## 9. Offline

| Funktion | Fil | Status |
|----------|-----|--------|
| Cache schema/belöningar | `child-dashboard.js` + IndexedDB | ✅ |
| Kö offline-actions | `offline-queue.js` | ✅ |
| Sync events | `offlineQueue:synced` | ✅ |
| Offline-sida | `/offline.html` + SW | ✅ |
| Barn-banner "Sparat…" | — | ❌ |
| Förälder push efter sync | Server event | ✅ |

**Acceptans:** Barn bockar av utan wifi → synkas → förälder notifierad inom ~60 s efter online.

---

## 10. Native build (Capacitor)

**Remote WebView:** Appen laddar `https://mystarday.se` — kräver native integration för App Store **4.2**.

> **Största tekniska risk:** Apple kan avvisa appar som upplevs som "tunn WebView". Problemet är inte Capacitor — det är **mängden native integration** vid review.

### 4.2-checklista (argument för "riktig app")

Ju fler som är ✅ före review, desto starkare case:

| Native signal | Status | Prio före review |
|---------------|--------|------------------|
| Native tab bar (vuxen) | ❌ | Hög |
| Native push (APNs/FCM) | ◐ | **Hög — före IAP** |
| Haptik (barnvy + PIN) | 🟡 | Hög |
| Face ID / biometri (PG) | ❌ | **P0** |
| Apple Sign In (native) | ◐ | Hög |
| Offline (kö + cache) | ✅ | Redan starkt |
| Safe-area / fullskärm | 🟡 | Medel |
| Ingen PWA-installtext | ❌ | Hög (Prio 2) |
| Keep-awake barnläge | ❌ | Medel |

**Push före IAP:** För familjeprodukt ger push-notiser mer värde i v1.0 än RevenueCat UI. Backend webhook finns — **leverans + token-registrering** prioriteras före paywall.

### Beslut (F0)

| # | Beslut |
|---|--------|
| App ID | `se.mystarday.app` |
| Kategori | Lifestyle |
| Språk | Svenska vid launch |
| iPad | Telefon-primary, kompatibilitetsläge |
| Betalning native | IAP via RevenueCat — **efter push + TestFlight RC** |
| Betalning webb | Stripe senare; nu `PAYMENT_ENABLED=false` |
| Grundarfamiljer | 200 gratis; `is_lifetime_free` |

### Status steg 1–10 (2026-05-31)

| Steg | Innehåll | Status |
|------|----------|--------|
| **1** | Capacitor-paket + ios/android-projekt | ○ Ej påbörjat |
| **2** | `platform.js` på alla sidor | ◐ Delvis |
| **3** | Apple Sign In end-to-end iOS | ◐ Backend delvis; buggar kvar |
| **3B** | Google Android | ○ v2 |
| **4** | Native push klient | ○ push-manager = VAPID only |
| **5** | APNs + FCM server | ◐ APNs ✅; FCM stub |
| **6** | Native UX (skeleton, gating) | ◐ skeleton ✅; gating ❌ |
| **7** | Juridik / butiksmetadata | ○ |
| **8** | IAP RevenueCat UI | ○ Backend webhook ✅ — **efter push, före public launch** |
| **9** | TestFlight + Play Internal | ○ |
| **9A** | **Release Candidate — intern QA** | ○ Se nedan |
| **9B** | **Release Candidate — testfamiljer** | ○ Se nedan |
| **10** | App Store / Play Store release | ○ |

### Steg 9A — Enhetstester (Release Candidate)

| Enhet | Varför | Testfokus |
|-------|--------|-----------|
| **iPhone SE** | Liten skärm, tight layout | Tab bar, barnlogin, PG-modal |
| **iPhone 16 Pro Max** | Stor skärm, Dynamic Island | Safe-area, header |
| **iPad** | Kompatibilitetsläge | Barnläge persistent, barnvy |
| **Billig Android-platta** | Målgruppens verkliga enhet | Google login, layout, prestanda |
| **Android telefon** | Push + FCM | Token, tab bar |

**Gate:** Alla **P0.1–P0.4** + §14 gröna på minst **en iOS + en Android**.

### Steg 9B — Familje-beta (Release Candidate)

| Krav | Syfte |
|------|--------|
| 10–20 familjer | Riktig användning |
| **Minst 1 separerat hushåll** | Per-barn-inbjudan; pappa ser inte syskon |
| Minst 1 pedagog | Roll `pedagog` isolerad |
| Minst 2 barn på delad iPad | P0.1 `device_mode` + PG |
| Synk mellan adresser/enheter | Schemaändring + avbockning syns; **ingen dataläcka** mellan barn |

**Gate:** Golden Path (§11.0) + P0 grön + push vid avbockning (om push ship:at).

**Först efter 9A + 9B:** Steg 10 — public App Store / Play Store.

**Nästa (teknisk ordning):** **Fas A+ (The Core)** → Barnlogin P1 → Dashboard mockup → Capacitor 1–2 (om saknas) → push 4–5 → 9A.

Fullständiga steg-prompter: [`app.md`](app.md) (Capacitor-detaljer).

---

## 11. Implementeringsordning

### 11.0 The Golden Path (prioritet #1)

Innan bred feature-utbyggnad — gör detta flöde **magiskt**:

```
Registrera / logga in (vuxen)
  → Onboarding steg 1–6
  → Barn-PIN satt
  → Barn loggar in (PIN-tavla)
  → Första aktiviteten bockad
  → Första stjärnan + personlig feedback ("Snyggt jobbat!")
  → Förälder ser push/notis
```

**Test:** Ge en riktig 6–10-åring telefonen **utan förklaring**. Om de inte hittar bocken inom 30 s → förenkla designen.

**Vertikala sprintar:** En sprint = ett helt flöde (t.ex. "PG + persistent barnläge"), inte spridda halvfärdiga features.

**Nästa:** **Fas A+ (The Core)** → Capacitor 1–2 om saknas → push → 9A.

### 11.2 Fas A+ — "The Core" (super-uppdrag)

**Mål:** En app som **tekniskt kan passera första App Store-granskning** — även om innehåll poleras senare.

**Tre pelare i ett uppdrag:**

```
┌─────────────────────────────────────────────────────────┐
│  Fas A+ — The Core                                      │
├─────────────────────────────────────────────────────────┤
│  1. ios-städ        Auth-fixar + lifetime_free (→ P0.2) │
│  2. P0.1 PG         Säkerhetslås + device_mode          │
│  3. P0.3 + P0.4    UI-gating + Native Tab Bar          │
└─────────────────────────────────────────────────────────┘
```

| Pelare | P0 | Leverabel |
|--------|-----|-----------|
| ios-städ | P0.2 stöd | Apple native login fungerar; Android utan Apple-knapp |
| Parental Gate | **P0.1** | Barn kan inte nå vuxenytor; PG vid utpassage |
| UI-gating + Tab bar | **P0.3 + P0.4** | Ingen PWA-text; fast bottennav med haptik |

**Efter Fas A+:** Barnlogin P1 → Dashboard mockup → push → TestFlight.

**Polsia-prompt:** [§12 — Fas A+ (The Core)](#fas-a--the-core-super-uppdrag)

### 11.1 Kritisk väg till extern testgrupp

När dessa är klara är planen mogen för **första externa testgrupp** (9B):

| # | Leverabel |
|---|-----------|
| 1 | **Fas A+ (The Core)** — P0.1–P0.4 + ios-städ auth |
| 2 | Barnlogin P1 |
| 3 | Dashboard mockup |
| 4 | Capacitor steg 1–2 (om ej redan) |
| 5 | Push-flöde (token + APNs/FCM) |
| 6 | TestFlight → 9A → 9B |

```
═══ Fas A+ — The Core (P0, före TestFlight) ═══
 • ios-städ auth + lifetime_free
 • P0.1 Parental Gate + device_mode
 • P0.2 Apple native (iOS) + Google native (Android) — minimalt
 • P0.3 UI-gating (noll PWA i native)
 • P0.4 Native tab bar

═══ Fas A — Fortsatt säkerhet & konto ═══
 1. Barnlogin P1
 2. Kontohantering A–F (parallellt)

═══ Fas B — Design & polish ═══
 3. Dashboard mockup
 4. Barnvy bottennav + swipe
 5. Barnlogin P2, Familje-flik, onboarding mobil

═══ Fas C — Native build & push (före IAP) ═══
 6. Capacitor Steg 1–2 (om A+ kördes utan)
 7. Native push 4–5
 8. TestFlight → 9A → 9B

═══ Fas D — Efter RC / launch ═══
 9. IAP RevenueCat UI
10. Push Fas 1, magic link, föräldra-logg, push till barn
```

---

## 12. Polsia-uppdrag (copy-paste)

### Fas A+ — "The Core" (super-uppdrag)

**Kör detta först.** Ett deploy = grund som klarar första granskning.

```
Uppgift: Fas A+ — The Core (P0.1–P0.4 + ios-städ auth)

Läs: app2.md §4 P0, §11.2, §14.1, §14.3, §14.6, §14.7, §14.8

MÅL: Native app som INTE känns som web-wrapper. Ingen TestFlight förrän §14 P0-checklistor är gröna.

═══ DEL 1 — ios-städ (stöd P0.2) ═══
1. platform.js: body.is-native / is-native-ios; isAppleSignInAvailable()
2. Ladda platform.js på login, register, onboarding, settings, schedule, dashboard
3. auth.js: fix _jwkToPem (crypto.createPublicKey)
4. csrf.js: exempt /auth/apple, /auth/apple/link
5. login.html: email_conflict, handleAppleLink (idToken), modal istf prompt()
6. subscription.js: respektera is_lifetime_free
7. iOS native: Apple Sign In via Capacitor (inte webb-OAuth i WebView)
8. Android native: Google Sign In via native plugin (minimalt — skapa /api/auth/google om saknas)
9. Android native: INGEN Apple-knapp

═══ DEL 2 — P0.1 Parental Gate ═══
10. "Aktivera barnläge" — välj barn + app-lås-PIN (Secure Storage)
11. device_mode='child' persistent; cold start → /child-login
12. Gate: childLogout, sessionRestored, "Jag är vuxen", tillbaka, dörr
13. Blockera OS back-gest från att kringgå PG (Capacitor App backButton / history)
14. Biometri: @capacitor-community/biometric (iOS + Android)
15. Glömt PIN → full logout + re-auth (tvinga e-post/Apple/Google)
16. Endast PG sätter device_mode='parent'
17. Server/klient: barn når inte /dashboard, /settings, /family, vuxen-API

═══ DEL 3 — P0.3 UI-gating ═══
18. public/css/platform-gating.css — dölj ALLT webb-only när .is-native
19. pwa-install.js isNeeded() = false native
20. Dölj hamburger/.mobile-topbar på föräldrasidor i native (förbered P0.4)

═══ DEL 4 — P0.4 Native Tab Bar ═══
21. public/js/native-tab-bar.js — endast Platform.isNative()
22. Flikar: Hem / Schema / Bibliotek / Familj / Inställningar
23. position:fixed bottom + safe-area-inset-bottom
24. Platform.haptics.light() vid flikbyte
25. body.has-native-tab-bar — dölj webb-nav

26. SW bump

TEST (§14):
- P0.1: barn kan inte nå vuxenytor; force close → PIN; PG vid utpassage; glömt PIN = logout
- P0.2: Apple login iOS app; Google login Android app; ingen Apple på Android
- P0.3: ingen PWA-text i TestFlight
- P0.4: tab bar fixed, safe-area, haptik

Gör INTE: dashboard mockup, barnlogin redesign, IAP, RevenueCat UI
```

### A — ios-städ fas 1 (ingår i Fas A+ — kör ej separat om A+ körs)

```
Uppgift: ios-städ fas 1 — Universal Auth + UI-gating + lifetime_free

Läs: app2.md §4 Prio 1–3

Gör:
1. platform.js: body-klasser is-native; isAppleSignInAvailable()
2. public/css/platform-gating.css
3. login.html + register.html: Apple enligt plattformsmatris
4. auth.js: fix _jwkToPem (crypto.createPublicKey)
5. csrf.js: exempt /auth/apple, /auth/apple/link
6. login.html: email_conflict, handleAppleLink (idToken)
7. Ladda platform.js på login, register, onboarding, settings, schedule
8. subscription.js: respektera is_lifetime_free
9. SW bump

Test: iOS native Apple login; Android ingen Apple-knapp; Safari PWA-guide syns; review-konto ingen 402
```

### B — Parental Gate

```
Uppgift: Parental Gate — barn kan inte nå vuxenläge utan app-lås

Läs: app2.md §4 P0, §5.2, §5.2.1, §14.1

Gör:
1. "Aktivera barnläge" — välj barn + sätt app-lås-PIN (Secure Storage hash)
2. device_mode = 'child' persistent över force close; cold start → /child-login
3. Native: @capacitor-community/biometric som alternativ
4. Gate childLogout, sessionRestored, "Jag är vuxen", tillbaka, dörr (håll inne 3s)
5. Endast PG sätter device_mode = 'parent'
6. Glömt PIN → full re-auth
7. SW bump

Test: force close i barnläge → PIN-skärm; PG → dashboard
```

### C — Barnlogin P1

```
Uppgift: Barnlogin redesign fas 1 — 3 skärmar

Läs: docs/polsia-barnlogin-design.md, docs/mockups/barnlogin-3-skarmar.png

Gör:
1. login.html rollval (Jag är barn / Jag är vuxen)
2. child-login: välj barn-lista + siffertavla (Platform.haptics.light per siffra)
3. Behåll POST /api/auth/child-login, lockout, safe-area
4. "+ Lägg till barn" → /onboarding?flow=add-child
5. SW bump
```

### D — Native tab bar (vuxen)

```
Uppgift: Native tab bar — Guideline 4.2

Läs: app2.md §2.1

Gör:
1. public/js/native-tab-bar.js — endast Platform.isNative()
2. Hem / Schema / Bibliotek / Familj / Inställningar
3. Dölj hamburger när .has-native-tab-bar
4. Safe-area padding
5. SW bump

Gör INTE: ändra webb mobile-nav.js
```

### E — Dashboard mockup (vuxen)

```
Uppgift: Dashboard enligt reimagined mockup

Läs: app2.md §2.1, docs/mockups/foraldra.html (designreferens — matcha tokens/layout)

Gör:
1. Horisontell scroll barnkort (Idag X/Y, totalt ⭐, progressbar, 🎁 väntande, senaste/nästa)
2. Quick Actions: Ge extra stjärna, Ledig dag, Lägg till aktivitet (+)
3. IDAG-lista med NU/NÄSTA badges
4. Responsiv: desktop sidomeny, mobil hamburger, native tab bar (ej i detta steg om separat task D)
5. Använd befintliga API — ingen schema-logik-ändring
6. SW bump
```

### F — Barnvy mockup (barn)

```
Uppgift: Barnvy enligt reimagined mockup

Läs: app2.md §2.2, docs/mockups/barnvy.html, docs/mockups/beloningar.html

Gör:
1. Rymd-tema + sticky profilzon (namn + ⭐)
2. Bottennav: Dagens Schema / Skattkammaren / Min profil — ersätt mid-screen-flikar
3. Swipe mellan Schema och Skattkammaren
4. Stora aktivitetskort (behåll befintlig check-logik + offline-kö)
5. Tillbaka-knapp (UI only — PG kopplas i separat task B)
6. Platform.haptics + safe-area
7. SW bump
```

---

## 13. Genomförandestrategi

### Vertikala sprintar (rekommenderat arbetssätt)

| Sprint | Scope | Leverabel |
|--------|-------|-----------|
| **G0 Golden Path** | Login → onboarding → barn-PIN → första stjärna | Demo-bar för barn-test |
| **G1 Barnläge** | PG + `device_mode` persistent (§5.2.1) | iPad glömmer inte barnläge |
| **G2 Barnvy känsla** | Block-animation, micro-copy, haptik (§7.1) | "Känns som riktig app" |
| **G3 Vuxen effektivitet** | Dashboard mockup + smart copy syskon | Förälder sparar tid |
| **G4 Native shell** | Capacitor + tab bar + push | TestFlight |

**Regel:** Avsluta en sprint vertikalt (backend + UI + test) innan nästa påbörjas.

### Testa på barn tidigt

- Barn är de mest ärliga testarna
- Om bock-flödet kräver förklaring → designen är för komplex
- Observationsprotokoll: tid till första avbockning, antal missklick, "var är jag klar?"-frågor

### Capacitor — snåla inte med haptik

Haptik är det som skiljer **native pryl** från **hemsida i WebView**:

| Händelse | Haptik |
|----------|--------|
| PIN-siffra | `light()` |
| Avbockning | `medium()` |
| Block klart / stjärna | `heavy()` + `success()` |
| Fel PIN | `error()` |

Alltid respektera `stjarndag_haptics_enabled` + `prefers-reduced-motion`.

### Definition of "magisk" launch

- [ ] Golden Path utan handholding
- [ ] Barnläge överlever omstart (§5.2.1)
- [ ] P0 Parental Gate acceptans (§14.1) grön
- [ ] Push mottagen vid barns avbockning (§14.4)
- [ ] Minst en "wow"-moment per barnsession (§7.1)

---

## 14. Acceptanskriterier per feature

Gör Polsia-uppdrag och QA testbara. Varje feature = checklista som måste vara grön innan merge/deploy.

### 14.1 Parental Gate (P0.1)

**Barn-session / barnläge (`device_mode = 'child'`):**

- [ ] Barn kan **inte** nå `/dashboard` (redirect → `/child-login` eller barnvy)
- [ ] Barn kan **inte** nå `/settings`
- [ ] Barn kan **inte** nå `/family`, `/schedule` (vuxen), `/reports`, `/onboarding` (vuxen)
- [ ] Barn kan **inte** anropa `/api/family/*`, `/api/account/*` (403)
- [ ] Logout i barnvy → `/child-login`, **inte** dashboard med `sessionRestored`
- [ ] "Jag är vuxen" på login → PG-modal om `device_mode = child`
- [ ] Force close → omstart → `/child-login` (§5.2.1)
- [ ] **OS back-gest** kringgår **inte** PG (iOS edge swipe / Android back)

**Parental Gate — ut ur barnläge:**

- [ ] Kräver PIN **eller** biometri vid växling barnläge → vuxenläge
- [ ] Rätt app-lås-PIN → vuxen dashboard
- [ ] Fel PIN → stanna i barnläge; tydligt felmeddelande
- [ ] 5 fel PIN-försök → tillfällig lockout (t.ex. 5 min)
- [ ] Biometri fungerar på **iOS native**
- [ ] Biometri fungerar på **Android native** (om enhet stödjer)
- [ ] **"Glömt PIN" → full logout** + tvinga re-auth (e-post/Apple/Google) — inte bypass
- [ ] Endast PG sätter `device_mode = 'parent'`

### 14.2 Barnlogin P1

- [ ] Rollval: "Jag är barn" / "Jag är vuxen"
- [ ] Barnväljare (lista), inte fritext namn
- [ ] **Egen siffertavla** — **inte** systemets tangentbord
- [ ] **Selfie/avatar visas omedelbart** vid val av barn i listan
- [ ] Siffertavla med haptik per siffra
- [ ] Befintlig lockout (`pin_lockout`) fungerar
- [ ] "+ Lägg till barn" → `/onboarding?flow=add-child`
- [ ] Safe-area OK på iPhone med notch

### 14.3 Native identity (P0.2)

- [ ] **iOS native app:** Apple Sign In via Capacitor → dashboard/onboarding
- [ ] **iOS native app:** E-post/lösenord fallback fungerar
- [ ] **Android native app:** Google Sign In via native plugin
- [ ] **Android native app:** E-post/lösenord fallback fungerar
- [ ] **Android native:** **ingen** Apple-knapp
- [ ] **Webb iOS Safari:** Apple JS (inte native plugin)
- [ ] Desktop Chrome: e-post login, ingen Apple-knapp

### 14.4 Native push

- [ ] Tillstånd begärt → token i `push_subscriptions` med `platform=ios|android`
- [ ] Token re-registreras vid app start
- [ ] Token tas bort vid logout
- [ ] Test-notis når enhet inom 60 s
- [ ] BadDeviceToken rensas automatiskt (APNs)

### 14.5 Golden Path (§11.0)

- [ ] Ny familj: registrera → onboarding 6 steg → klart
- [ ] Barn-PIN satt
- [ ] Barn loggar in → bockar av → stjärna syns
- [ ] Micro-copy eller toast med barnets namn
- [ ] Förälder får push vid avbockning (online)

### 14.6 Native tab bar (P0.4)

- [ ] **Fast i botten** oavsett scroll (`position: fixed`)
- [ ] **Safe area** — `env(safe-area-inset-bottom)` för notch + hem-indikator (iPhone SE → 16 Pro Max)
- [ ] **Haptisk feedback** vid flikbyte (`Platform.haptics.light()`)
- [ ] Flikar: Hem · Schema · Bibliotek · Familj · Inställningar
- [ ] Endast `Platform.isNative()` — **mobil webb behåller hamburger** (`mobile-nav.js` oförändrad)
- [ ] `body.has-native-tab-bar` döljer webb-nav på föräldrasidor

### 14.7 UI-gating (P0.3)

- [ ] `body.is-native` sätts vid app-start (Capacitor)
- [ ] **Ingen** PWA-installguide i native (`pwa-install.js` → `isNeeded() === false`)
- [ ] **Ingen** "Ladda ner app"-banner / `.pwa-callout` i native
- [ ] Settings: push/PWA-sektion dold eller native-anpassad
- [ ] Cookie/marketing-banner dold eller reducerad i native
- [ ] Webb-hamburger **inte** primär nav i native (ersatt av §14.6)

### 14.8 ios-städ auth-stöd (P0.2)

- [ ] `auth.js`: JWKS → PEM via `crypto.createPublicKey`
- [ ] CSRF exempt: `/auth/apple`, `/auth/apple/link`
- [ ] `login.html`: `email_conflict` utan `prompt()` — modal med val
- [ ] Apple-länkning: skickar `idToken`; kräver lösenord-login först
- [ ] `platform.js` laddad på login, register, onboarding, settings, schedule, dashboard
- [ ] `is_lifetime_free` respekteras i `subscription.js` (ingen 402)
- [ ] Android native: **ingen** Apple-knapp (`Platform.isAppleSignInAvailable()`)

### 14.9 Dashboard mockup (P1 — efter Fas A+)

- [ ] Horisontella barnkort med Idag X/Y + totalt ⭐
- [ ] Quick Actions fungerar (extra stjärna, ledig dag)
- [ ] IDAG-lista med NU/NÄSTA
- [ ] Desktop: sidomeny; mobil webb: hamburger; native: tab bar (§14.6)

---

## 15. Beredskapsbedömning

| Dimension | Idag | Efter Fas A+ + B | Mål launch |
|-----------|------|-----------------|------------|
| Produktvision | 9/10 | 9/10 | 9/10 |
| Designriktning | 9/10 | 9/10 | 9/10 |
| Datamodell | 8.5/10 | 8.5/10 | 9/10 |
| Native-beredskap | ~6/10 | ~8/10 | 9/10 |
| App Store-beredskap | ~5/10 | ~8.5/10 | 9/10 |

**Kritisk väg (sammanfattning):** **Fas A+ (The Core)** → Barnlogin P1 → Dashboard mockup → Capacitor 1–2 (om ej i A+) → push → TestFlight → **9A/9B RC** → release.

IAP/RevenueCat UI medvetet **efter** RC — inte på kritisk väg till första externa testgrupp.

---

## Bilaga — filkarta

| Område | Filer |
|--------|-------|
| Plattform | `public/js/platform.js`, `capacitor.config.ts` |
| Auth | `src/routes/auth.js`, `public/login.html`, `public/child-login.html` |
| Behörighet | `db/parent-access.js`, `src/middleware/authz.js` |
| Familj | `src/routes/family.js` |
| Barnvy | `public/js/child-dashboard.js`, `public/child-dashboard.html` |
| Offline | `public/js/offline-queue.js` |
| Push | `src/lib/push-reminder-scheduler.js`, `public/js/push-manager.js` |
| Onboarding | `public/js/onboarding.js`, `public/onboarding.html` |
| Native nav | `public/js/mobile-nav.js` (+ planerad `native-tab-bar.js`) |

---

## Versionshistorik

| Datum | Ändring |
|-------|---------|
| 2026-05-28 | P0.1–P0.4 blocker-lista, Fas A+ (The Core), §14.6–14.9, 9A/9B RC |
| 2026-06-01 | P0 PG, RC 9A/9B, §14 acceptans, §15 beredskap, push före IAP |
| 2026-05-31 | §5.2.1 device_mode, §5.3–5.7, §7.1 feedback, §13 strategi |
| 2026-05-31 | Utökad §2 med wireframes, HTML-mockup-länkar |
| 2026-05-31 | app2.md — samlat masterdokument |
