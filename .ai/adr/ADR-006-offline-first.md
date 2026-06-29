# ADR-006 — Offline First

**Status:** Accepted  
**Date:** 2026-06-29

## Context

99,9% mobile users; morgonrutin sker ofta utan stabilt nät. Primary success = offline beteende förbättras (GDB §43, PEB).

## Problem

Online-only completion ger false celebration, tappad trust, och blockerar Idag spine i skolor/flygplan.

## Decision

- **Local snapshot** av last-synced world + routine state för read-only barnvy.  
- **Write queue:** completion ops med `timestamp` + client `operation_id`; flush on reconnect.  
- **Stars/progression unlock:** endast efter **server verify** — ingen offline grant.  
- **UI:** calm sync indicator; errors never blame child (GDB anti-frustration).  
- **Idag check-off:** queue allowed; celebration copy väntar på verify om offline.  
- Capacitor/web: same queue abstraction (Sync Runtime).

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Full offline CRDT all state | Complexity; server authority for stars |
| Online-only with retry spinner | Blocks primary loop |

## Trade-offs

+ Flygplan/skol-wifi fungerar för rutin.  
− Delayed celebration; parent must understand verify lag.  
− Queue conflict handling (see ADR-008).

## Consequences

- Client: offline detector + queue persistence (IndexedDB/local).  
- Server: idempotent completion ingest by `operation_id`.  
- Tests: offline QA matrix mandatory for completion changes.

## Migration Strategy

Existing clients: add queue layer behind existing API calls; feature flag rollout (ADR-009).

## Related Documents

- `GAME_DESIGN_BIBLE.md` §43, QG-431–434  
- `PARENT_EXPERIENCE_BIBLE.md` — offline dignity  
- `WORLD_ENGINE.md` — Save/Sync Runtime

## Future Revisions

Cosmetic-only CRDT zones; background sync on iOS BGTask.
