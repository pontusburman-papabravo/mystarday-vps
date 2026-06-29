# ADR-004 — Progression Nodes

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Tidigare idé med fixed "75 delar" per värld ersatt av data-driven progression (Constitution §6, WDB §2).

## Problem

Hårdkodade trösklar (`PARTS_REQUIRED`, star counts i engine) kräver deploy för pacing-justering och bryter per-world emotional arcs.

## Decision

- **Progression Node** = minsta unlock-enhet i pack manifest (`node_id`, `order`, `node_type`, `emotional_beat`, `unlock_signal`, `pack_config_key`).  
- **Node count** = manifest-driven; ingen engine quota.  
- **Unlock path:** event → Progression Runtime → evaluate `unlock_signal` via pack rules engine → persist `child_progression_node` (server) → emit `onProgressionNodeUnlocked`.  
- **UI:** visa emotionell progression — inte "X av Y delar".  
- **ADR trigger:** >20% node count change in live world → pacing review (WDB).

## Alternatives Considered

| Alt | Varför nej |
|-----|------------|
| Fixed 75 parts | Motverkar Constitution §6 |
| XP/level integers in core | Magic numbers; guilt metrics |
| Client-only unlock | Trust / offline integrity |

## Trade-offs

+ CPO/Game Director justerar pacing via data.  
− Pack rules engine måste vara deterministisk och testbar.  
− Mer manifest-komplexitet per world.

## Consequences

- Schema: `progression-node.schema.json`, `progression.schema.json`.  
- DB: `child_progression_node(child_id, world_slug, node_id, unlocked_at, metadata JSONB)`.  
- Engine reject load om manifest innehåller numeric threshold constants without `pack_config_key`.

## Migration Strategy

Legacy build-part IDs mappas till `node_id`; one-time migration script; dual-read period om nödvändigt.

## Related Documents

- `docs/PRODUCT-CONSTITUTION.md` §6  
- `WORLD_DESIGN_BIBLE.md` §2–3  
- `scripts/wdb_progression_nodes.py`

## Future Revisions

Cross-world progression edges; seasonal node append-only automation.
