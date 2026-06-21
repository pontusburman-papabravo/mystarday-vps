# Vuxenmeny v2 — informationsarkitektur & inkrementell migration

> **Syfte:** Teamreferens för design, frontend och test. Styr var föräldrfunktioner *bor* i navigationen — inte bara var routes *finns*.
>
> **Status:** Låst arkitektur · implementation pågår inkrementellt  
> **Relaterat:** [`for-dig-spec.md`](./for-dig-spec.md) · [`paket-v1.2-spec.md`](./paket-v1.2-spec.md) §6 · [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) · [`component-feature-map.js`](../config/component-feature-map.js)
>
> **Senast uppdaterad:** 2026-06-21

---

## 0. Non-goals (låst)

> **V2 bygger inte om produktlogiken. Den flyttar ägarskap och presentation. Befintliga features, routes och dataflöden återanvänds där möjligt.**

Detta innebär konkret:

| Gör | Gör inte |
|-----|----------|
| Nya hub-sidor som länkar till befintliga routes | Flytta eller omskriva `/schedule`, `/library`, `/reports` |
| Ny barnprofil-sida som samlar befintlig UI | Duplicera affärslogik i nya filer |
| Redirects från gamla entry points | Ta bort gamla routes innan analytics visar adoption |
| `nav-config.js` som presentationslager | Ny backend för befintliga flows |

Om någon föreslår "vi flyttar hela schedule-modulen till planning" — det är **utanför scope** för v2.

---

## 1. Produktprincip (en rad som styr allt)

| Fråga | Svar i v2 |
|-------|-----------|
| Vad navigerar föräldern efter? | **Föräldrajobb** (*Parent Intent*) — inte features eller paket |
| Vad gör ett paket? | **Utökar innehåll** i en befintlig domän |
| Vad gör en feature? | **Läggs till** på rätt `placement` — skapar inte menyitem |

**Designregel:** Flikar = förälderns jobb. Paket = kapabiliteter.

Fel: `feature → skapa menyitem`  
Rätt: `feature → lägg till innehåll i rätt domän`

Fel: *"Var ska den nya TEACCH-sidan ligga?"*  
Rätt: *"Vilket parent intent hjälper den?"* → Planering.

Om en ny funktion kräver ny bottenflik har den troligen fel hemvist.

**Terminologi:** *Föräldrajobb* internt · *Parent Intent* i produktteam och vid feature-review.

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

Fyra begrepp styr synlighet och placering:

| Begrepp | Betydelse | Exempel |
|---------|-----------|---------|
| **`feature`** | Paket-/feature-slug som styr **åtkomst** | `reporting`, `pedagog`, `teacch`, `for_dig` |
| **`domain`** | Parent intent — *vilket jobb hjälper funktionen?* (**obligatoriskt**) | `child_progress`, `planning`, `rewards`, `family` |
| **`placement`** | Var i UI innehållet **kan** renderas | `planning_hub`, `child_profile`, `home_card` |
| **`visibility`** | Om innehållet **ska** visas just nu på en placement | Per placement, oberoende av köp |

**Viktigt:** Navigationen *äger inte* funktionen. Samma feature kan ha flera placements.

### Obligatoriska fält i `CAPABILITIES`

Varje capability **måste** ha alla fyra — inga undantag:

```js
{
  id: 'reports',           // required — stabil nyckel
  feature: 'reporting',    // required — access gate (null = basic, alltid tillgänglig)
  domain: 'child_progress', // required — parent intent
  placements: ['child_profile', 'rewards_hub', 'home_card'], // required — minst en
  label: 'Rapporter',
  href: '/reports',
}
```

**Förbjudet** (återinför gamla problemet):

```js
{ label: 'Ny grej', href: '/new-feature' }  // ❌ saknar id, feature, domain, placements
```

Code review / lint: avvisa capabilities utan `domain`.

### Access vs visibility (separata lager)

| Lager | Fråga | Källa |
|-------|-------|-------|
| **Access** | Har familjen rätt att använda funktionen? | `/api/subscription/access` → `components`, `features` |
| **Visibility** | Ska vi visa den på denna placement nu? | `nav-config` + ev. rollout / aktiveringsstatus |

Exempel: TEACCH kan vara **köpt** (`access.teacch: true`) men **inte aktiverat** av föräldern → dölj i `planning_hub` tills aktivering.

```js
function shouldShow(capability, access, visibility) {
  if (!hasFeatureAccess(access, capability.feature)) return false;
  return capability.placements.every((p) => visibility[p] !== false);
}
```

Detta förhindrar att feature-flaggning och UI-beslut blandas i samma boolean.

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

### `/family/child/:slug` — Barnprofil (navets viktigaste objekt)

Största UX-lyftet. Ersätter drawer + `/child-settings`.

> **Regel:** Alla barnrelaterade funktioner ska kunna nås via barnprofilen — även om de också finns i andra domäner (hubbar, Hem, För dig).

Samma funktion, olika entréer:

| Funktion | Barnprofil | Annan entré |
|----------|------------|-------------|
| Rapporter | Framsteg → Rapporter | Hem: "Se utveckling →" |
| Schema | Schema | Planering-hub |
| Kvällsrutin | (via rekommendation) | För dig: "Bygg kvällsrutin för Astrid" |
| PIN | PIN-kod | Hem: readiness-kort |

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

### Filtrering (access + visibility)

```js
function visibleAtPlacement(capability, access, visibility, placement) {
  if (!capability.placements.includes(placement)) return false;
  if (!hasFeatureAccess(access, capability.feature)) return false;
  if (visibility[placement] === false) return false;
  return true;
}

function capabilitiesForPlacement(access, visibility, placement) {
  return CAPABILITIES.filter((c) => visibleAtPlacement(c, access, visibility, placement));
}
```

`access` från befintlig `/api/subscription/access`. `visibility` kan börja som `{}` (allt synligt om access finns) och utökas vid behov (t.ex. TEACCH aktivering).

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
| Drawer | Avvecklas till förmån för barnprofil (behåll fallback tills analytics OK) |

#### Analytics (krav i fas 3)

Stor UX-förändring — mät adoption, inte bara känsla.

**Baseline före (2 veckor eller retrospektivt):**

| Event | Syfte |
|-------|-------|
| `page_view` `/child-settings` | Gammal barninställningsväg |
| `page_view` `/skattkammaren` | Gammal belöningsväg |
| `family_drawer_open` | Drawer-användning |

**Efter lansering:**

| Event | Syfte |
|-------|-------|
| `page_view` `/family/child/:slug` | Barnprofil-adoption |
| `nav_hub_click` `planning` / `rewards` | Hub-användning vs direktlänkar |
| `readiness_action_click` | Hem-kort leder till handling |
| `child_profile_section` `schema` / `framsteg` / `pin` | Vilka sektioner används |

**Beslutskriterium:** drawer och `/child-settings` kan tas bort när barnprofil ≥ 80% av barnrelaterade sessioner i 14 dagar.

Använd befintlig `analytics_events` (`event_type` + `metadata`) — inga nya tabeller krävs för v1-mätning.

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

## 9. Sprint-plan (låst ordning)

Varje sprint ska lämna appen **användbar** — inte halvfärdig nav med gamla sidor under.

### Sprint 1 — Synlig v2
- [ ] `nav-config.js` med obligatoriska capability-fält
- [ ] Alla nav-konsumenter läser samma källa (`native-tab-bar`, `parent-magic-shell`, `mobile-nav`, sidebar)
- [ ] Fem flikar live: Hem · Planering · Belöningar · För dig · Familj
- [ ] `session-gate.js` uppdaterad
- [ ] `public/sw.js` CACHE_NAME-bump

*Leverans:* användaren ser ny mental modell direkt. Gamla routes fungerar fortfarande.

### Sprint 2 — Hubbar
- [ ] `/planning` tunn hub
- [ ] `/rewards` tunn hub
- [ ] Redirect `/skattkammaren` → `/rewards`
- [ ] `nav_hub_click` analytics

*Leverans:* slut på route-navigation som huvudmodell.

### Sprint 3 — Barnprofil (största kvalitetslyftet)
- [ ] `/family/child/:slug`
- [ ] `/family` rensad (barn, vuxna, pedagoger only)
- [ ] Redirect `/child-settings` → barnprofil
- [ ] Analytics baseline + post-launch events (§8 Fas 3)
- [ ] Drawer kvar som fallback tills mätvärden OK

### Sprint 4 — Settings & avatar
- [ ] `/settings` minimal (konto, säkerhet, notiser, app, data)
- [ ] Flytta operativt från `/family`
- [ ] Avatar-meny (inställningar, logout, pedagog-förberedelse)
- [ ] Språk: "PIN-kod" / "Säkerhet" — inte "föräldralås" i föräldratext

### Sprint 5 — Readiness-lager
- [ ] `home-readiness.js` (eller `/api/family/readiness`)
- [ ] Hem-kort: saknas-status, nästa steg
- [ ] För dig kopplat till samma intelligenslager
- [ ] Entréer till barnprofil från Hem och För dig

### Sprint 6+ — Paket-placements
- [ ] `CAPABILITIES` för reporting, pedagog, teacch (dolda tills live)
- [ ] Access + visibility separerat i nav-render
- [ ] Fas 7-städning (Extra/Mer borta, permanenta redirects)

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

## 12. Checklista innan merge (per sprint)

- [ ] Alla nav-konsumenter läser `nav-config.js`
- [ ] Varje `CAPABILITY` har `id`, `feature`, `domain`, `placements`
- [ ] Access och visibility inte sammanslagna i en boolean
- [ ] Inga tomma hub-ytor för basic-användare (gated items dolda, inte disabled)
- [ ] Barnrelaterade flows nåbara via barnprofil
- [ ] `session-gate.js` inkluderar nya parent-only paths
- [ ] Deep links / push (`deep-link-router.js`) uppdaterade vid behov
- [ ] Analytics-events tillagda vid UX-förändring (Sprint 3+)
- [ ] `CACHE_NAME` i `public/sw.js` bumpad
- [ ] Manuell smoke: desktop sidebar, mobil webb, native tab bar, magic view
- [ ] Ingen omskrivning av `/schedule`, `/library`, `/reports` (non-goal §0)

---

## 13. Ägarskap efter migration

| Parent intent | Äger |
|---------------|------|
| Daglig överblick | Hem |
| Planera vardag | Planering |
| Stjärnor & belöningar | Belöningar |
| Coach & rekommendationer | För dig |
| Personer i hushållet | Familj |
| **Ett barns hela värld** | **Barnprofil** (kanonisk väg för allt barnrelaterat) |
| Utveckling över tid | Framsteg (domän under barnprofil) |
| Konto & säkerhet | Inställningar / avatar |

**Slutsats:** Navigationen växer inte när paket kommer — **djupet** i varje värld växer. Barnprofilen är navets viktigaste objekt; hubbar och Hem är entréer, inte ägare.
