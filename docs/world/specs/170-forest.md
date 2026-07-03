# Skogen — Place Specification

> **Machine-readable contract (source of truth):** [`../data/170-forest.yaml`](../data/170-forest.yaml)  
> **Rulebook (frozen):** [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Status:** draft · **Catalog #:** 170 · **Room ID:** `forest` · **Pack scene:** `forest`

```yaml
# Excerpt — full contract in data/170-forest.yaml
room:
  id: forest
  pack_scene_id: forest
  display_name_sv: Skogen
catalog_number: 170
status: draft
emotion: Curiosity
secondary_emotion: Wonder
hero_object: forest_path_deep
landmark: ancient_pine_trunk
navigation_targets: [garden, lake]
unlock_condition: progression.forest.unlock
```

---

## Overview

**Skogen** är en nordisk skogsglänta — höga träd, mossa, barr och stig som slingrar djupare in. Platsen där nyfikenhet möter stillhet och mod i lagom skala: lingonris, stenstapel, ekorre med kottor, rådjur i bakgrund (sällsynt, inte skrämmande). Svensk barr- och lövskog — barnstig, inte vildmark.

Nås från trädgården (`path_forest`) efter explore threshold. Stigen leder vidare mot sjön (#180) när `progression.lake.unlock`. Vattenblink mellan träd som tease. Idag **ej shipped**.

**Katalogmappning:** Catalog #170 `forest` ↔ pack `forest` ↔ trädgård = #110, sjö = #180 `lake`.

---

## Emotion

**Primär: Curiosity** — *"Det finns mer att se om jag vågar gå."*

**Sekundär: Wonder** — ljusstråle i glänta, svampcirkel, eldsvärmor kväll. Director `calmness_target: 78`.

| Constitution-pelare | Hur skogen stärker den |
|---------------------|------------------------|
| Curiosity | Stig, stenstapel, fjäder — utforskning utan combat |
| Imagination | Omfallen stam som bro, moln genom träd |

Spännande men aldrig skrämmande. `comfort_zone: false`.

---

## Purpose

Skogen expanderar grannskapet bortom trädgården:

1. **Forest path** — Navigate mot sjö (progression-gated); Inspect tall, stenstapel, fjäder.
2. **Rare events** — Rådjur (7-dagars cooldown), eldsvärmor (`evt_firefly_evening`).
3. **Build slots** — Bänk i solglänta, fågelmatare vid tall.

Failure mode: skräckskog eller tom grön bakgrund — utomhusmagin dör.

---

## Art Prompts

**`forest_scene_hero`** · catalog `art_prompt_catalog/0030`

**Positive:**
> Nordic Scandinavian forest glade, 2.5D illustrated diorama, dappled sunlight through pine and birch trees.
> Mossy path winding between tree trunks, ancient pine with lichen as landmark center,
> stone cairn, lingonberry bush, fallen log, pine cones on ground, soft green and brown palette,
> cool forest light with warm sunbeams, child eye height, inviting exploration not scary dark forest,
> handcrafted illustration, Swedish nature authenticity, depth with path leading deeper.
> Portrait mobile composition, path foreground center, tall trees framing sides, lake tease light between trees background.

**Negative:**
> No horror dark forest, no scary creatures, no combat, no text, no brand logos,
> no jungle vines, no stock photo, no empty flat green

**`ancient_pine_hero`** · catalog `art_prompt_catalog/0030b`

**Positive:**
> Hero shot of ancient pine tree trunk with lichen in Nordic forest glade,
> moss at base, dappled light, warm illustrated style, landmark tree.

**Negative:** No scary, no text

---

## Navigation

| Nav ID | Till | Pack scene | Catalog # | Villkor |
|--------|------|------------|-----------|---------|
| `path_garden` | Trädgården | `garden` | 110 | alltid |
| `path_to_lake` | Sjön | `lake` | 180 | `progression.lake.unlock` |

`return_anchor: path_from_garden`. Kamera: `gentle_pan_forest` vid inträde.

---

## Implementation notes

**Ej shipped.** Nav från garden. Sjö via `path_to_lake`. Secret glade (`progression.forest.secret_glade`) kräver kindness + explore. QA-gates alla pending.

---

*Companion narrative for [`../data/170-forest.yaml`](../data/170-forest.yaml). Contracts live in YAML; this file explains why.*
