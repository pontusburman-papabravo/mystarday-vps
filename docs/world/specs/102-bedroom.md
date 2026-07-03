# Sovrummet — Place Specification

> **Machine-readable contract (source of truth):** [`../data/102-bedroom.yaml`](../data/102-bedroom.yaml)  
> **Rulebook (frozen):** [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Status:** draft · **Catalog #:** 102 · **Room ID:** `bedroom` · **Pack scene:** `bedroom`

```yaml
# Excerpt — full contract in data/102-bedroom.yaml
room:
  id: bedroom
  pack_scene_id: bedroom
  display_name_sv: Sovrummet
catalog_number: 102
status: draft
emotion: Calm
secondary_emotion: Comfort
hero_object: child_bed
landmark: window_night_light
navigation_targets: [hall, reading_corner]
unlock_condition: always
```

---

## Overview

**Sovrummet** är barnets eget territorium — mjukt kvällsljus genom fönster, ordnad säng och personliga detaljer på hylla. Platsen där dagen landar och morgondagen väntar, utan prestation eller belöningsskärm. Rummet ska kännas levande men lugnt: nalle på kudden, ritning under kudden, morgondagens tröja på stol — tecken på att någon (förälder) redan varit här och lämnat värme.

Sovrummet är en del av hemklustret (100–105) och nås från hallen. Det kopplas naturligt till **läshörnan** (160) när kvällsrutiner stabiliserats — en mjuk förlängning av kvällslandningen, inte en separat app. Idag är rummet **inte shipped som egen scen**; hallens `door_bedroom`-nav finns i `101-hall.yaml` men pack/scenes.json saknas.

**Katalogmappning:** Catalog #102 `bedroom` ↔ pack `bedroom` ↔ nav till hall = #101 `home_hall`, läshörna = #160 `reading_corner` (progression-gated).

---

## Emotion

**Primär: Calm** — *"Här kan jag andas ut."*

**Sekundär: Comfort** — mjukt fönsterljus, nattlampa på fönsterbräda, inga modaler vid inträde. Director `calmness_target: 85`, lägsta stressnivå.

| Constitution-pelare | Hur sovrummet stärker den |
|---------------------|---------------------------|
| Comfort | Trygg landning efter Idag; inga recap-toasts |
| Ownership | Säng, hylla, tillväxtstreck på dörrkarm — "mitt eget" |
| Capability | Indirekt — kvällsrutiner låser upp hylla och nattlampa |

Nattvariant ska kännas trygg — inga skrämmande skuggor. Barnet kan stanna utan stjärnor eller uppdrag.

---

## Purpose

Sovrummet svarar på tre frågor:

1. **Var landar jag?** — Säng + fönster + nattlampa synliga i första bild.
2. **Vad hände idag?** — Miljöberättande (filt vikt i hörn, ritning under kudden) utan quest-logg.
3. **Vad kommer imorgon?** — Morgondagens kläder på stol; stjärnor genom fönster (sällsynt).

Sovrummet är **inte** belöningsskärm. Evolution sker via verkliga rutiner: `bedroom_shelf`, `pet_bed`, `bedroom_night_light`, `bedroom_star` (shooting star, 14-dagars cooldown).

---

## Art Prompts

**`bedroom_scene_hero`** · catalog `art_prompt_catalog/0010`

**Positive:**
> Nordic child bedroom interior, 2.5D illustrated diorama, warm evening atmosphere.
> Low wooden bed with soft blanket and pillow, stuffed animal on bed.
> Window on right with small warm night light on sill, twilight sky visible.
> Wooden floor, soft rug, small shelf with books, chair with tomorrow's clothes.
> Child eye height camera, cozy lagom Scandinavian style, handcrafted illustration,
> soft shadows, no clutter, lived-in warmth, golden amber interior light mixed with cool blue from window.
> Portrait mobile composition, bed in lower third, ceiling with subtle star stickers.

**Negative:**
> No text on walls, no brand logos, no scary shadows, no horror night,
> no empty grey room, no stock photo, no realistic horror, no neon,
> no adult bedroom, no messy chaos

**`child_bed_hero`** · catalog `art_prompt_catalog/0010b`

**Positive:**
> Close hero shot of child's low wooden bed, soft knitted blanket, pillow with stuffed friend,
> warm side light from night lamp, Nordic illustrated style, inviting and calm.

**Negative:** No scary, no text, no brand logos

---

## Navigation

| Nav ID | Till | Pack scene | Catalog # | Villkor |
|--------|------|------------|-----------|---------|
| `door_hall` | Hallen | `home_hall` | 101 | alltid |
| `door_reading_corner` | Läshörnan | `reading_corner` | 160 | `progression.reading_corner.unlock` |

`comfort_zone: true` · `return_anchor: door_hall`. Hund (`dog_companion`) kan sova i pet_bed kvällstid — ingen hunger timer.

---

## Implementation notes

**Ej shipped.** Blueprint för art pipeline; `child-morgonhus.js` implementerar inte egen bedroom-scen ännu. Hall door_bedroom nav definierad i `101-hall.yaml`. Pack `scenes.json` ej skapad. QA-gates: designer/artist/ai_gen/engineer alla pending.

---

*Companion narrative for [`../data/102-bedroom.yaml`](../data/102-bedroom.yaml). Contracts live in YAML; this file explains why.*
