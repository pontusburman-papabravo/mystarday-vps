# Trädgården — Place Specification

> **Machine-readable contract (source of truth):** [`../data/110-garden.yaml`](../data/110-garden.yaml)  
> **Rulebook (frozen):** [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Status:** draft · **Catalog #:** 110 · **Room ID:** `garden` · **Pack scene:** `garden`

```yaml
# Excerpt — full contract in data/110-garden.yaml
room:
  id: garden
  pack_scene_id: garden
  display_name_sv: Trädgården
catalog_number: 110
status: draft
emotion: Curiosity
secondary_emotion: Wonder
hero_object: garden_path
landmark: old_oak_tree
navigation_targets: [hall, memory_hall, workshop, forest, pet_house]
unlock_condition: feature_flag:garden_playable
```

---

## Overview

**Trädgården** är hemmets utomhusrum — grön gräsmatta, blomsterbädd, stig och himmel under varmt morgonljus. Platsen där barnet kliver ut och känner frisk luft och nyfikenhet utan minispel eller grind. Nordisk familjeträdgård: lagom vild, inte perfekt klippt — fåglar, moln, blommor barnet kan röra.

Trädgården är **shipped** som presentation i `child-garden.js` + `worlds.json` med tre hotspots (`garden_path`, `garden_bed`, `garden_sky`) och monolit `scene-bg.webp`. Stigen leder vidare till minnesrum, verkstad, skog och husdjursstuga — progression-gated med vänligt "inte än"-meddelande.

**Katalogmappning:** Catalog #110 `garden` ↔ pack `garden` ↔ hall = #101, minnesrum = #130 `memory_hall`, verkstad = #120, skog = #170, husdjursstuga = #140.

---

## Emotion

**Primär: Curiosity** — *"Stigen svarar när jag är redo."*

**Sekundär: Wonder** — fjärilar, eldsvärmor skymning, moln som liknar något. Director `calmness_target: 80`.

| Constitution-pelare | Hur trädgården stärker den |
|---------------------|----------------------------|
| Curiosity | Tre tydliga ytor: stig, bädd, himmel — utan text |
| Imagination | Dandelion, snigel, molnform — fantasi utan facit |
| Comfort | Hus-silhuett bakom — "jag kan gå hem" |

`comfort_zone: true`. Låsta stigar visar anticipation, inte FOMO.

---

## Purpose

Trädgården öppnar världen utanför huset:

1. **Living bed** — `garden_bed` kopplad till `living-objects.json bed_1`; blommor växer via verklig omsorg.
2. **Nav-hub** — Stig till minnesrum (feature flag), verkstad, skog, husdjursstuga.
3. **Ecology** — Verkstad-rök-tease bortom häck; regn → vått gräs + fågelbad-ringar.

Failure mode: tom grön bakgrund eller casino — utomhusmagin försvinner.

---

## Art Prompts

**`garden_scene_hero`** · catalog `art_prompt_catalog/0020`

**Positive:**
> Nordic family garden exterior, 2.5D illustrated diorama, warm golden morning light.
> Green grass lawn in foreground with gentle path winding through garden,
> flower bed with soft colorful blooms (not neon), old oak tree silhouette in background,
> house roof edge visible behind hedge, blue sky with soft white clouds.
> Child eye height camera, Scandinavian lagom garden, handcrafted illustration,
> birds optional in sky, watering can by fence, inviting exploration.
> Portrait mobile composition, path in lower third leading into depth,
> flower bed right, sky upper portion with clouds.

**Negative:**
> No text, no brand logos, no perfect golf course lawn, no scary forest edge,
> no stock photo, no empty flat green, no casino colors, no harsh shadows

**`garden_path_hotspot`** · catalog `art_prompt_catalog/0020b`

**Positive:**
> Garden path detail, gravel and grass mix, winding into distance, Nordic illustrated style,
> warm morning light, inviting trail through green garden.

**Negative:** No text, no signs with words

**`garden_bed_hotspot`** · catalog `art_prompt_catalog/0020c`

**Positive:**
> Flower bed close view, soft soil, small blooms, child-scale garden patch,
> Nordic warm illustration, tactile and inviting.

**Negative:** No text, no brand logos

---

## Navigation

| Nav ID | Till | Pack scene | Catalog # | Villkor |
|--------|------|------------|-----------|---------|
| `door_hall` | Hallen | `home_hall` | 101 | alltid |
| `path_memory_hall` | Minnesrummet | `memory_hall` | 130 | `memory_hall_playable` |
| `path_workshop` | Verkstaden | `workshop` | 120 | `progression.workshop.unlock` |
| `path_forest` | Skogen | `forest` | 170 | `progression.forest.unlock` |
| `gate_pet_house` | Husdjursstugan | `pet_house` | 140 | `progression.pet_home.unlock` |

`return_anchor: door_from_hall`. Shipped gate på `garden_path` för memory_hall i `worlds.json`.

---

## Implementation notes

**SHIPPED (presentation):** `child-garden.js` + `worlds.json ambient_scenery`. Hotspots: `garden_path`, `garden_bed`, `garden_sky`. Assets: `public/images/child/world/garden/scene-bg.webp` (+ 430/860/1280). Engineer QA: partial. Layer split i `scenes.json` = framtida mål.

---

*Companion narrative for [`../data/110-garden.yaml`](../data/110-garden.yaml). Contracts live in YAML; this file explains why.*
