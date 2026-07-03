# Verkstaden — Place Specification

> **Machine-readable contract (source of truth):** [`../data/120-workshop.yaml`](../data/120-workshop.yaml)  
> **Rulebook (frozen):** [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
> **Status:** draft · **Catalog #:** 120 · **Room ID:** `workshop` · **Pack scene:** `workshop`

```yaml
# Excerpt — full contract in data/120-workshop.yaml
room:
  id: workshop
  pack_scene_id: workshop
  display_name_sv: Verkstaden
catalog_number: 120
status: draft
emotion: Capability
secondary_emotion: Imagination
hero_object: workbench_hero
landmark: pegboard_tools
navigation_targets: [garden]
unlock_condition: progression.workshop.unlock
```

---

## Overview

**Verkstaden** är familjens maker-rum — träbänk, verktyg på pegboard, halvfärdiga projekt och träspån på golvet. Platsen där händer skapar och barnet känner "jag kan fixa saker" utan farliga verktyg eller könsstereotyper. Nordisk fredagsmys-verkstad: blyertsspill, halvfärdigt fågelhus, förälders verktyg out of reach men synliga.

Verkstaden nås från trädgården (`path_workshop`) och låses upp vecka 2–3 per Progression Bible. Rök från skorsten synlig som tease från trädgården när unlocked. Idag **ej shipped**.

**Katalogmappning:** Catalog #120 `workshop` ↔ pack `workshop` ↔ trädgård = #110 `garden`.

---

## Emotion

**Primär: Capability** — *"Här bygger jag saker som betyder något."*

**Sekundär: Imagination** — fågelhus-projekt, ritningar, färgburkar. Director `calmness_target: 72`.

| Constitution-pelare | Hur verkstaden stärker den |
|---------------------|----------------------------|
| Capability | Pall vid bänk, Place-verktyg på pegboard — maker pride |
| Imagination | Halvfärdigt fågelhus → placeras i trädgårdsträd |

Könsneutral verkstad för alla barn. Inga roterande blad eller farliga verktyg i förgrund.

---

## Purpose

Verkstaden firar maker-stolthet:

1. **Workbench** — Inspect halvfärdigt projekt; Activate fågelhus (`project_birdhouse`).
2. **Pegboard** — Verktyg låses upp via hjälp-aktiviteter (`tool_hammer`, `tool_saw`).
3. **Ecology** — Färdigt fågelhus synligt i trädgårdsträd; rök-tease konsekvent från trädgård.

Failure mode: farlig garage eller generisk asset-butik — kompetens-fantasin dör.

---

## Art Prompts

**`workshop_scene_hero`** · catalog `art_prompt_catalog/0021`

**Positive:**
> Nordic family workshop shed interior, 2.5D illustrated diorama, warm honey wood tones.
> Sturdy wooden workbench center with wood shavings, half-built birdhouse project,
> pegboard wall with satisfying tool silhouettes (hammer, saw, screwdriver — safe, no spinning blades),
> window showing green garden outside, soft work lamp glow, child step stool,
> sorted screw jars, measuring tape, pencil shavings. Maker pride atmosphere,
> lagom messy not chaotic, child eye height, handcrafted Scandinavian illustration.
> Portrait mobile composition, workbench lower center, pegboard upper back wall.

**Negative:**
> No dangerous power tools prominent, no spinning blades, no horror, no text,
> no brand logos, no greasy industrial garage, no stock photo

**`workbench_hero`** · catalog `art_prompt_catalog/0021b`

**Positive:**
> Hero close-up of wooden workbench with birdhouse project, wood shavings,
> clamp, warm side light, Nordic maker illustration, safe child-friendly workshop.

**Negative:** No sharp danger, no text

---

## Navigation

| Nav ID | Till | Pack scene | Catalog # |
|--------|------|------------|-----------|
| `path_garden` | Trädgården | `garden` | 110 |

`return_anchor: path_from_garden` · `comfort_zone: false`. Ingång via `door_shed_open` från trädgård.

---

## Implementation notes

**Ej shipped.** Unlock vecka 2–3 per PCB. Rök-tease från trädgård (`workshop_smoke_tease`) när unlocked. Fågelhus i träd = cross-room ecology. QA-gates alla pending.

---

*Companion narrative for [`../data/120-workshop.yaml`](../data/120-workshop.yaml). Contracts live in YAML; this file explains why.*
