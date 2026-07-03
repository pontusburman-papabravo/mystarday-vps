# Läshörnan — Place Specification

> **Machine-readable contract (source of truth):** [`../data/160-reading_corner.yaml`](../data/160-reading_corner.yaml)  
> **Rulebook (frozen):** [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Status:** draft · **Catalog #:** 160 · **Room ID:** `reading_corner` · **Pack scene:** `reading_corner`

```yaml
# Excerpt — full contract in data/160-reading_corner.yaml
room:
  id: reading_corner
  pack_scene_id: reading_corner
  display_name_sv: Läshörnan
catalog_number: 160
status: draft
emotion: Calm
secondary_emotion: Capability
hero_object: reading_lamp
landmark: book_shelf_wall
navigation_targets: [bedroom]
unlock_condition: progression.reading_corner.unlock
```

---

## Overview

**Läshörnan** är ett mjukt hörn med lampa, kuddar, filt och låg bokhylla — platsen där dagen landar och barnet kan vara stilla och stolt över uppmärksamhet. Kvällshörna: filt fort, staplade sagor, tofflor vid kudde, gosedjur som "läser" med. Förälder har suttit här — tom liten stol som spår.

Unlock när kvällsrutiner stabiliserats (`progression.reading_corner.unlock`). Nav från sovrummet (#102). Story relics max 3 paneler — inte oändlig reader. Idag **ej shipped**.

**Katalogmappning:** Catalog #160 `reading_corner` ↔ pack `reading_corner` ↔ sovrum = #102 `bedroom`.

---

## Emotion

**Primär: Calm** — *"Här kan jag vara stilla."*

**Sekundär: Capability** — fokus som stolthet, inte skolarbete. Director `calmness_target: 90`, högsta i grannskapet.

| Constitution-pelare | Hur läshörnan stärker den |
|---------------------|---------------------------|
| Comfort | Amber-lampa, regn på fönster — kvällslandning |
| Capability | Bokhylla, bokmärke — fortsättning utan deadline |

`forbidden: homework_ui`. Inga timers eller läxor-UI.

---

## Purpose

Läshörnan stänger dagens loop:

1. **Reading lamp** — Activate; varm pool över kudde och bok.
2. **Story relic** — Open max 3 paneler (`story_1` → `story_complete`).
3. **Build slots** — Bokryggar, kudde, story relic på hylla.

Failure mode: klassrum eller skärmtid — kvällsankare bryts.

---

## Art Prompts

**`reading_corner_scene_hero`** · catalog `art_prompt_catalog/0025`

**Positive:**
> Nordic cozy reading corner interior, 2.5D illustrated diorama, warm amber evening lamp light.
> Soft floor cushions and blanket fort edge, low wooden bookshelf with colorful book spines,
> warm reading lamp casting golden pool, stuffed animal reading companion, slippers on rug,
> dark window showing night sky, star projector subtle on ceiling, peaceful focus atmosphere.
> Child eye height low angle, Scandinavian hygge, handcrafted warmth, calm not classroom.
> Portrait mobile composition, lamp and cushion center, bookshelf back wall, night window side.

**Negative:**
> No homework UI, no screens, no harsh desk lamp, no classroom, no text on book covers readable,
> no scary night, no stock photo, no clutter chaos

**`reading_lamp_hero`** · catalog `art_prompt_catalog/0025b`

**Positive:**
> Hero shot of warm reading lamp over open book and soft cushion,
> amber golden light pool, Nordic cozy evening illustration, calm focus.

**Negative:** No harsh light, no text readable

---

## Navigation

| Nav ID | Till | Pack scene | Catalog # | Villkor |
|--------|------|------------|-----------|---------|
| `door_bedroom` | Sovrummet | `bedroom` | 102 | alltid |

Ingång från sovrum kräver `reading_corner.unlock`. `return_anchor: door_bedroom` · `comfort_zone: true`.

---

## Implementation notes

**Ej shipped.** Evening unlock när kvällsrutiner stabila. Nav från bedroom definierad i `102-bedroom.yaml`. Hund kan sova på matta kvällstid. QA-gates alla pending.

---

*Companion narrative for [`../data/160-reading_corner.yaml`](../data/160-reading_corner.yaml). Contracts live in YAML; this file explains why.*
