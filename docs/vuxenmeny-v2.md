# Vuxenmeny v2 — informationsarkitektur & inkrementell migration

> **Syfte:** Teamreferens för design, frontend och test. Styr var föräldrfunktioner *bor* i navigationen — inte bara var routes *finns*.
>
> **Status:** Låst arkitektur · implementation pågår inkrementellt  
> **Relaterat:** [`for-dig-spec.md`](./for-dig-spec.md) · [`paket-v1.2-spec.md`](./paket-v1.2-spec.md) §6 · [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) · [`component-feature-map.js`](../config/component-feature-map.js)
>
> **Senast uppdaterad:** 2026-06-21

---

## 1. Produktprincip (en rad som styr allt)

| Fråga | Svar i v2 |
|-------|-----------|
| Vad navigerar föräldern efter? | **Föräldrajobb** — inte features eller paket |
| Vad gör ett paket? | **Utökar innehåll** i en befintlig domän |
| Vad gör en feature? | **Läggs till** på rätt `placement` — skapar inte menyitem |

**Designregel:** Flikar = förälderns jobb. Paket = kapabiliteter.

Fel: `feature → skapa menyitem`  
Rätt: `feature → lägg till innehåll i rätt domän`

Om en ny funktion kräver ny bottenflik har den troligen fel hemvist.

---

## 2. Primärnav (basic, idag)

Fem flikar. Ingen **Mer**. Ingen **Extra**. Inställningar i avatar — inte i bottennav.

| # | Flik | Route (hub) | Förälderns jobb |
|---|------|-------------|-----------------|
| 1 | 🏠 **Hem** | `/dashboard` | *Här är läget* — status, nästa steg, daglig överblick |
| 2 | 📅 **Planering** | `/planning` | *Jag vill planera* — schema, kalender, aktiviteter, bibliotek |
| 3 | ⭐ **Belöningar** | `/rewards` | *Stjärnor och belöningar* — kista, museum, historik |
| 4 | ✨ **För dig** | `/for-dig` | *Här är vad jag rekommenderar* — mål, tips, nästa bästa steg |
| 5 | 👨‍👩‍👧 **Familj** | `/family` | *Vilka är med?* — barn, vuxna, pedagoger |

### Hem vs För dig (produktprincip, inte bara routes)

| | Hem | För dig |
|--|-----|---------|
| Roll | *Här är läget* | *Här är vad jag rekommenderar* |
| Ton | Status, varningar, överblick | Guidning, mål, handlingar |
| Exempel | Astrid ⭐⭐⭐☆☆ · PIN saknas | Testa kvällsrutin → [Skapa schema] |
| Data | Samma readiness-/intelligenslager | Samma lager, mer coachande presentation |

`/for-dig` ska **inte** degenerera till en glömd tips-sida. Den är appens **coach-lager** och ingår i basic (`for_dig` → `basic_app` i `component-feature-map.js`).

### Desktop-sidebar

Samma fem som primärnav. Inställningar under avdelare — konkurrerar inte med kärnflöden.

```
Hem
Planering
Belöningar
För dig
Familj
────────
Inställningar
```

Framtida paketinnehåll syns i **hubbar** och **barnprofil** — inte som nya toppnivålänkar (se §5).

---

## 3. Domänmodell

Tre begrepp styr all synlighet och placering:

| Begrepp | Betydelse | Exempel |
|---------|-----------|---------|
| **`feature`** | Paket-/feature-slug som styr åtkomst | `reporting`, `pedagog`, `teacch`, `for_dig` |
| **`domain`** | Föräldramental modell — *vilket jobb hjälper funktionen?* | `child_progress`, `planning`, `rewards`, `family` |
| **`placement`** | Var i UI innehållet renderas | `primary`, `planning_hub`, `child_profile`, `home_card` |

**Viktigt:** Navigationen *äger inte* funktionen. Samma feature kan ha flera placements.

```js
{
  id: 'reports',
  label: 'Rapporter',
  feature: 'reporting',
  domain: 'child_progress',
  placements: ['child_profile', 'rewards_hub', 'home_card'],
  href: '/reports',
}
```

### Domäner (låsta)

| Domän | Beskrivning |
|-------|-------------|
| `home` | Daglig överblick, readiness, snabbstatus |
| `for_you` | Coach, rekommendationer, mål, personliga tips |
| `planning` | Schema, kalender, aktiviteter, bibliotek |
| `rewards` | Stjärnor, belöningar, kista, museum |
| `child_progress` | **Framsteg** — stjärnor över tid, historik, rapporter, mål |
| `family` | Barn, vuxna, pedagoger, inbjudan |
| `child_profile` | En barns hela värld (per barn) |
| `settings` | Konto, säkerhet, notiser, app, data |
| `pedagog_view` | Separat UI-universum (ej föräldraflik) |

### Framsteg som gemensam domän

Rapporter är **inte** en belöningssak — det är uppföljning/utveckling.

```
/family/child/astrid
└── Framsteg
    ├── Stjärnor
    ├── Historik
    ├── Rapporter      ← feature: reporting
    └── Mål
```

Belöningar kan **länka** dit utan att äga innehållet:

```
⭐ Belöningar
500 stjärnor totalt
Se Astrids utveckling →
```

---

## 4. Hubbar & undersidor

### `/planning` — Planeringshub

| Ingång | Befintlig route | Feature (basic) |
|--------|-----------------|-----------------|
| Schema | `/schedule` | `basic_app` |
| Kalender | `/calendar` | `basic_app` |
| Aktiviteter | `/activities` eller `/library` (aktiviteter) | `basic_app` |
| Bibliotek | `/library` | `basic_app` |
| Kopiera schema | `/assign-schedule` | `basic_app` |
| Stöd & verktyg | `/barn-stod` | `teacch` (framtida) |

### `/rewards` — Belöningshub

| Ingång | Befintlig route | Feature |
|--------|-----------------|---------|
| Stjärnor | `/rewards#stars` eller inbäddat | `basic_app` |
| Belöningar | `/skattkammaren` (föräldervy) | `basic_app` |
| Familjekista | `/rewards#chest` | `basic_app` |
| Familjemuseum | `/rewards#museum` | `basic_app` |
| Statistik / utveckling | länk → barnprofil → Framsteg | `basic_app` / `reporting` |

**Redirect:** `/skattkammaren` → `/rewards` (inloggad förälder).

### `/family` — Familjehub (ren)

```
Familj

Barn
──────
🌟 Astrid
👶 Olle

Vuxna
──────
Pontus
Anna

Pedagoger          ← feature: pedagog (dold tills live)
──────
Lisa
```

**Flytta bort från `/family`:** push, PWA-installation, föräldralås, GDPR, dataexport, radera konto → `/settings` eller avatar.

### `/family/child/:slug` — Barnprofil

Största UX-lyftet. Ersätter drawer + `/child-settings`.

```
🌟 Astrid · 7 år

Idag
⭐⭐⭐☆☆

Översikt
Schema
Belöningar
Framsteg
Barnvy
PIN-kod
```

**Redirect:** `/child-settings?id=…` → `/family/child/:slug`

Slug: barnets namn (normaliserat), med fallback till `id` vid kollision.

### `/settings` — Minimal

```
⚙️ Inställningar

👤 Konto
🔒 Säkerhet        (PIN-kod — inte "föräldralås" i föräldratext)
🔔 Notiser
📱 App             (push, PWA)
📦 Data & integritet
```

### Avatar-meny (sekundärnav)

```
[Pontus ▾]
──────────────
Byt till pedagogvy    ← feature: pedagog + dual/educator
Inställningar
Logga ut
```

Pedagogvy = byte av **hela UI** (`pedagog-nav.js`), inte sjätte föräldraflik.

---

## 5. Paket → placering (framtida, ingen navändring)

| Paket | Feature-slug | Domän | Placements | Synligt som |
|-------|--------------|-------|------------|-------------|
| **Basic** | `for_dig`, m.fl. | diverse | `primary`, hubbar | Fem flikar idag |
| **Reporting** | `reporting` | `child_progress` | `child_profile`, `rewards_hub`, `home_card` | Framsteg → Rapporter |
| **Pedagog** | `pedagog` | `family` | `family` (Pedagoger), `avatar` (vyväxling) | Sektion + pedagog-UI |
| **TEACCH** | `teacch` | `planning` | `planning_hub` | Stöd & verktyg |

**Regel vid lansering:** lägg till rader i `nav-config.js` — refaktorera inte bottennav.

### Pedagogläge (separat universum)

När `pedagog` är live för dual-roll:

- **Inte** ny föräldraflik
- Familj → Pedagoger-sektion
- Avatar → Byt till pedagogvy
- Befintligt pedagog-nav: Översikt · Idag · Historik · Inställningar

---

## 6. Teknisk källa: `nav-config.js`

**Mål:** en källa för all föräldranavigation.

### Konsumenter (ska läsa samma config)

| Fil | Idag | v2 |
|-----|------|-----|
| `public/js/native-tab-bar.js` | `LEGACY_TABS` / `ROLLOUT_TABS` | `nav-config` → `primary` |
| `public/js/parent-magic-shell.js` | `LEGACY_NAV` / `ROLLOUT_NAV` | `nav-config` → `primary` |
| `public/js/mobile-nav.js` | Parsar sidebar DOM | Sidebar genererad från config |
| Sidebar i `*.html` | Duplicerad per sida | Config eller delad partial |
| Hub-sidor | — | `planning_hub`, `rewards_hub` placements |
| `public/js/session-gate.js` | `PARENT_ONLY_PATHS` | Lägg till `/planning`, `/rewards`, `/family/child/*` |

### Config-struktur (koncept)

```js
// public/js/nav-config.js

export const PRIMARY_NAV = [
  { id: 'home',     href: '/dashboard', label: 'Hem',        icon: '🏠' },
  { id: 'planning', href: '/planning',  label: 'Planering',  icon: '📅' },
  { id: 'rewards',  href: '/rewards',   label: 'Belöningar', icon: '⭐' },
  { id: 'for_you',  href: '/for-dig',   label: 'För dig',    icon: '✨', feature: 'for_dig' },
  { id: 'family',   href: '/family',    label: 'Familj',     icon: '👨‍👩‍👧' },
];

export const CAPABILITIES = [
  {
    id: 'reports',
    label: 'Rapporter',
    feature: 'reporting',
    domain: 'child_progress',
    href: '/reports',
    placements: ['child_profile', 'rewards_hub', 'home_card'],
  },
  {
    id: 'pedagog_invite',
    label: 'Pedagoger',
    feature: 'pedagog',
    domain: 'family',
    placements: ['family_section'],
  },
  {
    id: 'teacch_tools',
    label: 'Stöd & verktyg',
    feature: 'teacch',
    domain: 'planning',
    href: '/barn-stod',
    placements: ['planning_hub'],
  },
  // …
];

export const AVATAR_ACTIONS = [
  { id: 'switch_pedagog', label: 'Byt till pedagogvy', feature: 'pedagog', role: 'dual_or_educator' },
  { id: 'settings',       href: '/settings', label: 'Inställningar' },
  { id: 'logout',         action: 'logout', label: 'Logga ut' },
];
```

### Filtrering

```js
function visiblePlacements(access, placement) {
  return CAPABILITIES.filter(
    (c) => c.placements.includes(placement) && hasFeature(access, c.feature)
  );
}
```

`access` från befintlig `/api/subscription/access` — ingen ny backend krävs för fas 0–5.

### Filer att **inte** omskriva

| Fil | Strategi |
|-----|----------|
| `public/js/dashboard.js` | Behåll; lägg readiness i ny `home-readiness.js` |
| `public/js/family.js` | Behåll; barnprofil i ny `child-profile.js` |
| `public/js/schedule.js` | Orörd; hub länkar in |
| `src/routes/*` | Orörd; nya sidor är tunna HTML + hub-JS |

---

## 7. Readiness / Home cards (fas 5)

Delat intelligenslager för Hem, För dig och barnprofil.

### Exempel-kort på Hem

```
⚠️ Astrid saknar PIN
[Sätt PIN]                    → /family/child/astrid#pin

⭐ 2 dagar kvar till belöning
[Visa]                        → /rewards

✨ Rekommenderat: Kvällsrutin
[Skapa]                       → /for-dig eller /planning
```

### Data (klient eller ny endpoint)

```js
// Per barn — pseudostruktur
{
  child_id,
  slug,
  stars_today: 3,
  stars_possible: 5,
  pin_set: false,
  schema_ok: true,
  rewards_ok: true,
  next_action: { label: 'Sätt PIN', href: '/family/child/astrid#pin' },
  for_you_tip: { label: 'Kvällsrutin', href: '/for-dig?intent=evening' },
}
```

Aggregering kan ske i `GET /api/family/readiness` (ny) eller via befintliga endpoints på dashboard-init.

---

## 8. Inkrementell migration

**Princip:** Ny mental modell snabbt. Gamla routes lever tills de fasas ut (redirects).

### Fas 0 — Lås arkitekturen (1–2 dagar)

| Leverans | Detalj |
|----------|--------|
| `public/js/nav-config.js` | `PRIMARY_NAV`, `CAPABILITIES`, `AVATAR_ACTIONS`, hub-definitioner |
| Koppla konsumenter | `native-tab-bar`, `parent-magic-shell`, `mobile-nav` läser config |
| **Inte** bygga om UI ännu | Bara en källa — beteende kan vara oförändrat tills fas 1 |

### Fas 1 — Nytt nav (snabb vinst)

| Från | Till |
|------|------|
| Hem · Schema · För dig · Skatt · Extra · Mer | Hem · Planering · Belöningar · För dig · Familj |

Gamla routes fungerar: `/schedule`, `/library`, `/skattkammaren`, `/family`.

### Fas 2 — Hubbar

| Route | Innehåll | Strategi |
|-------|----------|----------|
| `/planning` | Tunn hub-sida | Länkar till befintliga sidor |
| `/rewards` | Tunn hub-sida | Redirect `/skattkammaren` → `/rewards` |

Ingen affärslogik flyttas.

### Fas 3 — Familj + barnprofil (största UX-lyftet)

| Leverans | Detalj |
|----------|--------|
| `/family/child/:slug` | Ny barnprofil-sida |
| Rensa `/family` | Endast barn, vuxna, pedagoger |
| Redirect | `/child-settings` → barnprofil |
| Drawer | Avvecklas till förmån för barnprofil |

### Fas 4 — Settings-sanering

| Flytta från `/family` | Till |
|-----------------------|------|
| PIN, notiser, GDPR, data, radering | `/settings` |
| Pedagog-växling | Avatar-meny |

### Fas 5 — Hem som coach

| Leverans | Detalj |
|----------|--------|
| `home-readiness.js` | Kort på Hem |
| Delad data | Hem + För dig + barnprofil |

### Fas 6 — Paket-placements

Lägg till `CAPABILITIES`-rader när paket går live. Ingen nav-refaktor.

### Fas 7 — Städa gammalt

| Route / mönster | Åtgärd |
|-----------------|--------|
| Extra / Mer-flikar | Ta bort från nav-config |
| `/child-settings` | Permanent redirect |
| `/skattkammaren` (förälder) | Permanent redirect till `/rewards` |
| Preview-shells i huvudnav | Behåll endast som intresse-banner om `rollout_mode !== off` |

---

## 9. Sprint-plan (rekommenderad)

### Sprint 1
- [ ] `nav-config.js`
- [ ] Nytt primärnav (sidebar + bottennav + magic shell)
- [ ] `/planning` hub
- [ ] `/rewards` hub + redirect från `/skattkammaren`
- [ ] `session-gate.js` uppdaterad
- [ ] `public/sw.js` CACHE_NAME-bump

### Sprint 2
- [ ] `/family` rensad (personer only)
- [ ] `/family/child/:slug` barnprofil
- [ ] Redirect `/child-settings`
- [ ] Avveckla drawer (eller behåll som fallback tills analytics OK)

### Sprint 3
- [ ] `/settings` minimal
- [ ] Avatar-meny
- [ ] Readiness-kort på Hem
- [ ] För dig kopplat till samma intelligenslager

### Sprint 4
- [ ] `CAPABILITIES` + feature placements
- [ ] Paketstöd (reporting, pedagog, teacch) — dolda tills live
- [ ] Fas 7-städning

---

## 10. Redirects (sammanfattning)

| Gammal | Ny |
|--------|-----|
| `/skattkammaren` (inloggad förälder) | `/rewards` |
| `/child-settings?id=:id` | `/family/child/:slug` |
| `/home` (om skapad) | `/dashboard` |

Befintliga sidor (`/schedule`, `/library`, `/calendar`, `/assign-schedule`, `/for-dig`, `/reports`) behålls som **mål** för hub-länkar.

---

## 11. Relation till befintliga specs

| Dokument | Relation |
|----------|----------|
| `paket-v1.2-spec.md` §6 | v2 **ersätter** fem-fliks-förslaget Idag/Rutiner/Utveckling/Samarbete med domänmodell + placements; pedagog-nav oförändrat |
| `for-dig-spec.md` | För dig förblir `/for-dig` men rollen utökas till coach-lager (§2) |
| `informationsarkitektur-barnapp.md` | Parallell doc för barnsidan; vuxenmeny v2 är föräldrarnas spegel |

---

## 12. Checklista innan merge (per fas)

- [ ] Alla nav-konsumenter läser `nav-config.js`
- [ ] Inga tomma hub-ytor för basic-användare (gated items dolda, inte disabled)
- [ ] `session-gate.js` inkluderar nya parent-only paths
- [ ] Deep links / push (`deep-link-router.js`) uppdaterade vid behov
- [ ] `CACHE_NAME` i `public/sw.js` bumpad
- [ ] Manuell smoke: desktop sidebar, mobil webb, native tab bar, magic view

---

## 13. Ägarskap efter migration

| Föräldrajobb | Äger |
|--------------|------|
| Daglig överblick | Hem |
| Planera vardag | Planering |
| Stjärnor & belöningar | Belöningar |
| Coach & rekommendationer | För dig |
| Personer i hushållet | Familj |
| Ett barns hela värld | Barnprofil |
| Utveckling över tid | Framsteg (domän) |
| Konto & säkerhet | Inställningar / avatar |

**Slutsats:** Navigationen växer inte när paket kommer — **djupet** i varje värld växer.
