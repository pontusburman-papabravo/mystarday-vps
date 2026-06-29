# ADR-008 — Save & Sync

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Progression, routine completions och family state måste vara konsekventa across devices, co-parents och offline queues (ADR-006).

## Problem

Client-authoritative stars or last-write-wins utan merge log ger data loss och co-parent conflict.

## Decision

- **Server authoritative** for: stars, progression node unlocks, verified completions, subscription flags.  
- **Auto-save** on completion events — no manual save child UI (GDB QG-438–440).  
- **Delta sync:** ordered operations with timestamp; server applies idempotently.  
- **Conflict:** **server wins** progression domain; merge log row for audit (`sync.conflict` event).  
- **Cosmetic state** (placement, optional): client may optimistic UI; server reconcile on sync — future CRDT ADR.  
- **Save format:** semver header; forward migrators only in live; rollback dev-only.  
- **Compression:** snapshot blobs gzip/brotli; size budget per child in config.

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Client wins always | Co-parent desync |
| Full snapshot every write | Bandwidth on mobile |
| Event sourcing everywhere | Over-engineering v1 |

## Trade-offs

+ Predictable truth; support kan läsa merge log.  
− Occasional "why did my cosmetic move revert" — document in parent help.

## Consequences

- `Sync Runtime` + `Save Runtime` (WORLD_ENGINE).  
- Retry: exponential backoff client; no blocking Idag spinner.  
- DB migrations for save_version column if client cache used.

## Migration Strategy

Backfill `child_progression_node` from legacy tables; dual-write one release; monitor merge log.

## Related Documents

- `GAME_DESIGN_BIBLE.md` §43, QG-438–442  
- `WORLD_ENGINE.md` — Save Graph, Sync Graph  
- `ADR-006` Offline First

## Future Revisions

CRDT for cosmetic-only entities; end-to-end encrypted family notes ADR.
