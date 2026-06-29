# ADR-005 — Event Bus

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Core Engine, Experience Packs, analytics och world runtime måste reagera på samma händelser utan tight coupling.

## Problem

Direct function calls mellan routes, client JS och pack logic skapar cykler och age-specific side effects.

## Decision

- **Event Bus** (broadcast): naming `domain.action` (snake_case domains).  
- **Core events (v1 minimum):**  
  `onActivityComplete`, `onStarGranted`, `onProgressionNodeUnlocked`, `onWorldEnter`, `onWorldExit`, `onMilestone`, `onNpcInteraction`, `interaction.completed`, `save.captured`, `sync.completed`.  
- Payload: age-agnostic IDs — **no PII** in analytics-bound events.  
- Delivery: queued same tick; handlers **≤2 ms** budget (WORLD_ENGINE).  
- **Message Bus** (point-to-point) för runtime commands (`camera.transitionTo`, `animation.play`) — separat från bus.  
- Experience Packs **subscribe**; engine **emits**. Pack listeners får inte blockera Idag spine.

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Redux/global store only | Server truth + offline queue passar dåligt |
| Webhooks-only | Latency; offline |

## Trade-offs

+ Pack swap utan route-ändring.  
− Event schema discipline; versionering vid breaking payload.

## Consequences

- Appendix B (GDB) extended only via ADR + semver event version.  
- `public/js/analytics-shim.js` allowlist för client emit.  
- Contract tests: golden payloads per event.

## Migration Strategy

Legacy direct calls → emit wrapper; deprecate direct imports over 2 releases.

## Related Documents

- `GAME_DESIGN_BIBLE.md` Appendix B  
- `WORLD_ENGINE.md` — Event Bus & Message Bus  
- `src/core-engine/` event definitions (implementation)

## Future Revisions

Event replay for Testing Runtime; cross-tab broadcast on web.
