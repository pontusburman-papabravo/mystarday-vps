# Agent 1 — FEAT-1 Completion (Boendeschema v1)

**Kopiera hela filen till en ny Cursor-agent.**  
**Program:** [v1-completion-program.md](../v1-completion-program.md)  
**Våg:** 1 — start direkt efter Agent 8  
**Branch-prefix:** `cursor/v1-feat1-` + suffix `-ef46`

---

## Ditt mål

Stäng **FEAT-1 v1** helt och markera som **v1 complete**.

Du äger custody-domänen tills DoD i `docs/boendeschema-spec.md` är avbockad. Bygg **inte** FEAT-1B (`custom`) eller FEAT-1C (`custody_override`).

---

## Nuvarande läge (repo)

| Klart | Öppet |
|-------|-------|
| Schedule Engine, CustodyContext, Phase 4 konsumenter | Phase 5: `custody_home_id` skrivning |
| `custody-resolver.js` borttagen | UI skriver fortfarande `week_variant` i `schedule-custody.js` |
| `custody_schedule_updated` i analytics | `custody_schedule_created`, `custody_filter_changed` saknas |
| Dashboard/schedule/settings UI | Formell DoD ej avbockad |

**Källfiler:** `docs/boendeschema-implementationsplan.md` Phase 5, `docs/boendeschema-spec.md` §DoD.

---

## Fil-ägarskap (monopol)

Du äger — andra agenter får inte ändra utan koordination:

```
migrations/*custody*
db/custody.js
src/lib/custody-*
src/routes/family/custody.js
src/routes/schedules/child-crud.js
src/routes/calendar.js (custody-delar)
public/js/custody-*.js
public/js/dashboard-custody.js
public/js/schedule-custody.js
test/custody-*.test.js
```

**SW-bump:** Du är **första** SW-ägare i Våg 1 om du ändrar statiska assets.

---

## PR-sekvens (4 PR, i ordning)

### PR 1 — Phase 5

- Skriv `custody_home_id` vid schema-sparning (`child-crud.js`, `schedule-custody.js`)
- Migration: backfill `week_variant` → `custody_home_id` via pattern configuration
- Läsordning dokumenterad: `custody_home_id` → `week_variant` fallback → null
- UI: hemnamn istället för Vecka A/B

### PR 2 — Analytics

- Lägg till `custody_schedule_created` (första sparning)
- Lägg till `custody_filter_changed` **eller** dokumentera mapping till befintlig `custody_view_filtered` i ADR
- Verifiera `custody_schedule_updated` (finns redan i `src/routes/analytics.js`)
- **Lägg inte till** `custody_home_changed` utan ADR
- Tester för allowlist + emit

### PR 3 — Integration QA

- Utöka `test/custody-schedule-engine.test.js` / ny integration-fil
- Täck: `alternate_weekends`, `alternate_weeks`, DST, timezone, handoff-eve
- Verifiera: dashboard banner, planner markering, daily-log resolve

### PR 4 — Cleanup + DoD

- Ta bort `week_variant` **skrivvägar** i UI
- Deprecate legacy helpers som inte längre anropas
- Avbocka `docs/boendeschema-spec.md` §Definition of Done
- Uppdatera ADR om beteende låsts

---

## Definition of Done

- [ ] Phase 5 migration + backfill mergad
- [ ] Inga UI-skrivningar till `week_variant` (read fallback OK, dokumenterad)
- [ ] Hemnamn i banner, dashboard, schedule, settings
- [ ] Analytics-gap stängt (created + filter)
- [ ] Integrationstester för gränsfall
- [ ] `npm run test:gate` grön
- [ ] Agent 7 sign-off i PR (`Agent 7: ✓ custody regression`)
- [ ] POS: ingen barnvy med hem-etikett (BC-7)

---

## Test

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# test:gate — full env prefix in root AGENTS.md and .cursor/rules/130-testing.mdc
npm run test:gate
```

Kör `test/custody-*.test.js` explicit vid custody-ändringar.

---

## Förbjudet

- FEAT-1B `custom` pattern implementation
- FEAT-1C override UI
- `print-schema` / `daily-log.js` custody-migrering (utanför v1)
- Ändra parent hub-filer (`dashboard-home-hub.js`, etc.)
- Force-push `main`

---

## Stop Rule

Om Phase 5 kräver breaking API-ändring eller `week_variant`-DROP i samma release → stoppa, skriv ADR i `docs/boendeschema-adr.md`, vänta på godkännande.

---

## Self-review (klistra in PR)

```
Self-review: PE ✓ Mobile ✓ CPO ✓ UX ✓ Game ✓ QA ✓ Security ✓ AISA ✓
POS governed by: boendeschema-spec BC-1–13, 09 custody domain
Agent 7: [väntar på sign-off]
```
