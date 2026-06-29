# ADR-001 — Experience Pack Architecture

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Stjärndag ska stödja flera målgrupper (barn v1; tonår/vuxen/stöd senare) utan motor-fork. Fiction, copy och pacing varierar; completion och save ska vara gemensamma.

## Problem

Hårdkodad barn-copy i server/klient blockerar pack-byte och skapar dubbel underhåll.

## Decision

- **Experience Pack** = semver manifest (`pack_id`, `audience_band`, `locale`, `fiction_manifest`, `ui_skin`, `pacing`, `worlds[]`, `copy_tables`).  
- v1 shippar endast **`child_se`** — övriga packs schema-only tills ADR revideras.  
- Pack laddas via **Pack Runtime**; byte byter presentation + manifest refs, **inte** DB per audience.  
- Pack **får inte** override Product Constitution eller G-rules (GDB).

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Separata appar per ålder | Fork, dubbel sync, fragmenterad data |
| Feature flags som enda mekanism | Ingen tydlig fiction/copy-gräns |
| i18n-only | Räcker inte för pacing/reading level |

## Trade-offs

+ En deploy, en save-modell.  
− Pack-validering måste vara strikt CI-gate.  
− Större manifest-yta att versionera.

## Consequences

- `experience-pack.schema.json` (WORLD_ENGINE) är kontrakt.  
- Integration test: swap pack i staging utan migration.  
- All age-specific copy i pack — grep-gate: inga `if (age<13)` i core routes.

## Migration Strategy

Befintlig `child_se`-upplevelse mappas till manifest v1.0.0. Nya packs append-only tills CPO godkänner live pack.

## Related Documents

- `GAME_DESIGN_BIBLE.md` §2, Appendix C  
- `WORLD_ENGINE.md` — Pack Runtime  
- `docs/first-success/coach.md` — experiment på Coach, inte pack-etik

## Future Revisions

Revidera vid första **live** icke-`child_se` pack eller breaking manifest semver major.
