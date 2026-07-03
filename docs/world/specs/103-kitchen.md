# Köket — Place Specification

> **Machine-readable contract (source of truth):** [`../data/103-kitchen.yaml`](../data/103-kitchen.yaml)  
> **Rulebook (frozen):** [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Status:** draft · **Catalog #:** 103 · **Room ID:** `kitchen` · **Pack scene:** `home_kitchen`

```yaml
# Excerpt — full contract in data/103-kitchen.yaml
room:
  id: kitchen
  pack_scene_id: home_kitchen
  display_name_sv: Köket
catalog_number: 103
status: draft
emotion: Comfort
secondary_emotion: Capability
hero_object: breakfast_table
landmark: window_garden_view
navigation_targets: [hall]
unlock_condition: always
```

---

## Overview

**Köket** är hemmets morgonankare — varm morgonluft, frukostbord vid fönster, spis med diskret ugnsglöd och diskho med barnpall. Platsen där morgonmat och helgmys samlas utan stress eller mat-skuld. Rummet ska kännas som ett levande familjekök: kaffekopp, barnritning på kylskåp, handduk på krok, honungsburk i ljusstråle — lagom rörigt, aldrig smutsigt.

Köket nås enbart från hallen och är en del av hemklustret (100–105). Stort fönster mot trädgården ger grönt ljus in och kopplar interiören till utomhusvärlden (#110). Idag **ej shipped** som egen scen; `breakfast_nook` kopplad till Progression Bible Day 30.

**Katalogmappning:** Catalog #103 `kitchen` ↔ pack `home_kitchen` ↔ hall = #101 `home_hall`.

---

## Emotion

**Primär: Comfort** — *"Här är det varmt och tryggt."*

**Sekundär: Capability** — barnpall vid diskho, frukostbord som inbjuder till deltagande. Director `calmness_target: 78`. Känns varmt vid 07:15 — inte stressigt.

| Constitution-pelare | Hur köket stärker den |
|---------------------|----------------------|
| Comfort | Varmt ljus, ånga från tekanna, inga diet-meddelanden |
| Capability | "Jag når" — pall, hjälp-känsla utan uppdrags-UI |

Inga popup, dialog eller reward_toast vid inträde. Tekanna med lätt ånga efter ~2 s.

---

## Purpose

Köket firar morgon- och hjälp-rutiner:

1. **Morgonankare** — Frukostbord + fönster mot trädgård = "här börjar dagen".
2. **Bidra utan skuld** — Spis (Activate), pall, magnetram — aldrig mat-shame.
3. **Evolution** — `breakfast_nook` (Day 30), `kitchen_herb`, `kitchen_magnet`, `secret_tray` (pannkaksmys tease).

Failure mode: känns som restaurang eller steril showroom — morgonankare försvinner.

---

## Art Prompts

**`kitchen_scene_hero`** · catalog `art_prompt_catalog/0011`

**Positive:**
> Nordic family kitchen interior, 2.5D illustrated diorama, warm morning light.
> Round wooden breakfast table with chairs near large window showing green garden outside.
> Stove with soft warm glow, kettle with gentle steam, wooden cabinets, honey-toned wood.
> Child-height step stool near sink, fridge with child's drawing magnet, fruit bowl on counter.
> Child eye height camera, Scandinavian lagom cozy style, handcrafted warmth,
> soft golden morning light through window mixing with warm interior tones.
> Portrait mobile composition, table center-left, garden visible through window right.

**Negative:**
> No text, no brand logos, no sterile restaurant kitchen, no scary,
> no empty grey room, no stock photo, no clutter chaos, no sharp knives prominent

**`breakfast_table_hero`** · catalog `art_prompt_catalog/0011b`

**Positive:**
> Hero close-up of cozy breakfast table, wooden surface, morning light, cereal bowl,
> juice glass, warm Nordic illustrated style, inviting family morning.

**Negative:** No text, no brand logos, no food shame imagery

---

## Navigation

| Nav ID | Till | Pack scene | Catalog # |
|--------|------|------------|-----------|
| `door_hall` | Hallen | `home_hall` | 101 |

`comfort_zone: true` · `return_anchor: door_hall`. Endast en ingång — köket är sidorum i hemklustret, inte hub.

---

## Implementation notes

**Ej shipped.** Blueprint för art pipeline. `breakfast_nook` progression definierad i YAML kopplad till Progression Bible Day 30. QA-gates alla pending. Spis-kettle Activate (`progression.routine_home.kettle_anim`) planerad.

---

*Companion narrative for [`../data/103-kitchen.yaml`](../data/103-kitchen.yaml). Contracts live in YAML; this file explains why.*
