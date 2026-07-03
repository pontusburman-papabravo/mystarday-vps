# Sjön — Place Specification

> **Machine-readable contract (source of truth):** [`../data/180-lake.yaml`](../data/180-lake.yaml)  
> **Rulebook (frozen):** [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Status:** draft · **Catalog #:** 180 · **Room ID:** `lake` · **Pack scene:** `lake`

```yaml
# Excerpt — full contract in data/180-lake.yaml
room:
  id: lake
  pack_scene_id: lake
  display_name_sv: Sjön
catalog_number: 180
status: draft
emotion: Calm
secondary_emotion: Wonder
hero_object: lake_dock
landmark: lily_pad_cluster
navigation_targets: [forest]
unlock_condition: progression.lake.unlock
```

---

## Overview

**Sjön** är grannskapets lugnaste utpost — spegelblank vatten, träbrygga över grunt vatten, näckrosor och skog som speglas i ytan. Platsen där tålamod och lugn får ta plats: fiskespö mot staket, båt uppdragen på strand, platta stenar att kasta, änder på avstånd. Svensk skogssjö — sommar och vinter (säker iskant, inte farlig).

Nås från skogen (`path_to_lake`) efter forest explore depth. Djupaste utpost i home neighborhood graph. Fiskebrygga-world tease v1.1+ (`progression.fishing_pier.unlock`). Idag **ej shipped**.

**Katalogmappning:** Catalog #180 `lake` ↔ pack `lake` ↔ skog = #170 `forest`.

---

## Emotion

**Primär: Calm** — *"Här kan jag vänta och titta."*

**Sekundär: Wonder** — trollslända, groda på näckros (sällsynt), guld på vatten kvällstid. Director `calmness_target: 88`.

| Constitution-pelare | Hur sjön stärker den |
|---------------------|----------------------|
| Comfort | Stillhet utan tomhet — ripples, vass, änder |
| Curiosity | Fisk under ytan, stenar att kasta — tålamod som fiction |

Vatten grunt och säkert vid brygga — aldrig skrämmande djupt. Inga fiske-minispel-grind.

---

## Purpose

Sjön är tålamod utan tråkig väntan:

1. **Lake dock** — Inspect; barn kan sitta på kanten.
2. **Skipping stones** — Activate platta stenar (visuell ripple, ej grind).
3. **Fishing rod slot** — Place efter unlock; patience fiction, inte minispel.

Failure mode: tom blå bitmap eller farligt djupt vatten — lugn-fantasin bryts.

---

## Art Prompts

**`lake_scene_hero`** · catalog `art_prompt_catalog/0031`

**Positive:**
> Nordic Scandinavian forest lake scene, 2.5D illustrated diorama, calm mirror-still water.
> Simple wooden dock extending over shallow safe water, lily pads cluster as landmark,
> reeds along shore, boat pulled up on grass, fishing rod leaning on fence,
> forest trees reflecting in water, ducks distant on surface, soft cool palette with warm accents,
> child eye height from shore, peaceful patience atmosphere, handcrafted illustration,
> Swedish summer lake feeling, not tropical, not scary deep water.
> Portrait mobile composition, dock foreground left, lake center, forest background reflected in water.

**Negative:**
> No scary deep water, no drowning danger, no horror, no tropical beach,
> no text, no brand logos, no stock photo, no empty flat blue

**`lake_dock_hero`** · catalog `art_prompt_catalog/0031b`

**Positive:**
> Hero shot of simple wooden lake dock over calm shallow water,
> lily pads nearby, forest reflection, Nordic peaceful illustration, child-safe inviting pier.

**Negative:** No dangerous deep water, no scary

---

## Navigation

| Nav ID | Till | Pack scene | Catalog # |
|--------|------|------------|-----------|
| `path_forest` | Skogen | `forest` | 170 |

`return_anchor: path_from_forest` · `comfort_zone: true`. Endast retur via skog — dead end i grannskapsgrafen (v1).

---

## Implementation notes

**Ej shipped.** Djupaste utpost i neighborhood graph. Fiskebrygga v1.1+ tease via `fishing_rod_spot`. Vinter: säker iskant (`evt_snow_morning`). Hund tittar på vatten, badar inte automatiskt. QA-gates alla pending.

---

*Companion narrative for [`../data/180-lake.yaml`](../data/180-lake.yaml). Contracts live in YAML; this file explains why.*
