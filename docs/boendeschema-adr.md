# Boendeschema — ADR: från A/B-variant till hemcentrerad domän

| | |
|--|--|
| **Status** | Accepted |
| **Gäller från** | 2026-07-01 |
| **Ersätter** | FEAT-1 §6.5.1 i `aktivering-exekveringsplan.md` (A/B-variant-spec) |
| **Typ** | Architecture Decision Record — normativt styrdokument |
| **Spec** | [boendeschema-spec.md](./boendeschema-spec.md) |
| **Implementationsplan** | [boendeschema-implementationsplan.md](./boendeschema-implementationsplan.md) |

---

## Kontext

FEAT-1 levererades initialt med en **implementationscentrerad** modell:

- `custody_pattern` med `week_a_home_id` / `week_b_home_id`
- `weekly_schedule.week_variant` (`'a' | 'b'`)
- `custody-resolver.js` som hårdkodar varannan vecka

Det fungerar för `alternate_weeks` men **låser domänen** till en algoritm. Nya mönster (varannan helg, 2–2–3) kräver då schemaändringar och spridd logik.

Produktkravet är ett **boendeschema** — vem har barnet när — inte “vecka A/B”.

---

## Beslut

Dessa beslut gäller. De ska inte omförhandlas i varje PR.

### 1. Domän före algoritm

- **Boendeschema** är domänentiteten.
- **Pattern type** + **configuration** beskriver schemat.
- **Active Home** är output per datum — inte “vecka A/B”.

### 2. `custody_pattern` → `custody_schedule`

- Tabellen `custody_pattern` utökas (eller byter namn) till **`custody_schedule`**.
- Nya kolumner: `pattern_type`, `configuration` (JSONB).
- Legacy-kolumner (`week_a_home_id`, `week_b_home_id`, `interval_weeks`) **behålls temporärt** för backfill och rollback — läses inte av ny kod efter Phase 3.

### 3. `weekly_schedule.week_variant` → `custody_home_id`

- **Målmodell:** aktiviteter kopplas till **hem** (`custody_home_id`), inte variant.
- `week_variant` behålls som **legacy/cache** under övergången.
- Ny kod skriver `custody_home_id`; läser med fallback: `custody_home_id` → `week_variant` + pattern mapping → legacy null.

### 4. En gemensam Schedule Engine (lagerad resolve)

- All beräkning av aktivt hem sker i **`src/lib/custody-schedule-engine.js`**.
- **`custody-resolver.js` avvecklas** efter migrering av konsumenter.
- Ingen route, scheduler eller UI-fil får duplicera datumlogik.
- Motorn ska implementera **lagerad resolve** redan i v1 — även om undantagslagret är tomt.

**Prioritetsordning (låst):**

| Prioritet | Lager | v1 |
|-----------|-------|-----|
| 1 | **Override** (undantag) | Hook reserverad — returnerar inget |
| 2 | **Pattern** (grundschema) | `alternate_weeks`, `alternate_weekends` |
| 3 | **Fallback** | Legacy veckoschema utan `custody_schedule` |

```js
function resolveCustodyDateSync(ctx, date) {
  const override = findOverrideForDate(ctx.overrides, date); // v1: alltid null
  if (override) return buildResultFromOverride(override);

  if (ctx.schedule) return resolvePattern(ctx.schedule, date);

  return null; // fallback hanteras av anroparen
}
```

**Varför nu:** Delad vårdnad har nästan alltid grundregel *plus* sportlov, jul, sommar och tillfälliga byten. Att baka in specialfall i `pattern_type` leder till oändliga varianter. Grundregler + överstyrningar är renare domändesign.

**Engine-principer (låsta inför PR-C):**

| # | Princip | Detalj |
|---|---------|--------|
| E1 | **CustodyContext** är enda publika kontraktet | Alla konsumenter får samma objekt — ingen ska veta hur det räknades |
| E2 | **ResolverPipeline** — inte if-kedjor | `OverrideResolver` → `PatternResolver` → `FallbackResolver` |
| E3 | **Mönster isolerade** | `patterns/alternate-weeks.js`, `alternate-weekends.js` — ingen `switch` i motorn |
| E4 | **Overrides generella** | `reason` är metadata; motorn har ingen logik per orsak (jul, sportlov, …) |

**CustodyContext (publikt kontrakt):**

```ts
interface CustodyContext {
  date: string;
  activeHome: Home | null;
  source: 'override' | 'pattern' | 'fallback';
  patternType: string | null;
  activePeriod: { start: string; end: string } | null;
  nextTransition?: string | null;
  previousTransition?: string | null;
  isParentDay: boolean;
}
```

Modul: `src/lib/custody-schedule-engine/`

### 5. v1 pattern types

Endast dessa implementeras i första engine-versionen:

- `alternate_weeks`
- `alternate_weekends`

Övriga (`223`, `3443`, `5225`, `custom`) är **datamodell-redo** men inte i v1-scope.

### 6. UI-språk

- Användare ser **hemnamn** (“Hos Anna”), inte “Vecka A/B”.
- Färg + ikon/text som tillgänglighetsbärare.

### 7. Kärnfamiljer opåverkade

- Familjer utan `custody_schedule` använder legacy `weekly_schedule` (`week_variant IS NULL`).
- Ingen forced setup.

### 8. Utskrift/PDF utanför FEAT-1

- FEAT-1 exponerar `activeHome` och `isParentDay` via Schedule Engine och API.
- PDF-generering, print-layout och exportformat ägs av separat tjänst (t.ex. `print-schema`).
- Foto-scan/OCR förblir FEAT-6.

### 9. Undantag reserverade — ej FEAT-1

- **`custody_override`** är reserverad framtida tabell — **ingen migration i FEAT-1**.
- Schedule Engine ska ha `findOverrideForDate()` som **no-op** i v1 (`overrides: []`).
- Nästa feature lägger till tabell + UI utan att ändra resolve-kedjan.

**Reserverad modell:**

```sql
-- Framtida — ej FEAT-1
CREATE TABLE custody_override (
  id UUID PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES child(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  home_id UUID NOT NULL REFERENCES custody_home(id),
  reason TEXT,
  priority SMALLINT NOT NULL DEFAULT 0
);
```

Exempel på undantag: sportlov, sommarlov, jul, påsk, födelsedagar, domstolsbeslut, tillfälliga byten.

---

## Arkitektur

```
Grundschema (custody_schedule.pattern_type)
        │
        ▼
Boendeschema + hem (custody_home, assignments)
        │
        ▼
Undantag (custody_override)          ← v1: tom, hook reserverad
        │
        ▼
Aktivt hem per datum                 ← custody-schedule-engine.js
```

**Datamodell v1:**

```
custody_home ─────────────┐
custody_parent_home ──────┤
custody_schedule ─────────┼──► resolveCustodyDate()
  pattern_type            │      1. override?  (v1: skip)
  configuration           │      2. pattern.resolve(date)
  anchor_date             │      3. fallback
                          │
weekly_schedule ──────────┘    (custody_home_id primärt;
  custody_home_id                 week_variant fallback)
```

**Framtida utökning (ingen motor-omskrivning):**

```
custody_override ─────────► findOverrideForDate() → return override.home
```

**Fel (legacy):**

```js
const variant = getWeekVariantForDate(pattern, date);
const homeId = variant === 'a' ? pattern.week_a_home_id : pattern.week_b_home_id;
```

**Rätt:**

```js
const result = await resolveCustodyDate({ childId, date, familyId, parentId });
// result.activeHome, result.nextHandoff, result.isParentDay
```

---

## Konsekvenser

### Positivt

- Nya mönster via `configuration` — ingen migration
- En testbar motor med tydliga edge cases
- UI och copy följer domänen (hem, inte variant)
- `alternate_weekends` möjlig utan `week_variant`-hack
- Undantag (sportlov, jul, …) kan läggas till utan motor-omskrivning

### Kostnad

- Migration + backfill av befintlig prod-data
- Konsumenter måste migreras en i taget
- Dubbel läsning under övergång (`week_variant` + `custody_home_id`)

### Risker och mitigering

| Risk | Mitigering |
|------|------------|
| Prod-data med A/B-scheman | Backfill `configuration` från legacy-kolumner |
| Schedule-resolve bryts | Feature flag; integrationstester per konsument |
| Performance | In-memory engine; batch-ladda pattern + hem per request |
| alternate_weekends + aktiviteter | Aktiviteter per `custody_home_id`; motor väljer hem per dag |

---

## Låsta produktbeslut (öppna frågor stängda)

| Fråga | Beslut |
|-------|--------|
| Aktiviteter per hem eller per variant? | **Per hem** (`custody_home_id`) |
| Ett hem per familj? | Tillåtet — boendeschema är valfritt |
| UI: A/B eller hemnamn? | **Hemnamn** överallt i föräldravyn |
| `alternate_weekends` vardagar | **`default_home`** gäller mån–tors |
| `alternate_weekends` helger | **`weekend_home_a` / `weekend_home_b`** fre–sön varannan helg |
| Null-hem i v1? | **Nej** — varje dag har aktivt hem när boendeschema finns |
| Undantag i FEAT-1? | **Nej** — arkitektur reserverad, `overrides: []` i v1 |
| Resolve-prioritet | **Override → Pattern → Fallback** |

---

## Avveckling

| Artifact | När |
|----------|-----|
| `custody-resolver.js` | Efter Phase 4 (alla konsumenter migrerade) |
| `week_variant` i ny kod | Efter Phase 5 |
| Legacy-kolumner i `custody_pattern` | Efter Phase 5 + en deploy-cykel stabil |

---

## Dokumenthistorik

| Datum | Version | Ändring |
|-------|---------|---------|
| 2026-07-01 | 1.0 | Accepted — domänomskrivning FEAT-1 |
| 2026-07-01 | 1.1 | Utskrift/PDF utanför FEAT-1; domänexponering via API |
| 2026-07-01 | 1.2 | Låst alternate_weekends: default_home + weekend_home_a/b |
| 2026-07-01 | 1.3 | Lagerad Schedule Engine: override → pattern → fallback; custody_override reserverad |
| 2026-07-01 | 1.4 | Engine-principer E1–E4: CustodyContext, pipeline, isolerade patterns |
