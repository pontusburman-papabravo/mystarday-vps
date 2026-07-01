# Boendeschema — implementationsplan

| | |
|--|--|
| **Status** | Planerad (2026-07-01) |
| **Spec** | [boendeschema-spec.md](./boendeschema-spec.md) |
| **ADR** | [boendeschema-adr.md](./boendeschema-adr.md) |
| **Förutsättning** | Phase 1 (spec + ADR) klar — **ingen kod före denna plan är godkänd** |

---

## Översikt

```
Phase 1  Spec & ADR                    ✅ (detta PR)
Phase 2  Migration                     DB + backfill
Phase 3  Schedule Engine               custody-schedule-engine.js
Phase 4  Konsumenter                   routes, UI, schedulers
Phase 5  Weekly schedule cleanup       home_id primärt, week_variant legacy
```

**Låsta beslut (ADR):**

1. `weekly_schedule.week_variant` → på sikt ersätts av `custody_home_id`
2. `custody_pattern` → utökas till `custody_schedule` (pattern_type + configuration)
3. All logik via `custody-schedule-engine.js`

---

## Phase 1 — Spec & ADR ✅

| Leverans | Fil |
|----------|-----|
| Domänspec BC-1 … BC-13 | `docs/boendeschema-spec.md` |
| ADR hemcentrerad domän | `docs/boendeschema-adr.md` |
| Implementationsplan | `docs/boendeschema-implementationsplan.md` |
| Pekare i exekveringsplan | `docs/aktivering-exekveringsplan.md` §6.5.1 |
| Uppdaterad tasklist-pekare | `docs/act-1-cursor-tasklist.md` |

**Gate:** Ingen Phase 2-kod förrän denna PR är mergad.

---

## Phase 2 — Migration

### 2.1 Ny migration

**Fil:** `migrations/18XXXXXXXXXX_custody_schedule_domain.js`

```sql
-- custody_home: lägg till icon
ALTER TABLE custody_home
  ADD COLUMN IF NOT EXISTS icon VARCHAR(32);

-- custody_pattern → custody_schedule (utöka, byt inte namn i samma deploy)
ALTER TABLE custody_pattern
  ADD COLUMN IF NOT EXISTS pattern_type VARCHAR(32) NOT NULL DEFAULT 'alternate_weeks',
  ADD COLUMN IF NOT EXISTS configuration JSONB NOT NULL DEFAULT '{}';

-- weekly_schedule: custody_home_id finns redan — dokumentera som primär målkolumn
-- week_variant behålls oförändrad
```

**Backfill (i samma migration):**

```sql
UPDATE custody_pattern
SET
  pattern_type = 'alternate_weeks',
  configuration = jsonb_build_object(
    'home_a', week_a_home_id::text,
    'home_b', week_b_home_id::text
  )
WHERE configuration = '{}'::jsonb OR configuration IS NULL;
```

**Index (valfritt):**

```sql
CREATE INDEX IF NOT EXISTS idx_custody_pattern_type ON custody_pattern (pattern_type);
```

### 2.2 DB-modul

**Fil:** `db/custody.js`

| Ändring | Detalj |
|---------|--------|
| `getSchedule(childId)` | Ersätter/alias `getPattern` — returnerar `pattern_type`, `configuration`, legacy-fält |
| `upsertSchedule(childId, data)` | Skriver `pattern_type` + `configuration` |
| `listHomes` | Inkludera `icon` |
| Behåll `getPattern` | Deprecated wrapper → `getSchedule` (en deploy) |

### 2.3 API-kontrakt (förbered)

**Fil:** `src/routes/family/custody.js`

| Endpoint | Ändring |
|----------|---------|
| `GET /api/family/custody` | `patterns` → `schedules`; inkludera `pattern_type`, `configuration` |
| `PUT /api/family/custody/pattern/:childId` | Acceptera `pattern_type`, `configuration`; behåll legacy body för bakåtkomp |
| `POST /api/family/custody/setup` | Skapa `alternate_weeks` default; stöd `alternate_weekends` i body |
| `GET /api/family/custody/context` | Oförändrad path — engine tar över i Phase 3 |

### 2.4 Tester

| Fil | Innehåll |
|-----|----------|
| `test/custody-migration.test.js` | Migration innehåller `pattern_type`, `configuration`, `icon`; backfill SQL |
| `test/custody-feat1.test.js` | Uppdatera assertions till nya kolumnnamn |

**Gate:** `npm run test:gate` grönt. Ingen konsument ändrad ännu.

---

## Phase 3 — Schedule Engine ✅ PR-C

> **Scope:** Endast motorn + kontrakt + tester. **Inga konsumenter** migreras i PR-C.

### 3.1 Modul

**Rot:** `src/lib/custody-schedule-engine/` (re-export via `src/lib/custody-schedule-engine.js`)

```
custody-schedule-engine/
├── index.js              loadCustodyContext, resolveCustodyDate(Sync|Range)
├── types.js              CustodyContext JSDoc
├── pipeline.js           ResolverPipeline
├── resolvers/
│   ├── override-resolver.js
│   ├── pattern-resolver.js
│   └── fallback-resolver.js
├── patterns/
│   ├── index.js          registry — ingen switch i motorn
│   ├── alternate-weeks.js
│   └── alternate-weekends.js
├── overrides/
│   └── find-override-for-date.js
├── handoff.js            nextTransition / previousTransition
├── date-math.js
└── homes.js
```

### 3.2 CustodyContext (enda kontrakt — ADR E1)

Se [boendeschema-adr.md §4](./boendeschema-adr.md) och `types.js`.

### 3.3 Tester

**Fil:** `test/custody-schedule-engine.test.js` — pipeline, weeks, weekends, override, fallback, prestanda.

**Gate:** `npm run test:gate` grönt. Konsumenter oförändrade.

### 3.4 Pattern: `alternate_weeks`

**Fil:** `src/lib/custody-patterns/alternate-weeks.js`

- Porta logik från `custody-resolver.js` (`diffCalendarWeeks`, vecka A/B → `home_a`/`home_b` från configuration)
- `activePeriod` = måndag–söndag för aktiv vecka

### 3.3 Pattern: `alternate_weekends`

**Fil:** `src/lib/custody-patterns/alternate-weekends.js`

**Låst v1 (spec § BC-4):**

| Dag | Hem |
|-----|-----|
| Mån–tors | `configuration.default_home` |
| Fre–sön | `weekend_home_a` eller `weekend_home_b` (varannan helg från `anchor_date`) |

- `activeHome` är **aldrig null**
- `weekend_start` default `friday`
- `activePeriod`: helgblock fre–sön när helghem gäller; mån–tors kan markeras som `weekday` period

### 3.4 Enhetstester

**Fil:** `test/custody-schedule-engine.test.js`

| Testfall | Pattern |
|----------|---------|
| Ankardatum vecka A | `alternate_weeks` |
| Vecka B efter 7 dagar | `alternate_weeks` |
| Skottår 29 feb | båda |
| Ankardatum i framtiden | båda |
| Handoff-eve (söndag → måndag byte) | `alternate_weeks` |
| Varannan helg fre–sön + default_home mån–tors | `alternate_weekends` |
| `nextHandoff` / `previousHandoff` | båda |
| `isParentDay` med assignment | båda |
| Okänt `pattern_type` → tydligt fel | — |
| Sync resolve &lt; 5 ms (1000 iterationer) | `alternate_weeks` |
| `source: 'pattern'` när inget override | båda |
| `findOverrideForDate` returnerar null (v1 stub) | — |

**Fil:** `test/custody-patterns-alternate-weekends.test.js` — dedikerade helgfall

### 3.5 Deprecation

**Fil:** `src/lib/custody-resolver.js`

- Lägg `@deprecated` — tunna wrappers som delegerar till engine (en deploy)
- Ta bort i Phase 4 när alla imports är borta

**Gate:** Engine-tester gröna. Inga konsumenter migrerade ännu (eller endast `/context` som pilot).

---

## Phase 4 — Konsumenter

Migrera i ordning — varje steg ska ha grönt `test:gate`.

**Arkitekturregel (ADR E7):** Ingen konsument får implementera egen boendeschemalogik. Varje konsument anropar endast `resolveCustodyDate()` / `resolveCustodyDateSync()` / `resolveCustodyDateRange()` eller `GET /api/family/custody/context`. Egen “är det vecka A?”-logik i UI-komponenter eller schedulers betraktas som arkitekturfel.

### 4.1 API context (pilot)

| Fil | Ändring |
|-----|---------|
| `src/routes/family/custody.js` | `GET /context` använder `resolveCustodyDate`; returnera `nextHandoff`, banner-hint |

### 4.2 Daglig logg & schema-resolve

| Fil | Ändring |
|-----|---------|
| `src/lib/custody-schedule-resolve.js` | Anropa engine; välj `weekly_schedule` via `custody_home_id` med `week_variant`-fallback |
| `src/lib/daily-log-generator.js` | Oförändrad import — får engine via resolve |
| `test/custody-daily-log-resilience.test.js` | Uppdatera |

### 4.3 Kalender

| Fil | Ändring |
|-----|---------|
| `src/routes/calendar.js` | Ersätt `getWeekVariantForDate` med `resolveCustodyDateRange` |

### 4.4 Notiser & handoff

| Fil | Ändring |
|-----|---------|
| `src/lib/custody-notify.js` | `isCustodyHandoffEve` → engine `handoff.js` |
| `src/lib/custody-handoff-scheduler.js` | Engine för handoff-datum |
| `src/lib/push-reminder-scheduler.js` | `getNotifyParentIdsForChildDate` via engine `isParentDay` |
| `server.js` | Oförändrad mount — verifiera scheduler |

### 4.5 UI — förälder (FEAT-1)

| Fil | Ändring |
|-----|---------|
| `public/js/custody-banner.js` | Stöd “Nästa byte på …”; hemnamn inte A/B |
| `public/js/dashboard-custody.js` | Hämta context från API; färg + text/ikon |
| `public/js/schedule-custody.js` | Samma; `alternate_weekends` dagsmarkering |
| `public/js/custody-settings.js` | Pattern-väljare: varannan vecka / varannan helg; hemnamn |

### 4.5b Externa konsumenter (ej FEAT-1)

Utskrift/PDF ägs av separat tjänst (`print-schema`). FEAT-1 levererar endast API/engine.

| Fil | Ändring (senare, utanför FEAT-1 PRs) |
|-----|--------------------------------------|
| `public/js/print-schema-core.js` | Konsumera `isParentDay` från `/api/family/custody/context` |
| `public/js/daily-log.js` | Samma — inga custody-ändringar i FEAT-1 Phase 4 |

### 4.6 Analytics

| Fil | Ändring |
|-----|---------|
| `src/routes/analytics.js` | Lägg till `custody_schedule_created`, `custody_schedule_updated`, `custody_filter_changed`; behåll legacy events en deploy |
| `db/analytics.js` / whitelist | Synka event-namn |

### 4.7 Integrationstester

| Fil | Innehåll |
|-----|----------|
| `test/custody-feat1b.test.js` | Uppdatera till engine |
| `test/custody-feat1c.test.js` | API + `alternate_weekends` |
| Ny: `test/custody-api-integration.test.js` | Full setup → context → resolve |

**Gate:** Alla konsumenter använder engine. `custody-resolver.js` har noll imports.

---

## Phase 5 — Weekly schedule cleanup

### 5.1 Skriv `custody_home_id` vid schema-sparning

| Fil | Ändring |
|-----|---------|
| `src/routes/schedules/child-crud.js` | Acceptera `custody_home_id`; skriv parallellt `week_variant` under övergång |
| `src/lib/custody-schedule-migrate.js` | Migrera befintliga A/B-rader → `custody_home_id` via configuration |
| `public/js/schedule.js` | UI: visa hemnamn, inte “Vecka A/B” |

### 5.2 Läsordning

```
1. weekly_schedule.custody_home_id = activeHome.id
2. weekly_schedule.week_variant + pattern mapping (legacy)
3. weekly_schedule.week_variant IS NULL (enkelt schema)
```

### 5.3 Data-migration (prod)

**Fil:** `migrations/18XXXXXXXXXX_weekly_schedule_home_backfill.js`

```sql
UPDATE weekly_schedule ws
SET custody_home_id = CASE ws.week_variant
  WHEN 'a' THEN (cp.configuration->>'home_a')::uuid
  WHEN 'b' THEN (cp.configuration->>'home_b')::uuid
END
FROM custody_pattern cp
WHERE ws.child_id = cp.child_id
  AND ws.week_variant IS NOT NULL
  AND ws.custody_home_id IS NULL;
```

### 5.4 Avveckling (senare PR, ej samma release)

- Ta bort `week_variant` från UI
- Deprecate `week_variant` i API
- Eventuell migration DROP `week_variant` (ADR + rollback-plan krävs)

---

## PR-sekvens (rekommenderad)

| PR | Phase | Innehåll | Risk |
|----|-------|----------|------|
| **PR-A** | 1 | Spec + ADR + plan + pekare | Ingen |
| **PR-B** | 2 | Migration + db/custody + API shape | Låg |
| **PR-C** | 3 | Engine + pattern modules + unit tests | Låg |
| **PR-D** | 4a | API context + schedule-resolve + daily-log | Medel |
| **PR-E** | 4b | Calendar + push + handoff schedulers | Medel |
| **PR-F** | 4c | UI (settings, banner, dashboard, schedule) | Medel |
| **PR-G** | 5 | home_id backfill + UI hemnamn + cleanup | Medel |

Varje PR: `NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:gate`

---

## Verifieringschecklista (DoD)

Kopplad till [boendeschema-spec.md § Definition of Done](./boendeschema-spec.md#definition-of-done).

| # | Verifiering | Fas |
|---|-------------|-----|
| 1 | `alternate_weeks` prod-data backfillad | 2 |
| 2 | `alternate_weekends` manuellt testat i UI | 4 |
| 3 | `resolveCustodyDate` används i alla FEAT-1-konsumenter (ej print/PDF) | 4 |
| 4 | Inga direkta anrop till `getWeekVariantForDate` utanför engine | 4 |
| 5 | Banner visar hemnamn + nästa byte | 4 |
| 6 | Färg + text i dashboard/schedule | 4 |
| 7 | Barnvy utan hem-etikett | 4 |
| 8 | Handoff + push till rätt förälder | 4 |
| 9 | API exponerar `activeHome` + `isParentDay` för externa konsumenter | 4 |
| 10 | Familj utan custody oförändrad | 2–5 |
| 11 | Engine unit tests inkl. skottår + helg | 3 |
| 12 | Analytics events enligt spec | 4 |

---

## Filer — snabbreferens

### Befintligt (berörs)

```
db/custody.js
migrations/1808650000000_custody_schedule.js
src/lib/custody-resolver.js              → avvecklas
src/lib/custody-schedule-resolve.js
src/lib/custody-notify.js
src/lib/custody-handoff-scheduler.js
src/lib/custody-schedule-migrate.js
src/lib/daily-log-generator.js
src/lib/push-reminder-scheduler.js
src/routes/family/custody.js
src/routes/calendar.js
src/routes/schedules/child-crud.js
public/js/custody-settings.js
public/js/custody-banner.js
public/js/dashboard-custody.js
public/js/schedule-custody.js
test/custody-*.test.js
```

### Externa konsumenter (ej FEAT-1 — migreras separat)

```
public/js/daily-log.js
public/js/print-schema-core.js
public/js/print-schema.js
```

### Nytt (skapas)

```
src/lib/custody-schedule-engine.js
src/lib/custody-patterns/alternate-weeks.js
src/lib/custody-patterns/alternate-weekends.js
src/lib/custody-patterns/handoff.js
src/lib/custody-overrides/find-override-for-date.js
migrations/18XXXXXXXXXX_custody_schedule_domain.js
migrations/18XXXXXXXXXX_weekly_schedule_home_backfill.js
test/custody-schedule-engine.test.js
test/custody-migration.test.js
test/custody-api-integration.test.js
```

---

## Dokumenthistorik

| Datum | Version | Ändring |
|-------|---------|---------|
| 2026-07-01 | 1.0 | Första implementationsplan — Phase 1–5 |
| 2026-07-01 | 1.1 | Utskrift/PDF utanför FEAT-1; externa konsumenter via API |
| 2026-07-01 | 1.2 | Låst alternate_weekends semantik (default_home + weekend_home) |
| 2026-07-01 | 1.3 | Phase 3: lagerad engine override → pattern → fallback |
| 2026-07-01 | 1.4 | Phase 3 levererad i PR-C: pipeline, CustodyContext, patterns |
