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

### 4. En gemensam Schedule Engine

- All beräkning av aktivt hem sker i **`src/lib/custody-schedule-engine.js`**.
- **`custody-resolver.js` avvecklas** efter migrering av konsumenter.
- Ingen route, scheduler eller UI-fil får duplicera datumlogik.

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

---

## Arkitektur

```
custody_home ─────────────┐
custody_parent_home ──────┤
custody_schedule ─────────┼──► custody-schedule-engine.js
  pattern_type            │         │
  configuration           │         ▼
  anchor_date             │    Active Home + handoffs
                          │
weekly_schedule ──────────┘    (custody_home_id primärt;
  custody_home_id                 week_variant fallback)
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
