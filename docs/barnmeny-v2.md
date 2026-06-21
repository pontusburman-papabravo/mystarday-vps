# Barnmeny v2 — nuläge & (kommande) informationsarkitektur

> **Syfte:** Teamreferens för barnsidans navigation. Del 1 dokumenterar **hur det ser ut idag**. Del 2 (v2-spec) kommer att låsa målarkitektur och migration — parallellt med [`vuxenmeny-v2.md`](./vuxenmeny-v2.md).
>
> **Relaterat:** [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) · [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) · [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md)
>
> **Senast uppdaterad:** 2026-06-21

---

# Del 1 — Hur det ser ut idag

## 1. Översikt: en sida, många navigationslager

Barnupplevelsen är i praktiken **en SPA** på `/child-dashboard` med tab-state — inte separata routes per flik (utom hash-alias via `child-layer-router.js`).

```
Inloggning                    Huvudapp                         Publika sidor
─────────                    ────────                         ─────────────
/child-login  ──────────►  /child-dashboard                  /skattkammaren (demo, ej inloggad)
     │                            │
     │                            ├── Klassisk vy (default)
     │                            └── Magic / ny design (feature-flaggad)
     │
DeviceMode=child + session-gate blockerar föräldraroutes
```

**Kärnfil:** `public/child-dashboard.html` + `public/js/child-dashboard.js` (~2 700 rader logik).

---

## 2. Inloggningsflöde

| Steg | Route | Vad som händer |
|------|-------|----------------|
| 1 | `/child-login` | Barnväljare (kända barn från `localStorage` + ev. `/api/auth/login-picker-children`) |
| 2 | PIN | `POST /api/auth/child-login` |
| 3 | Redirect | `/child-dashboard` |

**Övriga ingångar:**

- Förälder på dashboard → "Barnet loggar in" → `/child-login` (`dashboard-child-handoff.js`)
- `DeviceMode.enterChild()` + `session-gate.js` → föräldrasidor redirectar till `/child-login`
- `Auth.redirectToDashboard()` → `type === 'child'` → `/child-dashboard`

**Filer:** `public/js/child-login.js`, `public/js/session-gate.js`, `public/js/device-mode.js`

---

## 3. Två helt olika nav-upplevelser (klassisk vs magic)

Barnets UI styrs av `AppViewMode` (`public/js/app-view-mode.js`) — samma vyväxlare som föräldrar, men med `initChild()` och per-barn `view_mode` i DB (`classic` | `new` → magic).

| | **Klassisk vy** (default) | **Magic / ny design** |
|--|---------------------------|------------------------|
| Aktivering | `magic_view_enabled` + förälder/barn valt "Ny design" | |
| Primärnav | **Toppflikar** (`#childLayerNav`) | **Bottenflikar** (`#childBottomNav`) |
| Startflik | ☀️ **Idag** (`schedule`) | 🏠 **Hem** (`home`) |
| Bottennav | Dolt | Synligt |
| Hem-hub | Finns inte som flik | `homeView` + `ChildSkattHouse.mountHome()` |

```js
// child-dashboard.js — applyChildViewMode()
if (childUiMagic) {
  showTab('home');
} else {
  showTab('schedule');  // klassisk start
}
```

**Konsekvens:** Dokumentation och test måste täcka **båda** lägen. De flesta nya mockup-komponenter (Hem-flik, bottennav, universum-hub) är **magic-only**.

---

## 4. Navigationslager idag (överlappande)

Barnappen har **flera parallella nav-system** som delvis duplicerar varandra:

| System | Fil | När aktiv |
|--------|-----|-----------|
| **Bottennav (4 flikar)** | `child-dashboard.html` `#childBottomNav` | Magic vy |
| **Legacy toppnav (3 flikar)** | `#childLayerNav` | Klassisk vy |
| **Package nav (2 flikar)** | `child-package-nav.js` | `rollout_mode !== 'off'` — döljer Hem/Mer, byter etiketter |
| **Layer router (hash)** | `child-layer-router.js` | `#home`, `#today`, `#universe`, `#family`, `#more` |
| **Idag-fokus** | `child-today-focus.js` | Döljer veckonav/progress i Idag-läge |

### 4.1 Bottennav — magic (4 flikar)

```
🏠 Hem          → showTab('home')      → #homeView
📅 Schema       → showTab('schedule')  → #scheduleView  (+ todayFocusMount)
💎 Skattkammaren → showTab('rewards')   → #rewardsView
⋯ Mer           → showTab('more')       → #moreView
```

**Familj** har ingen egen flik — nås via Mer eller (klassisk) egen toppflik.

### 4.2 Legacy toppnav — klassisk (3 flikar)

```
☀️ Idag              → schedule
💎 Skattkammaren     → rewards
🏡 Familj            → family
```

Ingen Hem-flik. Ingen Mer-flik (logout/dark mode i header istället).

### 4.3 Package nav — vid rollout (2 flikar)

När `fetchPackageAccess().rollout_mode !== 'off'`:

```js
// child-package-nav.js
// Döljer: tabHome, tabMore, tabFamilyLegacy
// tabSchedule → etikett "Idag" ☀️
// tabRewards  → etikett "Skatt"
```

TEACCH **NU**-overlay döljer nav helt: `ChildPackageNav.setNavHidden(true)`.

### 4.4 Mer-menyn (magic only)

```
#moreView
├── 🏡 Familj        → showTab('family')
├── 👤 Byt barn      → switchChildMember()
├── 🌙 Mörkt läge
└── 🚪 Logga ut
```

**"Mer"** är skräplåda för familj + system — samma anti-mönster som förälderns gamla nav.

---

## 5. Vyer inuti `/child-dashboard` (tab → DOM)

Allt är `display: none/block` via `showTab()` — inte egna URL:er (hash är kosmetiskt).

| Tab-nyckel | DOM-container | Produktlager | Syfte idag |
|------------|---------------|--------------|------------|
| `home` | `#homeView` | Hem-hub (magic) | Teaser till skatt/universum via `ChildSkattHouse.mountHome` |
| `schedule` | `#scheduleView` | **Idag / handling** | Dagens aktiviteter, bocka av, veckonav (klassisk) |
| `rewards` | `#rewardsView` | **Skattkammaren / mening** | Stjärnor, mål, belöningar, universum |
| `family` | `#familyView` | **Familj / relation** | Familjehallen V0 (`child-family-hall.js`) |
| `more` | `#moreView` | System | Genvägar + logout |

### 5.1 Idag / Schema (`scheduleView`)

**Mental modell i kod:** `schedule` = Idag (inte veckoplanering som föräldern).

Innehåll:

- Aktivitetslista per dag (`view_type`: `day_sections` | `week_columns` | …)
- Veckoflikar / `weekNavDetails` (klassisk — doldes delvis av `child-today-focus.js`)
- Progress-ring i header (`childHeaderRing`) — dold i today-focus-läge
- Mood-rating modal efter aktivitet (`show_mood_rating` per barn)
- TEACCH: `child-seven-questions.js` **NU**-kort med döljd nav

**Filer:** `child-dashboard.js`, `child-today-focus.js`, `child-today-tasks.js`, `child-seven-questions.js`

### 5.2 Hem (`homeView`) — endast magic

- Laddar samma reward/universe-data som Skattkammaren
- `ChildSkattHouse.mountHome(homeHubMount, …)` — förenklad hub/ingress till universum
- Default vid magic-login (`applyChildViewMode`)

**Otydlighet:** Hem och Skattkammaren delar data och känsla — risk för "två hem" (noterat i `informationsarkitektur-barnapp.md` §8).

### 5.3 Skattkammaren (`rewardsView`)

Två renderingsvägar:

1. **Universum (magic + `ChildSkattHouse`):** rum-hub med unlocks (`child-skatt-house.js`)
2. **Klassisk banner-layout:** `renderSkattkammaren()` i `child-dashboard.js` (önskelista, historik, butik)

#### Rum i universum-hubben (`BASE_ROOMS`)

| Rum | ID | Unlock (typiskt) |
|-----|-----|------------------|
| Stjärnkistan | `chest` | Alltid |
| Drömvägg | `dreams` | Alltid |
| Troférum | `trophy` | 10⭐ livstid |
| Belöningshylla | `shelf` | 10⭐ |
| Samlingar | `collections` | 30⭐ |
| Historiebok | `story` | 30⭐ |
| Min avatar | `avatar` | 15⭐ |
| Husdjur | `pet` | 50⭐ |
| Museum | `museum` | 100⭐ |
| Butiken | `shop` | Alltid |

Navigation inuti skatt: **hub → rum → tillbaka** (`showRoom` / `showHub`) — ingen bottennav-ändring.

**Teman:** 🏰 Slott · 🌳 Trädkoja · 🚀 Rymden

**Filer:** `child-skatt-house.js`, `child-universe-client.js`, `child-avatar.js`, `child-collections.js`, `child-achievements.js`, `child-pet.js`, `child-museum.js`, `child-dashboard-warmth.js`

### 5.4 Familj (`familyView`) — Familjehallen V0

```
🏡 Familjehallen
├── ⭐ Familjeskista (aggregerade stjärnor)
├── 🎯 Familjeprojekt (tom om inga)
└── 📖 Familjens berättelse (event-feed)
```

Read-only från `GET /api/me/family`. Ingen checklista här (separation contract).

**Tillgång:**

- Klassisk: egen toppflik **Familj**
- Magic: via **Mer → Familj** (ingen bottenflik)

**Filer:** `child-family-hall.js`, `child-family-client.js`

---

## 6. Hash-routing (kosmetisk)

`child-layer-router.js` mappar hash → tab:

| Hash | Tab | Layer-namn |
|------|-----|------------|
| `#home` / `#hem` | `home` | home |
| `#today` / `#idag` / `#schedule` | `schedule` | today |
| `#universe` / `#skattkammaren` / `#rewards` | `rewards` | universe |
| `#family` / `#familj` | `family` | family |
| `#more` / `#mer` | `more` | more |

Sätter `data-child-layer` på `<html>`. **Ingen** server-side route per flik.

---

## 7. Header & system (utanför flikar)

I `#childHeader` (klassisk, alltid synlig):

| Element | Funktion |
|---------|----------|
| Barnnamn + datum | Identitet |
| Progress-ring | Dagens % (dold i today-focus) |
| Vyväxling | Dagsvy ↔ veckovy (`toggleViewType`) |
| Utskrift | `printBtn` |
| Mörkt läge | `toggleChildDarkMode` |
| Logga ut | `childLogout()` → `/child-login` eller förälder |

I **magic** ligger logout/dark mode även under **Mer**.

**Minimal UI** (`minimal_ui` / TEACCH): döljer print/dark/logout; Skattkammaren kan heta "Be om hjälp".

---

## 8. Feature-flaggor & paket (basic idag)

Barnens grundloop (`basic_app`) inkluderar:

- Idag/schema, stjärnor, belöningar, skattkammaruniversum, barninloggning

**Inte live för de flesta användare** (men kod finns):

| Paket | Barnsynlig kod | Nav-påverkan |
|-------|----------------|--------------|
| `teacch` | `child-seven-questions.js`, `child-read-aloud.js` | NU-overlay, dölj nav |
| `rollout_mode` | `child-package-nav.js` | 2-fliksnav |
| `parent_home_magic` / magic view | `AppViewMode` | Bottennav vs toppnav |

---

## 9. Mental karta vs faktisk navigation

`informationsarkitektur-barnapp.md` beskriver **tre lager**:

```
Idag (handling) → Skattkammaren (mening) → Familj (relation)
```

**Faktisk navigation idag:**

```
                    KLASSISK                    MAGIC
                    ────────                    ─────
Primär            Idag | Skatt | Familj     Hem | Schema | Skatt | Mer
                         │                      │       │
Idag/Handling      scheduleView              scheduleView (+ today-focus)
Mening             rewardsView               homeView + rewardsView  ← dubbel ingress
Relation           familyView                familyView (via Mer)
System             header-knappar            moreView
```

---

## 10. Kända friktioner (varför v2 behövs)

| Problem | Manifestation |
|---------|----------------|
| **Två nav-paradigm** | Toppflikar vs bottenflikar beroende på vy-flagga |
| **"Schema" för barn** | Fliken heter Schema men meningen är Idag/uppdrag |
| **Mer-flik** | Familj, byt barn, tema, logout — samma anti-mönster som förälder |
| **Två "hem"** | `homeView` och `rewardsView` konkurrerar i magic |
| **Familj gömd** | I magic bara under Mer — relationlagret svårt att hitta |
| **Rollout 2-flik** | Tredje nav-variant när paket-intresse är på |
| **Ingen barnprofil-route** | Allt på en HTML-sida; svårt att deep-linka "Astrids framsteg" |
| **Produkt vs barn-intent** | Namn som Schema, Skattkammaren, Mer är system/språk — inte barnets fråga |

**Mognad (från IA-doc):**

| Lager | Mognad | Nav-tydlighet |
|-------|--------|----------------|
| Skattkammaren | ~85% | Många rum — intern hub fungerar |
| Idag | ~60% | today-focus hjälper men veckonav/header kvar i klassisk |
| Familj | ~5% | Live men svår att hitta i magic |

---

## 11. Filer — snabbreferens

| Område | Filer |
|--------|-------|
| Huvudsida | `public/child-dashboard.html`, `public/js/child-dashboard.js` |
| Tab/hash | `public/js/child-layer-router.js` |
| Bottennav rollout | `public/js/child-package-nav.js` |
| Idag-fokus | `public/js/child-today-focus.js` |
| Skatt/universum | `public/js/child-skatt-house.js`, `child-universe-client.js` |
| Familj | `public/js/child-family-hall.js` |
| Inloggning | `public/child-login.html`, `public/js/child-login.js` |
| Vyväxlare | `public/js/app-view-mode.js` |
| Mockup (ej prod) | `public/v2/child.html` |
| IA vision | `docs/informationsarkitektur-barnapp.md` |
| Separation | `docs/separation-contract-barnapp.md` |

---

## 12. Jämförelse med föräldarsidan (nuläge)

| | Förälder idag | Barn idag |
|--|---------------|-----------|
| Huvud-URL | Många (`/dashboard`, `/schedule`, …) | En (`/child-dashboard`) |
| Nav-källor | Sidebar + native-tab-bar + magic + Mer/Extra | Toppnav ELLER bottennav + Mer |
| Settings | `/settings` | Mer / header |
| Hubbar | Saknas (direkt till routes) | Saknas (tab-state) |
| Paket i nav | Extra/Mer (rollout) | 2-flik (rollout) + TEACCH döljer nav |

---

# Del 2 — Barnmeny v2 (kommande)

> **Status:** Ej låst i detta dokument. Nästa steg: definiera barn-intents, primärnav, domän/placement-modell och inkrementell migration — i linje med [`vuxenmeny-v2.md`](./vuxenmeny-v2.md).

**Utgångspunkt från IA-principen:**

```
handling  →  mening  →  relation
  (Idag)    (Skatt)      (Familj)
```

V2 ska göra detta till **navigerbar struktur** utan Mer-flik och utan klassisk/magic-nav-split.

---

*Uppdatera Del 1 när nav ändras. Lås Del 2 när teamet godkänt målarkitektur.*
