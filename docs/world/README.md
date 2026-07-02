# World Database — Production Specifications

**Version:** 1.0  
**Status:** **ACTIVE** — canonical place specs for Min värld  
**Updated:** 2026-07-02

---

## What lives where

| Location | Role | Status |
|----------|------|--------|
| [`.ai/product/bibles/WORLD_BIBLE.md`](../.ai/product/bibles/WORLD_BIBLE.md) | **Rulebook** — Constitution, topology, RBS schema | **Frozen** (no new chapters) |
| **`docs/world/`** (this tree) | **Places database** — per-room contracts + narrative specs | **ACTIVE** |
| [`.ai/product/bibles/`](../.ai/product/bibles/README.md) | Entity, Animation, Audio, Prompt rulebooks | TBD / skeleton |
| [`docs/world/entities/`](./entities/README.md) | Shared object contracts (furniture, pets, trees…) | **Future** |
| [`config/experience-packs/child_se/`](../config/experience-packs/child_se/) | Runtime pack (`scenes.json` TBD) | Implementation |

**Rulebooks say how. This database says what each place is.**

---

## Dual-format philosophy

Every room has **two files** with distinct jobs:

| Format | Path | Audience | Purpose |
|--------|------|----------|---------|
| **YAML** | [`data/XXX-room_id.yaml`](./data/) | Cursor, CI, pack generators, art pipeline | Machine-readable **contract** — IDs, edges, slots, budgets |
| **Markdown** | [`specs/XXX-room_id.md`](./specs/) | Humans, QA, narrative review | **Why** — emotion, history, evolution, ecology, QA notes |

YAML is **canonical for contracts**. Markdown explains intent and may grow to 25–40 pages per room over time. Agents read YAML first; Markdown when judgment is needed.

Templates: [`_TEMPLATE.room.yaml`](./_TEMPLATE.room.yaml) · [`_TEMPLATE.room.md`](./_TEMPLATE.room.md)

---

## Numbered catalog

| # | ID | Name | Pack scene (LWES) | Data | Spec |
|---|-----|------|-------------------|------|------|
| 100 | `home` | Home | `home_exterior` | [100-home.yaml](./data/100-home.yaml) | [100-home.md](./specs/100-home.md) |
| 101 | `hall` | Hall | `home_hall` | [101-hall.yaml](./data/101-hall.yaml) | [101-hall.md](./specs/101-hall.md) |
| 102 | `bedroom` | Bedroom | `bedroom` | [102-bedroom.yaml](./data/102-bedroom.yaml) | [102-bedroom.md](./specs/102-bedroom.md) |
| 103 | `kitchen` | Kitchen | `home_kitchen` | [103-kitchen.yaml](./data/103-kitchen.yaml) | [103-kitchen.md](./specs/103-kitchen.md) |
| 104 | `bathroom` | Bathroom | `home_bathroom` | [104-bathroom.yaml](./data/104-bathroom.yaml) | [104-bathroom.md](./specs/104-bathroom.md) |
| 105 | `attic` | Attic | `attic` | [105-attic.yaml](./data/105-attic.yaml) | [105-attic.md](./specs/105-attic.md) |
| 110 | `garden` | Garden | `garden` | [110-garden.yaml](./data/110-garden.yaml) | [110-garden.md](./specs/110-garden.md) |
| 120 | `workshop` | Workshop | `workshop` | [120-workshop.yaml](./data/120-workshop.yaml) | [120-workshop.md](./specs/120-workshop.md) |
| 130 | `museum` | Museum | `museum` | [130-museum.yaml](./data/130-museum.yaml) | [130-museum.md](./specs/130-museum.md) |
| 140 | `pet_house` | Pet House | `pet_house` | [140-pet_house.yaml](./data/140-pet_house.yaml) | [140-pet_house.md](./specs/140-pet_house.md) |
| 150 | `trophy_room` | Trophy Room | `trophy_room` | [150-trophy_room.yaml](./data/150-trophy_room.yaml) | [150-trophy_room.md](./specs/150-trophy_room.md) |
| 160 | `reading_corner` | Reading Corner | `reading_corner` | [160-reading_corner.yaml](./data/160-reading_corner.yaml) | [160-reading_corner.md](./specs/160-reading_corner.md) |
| 170 | `forest` | Forest | `forest` | [170-forest.yaml](./data/170-forest.yaml) | [170-forest.md](./specs/170-forest.md) |
| 180 | `lake` | Lake | `lake` | [180-lake.yaml](./data/180-lake.yaml) | [180-lake.md](./specs/180-lake.md) |

**ID mapping:** Catalog `room.id` (e.g. `home`) may differ from LWES `pack_scene_id` (e.g. `home_exterior`). Both are declared in YAML.

---

## Cursor workflows

### Add content to an existing room

Example: *"Lägg till blomma i trädgården"*

1. Read [`data/110-garden.yaml`](./data/110-garden.yaml) — build slots, ecology, theme variants  
2. Read [`specs/110-garden.md`](./specs/110-garden.md) — Evolution / Ecology sections when filled  
3. Read [World Bible Part I](../.ai/product/bibles/WORLD_BIBLE.md#part-i--world-topology--spatial-design) — landmark + sightlines  
4. Read [LWES](../.ai/product/LIVING_WORLD_ENGINE_SPEC.md) — interaction types §22, Director  
5. Read [PROMPT_BIBLE](../.ai/product/bibles/PROMPT_BIBLE.md) / Art Prompt Catalog — if new art  
6. Update **YAML first** (slot, entity ref, progression key), then **MD** (why it belongs)  
7. Plan Entity Bible row in [`entities/`](./entities/README.md) when entity catalog exists  

### Add a placeable object

Example: *"Lägg till stol"*

1. Future: [`entities/furniture.md`](./entities/README.md) + entity YAML contract  
2. Target room YAML — `build_slots[]`, `theme_variant`  
3. Room spec — Ownership / Capability rationale  
4. Theme resolver — `house` vs `castle` skin  

### New room (rare)

1. World Bible Part I — **11-question checklist** (mandatory)  
2. Allocate production number + catalog ID  
3. Copy `_TEMPLATE.room.*` → `data/` + `specs/`  
4. Complete RBS in YAML before art or code (World Bible Part III DoD)  

---

## Shipped vs planned

| Slice | Code | Catalog |
|-------|------|---------|
| Morgonhus interior props | `child-morgonhus.js` | Maps to **hall** (101) + partial **home** (100) |
| Garden illustrated scene | `child-garden.js` | **garden** (110) |
| Pack worlds | `config/experience-packs/child_se/worlds.json` | `routine_home`, `garden` |
| `scenes.json` | **Not created** | All rooms — LWES Appendix C target |

---

## Future documentation tree (roadmap)

Target architecture — **not migrated yet**; current paths noted:

```
docs/
  00-product/          ← vision, constitution summaries (partial: docs/PRODUCT-CONSTITUTION.md today)
  01-world/            ← THIS TREE (docs/world/) — places database ACTIVE
  02-entities/         ← docs/world/entities/ stub → future full entity DB
  03-experience-packs/ ← config/experience-packs/ (runtime, not under docs/)
  04-art/              ← .ai/product/ART_BIBLE.md + bibles/ART_PROMPT_CATALOG.md today
  05-audio/            ← .ai/product/bibles/AUDIO_BIBLE.md today
  06-progression/      ← .ai/product/WORLD_DESIGN_BIBLE.md + progression.json today
  07-adr/              ← product-operating-system/14_DECISION_LOG.md today
```

POS (`product-operating-system/`) and LWES (`.ai/product/LIVING_WORLD_ENGINE_SPEC.md`) stay authoritative; this tree holds **production-ready place data** only.

---

## Authority stack (reminder)

```
World Constitution (WORLD_BIBLE §1)
  ↓
Part I Topology + Part III RBS schema (frozen)
  ↓
docs/world/data/*.yaml  ← per-room contracts (ACTIVE)
  ↓
docs/world/specs/*.md   ← narrative + QA
  ↓
Entity / Prompt / Audio bibles
  ↓
Experience Pack + implementation
```

---

## Related indexes

- [DOCUMENTATION_MAP.md](../.ai/product/DOCUMENTATION_MAP.md) — all product docs  
- [child-worlds-index.md](../child-worlds-index.md) — barnvärldar agent entry  
- [child-image-assets.md](../child-image-assets.md) — shipped asset IDs  
- [Deprecated room stubs](../.ai/product/bibles/rooms/README.md) — redirect only  

---

*Production Specifications replace World Bible Part IV room YAML work in `bibles/rooms/`.*
