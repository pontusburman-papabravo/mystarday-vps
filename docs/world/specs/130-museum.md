# Minnesrummet — Place Specification

> **Machine-readable contract (source of truth):** [`../data/130-museum.yaml`](../data/130-museum.yaml)  
> **Rulebook (frozen):** [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Status:** draft · **Catalog #:** 130 · **Room ID:** `museum` · **Pack scene:** `memory_hall`

```yaml
# Excerpt — full contract in data/130-museum.yaml
room:
  id: museum
  pack_scene_id: memory_hall
  display_name_sv: Minnesrummet
catalog_number: 130
status: draft
emotion: Belonging
secondary_emotion: Comfort
hero_object: memory_wall
landmark: memory_hall_window
navigation_targets: [garden]
unlock_condition: feature_flag:memory_hall_playable
```

---

## Overview

**Minnesrummet** (pack: `memory_hall`, catalog id: `museum`) är ett varmt rum fullt av minnen — träramar på vägg, mjukt ljus genom stort fönster, tyst stolthet. Platsen där verkliga framsteg blir synliga utan poängskärm, leaderboard eller röda prickar. Familjemuseum: morgonfoto, första medalj, inramad teckning — frivilligt, aldrig påtvingat.

Rummet nås via trädgårdens stig när `memory_hall_playable` är aktiv. **Partial shipped:** `worlds.json` definierar `memory_hall` ambient_scenery (`memory_hall_wall`, `memory_hall_window`). Gate på `garden_path` i shipped kod.

**Katalogmappning:** Catalog #130 `museum` ↔ pack `memory_hall` ↔ trädgård = #110. Kopplad till `progression.routine_home.museum` (Day 30) och hall `museum_frame_slot`.

---

## Emotion

**Primär: Belonging** — *"Det här har jag gjort."*

**Sekundär: Comfort** — mjukt ljus, bänk att sitta på, dammpartiklar i ljusstråle. Director `calmness_target: 88`, lägsta stress.

| Constitution-pelare | Hur minnesrummet stärker den |
|---------------------|------------------------------|
| Belonging | Ramar fylls av verkliga ögonblick — inte generiska troféer |
| Comfort | Tomma ramar = inbjudan, inte skuld |

Inga poäng, jämförelser eller parent-surprise utan opt-in export.

---

## Purpose

Minnesrummet är museum sent i bågen:

1. **Memory wall** — Inspect ramar; Place ny ram (`museum_frame_feature`).
2. **Tomma ramar** — Varm ghost-glow — "snart", inte FOMO.
3. **Parent opt-in** — Export-minnen kräver förälder; inget överraskande i barnvy.

Failure mode: trofé-skärm eller galleri med skuldfyllda tomma ramar — tillhörighet dör.

---

## Art Prompts

**`memory_hall_scene_hero`** · catalog `art_prompt_catalog/0022`

**Positive:**
> Nordic memory hall interior gallery room, 2.5D illustrated diorama, warm soft lighting.
> Wooden wall with picture frames of various sizes — some filled with warm family moment illustrations
> (morning routine, child drawing, gentle medal), some empty with subtle warm glow invitation.
> Large window with soft golden light beam and dust motes, wooden bench, plant on sill,
> cozy museum feeling not trophy screen. Child eye height, handcrafted Scandinavian warmth,
> quiet pride, belonging atmosphere. Portrait mobile composition, memory wall center,
> window light from side upper third.

**Negative:**
> No text in frames, no leaderboard, no red notification dots, no guilt empty frames,
> no scary, no stock photo, no casino gold, no point numbers visible

**`memory_wall_hero`** · catalog `art_prompt_catalog/0022b`

**Positive:**
> Hero shot of wooden picture frame wall, warm illustrations of child achievements,
> empty frames with soft invitation glow, Nordic cozy gallery style.

**Negative:** No text, no scores, no comparison UI

---

## Navigation

| Nav ID | Till | Pack scene | Catalog # | Villkor |
|--------|------|------------|-----------|---------|
| `path_garden` | Trädgården | `garden` | 110 | alltid |

`return_anchor: path_from_garden` · `comfort_zone: true`. Ingång via `path_fade_pan` från trädgård.

---

## Implementation notes

**Partial shipped.** `worlds.json` memory_hall ambient_scenery (wall + window). Gate från `garden_path` när `memory_hall_playable`. Full pack/scenes.json ej klar. Engineer QA: partial. Parent export-flow planerad — kräver förälder opt-in per QA `parent_opt_in_respected`.

---

*Companion narrative for [`../data/130-museum.yaml`](../data/130-museum.yaml). Contracts live in YAML; this file explains why.*
