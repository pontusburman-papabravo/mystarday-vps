# Production Bibles — Index

**Version:** 1.0  
**Authority:** Subordinate to POS and PCB; operationalises LWES for concrete production  
**Map:** [DOCUMENTATION_MAP.md](../DOCUMENTATION_MAP.md)  

---

## AI chain rule (normative)

> **No AI may create an image, animation, or implementation code directly from an idea.**  
> It MUST follow the bible chain below.

```
Vision (PCB, LWES principles)
  ↓
World Bible — Part I topology + Part III RBS
  ↓
bibles/rooms/ — concrete room YAML (Part IV catalog)
  ↓
Entity Bible — every object, NPC, pet
  ↓
Animation Bible — semantic motion catalog
  ↓
Prompt Bible / Art Prompt Catalog — generation handoff
  ↓
Audio Bible · Economy & Progression · World Events (as needed)
  ↓
Art Generation → Implementation
```

Enforcement: [AODS.md](../AODS.md) · `.cursor/rules/000-core.mdc`

---

## Bible registry

| Bible | File | Priority | Status |
|-------|------|----------|--------|
| World Bible | [WORLD_BIBLE.md](./WORLD_BIBLE.md) | ⭐⭐⭐⭐⭐ | Part I–III complete |
| **Room Catalog** | [rooms/README.md](./rooms/README.md) | ⭐⭐⭐⭐⭐ | In progress — `home_hall` pilot |
| Technical Architecture Bible | [TECHNICAL_ARCHITECTURE_BIBLE.md](./TECHNICAL_ARCHITECTURE_BIBLE.md) | ⭐⭐⭐⭐⭐ | Skeleton |
| Entity Bible | [ENTITY_BIBLE.md](./ENTITY_BIBLE.md) | ⭐⭐⭐⭐⭐ | Missing |
| Prompt Bible | [PROMPT_BIBLE.md](./PROMPT_BIBLE.md) | ⭐⭐⭐⭐⭐ | Missing |
| Animation Bible | [ANIMATION_BIBLE.md](./ANIMATION_BIBLE.md) | ⭐⭐⭐⭐ | Missing |
| Economy & Progression Bible | [ECONOMY_PROGRESSION_BIBLE.md](./ECONOMY_PROGRESSION_BIBLE.md) | ⭐⭐⭐⭐ | Missing |
| Audio Bible | [AUDIO_BIBLE.md](./AUDIO_BIBLE.md) | ⭐⭐⭐ | Missing |
| Emotion Bible | [EMOTION_BIBLE.md](./EMOTION_BIBLE.md) | ⭐⭐⭐⭐⭐ | Skeleton |
| Backend Bible | [BACKEND_BIBLE.md](./BACKEND_BIBLE.md) | ⭐⭐⭐⭐ | Stub planned |
| Accessibility Bible | [ACCESSIBILITY_BIBLE.md](./ACCESSIBILITY_BIBLE.md) | ⭐⭐⭐⭐ | Stub planned |
| World Events Bible | [WORLD_EVENTS_BIBLE.md](./WORLD_EVENTS_BIBLE.md) | ⭐⭐⭐⭐ | Missing |
| Art Prompt Catalog | [ART_PROMPT_CATALOG.md](./ART_PROMPT_CATALOG.md) | ⭐⭐⭐⭐⭐ | Missing |

---

## Build order (normative)

1. World Bible (Part I topology + Part III RBS)  
2. **Room blueprint** in `rooms/<scene_id>.yaml` — complete before art/code  
3. Technical Architecture Bible  
3. Entity Bible  
4. Prompt Bible  
5. Animation Bible  
6. Economy & Progression Bible  
7. Audio Bible  
8. Emotion Bible (parallel refinement after World Bible OK)

---

## Cross-references (frozen contracts)

| Document | Bibles use it for |
|----------|-------------------|
| [PRODUCT_CONTENT_BIBLE.md](../PRODUCT_CONTENT_BIBLE.md) | World soul, five feelings filter |
| [WORLD_DESIGN_BIBLE.md](../WORLD_DESIGN_BIBLE.md) | Progression nodes, WQS-200 |
| [ART_BIBLE.md](../ART_BIBLE.md) | Pixel craft, motion caps, palettes |
| [LIVING_WORLD_ENGINE_SPEC.md](../LIVING_WORLD_ENGINE_SPEC.md) | Runtime contracts (Parts I–X FROZEN) |
| [GAME_DESIGN_BIBLE.md](../GAME_DESIGN_BIBLE.md) | Loops, motivation ethics |

**Clarification:** WDB ≠ World Bible. WDB = progression nodes. World Bible = spatial/emotional architecture of Min värld.

---

## Per-bible DoD (minimum)

Every bible entry MUST include:

- Metadata (id, version, status, cross-refs)  
- Purpose and authority scope  
- Template schema for new entries  
- At least one filled example where applicable  
- Link to LWES Part V data fields where runtime-bound  

Ship gate: WDB WQS-001–200 + Bible DoD per asset.
