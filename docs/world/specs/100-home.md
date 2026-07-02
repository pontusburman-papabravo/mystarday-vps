# Home (exterior) — Production Specification

> **Machine-readable contract (source of truth):** [`../data/100-home.yaml`](../data/100-home.yaml)  
> **Rulebook (frozen):** [World Bible §1 + Part I + Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md)  
> **Status:** draft · **Production #:** 100 · **Room ID:** `home` · **Pack scene:** `home_exterior`

```yaml
# Excerpt — full contract in data/100-home.yaml
room:
  id: home
  pack_scene_id: home_exterior
  display_name_sv: Mitt hem
production_number: 100
status: draft
emotion: Ownership
hero_object: front_door
landmark: chimney
navigation_targets: [hall, garden]
```

---

## Overview

**Home (exterior)** är barnets första yttre vy av hemmet — inte en laddningsskärm, utan en plats i grannskapet. Huset sitter i centrum av den kända kartan (World Bible Part I: *Home Is The Center*). Barnet ser fasaden, skorstenen, dörren, brevlådan och stigen mot trädgården innan de kliver in.

Idag är denna vy **inte shipped som egen scen**. `child-morgonhus.js` implementerar `routine_home` som en interior-upplevelse med prop-knappar (`welcome_mat`, `first_light`, `door`). LWES anger `starting_scene_id: home_hall` och `home_exterior` finns som normativ blueprint i World Bible legacy-exempel, Progression Bible och Art Prompt Catalog `0001`. Denna spec dokumenterar **målbilden** och kopplar befintlig kod där den finns.

**Katalogmappning:** Production #100 `home` ↔ pack `home_exterior` ↔ interior hall = #101 `hall` (`home_hall`).

---

## Emotion

**Primär: Ownership** — *"Det här är mitt."*

Barnet ska känna att huset tillhör dem innan de öppnat dörren. Fasaden är personlig men inte överbelamrad; tomma zoner (t.ex. framtida kruka vid dörr) inbjuder till framtida ägande utan att kräva grind.

**Sekundär: Comfort** — mjukt morgonljus, varm glöd genom fönster, ingen skuld vid återkomst.

| Constitution-pelare | Hur exterior stärker den |
|---------------------|--------------------------|
| Ownership | Välkomstmatta, personlig fasad, "mitt hus" |
| Comfort | Välkomnande dörr, inga straff, lugn Director (calmness ≥ 85) |
| Curiosity | Brevlåda, paketplats, öppna frågor utan facit |
| Imagination | Barnet bestämmer vem som bor där inne |
| Capability | Indirekt — verkliga morgonrutiner låser upp matta/ljus |

---

## History

World Bible Part I etablerade **skorsten med lätt rök** som Hem-landmärke. Legacy scene entry `home_exterior` (World Bible Part IV) definierade emotion job `ownership`, story anchor `mailbox`, och navigation till `home_hall` + `garden`.

Progression Bible placerar **Day 1 welcome_mat** synligt vid `home_exterior` — första foten innanför-berättelsen börjar utifrån. Shipped `progression.json` har endast `routine_home_welcome_mat` och `routine_home_first_light` — exterior-specifik rendering återstår.

---

## Purpose

Exterior svarar på tre Part I Physical Continuity-frågor:

1. **Var är jag?** — igenkännbar husfasad + skorsten.
2. **Var kom jag ifrån?** — stig från trädgården bakom mig.
3. **Vart kan jag gå?** — dörr in (hall) eller stig ut (trädgård).

Exterior är **inte** en separat app eller belöningsskärm. Det är tröskeln till hela hemklustret (100–105).

---

## Story

**Öppna frågor (inga quest-loggar):**

- Vem skickade brevet i lådan?
- Varför lyser det varmt i fönstret?
- Vem lämnade paketet vid dörren? (föräldraöverraskning utifrån — Parent Principle)

**Pretend affordances:** ankomst hem, kolla post, vänta på någon vid dörren.

Story anchors i YAML: `first_arrival`, `warm_windows`, framtida `porch_planter_bloom`.

---

## Camera

Fast **2.5D diorama**, barn-ögonhöjd (Art Prompt Catalog 0001: hus centrerat, dörr nedre tredjedel, himmel ~40%). Ingen fri kamera. `pan_on_enter: gentle_pan_home` — långsam, lugn. `prefers-reduced-motion` → statisk frame.

---

## Layout

```
        [sky / birds]
    ┌─────────────────────┐
    │   chimney + roof    │
    │  [window glow]      │
    │      [door]  [mail] │
    └─────────────────────┘
   [lawn / welcome mat ghost]
         ╲ path ╱
          garden
```

Zoner: `zone_front_door`, `zone_mailbox`, `zone_welcome_mat_exterior`, `zone_path_garden`. Framtida: `zone_porch_planter`, `zone_garden_gate`.

---

## Lighting

TBD — full tid/väder i YAML `lighting_contract`. Primär: `sun_morning_golden`. Sekundär: `window_warm_interior_glow` (koppling till hall fireplace TBD). Kväll: amber fönsterglöd. Natt: cool moon silhouette — inget skrämmande.

---

## Weather

TBD — atmosfär only. Regn på tak, vind i gräs, lätt snö på tak (World Events `evt_snow_morning`). Påverkar inte gameplay gates.

---

## Time of Day

TBD — morning default. Evening/night variants i `lighting_contract.time_variants` och audio `home_exterior_night`.

---

## Navigation

Explicit edges (aldrig infererade):

| Nav ID | Till | Pack scene | Catalog # |
|--------|------|------------|-----------|
| `door_enter` | Hallen | `home_hall` | 101 |
| `path_garden` | Trädgården | `garden` | 110 |

`comfort_zone: true` — barnet kan alltid tänka "jag går hem" och landa här. `return_anchor: path_from_garden`.

Implementation: `child-morgonhus.js` door prop → `LivingWorldTransition.enterGarden` när `garden_playable` — exterior transition TBD.

---

## Hero Object

**`front_door`** — husets huvuddörr. Story purpose: tröskeln mellan utomvärld och hem; "Här bor jag" utan förklarande text. Interaction: Navigate → hall.

Alternativt landmärke i minnet: **skorsten** (Part I) — hero förblir dörr eftersom den är primär affordance.

---

## Ambient

Fåglar på distans (`birds: true`), gräs i bris, tunn skorstenrök, gardin genom fönster. Inga fjärilar på fasaden (`butterflies: false`). Director `calmness_target: 85`, låg visual density (0.55).

---

## NPC

TBD — inga NPCs på exterior som standard. Hund (`dog_companion`) primärt i hall; kan hälsa vid dörr — animation TBD.

---

## Pet

`allowed: true` — favorite spots: welcome mat, path. Ingen hunger timer (LWES §26 FORBIDDEN).

---

## Build Slots

| Slot | Unlock | Status |
|------|--------|--------|
| `exterior_welcome_mat` | `progression.routine_home.welcome_mat` | Shipped i morgonhus (interior prop) — exterior view TBD |
| `porch_planter` | TBD | Framtida |

WDB `routine_home_welcome_mat` — "Första foten innanför — du hör hemma." Exterior gör mattan synlig utifrån efter unlock.

---

## Interactions

LWES §22 typer endast: Navigate (dörr, trädgård), Inspect/Open (brevlåda), Place (matta). Se `interactive_objects` i YAML.

---

## Audio

Profile `home_exterior_day` (Audio Bible): fåglar, gräs/vind, sällsynt `door_knock_gentle` vid parent gift event. `master_gain_max: 0.60`. Night variant TBD.

---

## Particles

TBD — chimney smoke wisp, eventuellt lätt damm i morgonljus. Max 2 particle systems per performance budget.

---

## Secrets

TBD — `secret_footprint_path` (hidden discovery) kräver kindness + explore flag — ej definierad i WDB ännu.

---

## Discoveries

Common: gräs, skorsten. Rare: brev i lådan. Seasonal: snö på tak, födelsedagskrans. Se YAML `discoveries`.

---

## Season

`global_sync: true` — winter/summer/birthday overlays i YAML. Koppling World Events Bible.

---

## Evolution

Exterior **växer med verkliga rutiner**, inte med skärmtid:

| Fas | WDB / signal | Synlig förändring |
|-----|--------------|-------------------|
| Day 1 | `routine_home_welcome_mat` | Välkomstmatta |
| Day 1+ | `routine_home_first_light` | Varmt fönsterljus (interior; synlig utifrån TBD) |
| Day 7+ | `routine_home_window_bird` | Fågel vid fönster (hall — sightline TBD) |
| Day 30+ | `routine_home_museum_frame` | Minnesram synlig utifrån? TBD |
| Framtid | porch planter, seasonal wreath | YAML `future_build_zones` |

**Ecology:** Exterior tar emot ljud/sikt från trädgård (fåglar) och antyder verkstad (rök i sightline Part I — TBD implementation). Världen andas — inga timers.

---

## Theme Variants

Sex teman (Constitution Themes) — samma topologi, annan hud: `house`, `castle`, `treehouse`, `space`, `pirate`, `wizard`. Se YAML `theme_variants`.

---

## Accessibility

TBD — inget ljud-only critical info. Reduced motion → static frame. 44pt touch på dörr/mailbox hotspots när shipped.

---

## Performance

Budget: 60 fps, ≤7 hotspots, ≤10 MB textures, first paint <200ms. Monolit exterior ej shipped — split layers per Art Prompt Catalog D_export TBD.

---

## Prompt

Art Prompt Catalog `0001` — Nordic family house exterior, morning, child-scale warmth. `catalog_ref: art_prompt_catalog/0001`. Negative: inga bilar, logotyper, skrämmande skuggor.

---

## QA

| Gate | Status |
|------|--------|
| Designer | Ja — Ownership + Comfort, Home Is The Center |
| Artist | Delvis — hero/zones definierade; assets TBD |
| AI Gen | Ja — Prompt manifest kopplad |
| Engineer | Nej — ej pack-deklarerbar ännu; morgonhus = interior slice |

Part I checklist (11 frågor): TBD full genomgång i review — topologi mot garden/hall verifierad mot World Bible graf.

---

*Companion narrative for [`../data/100-home.yaml`](../data/100-home.yaml). Contracts live in YAML; this file explains why.*
