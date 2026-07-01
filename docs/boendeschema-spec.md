# FEAT-1 — Boendeschema (Custody Schedule)

| | |
|--|--|
| **Status** | Godkänd domänspec (2026-07) |
| **Prioritet** | P1 |
| **Paket** | Basic (`basic_app`) |
| **Typ** | Produktspec — normativ för FEAT-1 |
| **Relaterat** | [boendeschema-adr.md](./boendeschema-adr.md) · [boendeschema-implementationsplan.md](./boendeschema-implementationsplan.md) |

**Beroenden:**

- ACT-1 A2 (template-first aktivering)
- Familjemodulen
- Veckoschema

---

## Syfte

Appen ska stödja familjer där barn bor i ett eller flera hem enligt ett återkommande boendeschema.

Boendeschemat ska användas för att:

- visa rätt aktiviteter för rätt förälder
- förenkla planering
- styra påminnelser
- ge båda hemmen samma struktur
- fungera oavsett framtida schemaform

Systemet ska vara byggt för att kunna utökas utan databasmigrering när fler boendemönster införs.

> **Viktigt:** “Vecka A / Vecka B” är en *implementation* av mönstret `alternate_weeks` — inte domänen. Domänen är **boendeschema** → **aktivt hem** per datum.

---

## Produktprinciper

1. **Barnet ser sin dag.**
2. **Föräldern ser sitt ansvar.**
3. **Hem är neutrala** — inte mamma/pappa.
4. **Schemat ska kännas naturligt** oavsett familjekonstellation.
5. **Vanliga kärnfamiljer ska inte påverkas.**

---

## Begrepp

| Begrepp | Definition |
|---------|------------|
| **Home** | Ett logiskt hem inom familjen |
| **Custody Schedule** | Återkommande boendeschema per barn |
| **Pattern** | Typ av schema (`alternate_weeks`, `alternate_weekends`, …) |
| **Anchor Date** | Datum då schemat börjar |
| **Active Home** | Hemmet som gäller ett visst datum |
| **Assignment** | Koppling mellan förälder och hem |
| **Grundschema** | Det normala återkommande mönstret (`pattern_type` + `configuration`) |
| **Undantag** | Tillfällig avvikelse från grundschemat (sportlov, domstolsbeslut, …) — **ej v1** |
| **Faktiskt schema** | Resultat efter att undantag applicerats på grundschemat |

### Tre nivåer av regler

```
Grundschema  →  Boendeschema  →  Undantag  →  Aktivt hem
(pattern)        (custody_schedule)   (override)    (per datum)
```

1. **Grundschema** — varannan vecka, varannan helg, 2–2–3, osv.
2. **Undantag** — sportlov, sommarlov, jul, påsk, födelsedagar, domstolsbeslut, tillfälliga byten
3. **Faktiskt schema** — vad som faktiskt gäller ett givet datum

FEAT-1 implementerar **grundschema** (nivå 1). **Undantag** (nivå 2) reserveras i Schedule Engine men implementeras **inte** i v1 — se ADR §4.

---

## Funktionella krav

### BC-1 Hem

En familj kan ha ett eller flera hem.

Varje hem har:

- namn (`label`)
- färg (`color`)
- ikon (`icon`, valfritt)
- sorteringsordning (`sort_order`)

Familjer med endast ett hem eller utan boendeschema ska fungera oförändrat.

---

### BC-2 Föräldrakoppling

En eller flera vuxna kan kopplas till ett hem.

Exempel:

- Hos Anna
- Hos Erik
- Hos bonusförälder
- Gemensamt hem

Systemet får **aldrig** anta kön eller familjerelation.

---

### BC-3 Boendeschema

Varje barn kan ha ett boendeschema.

Schemat består av:

- schematyp (`pattern_type`)
- startdatum (`anchor_date`)
- konfiguration (`configuration`, JSONB)

---

### BC-4 Stödda schematyper (v1)

**Varannan vecka** (`alternate_weeks`)

```
7 dagar → 7 dagar (växlar varannan kalendervecka)
```

**Varannan helg** (`alternate_weekends`)

```
Mån–tors: default_home (fast)
Fre–sön: weekend_home_a / weekend_home_b (växlar varannan helg)
```

**Låst v1-semantik (ingen null-hem):**

| Veckodag | Aktivt hem |
|----------|------------|
| Mån–tors | `default_home` |
| Fre–sön | `weekend_home_a` eller `weekend_home_b` beroende på vilken helg som gäller enligt `anchor_date` |

- Varje kalenderdag ska ha exakt ett aktivt hem — **`activeHome` är aldrig null i v1**.
- `weekend_start` default `friday` (fre–sön räknas som helgblock).

---

### BC-5 Framtida schematyper

Datamodellen ska stödja framtida schematyper **utan databasmigrering** — nya värden i `pattern_type` + utökad `configuration`.

Exempel (v2+):

- `223` (2–2–3)
- `3443` (3–4–4–3)
- `5225` (5–2–2–5)
- `custom`
- manuella undantag (se utanför scope v1)

---

### BC-6 Aktivt hem

Systemet ska kunna avgöra vilket hem som gäller för ett valfritt datum.

Resultatet används internt av:

- Dashboard
- Kalender
- Veckoplanering
- Pushnotiser
- Handoff
- Daglig logg

Externa konsumenter (t.ex. utskrift/PDF) hämtar samma data via Schedule Engine och API — se BC-13.

All beräkning sker i **Schedule Engine** — ingen vy eller tjänst implementerar egen logik.

**v1:** `activeHome` returneras alltid (aldrig `null`) när barn har boendeschema.

### BC-7 Färgmarkering

Planeringsvyn ska kunna markera dagar efter aktivt hem.

Färg får **aldrig** vara enda informationsbärare — komplettera med ikon eller text (WCAG AA).

---

### BC-8 Banner

Dashboard ska visa kontextberoende copy, t.ex.:

- “Denna vecka hos [hem]”
- “Nästa byte på fredag”

beroende på schemat och datum.

---

### BC-9 Mina dagar

Förälder kan växla mellan:

- **Mina dagar**
- **Alla dagar**

Filtret är en **domänfunktion** exponerad via Schedule Engine och API (`isParentDay`).

Föräldravyn använder filtret konsekvent i:

- Dashboard
- Planering

Andra tjänster (t.ex. utskrift/PDF) konsumerar samma filter via API — de ägs inte av FEAT-1.

---

### BC-10 Barnvy

Barn ser:

- dagens aktiviteter
- dagens rutiner

Hem visas **inte** som standard (valfri liten 🏠-ikon i inställning).

---

### BC-11 Handoff

Systemet ska kunna skapa:

- påminnelse inför byte
- packlista
- valfri aktivitet (t.ex. “Packa väska”)

---

### BC-12 Pushnotiser

Primär mottagare ska vara den förälder som ansvarar för barnet den aktuella dagen.

---

### BC-13 Domänexponering (integration)

Boendeschema ska exponera **aktivt hem** och **mina dagar** via Schedule Engine och API.

- `GET /api/family/custody/context` (och framtida range-endpoints) returnerar motorns output
- Konsumenter får **inte** duplicera datumlogik

Andra tjänster — t.ex. **utskrift/PDF** (`print-schema`), export, foto-scan — **får konsumera** detta men **ägs inte av FEAT-1**.

---

## Scope-gräns

### FEAT-1 ansvarar för

- hem (`custody_home`)
- boendeschema (`custody_schedule`)
- aktivt hem per datum (Schedule Engine)
- mina dagar-filter som domänfunktion
- notis- och handoff-underlag (vilken förälder, när byte)

### FEAT-1 ansvarar inte för

- PDF-generering
- print-layout
- exportformat
- foto-scan / OCR (→ FEAT-6)

---

```
Family
│
├── Homes (custody_home)
│
├── ParentHomeAssignments (custody_parent_home)
│
└── Child
     │
     └── CustodySchedule (custody_schedule)
              │
              └── Pattern (pattern_type + configuration)
                     │
                     ▼
              Schedule Engine
                     │
                     ▼
             Active Home
```

### `custody_home`

| Fält | Typ |
|------|-----|
| `id` | uuid |
| `family_id` | uuid |
| `label` | text |
| `color` | text |
| `icon` | text (nullable) |
| `sort_order` | int |

### `custody_parent_home`

| Fält | Typ |
|------|-----|
| `parent_id` | uuid |
| `custody_home_id` | uuid |

### `custody_schedule`

Ersätter/utökar dagens `custody_pattern` (se ADR).

| Fält | Typ |
|------|-----|
| `child_id` | uuid (PK) |
| `pattern_type` | enum/text |
| `anchor_date` | date |
| `configuration` | jsonb |

**Legacy-kolumner** (`week_a_home_id`, `week_b_home_id`, `interval_weeks`) behålls temporärt under migration — läses inte av ny kod efter Phase 3.

### Pattern types

| `pattern_type` | Status |
|----------------|--------|
| `alternate_weeks` | v1 |
| `alternate_weekends` | v1 |
| `223` | v2 |
| `3443` | v2 |
| `5225` | v2 |
| `custom` | v2 |

### Konfigurationsexempel

**Varannan vecka:**

```json
{
  "home_a": "uuid",
  "home_b": "uuid"
}
```

**Varannan helg:**

```json
{
  "default_home": "uuid",
  "weekend_home_a": "uuid",
  "weekend_home_b": "uuid",
  "weekend_start": "friday"
}
```

- `default_home` — mån–tors varje vecka
- `weekend_home_a` / `weekend_home_b` — fre–sön, varannan helg

### Veckoschema (`weekly_schedule`)

| Fält | Syfte |
|------|--------|
| `custody_home_id` | **Målmodell** — aktiviteter per hem |
| `week_variant` | **Legacy** — `'a' \| 'b' \| null`; behålls som cache under övergång |

På sikt ersätts `week_variant` av `custody_home_id` som primär koppling (ADR).

---

## Schedule Engine

**Modul:** `src/lib/custody-schedule-engine.js`

### Prioritetsordning (låst i ADR)

```
resolve(date):
  1. Override (undantag)     ← v1: tom lista, hook reserverad
  2. Pattern (grundschema)   ← v1: alternate_weeks | alternate_weekends
  3. Fallback                ← legacy veckoschema utan boendeschema
```

Motorn ska **alltid** gå via denna kedja — även när undantagslagret är tomt i v1 — så att framtida `custody_override` kan läggas till utan omskrivning.

### Input

- datum (`YYYY-MM-DD`)
- barn (`childId`)
- schema (laddat från DB + hem + assignments)
- overrides (valfritt, **v1: alltid `[]`**)

### Output — CustodyContext (enda kontrakt)

```js
{
  date: '2026-06-04',
  activeHome: { id, label, color, icon },
  source: 'pattern',              // 'override' | 'pattern' | 'fallback'
  patternType: 'alternate_weeks',
  activePeriod: { start, end },
  nextTransition: '2026-06-08',
  previousTransition: null,
  isParentDay: boolean
}
```

### Intern struktur

```
ResolverPipeline → OverrideResolver → PatternResolver → FallbackResolver
                              patterns/alternate-weeks.js
                              patterns/alternate-weekends.js
```

Alla konsumenter får **CustodyContext** — ingen ska veta hur resultatet räknades fram.

### Framtida undantag (ej FEAT-1)

Reserverad datamodell — implementeras i separat feature:

| Fält | Typ |
|------|-----|
| `id` | uuid |
| `child_id` | uuid |
| `start_date` | date |
| `end_date` | date |
| `home_id` | uuid |
| `reason` | text |
| `priority` | int |

---

## Behörigheter

| Roll | Läs | Ändra |
|------|-----|-------|
| Primary Parent | Ja | Ja |
| Shared Parent | Ja | Ja |
| Pedagog | Begränsat (kontext) | Nej |
| Barn | Begränsat | Nej |

---

## Accessibility

- WCAG AA
- Färg kompletteras med ikon eller text
- Tangentbordsnavigering
- Skärmläsarstöd för banner, filter och dagsmarkering

---

## Analytics

| Event | När |
|-------|-----|
| `custody_schedule_created` | Första sparning av boendeschema |
| `custody_schedule_updated` | Ändring av mönster eller hem |
| `custody_home_selected` | Hem valt i setup |
| `custody_filter_changed` | Mina dagar / alla dagar |
| `custody_banner_seen` | Banner visad |
| `custody_handoff_sent` | Handoff-påminnelse skickad |

---

## Edge cases

| Case | Förväntat beteende |
|------|-------------------|
| Skottår | Ingen avvikelse — datumbaserad beräkning |
| Sommartid | Använd familjens `timezone`; datum som kalenderdagar |
| Tidszon | `Europe/Stockholm` default; respektera `family.timezone` |
| Ankardatum i framtiden | Motorn returnerar aktivt hem enligt ankare — UI varnar |
| Barn utan schema | Legacy veckoschema; ingen custody-kontext |
| Borttaget hem | RESTRICT eller validering vid delete; blockera om aktivt i schema |
| Två vuxna kopplade till samma hem | Tillåtet — båda får “mina dagar” |
| Flera barn med olika scheman | Varje barn har eget `custody_schedule` |
| Familjer med endast ett hem | Ingen custody-setup krävs; oförändrat flöde |

---

## Icke-funktionella krav

- Beräkning av aktivt hem **&lt; 5 ms** (CPU, in-memory)
- **Ingen extra databasfråga per kalenderdag** — ladda schema + hem en gång per request/batch
- Full bakåtkompatibilitet med befintliga veckoscheman (`week_variant IS NULL`)
- Ingen påverkan på familjer utan boendeschema

---

## Utanför scope (v1)

- **Undantag / overrides** — arkitektur reserverad (ADR), implementation i separat feature
- Semesteröverlapp som egen produktlogik
- Fler än två aktiva hem per barn i samma mönster (undantag kan peka på vilket hem som helst i framtiden)
- iCal-export
- PDF-generering, print-layout och exportformat (separat tjänst/feature)
- Foto-scan / OCR (→ FEAT-6)
- Automatisk synkning med externa kalendrar
- Rapporter per hem

---

## Definition of Done

FEAT-1 är klar när:

- [ ] Samtliga funktionella krav BC-1 … BC-13 är implementerade
- [ ] Boendeschemat fungerar för både `alternate_weeks` och `alternate_weekends`
- [ ] Samma Schedule Engine används av samtliga vyer och tjänster
- [ ] API exponerar aktivt hem och `isParentDay` för externa konsumenter
- [ ] Alla API-kontrakt är dokumenterade
- [ ] Enhetstester täcker schemaberäkningar, inklusive gränsfall
- [ ] Integrationstester verifierar API och datamodell
- [ ] UI-tester verifierar banner, färgmarkeringar och filter
- [ ] Accessibility uppfyller WCAG AA
- [ ] Analytics skickar definierade händelser
- [ ] Befintliga familjer utan boendeschema fungerar oförändrat

---

## Dokumenthistorik

| Datum | Version | Ändring |
|-------|---------|---------|
| 2026-07-01 | 1.0 | Domänspec — ersätter A/B-centrerad §6.5.1 i aktivering-exekveringsplan |
| 2026-07-01 | 1.1 | BC-13 utskrift borttagen; domänexponering + scope-gräns; PDF/print utanför FEAT-1 |
| 2026-07-01 | 1.2 | Låst `alternate_weekends`: default_home mån–tors, weekend_home fre–sön; inget null-hem v1 |
| 2026-07-01 | 1.3 | Schedule Engine: grundschema → undantag → aktivt hem; overrides reserverade ej v1 |
| 2026-07-01 | 1.4 | CustodyContext som enda kontrakt; ResolverPipeline; nextTransition |
