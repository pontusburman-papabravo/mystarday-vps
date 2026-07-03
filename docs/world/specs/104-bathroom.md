# Badrummet — Place Specification

> **Machine-readable contract (source of truth):** [`../data/104-bathroom.yaml`](../data/104-bathroom.yaml)  
> **Rulebook (frozen):** [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Status:** draft · **Catalog #:** 104 · **Room ID:** `bathroom` · **Pack scene:** `home_bathroom`

```yaml
# Excerpt — full contract in data/104-bathroom.yaml
room:
  id: bathroom
  pack_scene_id: home_bathroom
  display_name_sv: Badrummet
catalog_number: 104
status: draft
emotion: Capability
secondary_emotion: Comfort
hero_object: bathroom_mirror
landmark: tile_wall_pattern
navigation_targets: [hall]
unlock_condition: always
```

---

## Overview

**Badrummet** är hemmets kapacitetsrum — kakel i mjuka toner, spegel ovan tvättställ, badkar med badanka och barnhörna med låg krok och färgglad mugg. Platsen där morgon- och kvällsrutiner känns trygga och begripliga: tandborstning, handtvätt, kvällsritual — utan skam eller överdriven lekfullhet.

Rummet ska kännas rent men varmt, inte kliniskt som sjukhus. Stegpall gör spegeln tillgänglig på barn-ögonhöjd. Idag **ej shipped**; `mirror_corner` kopplad till Progression Bible Day 7 (`progression.routine_home.mirror`).

**Katalogmappning:** Catalog #104 `bathroom` ↔ pack `home_bathroom` ↔ hall = #101 `home_hall`.

---

## Emotion

**Primär: Capability** — *"Jag klarar det själv."*

**Sekundär: Comfort** — mjuk belysning, badanka, nattlampa kvällstid. Director `calmness_target: 82`, lägsta aktivitetsnivå.

| Constitution-pelare | Hur badrummet stärker den |
|---------------------|---------------------------|
| Capability | Pall, barnmugg, tvålpump — självständighet utan facit |
| Comfort | Imma på spegel efter dusch = varmt, inte kallt |

Inga skrämmande spegelreflektioner. Inga överraskande karaktärer i spegel. Husdjur ej tillåtna här.

---

## Purpose

Badrummet stärker dagliga självvårdsrutiner:

1. **Spegeln** — "Här ser jag mig själv och fixar till" (Inspect + Activate sink).
2. **Mirror corner** — Unlock efter 3-dagars tandborstnings-streak; hylla vid spegel.
3. **Kvällsritual** — Badkar, nattlampa, `evening_bath` progression (framtida).

Failure mode: kliniskt, skrämmande eller skämtigt — kapacitetsankare bryts.

---

## Art Prompts

**`bathroom_scene_hero`** · catalog `art_prompt_catalog/0012`

**Positive:**
> Nordic family bathroom interior, 2.5D illustrated diorama, soft neutral-warm lighting.
> Child-height sink with step stool, round mirror above with soft ring light glow,
> subtle patterned tile wall in muted Scandinavian colors (sage, cream, soft blue).
> Bathtub with rubber duck, fluffy towel on hook, toothbrush mug, soap dispenser.
> Clean but cozy, not clinical hospital. Child eye height camera, handcrafted illustration,
> portrait mobile composition, mirror centered upper third, warm inviting atmosphere.

**Negative:**
> No text, no brand logos, no scary mirror, no horror, no clinical sterile white,
> no stock photo, no grime, no adult spa luxury

**`bathroom_mirror_hero`** · catalog `art_prompt_catalog/0012b`

**Positive:**
> Hero shot of child bathroom mirror above sink, soft warm light, step stool visible,
> toothbrush mug, Nordic illustrated cozy style, capability and comfort.

**Negative:** No scary reflection, no text, no brand logos

---

## Navigation

| Nav ID | Till | Pack scene | Catalog # |
|--------|------|------------|-----------|
| `door_hall` | Hallen | `home_hall` | 101 |

`comfort_zone: true` · `return_anchor: door_hall`. Smalt 2.5D-interiör — spegel i övre mitt, badkar bakom.

---

## Implementation notes

**Ej shipped.** `mirror_corner_room` build slot kopplad till `progression.routine_home.mirror` (Day 7). QA-gates alla pending. Väder-reaktiv: regn på litet fönster, tyngre imma vid kyla.

---

*Companion narrative for [`../data/104-bathroom.yaml`](../data/104-bathroom.yaml). Contracts live in YAML; this file explains why.*
