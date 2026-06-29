# ADR-002 — Core Engine Boundaries

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Spelplattformen delas i 25 runtimes (WORLD_ENGINE). Core Runtime orchestrerar; domänlogik för rutin/stjärnor/progression ska vara age-agnostic.

## Problem

Oklar gräns mellan engine, pack, och Express-routes leder till fiction i backend och magic numbers i klient.

## Decision

**Core Engine äger:**

- Auth/session, child/parent context  
- Activity completion → verified events  
- Progression rule evaluation (`unlock_signal` → node_id)  
- Save/sync orchestration hooks  
- Event bus emit (Appendix B + extensions)  

**Core Engine äger INTE:**

- World fiction, NPC copy, UI skin  
- Coach action mapping (→ Product Engine / `coach.md`)  
- Voice copy (→ voice-katalog)  
- Per-world art assets  

**Gränsregel:** Core känner `event` + `node_id` + `pack_config_key` — aldrig "75 delar" eller fixed star thresholds (Constitution §6).

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Monolith route handlers med all logik | Omöjlig pack/world expansion |
| Full microservices per world | Overkill v1; sync-komplexitet |

## Trade-offs

+ Tydlig testyta (mock events → progression).  
− Kräver disciplin vid nya API:er (engine hook först).

## Consequences

- Nya completion-typer → emit standardiserat event, pack listener optional.  
- `src/core-engine/` (first-success) är implementation av Brain — inte Coach copy.

## Migration Strategy

Refactor incrementellt: flytta age/copy ur routes till pack manifest; behåll befintliga endpoints tills parity-test pass.

## Related Documents

- `WORLD_ENGINE.md` — Core Runtime, Progression Runtime  
- `GAME_DESIGN_BIBLE.md` §2  
- `docs/first-success/ENGINE_SPEC.md`

## Future Revisions

Vid extrahering av client-side World Runtime till separat process eller WASM bundle.
