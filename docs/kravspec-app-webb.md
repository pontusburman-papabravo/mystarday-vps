# Kravspecifikation — Min Stjärndag (App & Webb)

**Skapad:** 2026-05-31  
**Syfte:** Samlad **produkt- och säkerhetskrav** för webb, iPhone och Android — inklusive separerade hushåll, delad enhet och behörigheter.

**Relaterade dokument:**

| Dokument | Innehåll |
|----------|----------|
| [`docs/plattform-webb-ios-android.md`](plattform-webb-ios-android.md) | Plattformsmatris, acceptanskriterier |
| [`docs/polsia-kontohantering-a-f.md`](polsia-kontohantering-a-f.md) | E-post, Apple, lösenord (A–F) |
| [`docs/polsia-barnlogin-design.md`](polsia-barnlogin-design.md) | Barnlogin 3 skärmar |
| [`app.md`](../app.md) | Capacitor-build, TestFlight, 10 steg |

---

## 0. Arkitekturgrund — individuella konton & behörigheter

### Principer

1. **Varje vuxen har eget konto** (`parent`) med egen e-post/auth — ingen delad inloggning mellan vuxna.
2. **Varje barn har egen PIN** (`child.pin_hash`) — barn kan inte logga in som förälder.
3. **Åtkomst till barn styrs per länk** (`parent_child`), inte per “familjelösenord”.
4. **Vuxna kan bo på olika adresser** och se **olika barn** — modellen stödjer detta redan tekniskt.

### Datamodell (befintlig)

```
family ──< child
   │
   └──< parent (flera vuxna kan tillhöra samma family_id)

parent_child (parent_id, child_id, role, revoked_at)
  role: 'primary' | 'shared' | 'pedagog'
```

| Roll | Betydelse |
|------|-----------|
| **primary** | Skapade familjen / första föräldern för barnet |
| **shared** | Medförälder inbjuden via `family_invite` |
| **pedagog** | Pedagog/terapeut — endast tilldelade barn |

**Viktigt:** `getChildrenForParent()` returnerar **endast barn där parent har aktiv länk** (`revoked_at IS NULL`). Alla API-routes ska gå via denna länk — aldrig “hela familjen” om föräldern saknar `parent_child`-rad.

### Per-barn-inbjudan (redan implementerat)

`POST /api/family/invite` accepterar valfritt `childIds[]`. Om angivet länkas inbjuden vuxen **endast till dessa barn** (`role: shared`). Om tomt → alla familjens barn (legacy-beteende).

**UI-krav (nytt):** Familje-fliken ska göra detta tydligt — se §6.

### Separerade hushåll — exempel

| Person | Ser barn | Mekanism |
|--------|----------|----------|
| Mamma (primary) | Astrid, Olle | `parent_child` primary |
| Pappa (shared) | Astrid | `family_invite` med `childIds: [astrid]` |
| Pedagog | Astrid | `pedagog_invite` |

Mamma och pappa delar **samma `family_id`** för Astrid men pappa ser **inte** Olle. Detta kräver **ingen ny tabell** — bara konsekvent användning av `parent_child` i UI och API.

### Säkerhetskontroller (ska alltid gälla)

| Kontroll | Var |
|----------|-----|
| `parent_child` + `revoked_at IS NULL` | Alla child-scoped routes |
| `requirePrimaryParent` | Radera barn, bjuda in pedagog, vissa familjeinställningar |
| CSRF på muterande requests | Vuxen-session |
| Barn-session | Endast child JWT — ingen access till `/api/family/*`, inställningar |
| Parental Gate | Barn → vuxen på delad enhet (§2) |

---

## 1. Autentisering & kontohantering (vuxna)

### 1.1 Inloggning per plattform

| Plattform | v1.0 (launch) | v1.1+ |
|-----------|---------------|-------|
| Desktop webb | E-post + lösenord, glömt lösenord | + Magic link (valfritt) |
| Mobil webb | E-post + lösenord; Apple på iOS Safari | + Magic link |
| iPhone app | Apple Sign In + e-post | — |
| Android app | E-post + lösenord | + Google Sign In (v2) |

**Magic links (v1.1):** E-post med engångslänk → session, minskar lösenordsfriktion på webb. Kräver ny route + token-tabell + rate limit. **Ersätter inte** lösenord för konton som redan har det.

**Social login:** Apple (iOS + Safari) enligt [`polsia-kontohantering-a-f.md`](polsia-kontohantering-a-f.md). Google = v2, Android-fokus.

### 1.2 Profilhantering (självbetjäning)

Föräldern ska kunna (A–F, ej implementerat):

- **Byta e-post** — verifiering på ny adress (`POST /api/account/change-email/request`)
- **Byta inloggningsmetod** — Apple-only → lägg till lösenord; koppla bort Apple med lösenord
- **Exportera data / radera konto** — ✅ finns (`/api/account/export-data`, `DELETE /api/family/delete-account`)

### 1.3 Individuella konton & separerade hushåll

- Registrering skapar **ett** `parent`-konto kopplat till **en** `family`.
- Medförälder skapar **eget** konto via inbjudan (`/api/family/invite/accept-new`) — flyttas **inte** in i mammas konto.
- Varje vuxen ser dashboard baserat på **sina** `parent_child`-rader — barnväljare, push och rapporter filtreras automatiskt.

---

## 2. Enhetshantering & barnläge (delad enhet)

### Scenario

Förälder konfigurerar **barnets telefon/iPad** en gång. Barnet använder sedan appen själv utan att nå vuxeninställningar.

### Flöde

```
1. Förälder loggar in (eget konto) på barnenheten
2. Förälder: "Aktivera barnläge" → väljer vilka barn som ska synas på enheten
3. Förälder sätter ev. app-lås (PIN / Face ID) för att lämna barnläge
4. Barnläge → /child-login → välj barn → barn-PIN → barn-dashboard
5. Föräldersession sparas krypterat lokalt (stjarndag_parent_session)
6. Barn använder schema, stjärnor, Skattkammaren
7. "Tillbaka till vuxen" → Parental Gate (§2.2)
```

### 2.1 Barnets selfie (profilbild)

| Aspekt | Krav |
|--------|------|
| **Var** | I barnläge — t.ex. "Min profil" eller första gången efter PIN |
| **Teknik** | `@capacitor/camera` (native) / `<input capture>` (webb) |
| **Lagring** | Uppladdning till barnprofil (R2/Polsia proxy), molnsynk |
| **Säkerhet** | Barn får **inte** byta namn, PIN eller inställningar — endast avatar |
| **Fallback** | Emoji om kamera nekas |

**Ändring mot tidigare spec:** Selfie kan tas **av barnet** i barnläge (inte enbart av förälder i inställningar). Förälder kan fortfarande återställa/ändra i Inställningar → Barn.

### 2.2 Parental Gate (PG) — reviderad modell

**Tidigare förslag:** en PIN per familj (`family.parent_pin_hash`).  
**Ny rekommendation:** **per förälder + enhet** — passar separerade hushåll bättre.

| Metod | Beskrivning |
|-------|-------------|
| **Biometri** | Face ID / Touch ID via Capacitor (`@capacitor-community/biometric`) — endast native |
| **App-lås-PIN** | 4–6 siffror som **den inloggade föräldern** sätter vid "Aktivera barnläge" |
| **Fallback** | Full re-auth (e-post/lösenord/Apple) — "Glömt PIN" |

**Lagring app-lås-PIN:**

- **Alternativ A (rekommenderat):** Hash i **localStorage/Secure Storage** på enheten — ingen server, PIN gäller bara denna enhet
- **Alternativ B:** `parent.device_unlock_pin_hash` server-side — synkas mellan enheter (mer komplext)

**Biometri på barnenhet:** Fungerar bara om **förälderns** biometri registrerats på enheten (vanligt om förälder äger telefonen). Annars → app-lås-PIN.

**Gate-punkter:**

- Barn-dashboard: "Tillbaka till vuxen" / dörr-ikon (håll inne 3 s **eller** direkt → PG-modal)
- Barn-logout med sparad föräldersession (`sessionRestored`)
- `/login` → "Jag är vuxen" när parent session finns lokalt

**Barn-PIN ≠ förälder-PIN:** Barnets 4-siffriga PIN (`child.pin_hash`) loggar in barnet. Förälderns app-lås skyddar **ut** från barnläge.

### Acceptans

- [ ] Barn kan inte nå dashboard/inställningar utan PG
- [ ] Två föräldrar på samma enhet: den som aktiverade barnläge sätter **sin** PG
- [ ] Selfie sparas på barnprofil och syns i barnväljare

---

## 3. Onboarding & wizards

### 3.1 Ny familj — 6 steg

Befintlig wizard (`onboarding.html`, `onboarding.js`):

| Steg | Innehåll |
|------|----------|
| 1 | Barn + standardschema (förskola/skola/…) |
| 2 | Barnvy |
| 3 | Förhandsgranska schema |
| 4 | Tre belöningar |
| 5 | Barn-PIN |
| 6 | Bjud in medförälder + slutför |

**Mobil:** Progress bar, stora knappar, ett steg i taget. Samma API på alla plattformar.

### 3.2 Lägg till barn

`/onboarding?flow=add-child` — samma 6 steg. Efter klart → `/child-login`.

**Kodkrav:** Tillåt wizard när `onboarding_completed && flow=add-child`.

---

## 4. Multi-plattform & responsivitet

| Läge | Navigation | Schemaplanering |
|------|------------|-----------------|
| **Desktop webb** | Sidomeny | Dra-och-släpp med mus |
| **Mobil webb** | Hamburger / ev. bottom-nav | Touch, stora targets |
| **Native app** | Tab bar (vuxen), bottennav (barn) | + haptik, offline, fullskärm |

Se [`plattform-webb-ios-android.md`](plattform-webb-ios-android.md) §4 och [`ios-städ.md`](ios-städ.md).

---

## 5. Push-notiser (kommunikationshub)

### Fas 0 — v1.0 (prioritet: leverans)

Fixa APNs / FCM / VAPID för **befintliga** typer:

| Typ | Mottagare | Status |
|-----|-----------|--------|
| schedule_reminder | Förälder | Backend ✅ |
| inactivity_nudge | Förälder | Backend ✅ |
| star_milestone | Förälder | Backend ✅ |
| backfill_reminder | Förälder | Backend ✅ |
| reward_redemption | Förälder | Event ✅ |
| Aktivitet avklarad | Förälder | Event ✅ (`notifyParentsChildCompleted`) |
| weekly_summary | Förälder | Scheduler ✅ |

### Fas 1 — v1.1 (rikare föräldertext)

| Notis | Exempel |
|-------|---------|
| Sektion klar | "Astrid har klarat alla morgonens uppgifter! 🌟" |
| Kvällspåminnelse | "Dags att checka av kvällsmaten för Olle." |
| Rapport utgår | "Din delade rapport till pedagogen går ut om 24 h." |

Kräver: nya triggers i scheduler/event-lager + `push_preferences`-nycklar.

### Fas 2 — v1.2 (barn-push)

| Notis | Exempel | Krav |
|-------|---------|------|
| Morgon-schema | "God morgon! Ditt schema för måndag är redo. 🚀" | Push-token kopplad till **barnsession** eller enhets-token med child scope |
| Mål-nudge | "Bara 5 stjärnor kvar till Utflykt!" | Pedagogiskt — kräver föräldra-opt-in |

**Arkitektur-not:** Barn har idag **ingen** `push_subscriptions`-rad — push går till `parent`. Barn-push kräver antingen:

- Delad familjeenhet med child-mode token, eller
- Barnets **egen** mobil med child-login + device registration (ny modell)

**Rekommendation:** Fas 1 först (förälder). Barn-push i Fas 2 när barn-enhetsmodell är tydlig.

---

## 6. Familje-fliken — separerade hushåll (UI)

### Struktur (vuxenvy)

```
Familj
├── Mina barn          → lista barn jag har parent_child till
│   └── [Barnkort]     → schema, stjärnor, inställningar (per behörighet)
├── Dela åtkomst       → bjud in vuxen till specifikt barn
│   └── E-post + välj barn (checkbox) → family_invite med childIds
└── Pedagoger          → befintlig pedagog_invite (separat flöde)
```

### Regler

| Handling | Vem |
|----------|-----|
| Bjuda in medförälder till **ett** barn | Primary **eller** shared med access till barnet* |
| Bjuda in till **alla** barn | Primary |
| Ta bort medförälders access | Primary; soft-delete `parent_child.revoked_at` |
| Se barn jag inte är länkad till | ❌ Aldrig |

\* *Beslut:* Shared parent kan bjuda in till barn de har access till — verifiera produktmässigt.

### Befintlig API att använda

- `GET /api/family/members` — lista föräldrar + barn
- `POST /api/family/invite` — `{ email, name, childIds? }`
- `DELETE /api/family/members/:parentId` — ta bort medförälder

---

## 7. Offline-synk (punkt 8)

### Nuläge (delvis implementerat)

| Funktion | Fil | Status |
|----------|-----|--------|
| Cache schema/belöningar | IndexedDB i `child-dashboard.js` | ✅ |
| Kö offline-ändringar | `public/js/offline-queue.js` | ✅ |
| Typer | COMPLETE, UNCOMPLETE, ADD_STARS, EMOTION, REDEEM | ✅ |
| Sync vid online | `offlineQueue:synced` events | ✅ |
| SW offline-sida | `/offline.html` | ✅ |

### Gap för produktkrav

| Gap | Åtgärd |
|-----|--------|
| Förälder ser inte offline-aktivitet förrän sync | Push/event efter sync ✅ (via server vid sync) |
| Tydlig barn-UX | Banner: "Sparat — synkas när nätet är tillbaka" |
| Konflikthantering | Last-write-wins idag — dokumentera begränsning |
| Föräldrar offline | Lägre prioritet — barn i skola viktigast |

### Acceptans

- [ ] Barn bockar av utan wifi → stjärna syns lokalt → synkas → förälder får push inom 60 s efter online

---

## 8. Föräldra-logg / intern kommunikation (punkt 9)

### Mål

Korta anteckningar mellan vuxna om barnets dag — **inte** chatt i realtid.

**Exempel:** *"Han var trött vid hämtning — gav en extra stjärna för tålamod."*

### Förslag datamodell

```sql
parent_day_note (
  id UUID PK,
  child_id UUID FK,
  author_parent_id UUID FK,
  date DATE,
  text TEXT (max 500),
  is_important BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
)
-- Synlig för alla parent med parent_child till child_id
```

### UI

- Familj → Barn → **Dagens logg** eller dashboard-widget
- Push till andra föräldrar med access: `co_parent_note` (Fas 1 push)
- **Inte** samma som `pedagog_notes` (pedagog-roll) eller `child_observation` (rapporter)

### Prioritet

**v1.2** — efter PG, barnlogin och kontohantering. Enklare MVP: återanvänd `child_observation` med ny sektion "Medförälder" om snabb leverans behövs.

---

## 9. Övrigt (punkt "vad saknas?")

| Område | Beslut |
|--------|--------|
| Lifetime free (200 familjer) | Behåll; middleware `is_lifetime_free` |
| IAP | Efter App Store; RevenueCat |
| Ljud & haptik | Se designdiskussion — toggles i barninställningar |
| GDPR | Export ✅; radera konto ✅ |
| Audit | `pin_audit_log`, `admin_audit_log` för känsliga händelser |

---

## Implementeringsordning (uppdaterad)

```
Fas 1 — Säker grund
  1. ios-städ fas 1 (auth, UI-gating)
  2. Kontohantering A–F
  3. Parental Gate (per förälder/enhet + biometri)
  4. Barnlogin P1 + P2 (inkl. selfie i barnläge)

Fas 2 — Plattform & hushåll
  5. Familje-flik UI (Mina barn / Dela åtkomst per barn)
  6. Onboarding mobil + flow=add-child
  7. Offline UX-polish
  8. ios-städ fas 2 (tab bar vuxen, barnvy bottennav)

Fas 3 — Engagemang
  9. Push Fas 1 (rikare föräldertext + leveransfix)
  10. Magic link (webb)
  11. Föräldra-logg (§8)

Fas 4 — Efter launch
  12. Google Sign In
  13. Push till barn (Fas 2)
  14. IAP
```

---

## Versionshistorik

| Datum | Ändring |
|-------|---------|
| 2026-05-31 | Första version — separerade hushåll, PG per förälder, push-faser, offline, föräldra-logg |
