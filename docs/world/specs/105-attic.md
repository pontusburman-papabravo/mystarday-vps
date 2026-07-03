# Vinden — Place Specification

> **Machine-readable contract (source of truth):** [`../data/105-attic.yaml`](../data/105-attic.yaml)  
> **Rulebook (frozen):** [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Status:** draft · **Catalog #:** 105 · **Room ID:** `attic` · **Pack scene:** `attic`

```yaml
# Excerpt — full contract in data/105-attic.yaml
room:
  id: attic
  pack_scene_id: attic
  display_name_sv: Vinden
catalog_number: 105
status: draft
emotion: Imagination
secondary_emotion: Curiosity
hero_object: treasure_trunk
landmark: roof_window
navigation_targets: [hall]
unlock_condition: progression.routine_home.attic_unlock
```

---

## Overview

**Vinden** är husets höga hemlighet — snedt tak, damm i ljusstrålar, gamla kistor och familjehistoria. Platsen där fantasi och minnen bor under takåsen: farmors kista, gamla leksaker, teckningar i låda, initialer i balk. Inte skräckvind — spännande men tryggt.

Vinden låses upp via `progression.routine_home.attic_unlock` (utforskningströskel). Före unlock: repstege-tease synlig från hall. Efter unlock: full scen med kista, takfönster och hyllor. Idag **ej shipped**.

**Katalogmappning:** Catalog #105 `attic` ↔ pack `attic` ↔ hall = #101 `home_hall` (trappa upp/ner).

---

## Emotion

**Primär: Imagination** — *"Här finns saker som betyder något."*

**Sekundär: Curiosity** — ljusstråle genom takfönster, damm som glittrar, nyckel på krok. Director `calmness_target: 75`.

| Constitution-pelare | Hur vinden stärker den |
|---------------------|------------------------|
| Imagination | Kista, gammal leksak, teckningslåda — fantasi utan quest-logg |
| Curiosity | Öppna frågor: vad finns i låsta kistan? Vem ristade initialerna? |

Spindelnät i hörn = natur, inte skräck. `comfort_zone: false` — utforskning, inte hemma-hub.

---

## Purpose

Vinden belönar långsiktig nyfikenhet:

1. **Earned unlock** — Repstege tease → full vind efter explore threshold.
2. **Treasure trunk** — Inspect + Open (`attic_memory`); familjefoto, filt, teckningar.
3. **Evolution** — `attic_shelf`, `memory_box`, `attic_secret_map` (hidden discovery).

Failure mode: skräckvind eller tom lagringslåda — magin dör.

---

## Art Prompts

**`attic_scene_hero`** · catalog `art_prompt_catalog/0013`

**Positive:**
> Nordic attic interior under sloped wooden roof, 2.5D illustrated diorama.
> Golden sunbeam through roof window illuminating floating dust motes.
> Old wooden treasure trunk with brass clasp center, folded quilt, toy wheel,
> hat boxes, rope ladder, wooden floorboards with patina.
> Warm curious atmosphere, not scary horror attic. Child eye height looking slightly up,
> handcrafted Scandinavian illustration, sloped ceiling, cozy mystery, golden light beam.
> Portrait mobile composition, roof window upper third, trunk lower center.

**Negative:**
> No horror, no scary shadows, no ghosts, no cobweb horror, no dark evil attic,
> no text, no brand logos, no stock photo, no empty grey room

**`treasure_trunk_hero`** · catalog `art_prompt_catalog/0013b`

**Positive:**
> Hero shot of old wooden treasure chest with brass lock, corner of quilt peeking out,
> golden dust motes in light beam, Nordic warm illustrated style, inviting mystery.

**Negative:** No horror, no scary, no text

---

## Navigation

| Nav ID | Till | Pack scene | Catalog # | Villkor |
|--------|------|------------|-----------|---------|
| `stairs_to_hall` | Hallen | `home_hall` | 101 | efter unlock |
| `stairs_from_hall` | Vinden | `attic` | 105 | `attic_unlock` |

`return_anchor: stairs_to_hall`. Kamera: `tilt_up_gentle` vid inträde; snedt tak, takfönster övre tredjedel.

---

## Implementation notes

**Ej shipped.** Låst tills `progression.routine_home.attic_unlock`. Repstege-tease från hall. Regn på tak = mysigt ljud inuti. Hund kan sniffa vid kistan vid första besök. QA-gates alla pending.

---

*Companion narrative for [`../data/105-attic.yaml`](../data/105-attic.yaml). Contracts live in YAML; this file explains why.*
