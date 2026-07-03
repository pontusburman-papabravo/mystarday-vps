# Husdjursstugan — Place Specification

> **Machine-readable contract (source of truth):** [`../data/140-pet_house.yaml`](../data/140-pet_house.yaml)  
> **Rulebook (frozen):** [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Status:** draft · **Catalog #:** 140 · **Room ID:** `pet_house` · **Pack scene:** `pet_house`

```yaml
# Excerpt — full contract in data/140-pet_house.yaml
room:
  id: pet_house
  pack_scene_id: pet_house
  display_name_sv: Husdjursstugan
catalog_number: 140
status: draft
emotion: Comfort
secondary_emotion: Curiosity
hero_object: rescue_bed_nook
landmark: warm_lamp_post
navigation_targets: [garden]
unlock_condition: progression.pet_home.unlock
```

---

## Overview

**Husdjursstugan** är en varm stuga för djur som behövde ett hem — halm, mjuk lampa, vattenskål och morotshörna. Platsen där barnet lär sig försiktig tillhörighet utan Tamagotchi-skuld: djur väntar varmt men straffar aldrig frånvaro. Rescue-fiction — inte köpta loot-box-djur.

Mid-game unlock (W-02) via trädgårdens grind (`gate_pet_house`). Separat från `dog_companion` i hall — rescue-kanin/igelkott med namngivning men **ingen hunger timer**. Idag **ej shipped**.

**Katalogmappning:** Catalog #140 `pet_house` ↔ pack `pet_house` ↔ trädgård = #110 `garden`.

---

## Emotion

**Primär: Comfort** — *"Här är det tryggt för dem."*

**Sekundär: Curiosity** — djur sover eller tittar nyfiket; tom namnskylt att fylla. Director `calmness_target: 86`.

| Constitution-pelare | Hur husdjursstugan stärker den |
|---------------------|--------------------------------|
| Comfort | Inga "du glömde mata"-meddelanden; `forbidden: guilt_message` |
| Curiosity | Morotshörna, fjäder på fönster — öppna frågor |

LWES §26: hunger_timer, sick_state, guilt_dialogue alla FORBIDDEN.

---

## Purpose

Husdjursstugan speglar omsorg utan prestation:

1. **Rescue bed** — Pet, Inspect; djur andas mjukt.
2. **Care verbs** — `feed_gentle`, `brush` — firar verklig omsorg (G-01).
3. **Evolution** — `second_rescue`, `play_corner`, `sanctuary_plaque` (sent game).

Failure mode: Tamagotchi, zoo eller tom dekoration — omsorgsfantasin bryts.

---

## Art Prompts

**`pet_house_scene_hero`** · catalog `art_prompt_catalog/0023`

**Positive:**
> Nordic cozy animal rescue shed interior, 2.5D illustrated diorama, warm lamp glow.
> Soft hay bed with blanket, gentle rabbit or small rescue animal resting peacefully,
> water bowl with ripple, carrot bin, brush on hook, wooden walls, garden visible through open gate,
> warm farmhouse lamp casting golden pool of light, straw on floor, caring atmosphere not zoo.
> Child eye height, Scandinavian lagom warmth, no cages, no guilt, gentle belonging.
> Portrait mobile composition, bed center, lamp upper right, gate to garden background left.

**Negative:**
> No cages, no sad animals, no Tamagotchi UI, no hunger meters, no guilt text,
> no horror, no stock photo, no dirty neglect aesthetic

**`rescue_bed_hero`** · catalog `art_prompt_catalog/0023b`

**Positive:**
> Hero shot of cozy hay pet bed with soft blanket, warm lamp light,
> small rescue rabbit sleeping peacefully, Nordic gentle illustration.

**Negative:** No cages, no sad, no text

---

## Navigation

| Nav ID | Till | Pack scene | Catalog # | Villkor |
|--------|------|------------|-----------|---------|
| `gate_garden` | Trädgården | `garden` | 110 | alltid |

`return_anchor: gate_from_garden` · `comfort_zone: true`. Ingång via `path_gate_small` från trädgård.

---

## Implementation notes

**Ej shipped.** Mid-game unlock W-02 (`progression.pet_home.unlock`). Separat från hall-hund. Frånvaro → djur välkomnar varmt utan skuld (`absence_days` ecology). QA-gates alla pending.

---

*Companion narrative for [`../data/140-pet_house.yaml`](../data/140-pet_house.yaml). Contracts live in YAML; this file explains why.*
