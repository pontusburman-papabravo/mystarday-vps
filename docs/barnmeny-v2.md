# Barnmeny v2 — nuläge & informationsarkitektur

> **Syfte:** Teamreferens för barnsidans navigation. Del 1 dokumenterar **hur det ser ut idag**. Del 2 är **låst målarkitektur** och inkrementell migration — parallellt med [`vuxenmeny-v2.md`](./vuxenmeny-v2.md).
>
> **Status:** Del 1 = nuläge · Del 2 = låst arkitektur · implementation pågår inkrementellt  
> **Relaterat:** [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) · [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) · [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) · [`component-feature-map.js`](../config/component-feature-map.js)
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

# Del 2 — Barnmeny v2 (låst arkitektur)

> **Kärninsikt:** Barnets app ska **inte** ärva vuxenappens informationsarkitektur. Den ska inte vara *"en förenklad version av förälderns app"* — den ska vara *"ett visuellt stödverktyg för att lyckas med nästa sak"*.
>
> **Skillnaden mot idag:** Idag navigerar barnet i en app. I v2 **guidar appen barnet genom dagen**. Det är den största produktdifferentieringen.

---

## 0. Non-goals (låst)

> **V2 bygger inte om produktlogiken. Den flyttar ägarskap och presentation. Befintliga features, API:er och dataflöden återanvänds där möjligt.**

| Gör | Gör inte |
|-----|----------|
| Ny primärnav med tre barnvärldar | Kopiera vuxenmodellen (jobb → domän → placement) rakt av |
| `child-nav-config.js` som presentationslager | Ny backend för daily_log, rewards, family |
| Routes `/child/today`, `/child/world`, `/child/family` | Ta bort `/child-dashboard` innan redirects + analytics OK |
| Dela upp `child-dashboard.js` i moduler | Omskriva hela barn-SPA i ett svep |
| Hash som fallback under migration | Kräva att barn "navigerar funktioner" |

**Barnet är inte en användare som ska navigera funktioner** — barnet ska lyckas med en **vardagsloop**.

| Idag (7/10) | v2 (10/10) |
|-------------|------------|
| Barnet tänker: *"Vilken funktion behöver jag?"* | Barnet känner: *"Vad gör jag nu?"* |
| App-navigation | **Trygg väg** |
| Klassisk / magic / rollout-nav | **En modell** — tre världar, alltid samma |
| Komplexitet synlig i menyer | Komplexitet **bakom stöd** |

---

## 1. Produktprincip (en rad som styr allt)

### Vuxen vs barn — olika mentala modeller

| | Vuxen (v2) | Barn (v2) |
|--|------------|-----------|
| Navigerar efter | **Föräldrajobb** (*Parent Intent*) | **Vad jag ska göra nu** |
| Lager | jobb → domän → placement | situation → handling → mening → relation |
| Flikar | Fem jobb (Hem, Planering, …) | Tre världar (Idag, Min värld, Mina personer) |
| Paket | Utökar domän | Ger mer stöd i **samma flöde** |
| Feature | Läggs till på placement | Gör en del av världen rikare |
| Ny flik? | Endast nytt föräldrajobb | **Endast ny barnfråga** |

| Fråga | Svar i v2 |
|-------|-----------|
| Vad navigerar barnet efter? | **Vad jag ska göra nu** |
| Vad gör en feature? | Gör en del av världen rikare |
| Vad gör paket? | Ger mer stöd i samma flöde |
| Vad får skapa en flik? | **Endast en ny barnfråga** |

**Designregel:** Flikar = barnets världar. Paket = kapabiliteter i befintliga världar.

Fel: `feature → skapa barnflik`  
Rätt: `feature → lägg till innehåll i rätt placement`

Fel: *"Var ska TEACCH-fliken ligga?"*  
Rätt: *"Vilken barnfråga hjälper den?"* → Idag (NU-overlay, aktivitetsstöd).

### Barnets fyra lager (inte nav — produktlogik)

```
situation     →  Vad händer nu?
trygg handling →  Idag (☀️)        →  Handling + Stöd
mening        →  Min värld (🏰)   →  Motivation
relation      →  Mina personer (❤️) →  Trygghet
```

### Slutarkitektur (låst)

```
CHILD APP

             ☀️ Idag
                |
        ----------------
        |              |
     Handling       Stöd


             🏰 Min värld
                |
        ----------------
        |
     Motivation


             ❤️ Mina personer
                |
        ----------------
        |
     Trygghet
```

### Tio principer för NPF 3–12 (låsta)

| # | Princip | Konsekvens |
|---|---------|------------|
| 1 | **Trygg väg**, inte app-navigation | Tre världar. Ingen mode-switch. Ingen classic/magic. Ingen rollout-nav. |
| 2 | **Idag = operativsystem** | ~80 % av användningen. Barnet ska alltid kunna svara: *"Vad ska jag göra?"* |
| 3 | **Komplexitet bakom stöd** | Samma data (`activity → sub_steps → completion`), adaptiv rendering per barn |
| 4 | **Skattkammaren borta från nav** | Implementation/internt namn. Barn-UI: *"Jag bygger min värld"* |
| 5 | **Relation, inte funktion** | Flik = *Mina personer* — vem hjälper mig? vilka finns nära? |
| 6 | **Coach-loop** | Idag → liten trygg guide efter aktivitet (inte chat-bot) |
| 7 | **Personlig navigation** | Samma `id`, olika etiketter per ålder/stödnivå (`Uppdrag` vs `Idag`) |
| 8 | **En enda sann källa** | `child-nav-config.js` → mobil, surfplatta, native — `presentationMode` styr utseende, inte antal flikar |
| 9 | **Dela monoliten** | `child-shell.js` + världsmoduler + engines — utveckla utan regressioner |
| 10 | **Minsta möjliga val** | Undvik menyer med Schema/Belöningar/Profil/Inställningar — *"Vad händer nu? [Starta]"* |

### Vad skapar **inte** flik

| ❌ | Varför |
|----|--------|
| Schema | Barnet frågar inte "var är schemat?" — barnet frågar "vad händer nu?" |
| Mer | System (byt barn, tema, logout) konkurrerar inte med barnets värld |
| Inställningar | Förälder styr eller liten vuxenikon i header |
| Funktioner | Paket/feature = placement, inte menyitem |

---

## 2. Primärnav (basic, idag)

**Tre flikar. Inte fyra. Inte fem.**

För många barn 3–12 med NPF är navigation i sig en belastning.

| # | Flik (default) | Route | `id` | Barnets fråga |
|---|----------------|-------|------|---------------|
| 1 | ☀️ **Idag** | `/child/today` | `today` | *Vad gör jag nu?* |
| 2 | 🏰 **Min värld** | `/child/world` | `world` | *Det jag bygger upp* |
| 3 | ❤️ **Mina personer** | `/child/family` | `family` | *Vem hjälper mig?* |

**Tre världar. Alltid samma.** Ingen Mer-flik. Ingen Hem-flik. Ingen Schema-flik.

### Personliga etiketter (samma ID, olika språk)

Nav-`id` är stabilt. Etikett kan anpassas per barn (ålder, stödnivå, föräldraval):

```js
{
  id: 'today',
  icon: '☀️',
  href: '/child/today',
  labels: {
    young: 'Uppdrag',           // yngre barn
    default: 'Idag',            // standard
    personal: '{name}s dag',    // t.ex. "Astrids dag"
  },
}
```

**Regel:** personalisering ändrar **språk**, inte struktur. Tre flikar förblir tre flikar.

### Terminologi (låst)

| Vuxenspråk / kod (internt) | Barnspråk (UI) |
|----------------------------|----------------|
| Skattkammaren, `rewards`, `child-skatt-house` | **Min värld** — aldrig i nav |
| Schema, `schedule`-tab | **Idag** |
| Familjehallen, `family`-domän | **Mina personer** (❤️) |
| Hem-hub, `homeView` | **Inte nav** — intro → Idag |
| classic / magic / rollout-nav | **Bort** som produktbegrepp |

### `presentationMode` — inte två appar

v2 **avskaffar** classic/magic/rollout som separata nav-modeller.

| Bort | Kvar |
|------|------|
| Toppnav vs bottennav som olika IA | `presentationMode`: `mobile` · `tablet` · `desktop` · `native` |
| `child-package-nav.js` 2-flik | Samma `CHILD_PRIMARY_NAV` överallt |
| `AppViewMode` styr antal flikar | `AppViewMode` / tema styr **utseende** (färger, animation, botten vs topp *placering*) |

```
child-nav-config.js
        |
        +-- mobile (bottennav)
        +-- tablet
        +-- native-tab-bar
        +-- desktop (om barn på stor skärm)
```

**Inte:** två appar. **Utan:** en IA, flera presentationslägen.

---

## 3. De tre världarna

### 3.1 ☀️ Idag — `/child/today` (barnets operativsystem)

**~80 % av användningen.** Inte en sida med schema — barnets **OS**.

**Mental modell:** Barnet ska alltid kunna svara *"Vad ska jag göra?"* utan att välja funktion.

```
Astrid ❤️

NU
🪥 Borsta tänder
[Visa steg]  eller  [✓]

NÄSTA
🥣 Frukost

SEN
🎒 Skola
```

| Kapabilitet | Befintlig kod / data |
|-------------|----------------------|
| `daily_log_item` | `child-dashboard.js`, `/api/me/daily-log` |
| NU / NÄSTA / SEN | `child-today-focus.js`, `child-seven-questions.js` (TEACCH) |
| Underaktiviteter (delsteg) | `daily_log_item_sub_step`, `toggleItem()` |
| Mood | `show_mood_rating` per barn |
| TEACCH-overlay | `child-seven-questions.js` — placement `today_overlay` |
| Coach-loop | **Ny** — se §3.2 |
| Veckonav (klassisk) | Dolt i default NPF-läge |

**Tab-nyckel idag:** `schedule` → **mappas till** `today` i v2.

**Undvik (NPF):**

```
❌ Vad vill du göra?
   Schema · Belöningar · Familj · Profil · Inställningar · Hjälp
```

**Bättre:**

```
✅ Vad händer nu?
   [Starta]
```

### 3.2 Coach-loop (barnets "För dig")

Vuxen har Hem → För dig. Barn behöver **Idag → liten coach**.

Inte chat-bot. En **trygg guide** som bekräftar och pekar framåt.

```
Efter avklarad aktivitet eller delmål:

🎉 Bra jobbat!

Du klarade morgonen.

Vill du se vad som händer sen?
[Nästa: Frukost →]
```

| Placering | `placement` | Trigger |
|-----------|-------------|---------|
| Efter aktivitet | `today_coach_post_activity` | Huvudaktivitet eller alla delsteg klara |
| Efter sektion | `today_coach_post_section` | FM/EM/kväll klar |
| Dagsavslut | `today_coach_day_done` | Alla dagens uppdrag klara |

**Regel:** coach är **kort**, **valfritt att expandera**, och leder alltid tillbaka till NU/NÄSTA — aldrig till en meny.

### 3.3 Adaptivt stöd — samma data, olika rendering

Datamodellen behålls:

```
activity
 └── sub_steps
       └── completion
```

Rendering är **adaptiv** per barn (`child_view_config`, stödnivå, ålder):

**Barn med mindre stöd:**

```
🪥 Borsta tänder
[✓]
```

**Barn med mer stöd:**

```
🪥 Borsta tänder
1/4

🚰 Hämta tandborste  ⬜
🪥 Borsta            ⬜
💧 Skölj             ⬜
✨ Klar
```

| Lager | Ansvar |
|-------|--------|
| `child-activity-engine.js` | Laddar `daily_log_item` + sub_steps |
| `child-support-layer.js` | Väljer renderingsläge (kompakt / expanderad / steg-för-steg) |
| `child-today.js` | Monterar vy, coach-loop, NU/NÄSTA/SEN |

**Oförändrat:** stjärna på **huvudaktivitet**; delsteg = stöd, inte prestation. `PUT …/sub-steps` + huvud-`toggleItem` auto-kompletterar delsteg.

**Detta är en stor del av 10/10** — samma backend, olika trygghetsnivå i UI.

### 3.4 🏰 Min värld — `/child/world`

**Skattkammaren är implementation** — barnets mentalmodell är *"Jag bygger min värld"*, inte *"Jag går till skattkammaren"*.

Gamification behålls. Den blir **begripligare**.

```
🏰 Min värld

⭐ Mina stjärnor
🎯 Mitt mål
🐾 Mitt husdjur
🏆 Mina saker
📖 Min historia
```

| Sektion | Befintlig kod |
|---------|---------------|
| Universum / rum | `child-skatt-house.js`, `universe-engine.js` |
| Stjärnor, mål, butik | `renderSkattkammaren()`, `/api/me/goal`, rewards API |
| Avatar, husdjur, museum, teman | `child-avatar.js`, `child-pet.js`, `child-museum.js` |
| Historik / reporting | `world_history` placement |

**Tab-nyckel idag:** `rewards` (+ `homeView` i magic) → **sammanslaget** till `world`.

`ChildSkattHouse.mountHome()` → **intro/animation efter login** → landar på Idag. Inte egen nav-flik.

### 3.5 ❤️ Mina personer — `/child/family`

**Relation, inte funktion.** Inte socialt nätverk — **trygghet**.

Barnets frågor:

- Vem hjälper mig?
- Vilka finns nära?
- Vad gör vi tillsammans?

```
❤️ Mina personer

Mamma
⭐ 120 familjestjärnor

Pappa
"Vi klarade kvällsrutinen"

Syskon
…

Vi tillsammans ⭐
```

| Innehåll | Befintlig kod |
|----------|---------------|
| Familjehallen V0 | `child-family-hall.js`, `GET /api/me/family` |
| Familjeskista, projekt, berättelse | Samma modul |
| Pedagog (paket) | `family_hall` placement — inte egen flik |

**Domän-id:** `family` (stabilt i kod). **Nav-etikett:** *Mina personer* (❤️).

**Tab-nyckel idag:** `family` (klassisk / Mer i magic) → **primärflik** i v2.

---

## 4. Vad händer med Hem och Mer?

### Hem — inte nav

| Roll idag (magic) | Roll i v2 |
|-------------------|-----------|
| Bottenflik `home` | **Bort** som flik |
| `homeView` + `mountHome()` | Intro efter login, dagens startsida, animation/ingång → landar på **Idag** |
| Dubbel ingress till skatt | **En** ingress: Min värld |

**Problem v2 löser:** *"Var är jag?"* när Hem och Skattkammaren båda känns som start.

### Mer — bort 100%

| Funktion idag | Placering i v2 |
|---------------|----------------|
| 🏡 Familj | Primärflik **Mina personer** |
| 👤 Byt barn | Förälder styr **eller** liten vuxenikon i header |
| 🌙 Mörkt läge | Förälder styr / header (vuxenikon) |
| 🚪 Logga ut | Header (vuxenikon) / förälder |

Systemgrejer ska **inte konkurrera** med barnets tre världar.

---

## 5. Domänmodell (barn)

Samma **fyra begrepp** som vuxen — men **andra domäner**:

| Begrepp | Betydelse | Barn-exempel |
|---------|-----------|--------------|
| **`feature`** | Paket-slug som styr åtkomst | `teacch`, `reporting` |
| **`domain`** | Barnfråga — *vilken värld?* (**obligatoriskt**) | `today`, `world`, `family` |
| **`placement`** | Var i UI innehållet **kan** renderas | `today_overlay`, `world_history`, `family_hall` |
| **`visibility`** | Ska det visas nu? | TEACCH köpt men ej aktiverat → dölj |

### Domäner (låsta)

| Domän | Barnfråga | Route |
|-------|-----------|-------|
| `today` | Vad händer nu? | `/child/today` |
| `world` | Det jag bygger upp | `/child/world` |
| `family` | Mina personer | `/child/family` |

**Ingen** `settings`-domän i barnnav. **Ingen** `more`-domän.

### Placements-register (`child-placements.js`)

Central lista över var innehåll **kan** renderas — separat från capabilities så nya placements inte kräver nav-ändring:

```js
// public/js/child-placements.js

export const CHILD_PLACEMENTS = {
  // Idag
  today_overlay:        { domain: 'today',  description: 'TEACCH NU-kort, fullskärmsstöd' },
  today_coach_post_activity: { domain: 'today', description: 'Coach efter aktivitet' },
  today_coach_post_section:  { domain: 'today', description: 'Coach efter FM/EM/kväll' },
  today_coach_day_done:      { domain: 'today', description: 'Coach när dagen är klar' },
  activity_support:     { domain: 'today',  description: 'Adaptiv delsteg-rendering' },
  // Min värld
  world_history:        { domain: 'world',  description: 'Min historia / reporting' },
  world_tools:          { domain: 'world',  description: 'TEACCH-verktyg i världen' },
  // Mina personer
  family_hall:          { domain: 'family', description: 'Familjehallen' },
  family_persons:       { domain: 'family', description: 'Personkort med relationstext' },
};
```

### Obligatoriska fält i `CHILD_CAPABILITIES`

```js
{
  id: 'teacch_now',           // required
  feature: 'teacch',          // required — access gate
  domain: 'today',            // required — barnvärld
  placements: ['today_overlay', 'activity_support'], // required — minst en
  label: 'NU-kort',
}
```

**Förbjudet:**

```js
{ label: 'TEACCH', href: '/teacch' }  // ❌ saknar domain, placements
```

---

## 6. Paket → placering (ingen navändring)

| Paket | Feature | Domän | Placements | Synligt som |
|-------|---------|-------|------------|-------------|
| **Basic** | — | `today`, `world`, `family` | primärnav | Tre flikar |
| **TEACCH** | `teacch` | `today` | `today_overlay`, `activity_support`, `world_tools` | NU-kort, adaptivt stöd — **inte** ny flik |
| **Pedagog** | `pedagog` | `family` | `family_hall`, `family_persons` | Extra innehåll i Mina personer |
| **Reporting** | `reporting` | `world` | `world_history` | Min historia — **inte** barnflik |
| **Coach** | — (basic) | `today` | `today_coach_*` | Trygg guide efter aktivitet/sektion/dag |

### Reporting — dubbel entré (samma princip som vuxen Framsteg)

| Roll | Placering |
|------|-----------|
| Förälder | Barnprofil → Framsteg (`vuxenmeny-v2.md` §3) |
| Barn | Min värld → Historik |

Barn ser **inte** rapporter som egen flik.

### TEACCH — overlay, inte nav

Idag: `ChildPackageNav.setNavHidden(true)` under NU-overlay.  
v2: behåll principen — nav döljs vid fullskärms-stöd, men **grundnav är fortfarande tre världar** när overlay stängs.

---

## 7. Teknisk källa — tre filer, en IA

```
child-nav-config.js      ← primärnav, etiketter, routes
        |
child-capabilities.js    ← feature + domain + access/visibility
        |
child-placements.js      ← var innehåll kan renderas
```

**Mål:** en källa för all barnnavigation — ersätter duplicering i `child-dashboard.html`, `child-package-nav.js`, `child-layer-router.js`, classic/magic-split.

### Modularkitektur (mål efter Fas 2)

```
Nu (monolit):
child-dashboard.js
  ├── login
  ├── nav
  ├── rewards
  ├── family
  ├── schedule
  ├── mood
  └── TEACCH

V2:
child-shell.js              ← login, nav, routing, system (vuxenikon)
child-today.js              ← Idag-vy, coach-loop
child-world.js              ← Min värld
child-family.js             ← Mina personer
child-support-layer.js      ← adaptiv rendering (steg/kompakt)
child-activity-engine.js    ← daily_log + sub_steps
child-rewards-engine.js     ← stjärnor, mål, inlösen
```

**Mål:** utveckla utan regressioner. `child-dashboard.js` blir tunn orchestrator → ersätts av `child-shell.js`.

### Konsumenter (ska läsa samma config)

| Fil | Idag | v2 |
|-----|------|-----|
| `child-dashboard.html` `#childBottomNav` / `#childLayerNav` | Hårdkodad HTML | Genererad från config |
| `child-package-nav.js` | 2-fliks rollout | **Avvecklas** |
| `AppViewMode` classic/magic nav | Olika antal flikar | **`presentationMode`** — samma tre flikar |
| `child-layer-router.js` | Hash → tab | Hash → route + tab fallback |
| `native-tab-bar.js` (barnläge) | Om separat | `child-nav-config` → `primary` |
| `session-gate.js` | `CHILD_PATHS` | Lägg till `/child/today`, `/child/world`, `/child/family` |

### Config-struktur (koncept)

```js
// public/js/child-nav-config.js

export const CHILD_PRIMARY_NAV = [
  {
    id: 'today',
    icon: '☀️',
    href: '/child/today',
    labels: { young: 'Uppdrag', default: 'Idag', personal: '{name}s dag' },
  },
  {
    id: 'world',
    icon: '🏰',
    href: '/child/world',
    labels: { default: 'Min värld' },
  },
  {
    id: 'family',
    icon: '❤️',
    href: '/child/family',
    labels: { default: 'Mina personer' },
  },
];

// child-capabilities.js — se §5
// child-placements.js — se §5
```

`CHILD_CAPABILITIES` och `CHILD_SYSTEM_ACTIONS` lever i `child-capabilities.js`:

```js
export const CHILD_CAPABILITIES = [
  {
    id: 'today_coach',
    feature: null,  // basic
    domain: 'today',
    placements: ['today_coach_post_activity', 'today_coach_post_section', 'today_coach_day_done'],
    label: 'Coach',
  },
  {
    id: 'teacch_now',
    feature: 'teacch',
    domain: 'today',
    placements: ['today_overlay', 'activity_support'],
    label: 'NU-kort',
  },
  {
    id: 'adaptive_substeps',
    feature: null,  // basic — driven by child_view_config
    domain: 'today',
    placements: ['activity_support'],
    label: 'Adaptivt stöd',
  },
  // … reporting, pedagog
];

export const CHILD_SYSTEM_ACTIONS = [
  // Inte i primärnav — header vuxenikon eller förälderstyrt
  { id: 'switch_child', label: 'Byt barn',    action: 'switchChild' },
  { id: 'dark_mode',    label: 'Mörkt läge',  action: 'toggleDark' },
  { id: 'logout',       label: 'Logga ut',    action: 'logout' },
];
```

### Filer att **inte** omskriva (initialt)

| Fil | Strategi |
|-----|----------|
| `src/routes/daily-logs.js` | Orörd |
| `src/routes/rewards.js` | Orörd |
| `src/routes/goals.js` | Orörd |
| `child-skatt-house.js` | Behåll; mountas från `child-world.js` |
| `child-family-hall.js` | Behåll; mountas från `child-family.js` |

---

## 8. Inkrementell migration

**Princip:** Ny mental modell snabbt. Monolit delas upp. Gamla entry points lever tills redirects + analytics OK.

### Fas 0 — Config (ingen UI-förändring)

| Leverans | Detalj |
|----------|--------|
| `public/js/child-nav-config.js` | `CHILD_PRIMARY_NAV` med personliga `labels` |
| `public/js/child-capabilities.js` | `CHILD_CAPABILITIES`, `CHILD_SYSTEM_ACTIONS`, access/visibility |
| `public/js/child-placements.js` | `CHILD_PLACEMENTS` register |
| Inga synliga ändringar | Config importeras men UI oförändrat |

### Fas 1 — Lås tre världar

| Från (magic) | Från (klassisk) | Till (alla) |
|--------------|-----------------|-------------|
| Hem · Schema · Skatt · Mer | Idag · Skatt · Familj | **Idag · Min värld · Mina personer** |

- Gamla `showTab()`-nycklar fungerar internt (`schedule` → `today`, `rewards` → `world`)
- `child-package-nav.js` och rollout 2-flik: **avvecklas**
- classic/magic nav-split: **bort** — endast `presentationMode`
- `public/sw.js` CACHE_NAME-bump

### Fas 2 — Separera komponenter

| Ny modul | Ansvar | Källa idag |
|----------|--------|------------|
| `child-shell.js` | Login, nav, routing, system | `child-dashboard.js` (orchestrator) |
| `child-today.js` | Idag-vy, NU/NÄSTA/SEN, coach-loop | `child-dashboard.js` |
| `child-world.js` | Min värld, universum | `child-dashboard.js` + `child-skatt-house.js` |
| `child-family.js` | Mina personer | `child-family-hall.js` |
| `child-activity-engine.js` | daily_log + sub_steps | `child-dashboard.js` |
| `child-support-layer.js` | Adaptiv rendering | Ny (extrahera från delsteg-UI) |
| `child-rewards-engine.js` | Stjärnor, mål, inlösen | `child-dashboard.js` rewards-del |

**Mål:** inte ~2 700 rader i en fil. Utveckla utan regressioner.

### Fas 3 — Route-riktig struktur

| Route | Innehåll |
|-------|----------|
| `/child/today` | Idag |
| `/child/world` | Min värld |
| `/child/family` | Mina personer |

- Server: tunna HTML eller Express-routes som servar samma shell
- Hash (`#today`, `#universe`, …) lever som **fallback** under migration
- `child-layer-router.js` mappar gamla hash → nya routes

### Fas 4 — NPF & coach (10/10-polish)

| Leverans | Detalj |
|----------|--------|
| Adaptivt stöd | `child-support-layer.js` — kompakt vs steg-för-steg (§3.3) |
| Coach-loop | `today_coach_*` placements (§3.2) |
| Minsta val | Dölj veckonav, print, funktionsmenyer |
| Personliga etiketter | `labels.young` / `labels.personal` i nav |
| Login-intro | Animation → Idag, inte Hem-flik |

---

## 9. Sprint-plan (låst ordning)

### Sprint 0 — Config
- [ ] `child-nav-config.js` (nav + personliga labels)
- [ ] `child-capabilities.js` (access + visibility)
- [ ] `child-placements.js` (placement-register)
- [ ] Inga UI-ändringar

### Sprint 1 — Synlig v2 (trygg väg)
- [ ] Ersätt magic 4-flik + klassisk 3-flik + rollout 2-flik med **en** tre-världsmodell
- [ ] Etiketter: Idag · Min värld · Mina personer (❤️)
- [ ] Mina personer upp från Mer
- [ ] Hem bort som flik; Mer bort; rollout-nav bort
- [ ] `presentationMode` — samma IA på mobil/tablet/native
- [ ] System i header (vuxenikon) eller förälderstyrt
- [ ] `session-gate.js` uppdaterad
- [ ] `public/sw.js` bump

*Leverans:* barn ser tre världar. Appen guidar — barnet navigerar inte funktioner.

### Sprint 2 — Moduluppdelning
- [ ] `child-shell.js` (ersätter orchestrator-delen)
- [ ] `child-today.js` + `child-activity-engine.js`
- [ ] `child-world.js` + `child-rewards-engine.js`
- [ ] `child-family.js` wired
- [ ] `child-support-layer.js` (skelett)

### Sprint 3 — Routes
- [ ] `/child/today`, `/child/world`, `/child/family`
- [ ] Redirect `/child-dashboard` → `/child/today`
- [ ] Hash-fallback
- [ ] `page_view` analytics per värld

### Sprint 4 — Adaptivt stöd & coach
- [ ] Adaptiv delsteg-rendering (§3.3)
- [ ] Coach-loop efter aktivitet (§3.2)
- [ ] Personliga nav-etiketter
- [ ] TEACCH via placements (inte `child-package-nav.js`)

### Sprint 5+ — Städning
- [ ] Avveckla `child-package-nav.js`, classic/magic nav-split
- [ ] `CHILD_CAPABILITIES` för teacch, reporting, pedagog
- [ ] `child-dashboard.js` bort eller minimal legacy-shim

---

## 10. Redirects (sammanfattning)

| Gammal | Ny |
|--------|-----|
| `/child-dashboard` | `/child/today` |
| `/child-dashboard#schedule` / `#today` / `#idag` | `/child/today` |
| `/child-dashboard#rewards` / `#universe` / `#skattkammaren` | `/child/world` |
| `/child-dashboard#family` / `#familj` | `/child/family` |
| `/child-dashboard#home` / `#hem` | `/child/today` (efter intro) |
| `/child-dashboard#more` / `#mer` | `/child/today` + system i header |

Befintliga API:er (`/api/me/daily-log`, `/api/me/goal`, …) **oförändrade**.

---

## 11. Relation till vuxenmeny v2

| Vuxen | Barn | Gemensam princip |
|-------|------|------------------|
| Parent Intent (jobb) | Barnfråga (värld) | Flik = mental modell, inte feature |
| `nav-config.js` | `child-nav-config.js` | En nav-källa |
| `CAPABILITIES` + placements | `CHILD_CAPABILITIES` | Paket utökar djup, inte bredd |
| Barnprofil → Framsteg | Min värld → Historik | Reporting dubbel entré |
| Avatar → inställningar | Vuxenikon / förälder | System utanför primärnav |
| `informationsarkitektur-barnapp.md` tre lager | Tre världar | Idag → Min värld → Mina personer |
| Hem → För dig (vuxen) | Idag → coach-loop (barn) | Coach-lager per målgrupp |

**Slutsats:** För att nå 10/10 behöver ni inte lägga till mer — ni behöver göra barnmenyn **mer konsekvent med barnets faktiska behov**. Appen guidar barnet genom dagen; barnet navigerar inte funktioner.

---

## 12. Checklista innan merge (per sprint)

- [ ] Alla barn-nav-konsumenter läser `child-nav-config.js`
- [ ] `child-placements.js` + `child-capabilities.js` på plats
- [ ] Varje `CHILD_CAPABILITY` har `id`, `feature`, `domain`, `placements`
- [ ] Exakt **tre** primärflikar — inga Hem/Mer/Schema/Skattkammaren
- [ ] Nav-etikett *Mina personer* (❤️), inte "Familj" eller "Skattkammaren"
- [ ] Ingen classic/magic/rollout **nav-split** — endast `presentationMode`
- [ ] Coach-loop testad (ej chat-bot, leder till NU/NÄSTA)
- [ ] Adaptivt stöd: samma data, två renderingslägen
- [ ] `session-gate.js` inkluderar `/child/*` paths
- [ ] Deep links / push uppdaterade vid behov
- [ ] Analytics vid route-migration (Sprint 3+)
- [ ] `CACHE_NAME` i `public/sw.js` bumpad
- [ ] Smoke: klassisk vy, magic vy, TEACCH overlay, native shell
- [ ] Ingen omskrivning av rewards/daily-log API (non-goal §0)

---

## 13. Ägarskap efter migration

| Barnfråga | Äger |
|-----------|------|
| Vad ska jag göra nu? | **Idag** (~80 % av tiden) |
| Det jag bygger upp | **Min värld** |
| Mina personer / trygghet | **Mina personer** |
| Coach efter handling | **Idag** → coach-loop |
| Adaptivt stöd | **Idag** → `child-support-layer` |
| System (byt barn, tema, logout) | Header vuxenikon / förälder — **inte** flik |
| Intro efter login | Animation → landar på Idag |
| Paket (TEACCH, reporting, …) | Placements i befintliga världar |

**Slutsats:** Navigationen växer inte när paket kommer — **djupet** i varje värld växer. Idag är operativsystemet. Min värld är motivation. Mina personer är trygghet. Appen guidar — barnet lyckas med nästa sak.

---

# Bilaga A — Schema & delsteg (teknisk kedja)

> Djupdykning för implementatörer. Produktbeteende oförändrat i v2 — bara UX och placering.

### Datakedja

```
activity_template
  └── activity_sub_step
weekly_schedule_item
  └── daily_log_item          ← stjärna här (star_value, vanligtvis 1⭐)
        └── daily_log_item_sub_step   ← checklista, ingen egen stjärna
```

Generator: `src/lib/daily-log-generator.js`

### Barn-API

| Endpoint | Syfte |
|----------|-------|
| `GET /api/me/daily-log` | Dagens items |
| `PUT /api/me/daily-log-items/:id` | Bocka av huvudaktivitet |
| `GET/PUT …/sub-steps` | Delsteg |

Huvud-`toggleItem` i `child-dashboard.js` auto-kompletterar alla delsteg när huvudaktiviteten bockas.

---

# Bilaga B — Min värld / stjärnekonomi

### Saldo

`getStarBalance()` i `src/routes/rewards.js`:

```
intjänade (completed daily_log_items)
+ manuella tilldelningar
− spenderade (godkända/auto redemptioner)
```

### Inlösen

Barn → `pending` → förälder godkänner.

### Mål

`child_reward_goal` / `GET /api/me/goal`

### Universum

`child-skatt-house.js` + `universe-engine.js` — rum, unlocks, teman (🏰 🌳 🚀). I v2: allt under **Min värld**, inte Skattkammaren i barn-UI.

---

*Uppdatera Del 1 när nav ändras. Del 2 ändras endast via teambeslut — samma process som `vuxenmeny-v2.md`.*
