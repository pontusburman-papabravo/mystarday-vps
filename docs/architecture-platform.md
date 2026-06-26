# Core Platform — Arkitektur & presentationslager

**Skapad:** 2026-06-26  
**Version:** 0.1 (utkast)  
**Status:** Strategisk arkitekturspec — styr långsiktiga beslut, **ingen omedelbar implementation**  
**Ägare:** Produkt + teknik

> **Relaterat (Generation 1 — barn):** [`USE_CASES_PLATFORM.md`](./USE_CASES_PLATFORM.md) · [`engineering-architecture-barnapp.md`](./engineering-architecture-barnapp.md) · [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) · [`separation-contract-barnapp.md`](./separation-contract-barnapp.md) · [`APP-V2-KRAVSPEC.md`](./APP-V2-KRAVSPEC.md)

---

## 0. En rad som styr allt

> **Samma motor, olika upplevelser.**

Produkten är inte en barnapp. Den är **Generation 1** av en motor för **exekutiv funktion** — planera, utföra, bekräfta, belöna, bygga vanor. Den råkar idag användas av familjer med barn 4–12.

**Beslutsgate för varje v2-ändring:**

> *Kan samma motor presenteras för en 24-åring med ADHD utan att vi skriver om arkitekturen?*

| Svar | Betydelse |
|------|-----------|
| **Ja** | Plattform — bygg vidare |
| **Nej** | Barnapp-skuld — ompröva |

---

## 1. Vad kunderna faktiskt köper

Idag marknadsför vi *visuella scheman*. Det kunderna köper är:

| Värde | Gäller även 22-åring med ADHD? |
|-------|-------------------------------|
| Mindre stress | ✅ |
| Mindre tjat / självövertygelse | ✅ ("Jag säger till mig själv att jag ska börja") |
| Mer självständighet | ✅ |
| Bättre rutiner | ✅ |
| Lugnare vardag | ✅ |
| Fungerande exekutiva funktioner | ✅ |

**Kärnloopen (åldersneutral):**

```
Planera → Utföra → Bekräfta → Belöna → Bygga vanor
```

---

## 2. Produktgenerationer

```
Generation 1 (nu)     Barn 4–12 + föräldrar + pedagoger
        ↓
Generation 2          Ungdomar 13–17
        ↓
Generation 3          Unga vuxna 18–30
        ↓
Generation 4          Vuxna
```

**Vad förändras per generation:** nästan bara **presentation** (nav, språk, illustrationer, gamification-nivå, coach-ton).

**Vad förändras inte:** core engines, datamodell, API-kontrakt.

App v2 / nav v2 är **Platform v1** — grunden som gör Generation 2–4 möjliga utan omskrivning.

---

## 3. Två lager (övergripande)

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE PLATFORM (Layer 1)                   │
│         Domänlogik — förändras sällan, delas av alla         │
│                                                              │
│  Identity · Tasks · Goals · Rewards · Progress · Habits     │
│  Relationships · Timeline · Coach (AI) · Permissions          │
│  Notifications · Analytics                                   │
│                                                              │
│              Gemensam datamodell & API                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER (Layer 2)                      │
│    Navigation · språk · färger · animation · gamification    │
│                                                              │
│   CHILD    TEEN    YOUNG_ADULT    ADULT    (+ Parent, Educator) │
└─────────────────────────────────────────────────────────────┘
```

**Regel:** Presentation får **aldrig** äga affärslogik. Paket, capabilities och permissions lever i Layer 1.

---

## 4. Layer 1 — Core Platform

### 4.1 Engines (domänlogik)

Dessa är produkten — inte barn-UI:t.

| Engine | Ansvar | Befintlig kod / data (Generation 1) |
|--------|--------|-------------------------------------|
| **Task** | Skapa, planera, schemalägga, slutföra uppgifter | `activity_template`, `weekly_schedule`, `daily_log_item`, `sub_steps` |
| **Goal** | Kort- och långsiktiga mål | `reward` (stjärnkost), streak, familjeprojekt |
| **Reward** | Poäng, inlösen, unlocks | `daily_log_item.star_value`, `reward_redemption`, universe |
| **Progress** | Streaks, nivåer, historik, statistik | `streak`, museum, star history |
| **Habit** | Återkommande mönster, vanor | weekly schedule, completion patterns |
| **Relationship** | Grupper, roller, inbjudan, stödpersoner | `family`, `parent_child`, `pedagog_invite` |
| **Timeline** | NU / NÄSTA / SEN, tidslinje, kalender | `view_type`, `now_next_later`, calendar |
| **Coach (AI)** | Personliga förslag, nästa steg | För dig (förälder, Gen 1), framtida per profil |
| **Notification** | Push, påminnelser, systemmeddelanden | `push_subscriptions`, `notification_log` |
| **Permission** | Roller, integritet, åtkomst | `parent_child.role`, authz, PIN/parental gate |
| **Identity** | Person, konto, session | `parent`, `child` (→ `member`), JWT |

### 4.2 Tre motorer — generiska namn

Dagens barn-specifika namn mappas till **plattformsneutrala** engines. Barn-IA är en *presentation* av dem.

| Plattform (Layer 1) | Generation 1 (barn-UI) | Mental modell |
|---------------------|------------------------|---------------|
| **Execution Engine** | Today / Idag | *Vad ska jag göra nu?* |
| **Progress Engine** | Universe / Min värld | *Vad har jag byggt upp?* |
| **Relationship Engine** | Family / Mina personer | *Vem finns i mitt liv?* |

```
Execution Engine     →  tasks → complete → emit event
Progress Engine      →  points → unlocks → collections
Relationship Engine  →  groups → shared story → support network
```

**Viktigt:** Vi **ersätter inte** Today/Universe/Family i Generation 1-koden över natten. Vi **namnger dem konceptuellt** i nya specs och ser till att v2-implementationen inte låser oss till barnord i *ny* kod.

### 4.3 Domänspråk (mål)

| Idag (Generation 1) | Plattform (mål) | Barn ser | Vuxen ser |
|---------------------|-----------------|----------|-----------|
| `child` | `member` / `person` | "Astrid" | "Jag" |
| `family` | `group` | "Familjen" | "Mitt team" / "Hushållet" |
| `reward` + stars | `reward` + `progress_unit` | ⭐ Stjärnor | Progress / XP |
| Skattkammaren | `progress_surface` | 🏰 Min värld | Mål / Achievements |
| `parent` | `guardian` / `account` | Förälder | Stödperson / Själv |

**Migreringsprincip:** Tabellnamn `child` / `family` **behålls** tills explicit migration. Ny kod och nya API-fält använder neutrala begrepp där det är billigt (`member_id` i events, `presentation_profile` i config).

---

## 5. Layer 2 — Presentation Profiles

### 5.1 `PresentationProfile`

```ts
type PresentationProfile =
  | 'CHILD'        // 4–12
  | 'TEEN'         // 13–17
  | 'YOUNG_ADULT'  // 18–30
  | 'ADULT'        // 30+
  | 'PARENT'       // vårdnadshavare (Gen 1)
  | 'EDUCATOR'     // pedagog (finns)
  | 'THERAPIST'    // horisont
```

Varje profil styr **endast presentation:**

| Dimension | Styrs av profil |
|-----------|----------------|
| Navigation (etiketter, antal flikar) | ✅ |
| Färger, illustrationer, animation | ✅ |
| Språk och metaforer | ✅ |
| Gamification-nivå (stjärnor vs XP vs %) | ✅ |
| Coach-ton | ✅ |
| Ikoner | ✅ |
| Affärslogik, API, permissions | ❌ Layer 1 |

**Teknisk början (v2, ingen ny tabell nödvändig):**

```js
// Utöka befintlig config — inte ny backend
child_view_config.presentation_profile  // 'CHILD' | 'TEEN' | …
child_view_config.age_band              // härledd från birthday
```

### 5.2 Navigation per profil

Samma tre **engine-slots** — olika etiketter och visuell tyngd.

| Engine slot | CHILD (4–12) | TEEN (13–17) | YOUNG_ADULT | ADULT |
|-------------|--------------|--------------|-------------|-------|
| Execution | ☀️ Idag | Idag | Idag / Tasks | Idag / Tasks |
| Progress | 🏰 Min värld | Mitt space | Mål / Progress | Mål / Growth |
| Relationship | ❤️ Mina personer | Mina personer | Mitt nätverk | Network / People |

**v2 gör redan rätt:** Idag · Min värld · Mina personer är **översättningsbara** etiketter — inte hårdkodade barnbegrepp i motorerna.

### 5.3 Gamification per profil

Samma API-anrop — olika presentation:

| Händelse | CHILD | TEEN | YOUNG_ADULT / ADULT |
|----------|-------|------|---------------------|
| Slutför uppgift | +1 ⭐ → glass | +25 XP → achievement | Progress 73 % → månadsmål |
| API | `POST …/complete` → `{ progress_delta, unit: 'stars' }` | samma | samma — `unit` + profil styr UI |
| Progress-yta | Skattkammaren, hus, rum | Avatar, streak, stats | Grafer, mål, vanor |

### 5.4 Coach per profil

| Profil | Coach-roll | Generation 1-status |
|--------|------------|---------------------|
| PARENT | Lösningslager för vårdnadshavare | För dig — **levererat** |
| CHILD | Kort loop efter aktivitet | v2 coach-loop |
| TEEN | Självständighet + integritet | Ej byggt |
| YOUNG_ADULT / ADULT | AI-stöd, dagssammanfattning | Ej byggt |

Samma **Coach engine** — olika `tone` + `placement` per `PresentationProfile`.

---

## 6. Produkter & roller (horisont)

```
Product (byggda på Core Platform)

├── Child          Generation 1 — live
├── Parent         Generation 1 — live
├── Educator       Generation 1 — live (pedagog)
├── Teen           Generation 2
├── Young Adult    Generation 3
├── Adult          Generation 4
├── Therapist      Horisont
└── Organization   Horisont (skola, BUP, arbetsplats)
```

Paket (`basic_app`, `reporting`, `pedagog`, `teacch`) är **capabilities** ovanpå Core — inte separata produkter.

---

## 7. Relation till befintlig barnarkitektur

**Gör inte:** Slänga Today / Universe / Family — de fungerar för Generation 1.

**Gör:** Lyfta dem ett konceptuellt lager och behandla dem som **första presentation** av Execution / Progress / Relationship.

```
                    CORE PLATFORM
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   Execution         Progress         Relationship
        │                 │                 │
        ▼                 ▼                 ▼
   CHILD preset      CHILD preset      CHILD preset
   "Idag"            "Min värld"       "Mina personer"
        │                 │                 │
        ▼                 ▼                 ▼
   TEEN preset       TEEN preset       TEEN preset
   "Idag"            "Mitt space"      "Mina personer"
```

| Befintligt dokument | Roll efter denna spec |
|--------------------|------------------------|
| `engineering-architecture-barnapp.md` | **Generation 1 implementation** av Core |
| `separation-contract-barnapp.md` | **Execution ⊥ Progress ⊥ Relationship** — fortfarande giltigt |
| `informationsarkitektur-barnapp.md` | CHILD presentation IA |
| `barnmeny-v2.md` / `vuxenmeny-v2.md` | Platform v1 nav-migration |
| `APP-V2-KRAVSPEC.md` | Platform v1 leveranskrav |

---

## 8. Vad v2 / Platform v1 ska förbereda (utan att bygga Gen 2)

| Åtgärd | Kostnad | Varför |
|--------|---------|--------|
| Åldersneutrala nav-etiketter (Idag, Min värld, Mina personer) | Pågår | Översättningsbar till teen/adult |
| `presentation_profile` / `age_band` i view-config | Låg | En källa för framtida UI |
| Capabilities med `domain` + `placement` (ej barnord i ny kod) | Pågår | `nav-config.js`, `child-worlds.js` |
| Events med neutrala namn (`activity_completed`, `progress_delta`) | Låg | `analytics_events` redan neutral |
| **Inte** byta tabell `child` → `member` nu | — | För tidigt; dokumentera mappning |
| **Inte** bygga teen/adult UI nu | — | Presentation Profiles är spec, inte sprint |

---

## 9. API-exempel (samma motor)

**Barn:**

```
POST /api/me/daily-log/items/:id/complete
→ { progress_delta: 1, unit: 'stars', unlocks: [...] }

UI: "Bra jobbat! +1 ⭐" → glass i Skattkammaren
```

**Ung vuxen (samma endpoint, annan profil):**

```
POST /api/me/daily-log/items/:id/complete
→ { progress_delta: 25, unit: 'xp', unlocks: [...] }

UI: "Uppgift klar. +25 XP" → veckomål 80 %
```

Backend returnerar **data** — `PresentationProfile` styr **hur** det renderas.

---

## 10. AI-lager (horisont)

```
Coach Engine (Layer 1)
├── Inputs: tasks, progress, goals, calendar, member context
├── Outputs: suggestion, next_step, activation_package
└── Presentation: tone + length per profile

PARENT  → "Prova kvällsrutinen för Astrid"     (För dig, Gen 1)
CHILD   → "Bra jobbat! Nästa: frukost"           (coach-loop, v2)
TEEN    → "Du har 2 kvar idag. Vill du se dem?"
ADULT   → "Morgonblock klart. Dags för fokuspass."
```

---

## 11. Plugin / capabilities (befintligt → plattform)

Nuvarande `component-feature-map.js` och `CAPABILITIES` är redan rätt modell:

```
Capability → feature gate → placement → visibility
```

Det skalar till nya produkter utan ny nav per paket. Se `paket-v1.2-spec.md`.

---

## 12. Öppna arkitekturbeslut

| # | Fråga | Rekommendation |
|---|-------|----------------|
| A1 | När byta `child` → `member` i API? | Generation 2 — alias i Gen 1 |
| A2 | En app eller flera App Store-listningar? | En motor; ev. separat branding senare |
| A3 | `PresentationProfile` i DB eller härledd? | `birthday` + `account_type` + override i config |
| A4 | Ersätta engine-namn i kod nu? | Nej — konceptuellt i docs; kod vid React-migration |
| A5 | För dig för teen/adult? | Nej — ny coach-yta, samma engine |

---

## 13. Dokumentstruktur (mål)

```
docs/
├── USE_CASES_PLATFORM.md             ← människans resa (UC01–UC12)
├── architecture-platform.md          ← Core Platform (engines, profiles)
├── APP-V2-KRAVSPEC.md              ← Platform v1 leverans
├── engineering-architecture-barnapp.md  ← Gen 1 implementation
├── informationsarkitektur-barnapp.md
├── separation-contract-barnapp.md
├── barnmeny-v2.md
├── vuxenmeny-v2.md
└── VISION-2030.md                  ← kort executive summary (valfritt)
```

---

## 14. Versionshistorik

| Version | Datum | Ändring |
|---------|-------|---------|
| 0.1 | 2026-06-26 | Första utkast. Core Platform + Presentation Profiles. v2 = Platform v1. |
