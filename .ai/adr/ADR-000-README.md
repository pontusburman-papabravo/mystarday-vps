# ADR-000 — Architecture Decision Records

**Status:** Accepted  
**Date:** 2026-06-29

---

## Syfte

`.ai/adr/` är **teknisk sanningskälla under implementation**. ADR dokumenterar *varför* vi byggde så — inte *hur produkten ska kännas* (Product OS / biblar) eller *hur varje rad kod ser ut* (repo).

| Lager | Sanningskälla |
|-------|----------------|
| Product OS + biblar | Vad & varför (produkt) |
| **ADR** | Tekniska beslut & gränser |
| Kod + schemas | Implementation |

---

## Format

Filnamn: `ADR-NNN-kort-slug.md` (t.ex. `ADR-004-progression-nodes.md`).

Varje ADR **måste** innehålla:

1. **Context** — teknisk situation  
2. **Problem** — vad som måste lösas  
3. **Decision** — valt beslut (imperativ)  
4. **Alternatives Considered** — kort lista  
5. **Trade-offs** — vad vi accepterar  
6. **Consequences** — effekt på kod, drift, team  
7. **Migration Strategy** — befintlig kod / data  
8. **Related Documents** — länkar, inte kopierad text  
9. **Future Revisions** — när ADR ska omprövas  

Header-fält: `Status`, `Date`, `Deciders` (valfritt), `Supersedes` / `Superseded by` (vid behov).

---

## Status

| Status | Betydelse |
|--------|-----------|
| **Proposed** | Under review — implementera inte som norm |
| **Accepted** | Gäller — implementation ska följa |
| **Superseded** | Ersatt av ny ADR — läs `Superseded by` |
| **Deprecated** | Inte längre relevant — behåll för historik |

Endast **Accepted** ADR är normativa för implementation.

---

## Beslutsprocess

1. **Identifiera** teknisk vägval som påverkar >1 modul eller är svår att ångra.  
2. **Skriv** ADR som `Proposed` — länka Product OS / biblar.  
3. **Review** CTO + ägare av berörda runtime (se WORLD_ENGINE när mergad).  
4. **Acceptera** → merge; uppdatera `Related Documents` i biblar endast om ADR *operationaliserar* — duplicera inte.  
5. **Konflikt** med Product OS → **ändra Product OS via ADR-förslag**, skapa inte parallell sanning i ADR.

---

## Länk till Product OS

| Product-källa | ADR använder för |
|---------------|------------------|
| `docs/PRODUCT-CONSTITUTION.md` §6 | Progression, inga magiska tal |
| `GAME_DESIGN_BIBLE.md` §2, Appendix B/C | Engine / pack / events |
| `WORLD_DESIGN_BIBLE.md` §2–3 | Progression nodes, unlock_signal |
| `WORLD_ENGINE.md` | Runtime-gränser, DSL, schemas |
| `PARENT_EXPERIENCE_BIBLE.md` | Parent approval, offline dignity |
| `docs/first-success/brain.md`, `coach.md` | Need/action — implementation split |

ADR **refererar** — citerar max 1 rad. Detaljer stannar i källan.

---

## Cursor / implementation

1. Innan arkitekturändring: `grep` + läs relevant **Accepted** ADR.  
2. PR beskriver: `ADR-NNN: [decision summary]` + hur diff följer den.  
3. Bryt inte Accepted ADR utan ny ADR som **Supersedes** den gamla.  
4. Feature flags (ADR-009) för experiment — permanent beteende kräver ADR eller bibel-alignment.  
5. Schemas i `.ai/product/world-engine/schemas/` (WORLD_ENGINE) validerar manifest — ADR pekar dit.

---

## AI-agenter — uppdatera ADR

**Skapa ny ADR när:** ny runtime-gräns, ny sync-modell, pack-format breaking change, plugin-kontrakt.

**Uppdatera inte ADR när:** bugfix, copy, enstaka endpoint — kod räcker.

**Process:**

1. Skriv `Proposed` ADR med alla 9 sektioner.  
2. Om ändring **motsäger** bibel → öppna issue/PR som föreslår bibel-ADR, vänta på accept.  
3. Efter accept: sätt status `Accepted`, datum, ev. `Supersedes: ADR-00X`.  
4. Markera gammal ADR `Superseded by: ADR-00Y`.  
5. Commit message: `docs(adr): ADR-NNN [title] accepted`.

**Förbjudet:** duplicera hela kapitel från GDB/WDB/PEB in i ADR.

---

## Index (v1)

| ADR | Titel |
|-----|-------|
| [ADR-001](ADR-001-experience-pack-architecture.md) | Experience Pack Architecture |
| [ADR-002](ADR-002-core-engine-boundaries.md) | Core Engine Boundaries |
| [ADR-003](ADR-003-world-dsl.md) | World DSL |
| [ADR-004](ADR-004-progression-nodes.md) | Progression Nodes |
| [ADR-005](ADR-005-event-bus.md) | Event Bus |
| [ADR-006](ADR-006-offline-first.md) | Offline First |
| [ADR-007](ADR-007-parent-approval-model.md) | Parent Approval Model |
| [ADR-008](ADR-008-save-and-sync.md) | Save & Sync |
| [ADR-009](ADR-009-feature-flag-strategy.md) | Feature Flag Strategy |
| [ADR-010](ADR-010-plugin-architecture.md) | Plugin Architecture |
