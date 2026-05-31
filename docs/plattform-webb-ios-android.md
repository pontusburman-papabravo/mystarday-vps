# Plattform — Webb, iPhone & Android

**Skapad:** 2026-05-29  
**Syfte:** En **produkt- och plattformsspec** som svarar på hur Min Stjärndag ska fungera på **desktop webb**, **mobil webbläsare/PWA**, **iPhone-app** och **Android-app** — utan att de skriver över varandra.

**Relaterade dokument:**

| Dokument | Innehåll |
|----------|----------|
| **[`docs/kravspec-app-webb.md`](kravspec-app-webb.md)** | **Kravspec:** auth, behörigheter, separerade hushåll, PG, push-faser |
| [`docs/ios-städ.md`](ios-städ.md) | Teknisk städning efter native-steg 1–10 + webb-fixar |
| [`app.md`](../app.md) | Native build-plan (Capacitor, TestFlight, 10 steg) |
| [`docs/polsia-kontohantering-a-f.md`](polsia-kontohantering-a-f.md) | Föräldrakonto: Apple, e-post, byt mail |
| [`docs/polsia-barnlogin-design.md`](polsia-barnlogin-design.md) | Barnlogin 3 skärmar + selfie |
| [`docs/mockups/barnlogin-3-skarmar.png`](mockups/barnlogin-3-skarmar.png) | Designreferens barnlogin |

**Grundregel:** All plattformslogik via `window.Platform` — webb-fixar får **aldrig** ta bort native-gates (`Platform.isNative()`).

---

## Plattformsöversikt (en bild)

```
                    ┌─────────────────────────────────────────┐
                    │           mystarday.se (samma kod)     │
                    └─────────────────────────────────────────┘
              ┌──────────────┬──────────────┬──────────────────┐
              │ Desktop webb │ Mobil webb   │ Native app       │
              │ Chrome/Safari│ Safari/PWA   │ Capacitor iOS/And│
              ├──────────────┼──────────────┼──────────────────┤
              │ Sidomeny     │ Hamburger    │ Tab bar (mål)    │
              │ E-post login │ + PWA-guide  │ APNs/FCM push    │
              │ Ingen Apple* │ Apple JS iOS │ Apple Sign In iOS│
              └──────────────┴──────────────┴──────────────────┘
              * Apple valfritt på desktop; prioritet = e-post enkelt
```

| Dimension | iPhone **app** | Android **app** | Mobil **webb** | Desktop **webb** |
|-----------|----------------|-----------------|----------------|------------------|
| **Detektering** | `Platform.isNative()` + iOS | `Platform.isNative()` + Android | `Platform.isWeb()` + smal viewport | `Platform.isWeb()` + bred viewport |
| **Förälder login** | Apple + e-post | E-post (ev. Google senare) | Apple JS (iOS Safari) + e-post | E-post (+ ev. Apple) |
| **Barn login** | `/child-login` | `/child-login` | `/child-login` | `/child-login` |
| **Navigation förälder** | Tab bar | Tab bar | Hamburger | Sidomeny |
| **Push** | APNs | FCM | Web Push (PWA) | Web Push (begränsat) |
| **PWA “installera app”** | ❌ Dölj | ❌ Dölj | ✅ Visa | Valfritt |
| **Betalning (senare)** | IAP (RevenueCat) | IAP | Stripe (ej nu) | Stripe (ej nu) |

---

## 1. Inloggning på webben ska vara enkel

### Mål

Föräldrar som använder **webbläsare** (majoriteten tills appen är släppt) ska kunna logga in **utan friktion** — primärt **e-post + lösenord**.

### Krav per plattform

| Plattform | Primär login | Sekundär |
|-----------|--------------|----------|
| Desktop webb | E-post + lösenord | “Glömt lösenord”, registrera |
| Mobil webb (Safari/Chrome) | E-post + lösenord | Apple Sign In **endast iOS Safari** |
| iPhone app | Apple Sign In + e-post | — |
| Android app | E-post + lösenord | — (ingen Apple-knapp) |

### UX-principer (webb)

- **En skärm** — e-post, lösenord, tydlig “Logga in”-knapp
- **Rollval** (Jag är barn / Jag är vuxen) ska inte blockera enkel e-post-login för vuxna
- **Glömt lösenord** → `/forgot-password` (befintligt flöde)
- **Verifieringsmail** — tydligt fel om e-post ej verifierad
- **Ingen** PWA-installation krävs för att logga in

### Tekniskt (Polsia)

- `login.html` / `register.html`: Apple-knapp via `Platform.isAppleSignInAvailable()` — **inte** `isNative()` alone
- Native iOS app: Capacitor-plugin via `Platform.appleSignIn.signIn()`
- iOS Safari webb: Apple JS-bibliotek (samma `signIn()`-API i `platform.js`)
- Se [`docs/ios-städ.md`](ios-städ.md) § Prio 1 för kända auth-buggar

### Acceptans

- [ ] Chrome desktop: e-post login → dashboard på &lt; 30 sek
- [ ] Safari iPhone (webb): e-post login fungerar; Apple valfritt
- [ ] Android webb: ingen Apple-knapp
- [ ] Registrering → onboarding (§5)

---

## 2. Förälder ändrar e-post och byter från Apple-login

> **Behörigheter & separerade hushåll:** Varje vuxen har eget konto; åtkomst till barn styrs per `parent_child`-länk (primary/shared/pedagog). Medförälder kan bjudas in till **specifika barn** via `family_invite.child_ids`. Se [`docs/kravspec-app-webb.md`](kravspec-app-webb.md) §0 och §6.

### Mål

Föräldern ska **själv** i Inställningar kunna:

1. **Byta e-postadress** (med verifiering på ny adress)
2. **Gå från Apple-only** till e-post/lösenord (så Android och webb fungerar)
3. **Koppla / koppla bort Apple** (iOS/webb där Apple UI finns)

### Auth-tillstånd (målbild)

| Tillstånd | Kan logga in med | Inställningar |
|-----------|------------------|---------------|
| E-post + lösenord | E-post | Byt lösenord, byt e-post, koppla Apple (iOS) |
| Apple-only | Apple (iOS/webb Safari) | **Lägg till lösenord** (kritiskt för Android) |
| Apple + lösenord | Båda | Koppla bort Apple (kräver lösenord) |

### Flöden

**Byt e-post:**

```
Inställningar → Konto & inloggning → Ny e-post + nuvarande lösenord
  → POST /api/account/change-email/request
  → Mail till NY adress med bekräftelselänk
  → /verify-email-change?token=… → klar
```

**Apple-only → kan logga in överallt:**

```
Inställningar → Lägg till lösenord (inget nuvarande krävs)
  → POST /api/account/set-password
  → Nu: Apple + e-post på alla plattformar
```

**Koppla bort Apple:**

```
Inställningar → Koppla bort Apple (kräver lösenord)
  → DELETE /api/account/unlink-apple
```

### Plattformsregler

| Funktion | iPhone app | Android app | Webb |
|----------|------------|-------------|------|
| Byt e-post | ✅ | ✅ | ✅ |
| Sätt lösenord (Apple-only) | ✅ | ✅ **kritiskt** | ✅ |
| Koppla Apple | ✅ | ❌ UI | ✅ Safari |
| Koppla bort Apple | ✅ | ✅ (med lösenord) | ✅ |

**Full spec + Polsia-prompts:** [`docs/polsia-kontohantering-a-f.md`](polsia-kontohantering-a-f.md) (A → F).

### Acceptans

- [ ] Apple-only på iPhone → sätter lösenord → kan logga in på Android webb
- [ ] Byt e-post → bekräftelse → login med ny adress
- [ ] Android: info-text om Apple kopplades på iPhone

---

## 3. Delad enhet — förälder först, sedan barn (med skydd)

### Scenario

**Barnets mobil** ( eller familjens iPad): föräldern konfigurerar en gång, barnet använder sedan appen själv — **utan** att kunna ta sig in i föräldraläget.

### Målflöde

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FÖRÄLDER LOGGAR IN (e-post/Apple)                        │
│    → Dashboard / Inställningar                              │
├─────────────────────────────────────────────────────────────┤
│ 2. FÖRÄLDER FÖRBEREDER BARN                                 │
│    • Onboarding (ny familj) ELLER wizard add-child (§6)     │
│    • Sätter barn-PIN                                        │
│    • Väljer vilka barn som ska finnas på enheten             │
│    • Sätter app-lås (PIN / Face ID) — PG per förälder (§2.2)│
├─────────────────────────────────────────────────────────────┤
│ 3. "Aktivera barnläge" / "Byt till barnläge"                │
│    → /child-login (välj barn → PIN → barn-dashboard)        │
│    Föräldersession sparas i stjarndag_parent_session        │
├─────────────────────────────────────────────────────────────┤
│ 4. BARN ANVÄNDER APPEN                                      │
│    • Schema, stjärnor, Skattkammaren                        │
│    • Selfie/profilbild i barnläge (Min profil) → molnsynk   │
├─────────────────────────────────────────────────────────────┤
│ 5. TILLBAKA TILL FÖRÄLDER                                   │
│    • "Tillbaka till vuxen" / dörr-ikon (håll inne eller PG) │
│    → Biometri ELLER förälderns app-lås-PIN — INTE barn-PIN  │
│    • Rätt → dashboard (inloggad förälders session)          │
│    • Fel → stanna i barnläge                                │
└─────────────────────────────────────────────────────────────┘
```

### UI-element

| Element | Var | Plattform |
|---------|-----|-----------|
| **Tillbaka till förälder** | Barn-dashboard header | Alla |
| **Föräldra-PIN-modal** | Vid byte barn → vuxen | Alla |
| **"Jag är vuxen"** | `login.html` / rollval | Alla — ska kräva PIN om session finns |
| **Selfie/avatar** | Min profil (barnläge) + Inställningar (förälder) | iOS kamera + webb fil |

### Parental Gate (PG) — reviderad (per förälder/enhet)

| Del | Spec |
|-----|------|
| **App-lås-PIN** | 4–6 siffror, sätts av inloggad förälder vid "Aktivera barnläge" |
| **Biometri** | Face ID / Touch ID via Capacitor (native) — fallback till PIN |
| **Lagring** | Hash i Secure Storage / localStorage på enheten (rekommenderat) |
| **Gate** | Barn-logout `sessionRestored`, "Jag är vuxen", tillbaka-knapp, dörr-ikon |
| **Glömt PIN** | Full re-auth (lösenord/Apple) |
| **≠ barn-PIN** | Barn-PIN loggar **in** barn; app-lås skyddar **ut** till vuxen |

Full spec: [`docs/kravspec-app-webb.md`](kravspec-app-webb.md) §2.2.

**Koppling barnlogin-redesign:** [`docs/polsia-barnlogin-design.md`](polsia-barnlogin-design.md) — skärm 2–3 + mockup.

### Vad som INTE ska hända (idag — bugg)

- ❌ Barn trycker logout → **direkt** till dashboard (`sessionRestored` utan PIN)
- ❌ Barn går till `/login` → "Jag är vuxen" → dashboard utan skydd

### Acceptans

- [ ] Förälder loggar in → konfigurerar barn → barnläge
- [ ] Barn kan **inte** nå dashboard utan föräldra-PIN
- [ ] Tillbaka-knapp synlig i barnvy
- [ ] Profilbild (selfie) syns i barnväljare + PIN-skärm

---

## 4. Design — mobil app, desktop webb, mobil webbläsare

### Responsiva lägen

| Läge | Breakpoint / signal | Layout |
|------|---------------------|--------|
| **Desktop webb** | ≥ 1024px, `Platform.isWeb()` | Sidomeny vänster, bred content |
| **Mobil webb** | &lt; 1024px, `Platform.isWeb()` | Hamburger (`mobile-nav.js`), full bredd |
| **Native app** | `Platform.isNative()` | Tab bar botten, safe-area, **ingen** hamburger |

### Gemensam design

- **Färger/tokens:** navy, gold, lavender (befintlig Tailwind)
- **Barnlogin “magisk natt”:** lila gradient, Outfit + Plus Jakarta Sans ([mockup](mockups/barnlogin-3-skarmar.png))
- **Touch targets:** min 44×44px (Apple HIG)
- **Safe area:** `env(safe-area-inset-*)` på native + mobil webb

### Plattformsspecifikt (dölj/visa)

| Element | Desktop webb | Mobil webb | Native app |
|---------|--------------|------------|------------|
| PWA-installguide | Valfritt | ✅ | ❌ |
| Cookie/marketing-banner | ✅ | ✅ | ❌ / minimal |
| Tab bar | ❌ | ❌ | ✅ |
| Hamburger | ❌ (sidomeny) | ✅ | ❌ |
| Skeleton loading | Valfritt | Valfritt | ✅ (dashboard) |

**CSS-mönster:** `body.is-native` → dölj `.pwa-callout`, `[data-pwa-guide]` (se [`docs/ios-städ.md`](ios-städ.md)).

### Acceptans

- [ ] iPhone 14 app: ingen horisontell scroll, safe-area OK
- [ ] iPhone Safari webb: samma sidor läsbara, hamburger fungerar
- [ ] Chrome desktop: sidomeny + dashboard OK
- [ ] iPad: kompatibilitetsläge (telefon-primary enligt app.md F0)

---

## 5. Registrera ny familj — befintlig 6-stegs-onboarding

### Mål

Ny familj ska **alltid** genom dagens onboarding-wizard med **standardschema** från admin-biblioteket — på **alla plattformar** (samma flöde, mobilanpassat).

### De 6 stegen (befintligt)

| Steg | Innehåll | API |
|------|----------|-----|
| **1** | Barn: namn, födelsedag, emoji, **välj schema** (förskola/skola/… från mall) | `POST /api/onboarding/child`, `schedule` |
| **2** | Barnvy: klassisk / ny vy | `POST /api/onboarding/child-view` |
| **3** | Schemat är klart — förhandsgranska | (preview) |
| **4** | Välj 3 första belöningar | `POST /api/onboarding/reward` |
| **5** | Så loggar ni in — barn-PIN, kopiera/dela | `POST /api/onboarding/update-pin` |
| **6** | Bjud in medförälder + slutför | `POST /api/onboarding/complete` |

**Filer:** `public/onboarding.html`, `public/js/onboarding.js`

### Plattform

| Plattform | Beteende |
|-----------|----------|
| Alla | **Samma 6 steg** — responsiv CSS, stora knappar på mobil |
| Native app | Ingen PWA-text; ev. dela inlogg via `Platform.share` |
| Efter steg 6 | `onboarding_completed = true` → `/dashboard` |

### Krav

- [ ] Standardschema från `/api/onboarding/template-groups` (admin-bibliotek)
- [ ] Mobil: ett steg i taget, scroll, thumb-friendly
- [ ] Registrering (`/register`) → e-post verify → `/onboarding` om ej complete

### Polsia

- **Rör inte** steg-logiken — endast mobil-CSS + `platform.js` + dölj PWA i native
- Se [`docs/polsia-barnlogin-design.md`](polsia-barnlogin-design.md) §3.2.1 för skillnad **ny familj** vs **lägg till barn**

---

## 6. Lägg till nytt barn — samma wizard, `flow=add-child`

### Mål

Befintlig familj ska lägga till syskon via **samma 6-stegs-wizard** — inte ett enkelt formulär i inställningar.

### Flöde

```
"+ Lägg till barn" (child-login eller inställningar)
  │
  ├─ Förälder INTE inloggad → /login?next=/onboarding&flow=add-child
  └─ Förälder inloggad     → /onboarding?flow=add-child
        │
        ▼
  Samma steg 1–6 (nytt barn, nytt schema, PIN, belöningar)
        │
        ▼
  Complete → /child-login (INTE dashboard)
  onboarding_completed förblir true (ändras inte)
```

### Teknisk ändring (kritisk)

I `onboarding.js` — tillåt wizard när `flow=add-child` **även om** `onboarding_completed === true`:

```javascript
const isAddChildFlow = new URLSearchParams(location.search).get('flow') === 'add-child';
if (me.onboarding_completed && !isAddChildFlow) {
  window.location.href = '/dashboard';
  return;
}
```

### Plattform

| Plattform | Entry point |
|-----------|-------------|
| Mobil app | child-login skärm 2 → "+ Lägg till barn" |
| Mobil webb | Samma |
| Desktop | Inställningar → Familj → Lägg till barn **eller** child-login |

### Acceptans

- [ ] Familj med 1 barn → add-child → barn 2 syns i child-login-lista
- [ ] Steg 6 (bjud in medförälder) kan hoppas över om `children.length > 0`
- [ ] Mobilanpassat — samma CSS som §5

**Spec:** [`docs/polsia-barnlogin-design.md`](polsia-barnlogin-design.md) §3.2.1

---

## 7. Push-notiser — behövs fler?

### Vad som finns idag (backend)

| Typ | Scheduler | Mottagare | Beskrivning |
|-----|-----------|-----------|-------------|
| **schedule_reminder** | `push-reminder-scheduler` (5 min) | Förälder | ~10 min före schemad aktivitet |
| **inactivity_nudge** | samma | Förälder | 18:00 om barn inte öppnat appen |
| **star_milestone** | samma | Förälder | 10/25/50/100 stjärnor |
| **backfill_reminder** | samma | Förälder | 09:00 om gårdagens schema ofullständigt |
| **reward_redemption** | event-driven | Förälder | Barn begär belöning |
| **weekly_summary** | söndag 21:00 | Förälder | Veckosammanfattning e-post/push |
| **dagens_nyhet** | admin | Broadcast | Nyhet från admin |
| **Test push** | admin | Vald familj | `/api/admin/test-push` |

**Kanal:** APNs (iOS app), FCM (Android app), Web Push/VAPID (PWA).

### Rekommendation — fasad rollout

**Fas 0 (v1.0):** Fixa leverans på befintliga typer (APNs/FCM/VAPID). Inkluderar redan `notifyParentsChildCompleted` vid avbockning.

**Fas 1 (v1.1):** Rikare föräldertext — t.ex. "Astrid klarat morgonen", kvällspåminnelse, rapport utgår om 24 h.

**Fas 2 (v1.2):** Push till barn (egen enhet) — kräver ny token-modell; föräldra-opt-in.

| Typ | Fas | Mottagare |
|-----|-----|-----------|
| schedule_reminder, inactivity, milestones, backfill | 0 | Förälder |
| Sektion klar / kvällspåminnelse | 1 | Förälder |
| Rapport utgår | 1 | Förälder (pedagog) |
| Morgon-schema, mål-nudge | 2 | Barn |

Full lista: [`docs/kravspec-app-webb.md`](kravspec-app-webb.md) §5.

### Tidigare v1.0-not (leverans först)

Prioritera **stabilitet** framför nya typer i Fas 0:

1. ✅ Säkerställ att befintliga 4 påminnelsetyper fungerar på **native iOS** (APNs)
2. ✅ Web Push fungerar i **installerad PWA** (iOS Safari kräver hemskärmsikon)
3. ✅ Inställningar: toggles per typ (`push_preferences` JSONB)
4. ⏸️ **Nya typer** enligt faser ovan — efter leveransfix

### ~~Eventuella **v2**-notiser~~ (ersatt av faser i kravspec)

Se [`docs/kravspec-app-webb.md`](kravspec-app-webb.md) §5.

### Plattform push

| Plattform | Teknik | Krav |
|-----------|--------|------|
| iPhone app | APNs via `Platform.push` | Fysisk enhet, tillstånd |
| Android app | FCM | `google-services.json` |
| Mobil webb PWA | VAPID + Service Worker | Installerad PWA (iOS!) |
| Desktop webb | VAPID | Begränsat stöd |

**Slutsats punkt 7:** Fas 0 = fixa leverans. Fas 1–2 = strategiska notiser enligt kravspec.

---

## 8. Vad mer? (övriga beslut)

| Område | Status / rekommendation |
|--------|-------------------------|
| **Separerade hushåll** | Datamodell ✅ (`parent_child` + `family_invite.child_ids`); UI Familj-flik ❌ |
| **Offline-synk** | Delvis ✅ (`offline-queue.js`, IndexedDB); UX-banner ❌ |
| **Föräldra-logg** | Ny feature v1.2 — korta daganteckningar mellan vuxna (§9 i kravspec) |
| **Magic link (webb)** | v1.1 — komplement till e-post/lösenord |
| **Lifetime free (200 familjer)** | Behåll; middleware ska respektera `is_lifetime_free` |
| **IAP / betalning** | Efter App Store; native = RevenueCat, webb = Stripe senare |
| **Tab bar (native)** | Ja — Guideline 4.2; se [`docs/ios-städ.md`](ios-städ.md) fas 2 |
| **Google Sign In (Android)** | v2 — e-post räcker till launch |
| **Pedagog-läge** | Separat feature-flag; inte i v1.0-app |
| **Offline** | `/offline.html` + cache + `offline-queue.js`; se kravspec §7 |
| **Radera konto** | ✅ Apple 5.1.1 — `DELETE /api/family/delete-account` |
| **GDPR export** | ✅ `/api/account/export-data` |
| **Admin support** | Kontohantering F — badges, admin byt mail |
| **Synka GitHub ↔ Polsia** | ZIP/prod = sanning; spegel för diff |
| **Testkonto App Review** | `review@mystarday.se` — se `docs/app-store-review-notes.md` |

---

## Implementeringsordning (Polsia-tasks)

```
Fas A — Grund (webb funkar + granskning)
  1. ios-städ fas 1 (auth + UI-gating + lifetime_free)
  2. Kontohantering A–F (e-post, Apple, lösenord)
  3. Parental Gate PG (föräldra-PIN)

Fas B — Barnupplevelse
  4. Barnlogin P1 (rollval, väljare, PIN-tavla)
  5. Barnlogin P2 (avatar/selfie upload)
  6. Onboarding mobil-polish + flow=add-child verifiering

Fas C — Native polish
  7. ios-städ fas 2 (tab bar)
  8. Push verifiering per plattform (§7)

Fas D — Efter launch
  9. IAP paywall (RevenueCat)
  10. Ev. fler push-typer (v2)
```

---

## Snabb-referens: vilken spec för vad?

| Du vill… | Läs |
|----------|-----|
| **Full kravspec (auth, hushåll, PG, push)** | [`docs/kravspec-app-webb.md`](kravspec-app-webb.md) |
| Frysa webb vs native tekniskt | [`docs/ios-städ.md`](ios-städ.md) |
| Bygga iOS/Android wrapper | [`app.md`](../app.md) |
| Föräldrakonto Apple/mail | [`docs/polsia-kontohantering-a-f.md`](polsia-kontohantering-a-f.md) |
| Barnlogin + selfie | [`docs/polsia-barnlogin-design.md`](polsia-barnlogin-design.md) |
| Push-arkitektur | `src/lib/push-reminder-scheduler.js`, `docs/app-store-apns.md` |
| Testa allt | `docs/native-app-test-checklist.md` |

---

## Versionshistorik

| Datum | Ändring |
|-------|---------|
| 2026-05-31 | PG per förälder/enhet; push-faser; länk till kravspec |
| 2026-05-29 | Första version — 8 produktpunkter + plattformsmatris |
