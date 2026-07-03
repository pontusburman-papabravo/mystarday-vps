# Troférummet — Place Specification

> **Machine-readable contract (source of truth):** [`../data/150-trophy_room.yaml`](../data/150-trophy_room.yaml)  
> **Rulebook (frozen):** [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Status:** draft · **Catalog #:** 150 · **Room ID:** `trophy_room` · **Pack scene:** `trophy_room`

```yaml
# Excerpt — full contract in data/150-trophy_room.yaml
room:
  id: trophy_room
  pack_scene_id: trophy_room
  display_name_sv: Troférummet
catalog_number: 150
status: draft
emotion: Belonging
secondary_emotion: Ownership
hero_object: trophy_shelf_hero
landmark: ribbon_door_arch
navigation_targets: [hall]
unlock_condition: progression.routine_home.trophy_unlock
```

---

## Overview

**Troférummet** samlar verkliga prestationer som fysiska objekt i världen — burk med första snöboll, inramad fjäril, ritad stjärna på trä, fjäder från skogen, sten från sjön. Inte guld-pokaler, leaderboard eller stjärnräknare på väggen. Personligt troférum som växer lagom fullt över tid.

Dörren från hallen (`door_trophy`) bär band på båge när låst — synlig tease i hall-sightline. Unlock via `progression.routine_home.trophy_unlock`. Idag **ej shipped**.

**Katalogmappning:** Catalog #150 `trophy_room` ↔ pack `trophy_room` ↔ hall = #101 `home_hall`.

---

## Emotion

**Primär: Belonging** — *"Det här har jag gjort på riktigt."*

**Sekundär: Ownership** — hyllan tillhör barnet; tom hylla = inbjudan. Director `calmness_target: 82`.

| Constitution-pelare | Hur troférummet stärker den |
|---------------------|-----------------------------|
| Belonging | Minnesobjekt kopplade till verkliga händelser (G-01) |
| Ownership | Personlig hylla — aldrig jämförelse med syskon |

Band på dörr = anticipation, inte FOMO. Inga poäng synliga.

---

## Purpose

Troférummet är stolthet utan skrik:

1. **Trophy shelf** — Inspect objekt; Place milestone (`trophy_first`, `trophy_second`).
2. **Reality objects only** — Snöboll, fjäril, medalj — inte generiska sporttroféer.
3. **Locked tease** — Band synligt från hall tills unlock.

Failure mode: sporttrophy-case eller tom skrytrum — tillhörighet blir skam.

---

## Art Prompts

**`trophy_room_scene_hero`** · catalog `art_prompt_catalog/0024`

**Positive:**
> Nordic child trophy room interior, 2.5D illustrated diorama, warm soft spotlight.
> Wooden shelves with meaningful personal objects — jar with first snowball memory,
> framed butterfly, drawn star on wood plaque, feather, smooth pebble — not gold sports trophies.
> Ribbon on door arch (locked tease), polished wooden floor, quiet pride atmosphere,
> no leaderboard, no point numbers. Child eye height, handcrafted Scandinavian warmth,
> belonging and ownership. Portrait mobile composition, shelf center, soft spotlight from above.

**Negative:**
> No gold sports trophies, no leaderboard, no scores, no comparison UI,
> no text, no brand logos, no casino, no empty boastful room

**`trophy_shelf_hero`** · catalog `art_prompt_catalog/0024b`

**Positive:**
> Hero shot of wooden trophy shelf with personal memory objects,
> soft warm spotlight, Nordic gentle pride illustration, child-scale treasures.

**Negative:** No sports trophies, no scores, no text

---

## Navigation

| Nav ID | Till | Pack scene | Catalog # | Villkor |
|--------|------|------------|-----------|---------|
| `door_hall` | Hallen | `home_hall` | 101 | alltid |

Ingång `door_trophy` från hall kräver `trophy_unlock`. `return_anchor: door_hall` · `comfort_zone: true`.

---

## Implementation notes

**Ej shipped.** Nav `door_trophy` från hall definierad i YAML. Låst tills `progression.routine_home.trophy_unlock` WDB node. Väder-reaktiv: false (interiör). QA-gates alla pending.

---

*Companion narrative for [`../data/150-trophy_room.yaml`](../data/150-trophy_room.yaml). Contracts live in YAML; this file explains why.*
