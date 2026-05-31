# Min Stjärndag — app2.md (masterplan)

**Skapad:** 2026-05-31  
**Syfte:** **Ett dokument** som samlar produktkrav, ny design, plattformsregler, vad som **redan finns**, vad som **behöver städas**, och vägen till **iPhone-app**, **Android-app**, **mobil webbläsare** och **desktop webbläsare**.

**Produktion:** https://mystarday.se · https://stjarndag.polsia.app  
**Stack:** Node.js 20, Express, Neon PostgreSQL, Tailwind, PWA + Capacitor (remote WebView)

**Detaljerade under-specar** (Polsia-prompts med radnivå):  
[`docs/polsia-kontohantering-a-f.md`](docs/polsia-kontohantering-a-f.md) · [`docs/polsia-barnlogin-design.md`](docs/polsia-barnlogin-design.md) · [`docs/mockups/barnlogin-3-skarmar.png`](docs/mockups/barnlogin-3-skarmar.png)

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

### 2.1 Vuxenvy — förälder (dashboard)

| Element | Beskrivning | Plattform |
|---------|-------------|-----------|
| **Kompakt header** | Logo + "Min Stjärndag" + profilikon | Alla; safe-area på native |
| **Översikt** | Horisontell scroll: barnkort med Idag X/Y, totalt ⭐, senaste aktivitet, väntande belöningar | Alla |
| **Dagens Quick Actions** | "Ge extra stjärna", "Ledig dag", "+" | Alla; stora knappar mobil |
| **IDAG** | Vertikal lista med NU / NÄSTA-taggar, tomma check-cirklar | Alla |
| **Navigation** | **Native:** tab bar — Hem · Schema · Bibliotek · Familj · Inställningar | Native |
| | **Webb desktop:** sidomeny (befintlig) | Desktop |
| | **Webb mobil:** hamburger (befintlig `mobile-nav.js`) | Mobil webb |

**Status idag:** Dashboard finns (`dashboard.html`, `dashboard.js`) men **inte** mockup-layout med horisontella barnkort + quick actions + native tab bar.

### 2.2 Barnvy — barn (child-dashboard)

| Element | Beskrivning | Plattform |
|---------|-------------|-----------|
| **Rymd-tema** | Mörk gradient, stjärnor, immersive bakgrund bakom status bar | Alla; fullskärm native (`@capacitor/status-bar`) |
| **Sticky header** | Barnnamn + stjärnsaldo ⭐ alltid synligt vid scroll | Alla — **saknas delvis idag** (saldo scrollar bort) |
| **Långsiktigt mål** | Progressbar mot vald belöning | ✅ Finns |
| **Schema** | NU/NÄSTA/SEDAN eller dagdelar; stora delsteg-cirklar | ✅ Finns; polish behövs |
| **Skattkammaren** | Belöningskort, mål, inlösen | ✅ Finns |
| **Navigation** | **Mål:** bottennav — Dagens Schema · Skattkammaren · Min profil | Mockup; idag mid-screen-flikar |
| **Swipe** | Swipa Schema ↔ Skattkammaren | Planerat |
| **Tillbaka till vuxen** | Diskret knapp + Parental Gate (PIN/biometri) | ❌ PG saknas |
| **Selfie** | Min profil — kamera → avatar molnsynk | Planerat (P2) |

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

### Prio 1 — Auth & plattform (blockerar TestFlight)

| Problem | Var | Fix |
|---------|-----|-----|
| Apple-knapp på Android | `login.html`, `register.html` | `Platform.isAppleSignInAvailable()` — inte `isNative()` alone |
| JWKS/PEM trasig | `src/routes/auth.js` | `crypto.createPublicKey` |
| CSRF 403 Apple | `src/middleware/csrf.js` | Exempt `/auth/apple`, `/auth/apple/link` |
| email_conflict | `login.html` | Kolla `data.error === 'email_conflict'` |
| Apple-länkning | `login.html` | Skicka `idToken`; kräv lösenord-login först |
| `platform.js` saknas | login, register, onboarding, settings, schedule | Ladda på alla sidor |
| Lifetime free ignoreras | `src/middleware/subscription.js` | Respektera `is_lifetime_free` |

### Prio 2 — UI-gating (App Store 4.2)

| Problem | Fix |
|---------|-----|
| PWA-guider syns i native app | `body.is-native` + `platform-gating.css` |
| "Ladda ner app" i appen | Dölj `[data-pwa-guide]`, cookie-banner reducera |

### Prio 3 — Kontohantering A–F (ej implementerat)

| Del | Innehåll |
|-----|----------|
| A | Android dölj Apple + login-modal (ersätt `prompt()`) |
| B | Backend: `accountAuth`, `set-password` |
| C | Inställningar: "Lägg till lösenord" |
| D | Koppla / koppla bort Apple |
| E | Byt e-post (request + confirm) |
| F | Admin badges + audit |

Spec: [`docs/polsia-kontohantering-a-f.md`](docs/polsia-kontohantering-a-f.md)

### Prio 4 — Säkerhet barnläge

| Problem | Fix |
|---------|-----|
| Barn logout → dashboard utan PIN | Parental Gate (PG) |
| "Jag är vuxen" oskyddat | PG-modal |
| Dörr-ikon utan lås | Håll inne 3 s → PG (PIN / Face ID) |

**PG-modell:** Per **inloggad förälder + enhet** (app-lås-PIN i Secure Storage + biometri native) — **inte** en gemensam familje-PIN.

### Prio 5 — Design & UX-gap

| Gap | Åtgärd |
|-----|--------|
| Dashboard ≠ mockup | Horisontella barnkort, quick actions, IDAG-lista |
| Native tab bar (vuxen) | `native-tab-bar.js` — Hem/Schema/Bibliotek/Familj/Inställningar |
| Barnvy mid-flikar | Flytta till bottennav + swipe |
| Sticky ⭐ i barn-header | Flytta `#totalStarBalance` till sticky zon |
| Barnlogin 3 skärmar | Polsia P1/P2 |
| Familje-flik UI | Mina barn / Dela åtkomst per barn |
| `flow=add-child` | Tillåt onboarding wizard trots `onboarding_completed` |
| Räknare 100 vs 200 | `landing.js`, `index.html` → 200 |
| PIN haptik | `Platform.haptics.light()` på siffertavla |

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
| Barn kan inte nå inställningar | ❌ PG saknas |
| Selfie i barnläge (Min profil) | ❌ P2 |
| Välj vilka barn på enheten | ❌ |

### 5.3 Onboarding

| Flöde | Route | Status |
|-------|-------|--------|
| Ny familj | `/onboarding` (6 steg) | ✅ Backend; mobil-polish ❌ |
| Lägg till barn | `/onboarding?flow=add-child` | API ✅; JS-gate ❌ |
| Efter add-child | Redirect → `/child-login` | Spec ✅ |

**6 steg:** Barn+schema → barnvy → preview → 3 belöningar → barn-PIN → bjud in medförälder.

### 5.4 Föräldra-logg (v1.2)

Korta daganteckningar mellan vuxna om barnet — *"Trött vid hämtning, gav extra stjärna"*.  
Ny tabell `parent_day_note` eller utökning av `child_observation`. Push till medförälder.

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

### Beslut (F0)

| # | Beslut |
|---|--------|
| App ID | `se.mystarday.app` |
| Kategori | Lifestyle |
| Språk | Svenska vid launch |
| iPad | Telefon-primary, kompatibilitetsläge |
| Betalning native | IAP via RevenueCat (Steg 8) |
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
| **8** | IAP RevenueCat UI | ○ Backend webhook ✅ |
| **9** | TestFlight + Play Internal | ○ |
| **10** | Review & launch | ○ |

**Nästa:** Steg 1 → 2 → ios-städ Prio 1–3 → 3 → 4–5.

Fullständiga steg-prompter: [`app.md`](app.md) (Capacitor-detaljer).

---

## 11. Implementeringsordning

```
═══ Fas A — Städning & säkerhet (Polsia) ═══
 1. ios-städ Prio 1–3  (auth, gating, lifetime_free)
 2. Kontohantering A–F  (e-post, Apple, lösenord)
 3. Parental Gate       (app-lås per förälder/enhet)
 4. Barnlogin P1        (3 skärmar, siffertavla, haptik)
 5. Barnlogin P2        (selfie Min profil)

═══ Fas B — Design & plattform ═══
 6. Dashboard mockup    (barnkort, quick actions, IDAG)
 7. Native tab bar      (vuxen: Hem/Schema/Bibliotek/Familj/Inställningar)
 8. Barnvy bottennav    (Schema/Skattkammaren/Min profil + swipe)
 9. Familje-flik UI     (Mina barn / Dela åtkomst)
10. Onboarding mobil   + flow=add-child fix
11. Offline UX-banner

═══ Fas C — Native build ═══
12. Capacitor Steg 1–2
13. Apple Sign In Steg 3
14. Native push 4–5
15. TestFlight 9

═══ Fas D — Engagemang (efter launch) ═══
16. Push Fas 1 (rikare text)
17. Magic link webb
18. Föräldra-logg
19. Google Sign In
20. Push till barn (Fas 2)
21. IAP paywall UI
```

---

## 12. Polsia-uppdrag (copy-paste)

### A — ios-städ fas 1 (Prio 1–3)

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

Läs: app2.md §4 Prio 4, §5.2

Gör:
1. "Aktivera barnläge" i inställningar/dashboard — välj barn + sätt app-lås-PIN (local Secure Storage hash)
2. Native: @capacitor-community/biometric som alternativ
3. Gate childLogout sessionRestored, "Jag är vuxen", tillbaka-knapp, dörr (håll inne 3s)
4. Glömt PIN → full re-auth
5. SW bump

Test: barn kan inte nå dashboard; rätt PIN/biometri → dashboard
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

Läs: app2.md §2.1

Gör:
1. Horisontell scroll barnkort (Idag X/Y, totalt ⭐, belöningar)
2. Quick Actions: Ge extra stjärna, Ledig dag, +
3. IDAG-lista med NU/NÄSTA
4. Responsiv: desktop sidomeny oförändrad, mobil hamburger, native tab bar
5. SW bump
```

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
| 2026-05-31 | app2.md — samlat masterdokument (design, plattform, städ, krav, native) |
