# Stjärndag — World Design Bible

**WORLD_DESIGN_BIBLE v1.0 — LIVE-RELEASE DESIGN CONTRACT** <!-- pragma: allowlist secret -->

**Dokumenttyp:** Definitiv specifikation för alla världar i Min värld
**Version:** 1.0
**Status:** Normativ för illustration, animation, speldesign, frontend, backend, QA, studios
**Skapad:** 2026-06-29
**Språk:** Svenska (primärt)

---

## Syfte

Detta dokument är **hela företagets byggkontrakt för världar**. När WDB v1.0 gäller ska en illustratör, backend-ingenjör eller AI-agent kunna leverera en värld **utan att fråga någon**.

**Designprincip:** Varje värld definierar **sin egen progression** via **Progression Nodes** i pack manifest — **inga magiska tal** (Constitution §6).

---

## Auktoritet

```
Product Constitution (§6 No Magic Numbers)
POS 00A/04/09 + Design tokens (020-design.mdc)
PRODUCT_CONTENT_BIBLE — world soul & emotion job
GAME_DESIGN_BIBLE v2 — loops, systems, Experience Packs
ART_BIBLE v1 FINAL — visual/motion/audio handoff
DENNA World Design Bible — progression maps, living rules, WQS
Implementation — följer, överstyr inte
```

**Konflikt:** PCB vinner fiction soul; WDB vinner progression structure; Art Bible vinner pixel timing.

---

## Innehåll

| § | Kapitel |
|---|---------|
| 1 | World Architecture |
| 2 | Progression Node System |
| 3 | No Magic Numbers |
| 4 | World Template |
| 5 | Living World Rules |
| 6 | World Differentiation Matrix |
| 7 | Experience Packs & Platform |
| 8–15 | Världar (progression maps) |
| 16 | Framtida världar |
| 17 | World Quality Score WQS-001–200 |
| 18 | Definition of Ready / Done |
| A–E | Appendix |

---

# 1. World Architecture

```
Core Engine
    │  auth · schedule · complete · star · event bus · save/sync
    │  emits: onActivityComplete, onMilestone, onProgressionNodeUnlocked
    ▼
Experience Pack (`child_se` v1 LIVE · teen/adult/support schema)
    │  fiction · copy · pacing · reading_level · ui_skin
    │  owns: world_progression_manifest.json per world
    ▼
World Definition
    │  slug · emotion_job · palette · NPC scripts · allowed node types
    ▼
World State (server)
    │  child_progression_node(child_id, world_slug, node_id, unlocked_at, metadata JSONB)
    ▼
Gameplay
    │  Idag spine → optional Min värld visit → one primary interaction default
    ▼
NPC · Animation · Audio · Collectibles · Build/Feature nodes
    ▼
Unlock · Secrets · Future Expansion (append nodes to manifest)
```

**Regel:** Core Engine känner **inte** till "75 delar", "30 stjärnor" eller "5 levels". Den känner till **events** och **node_id** som pack manifest definierar.

---

# 2. Progression Node System

En **Progression Node** är minsta enhet för världstillväxt. En nod kan vara:

| node_type | Exempel |
|-----------|---------|
| `build` | Hylla, planka, möbel |
| `room` | Nytt rum, balkong, akvarium-hörn |
| `npc` | Morgon-Mira anländer |
| `animal` | Hatchling, fönsterfågel |
| `animation` | Kettle ånga, harmoni-glow |
| `feature` | Hemlig frukostbricka, museum export |
| `sound` | Uppläsning optional |
| `bridge` | Brygg-plankor |
| `boat` | Båt vid pier (dekor) |
| `tree` | Trädkoja gren (framtida) |
| `book` | Bokrygg / berättelse |
| `decoration` | Kosmetisk autonomy |

### Node schema (pack manifest)

```json
{
  "world_slug": "workshop",
  "progression_model": "8_projects_x_components",
  "phases": ["bench", "projects_1_3", "projects_4_6", "projects_7_8", "master"],
  "nodes": [
    {
      "node_id": "workshop_proj_birdhouse_c3",
      "order": 12,
      "node_type": "build",
      "name_sv": "Fågelholk — komponent 3",
      "emotional_beat": "Synligt framsteg utan siffror i UI.",
      "unlock_signal": "project_stage:birdhouse:3",
      "pack_config_key": "progression.workshop.projects.birdhouse.components.3"
    }
  ]
}
```

**unlock_signal** tolkas av pack rules engine — **inte** hårdkodad i `if (stars > 30)`.

### Progressionsmodeller per värld (v1)

| Värld | Modell | Node count v1 (exempel) |
|-------|--------|-------------------------|
| Morgonhuset | Morgonsekvens rum | 12 (expanderbar) |
| Verkstaden | 8 projekt × varierande komponenter | 40–120 i data |
| Husdjurshemmet | Hem → trädgård → lekplats → stall | 14+ |
| Dinosauriedalen | Expeditioner → fossil → museum | 11+ |
| Dockhuset | Rum → möbler → dekoration | 20+ |
| Fiskebryggan | Brygga → båt → utrustning → akvarium | 12+ |
| Läshörnan | Hyllor → berättelser → världar | 13+ |
| Mitt Rum | Identitet / miniatyrer | 10+ |

*Antal är **manifest-drivet** — optimera emotional progression, not quota.*

---

# 3. No Magic Numbers

> **Constitution §6:** Produktens progression får inte bero på godtyckliga konstanter. Varje tröskel ska härledas från önskad upplevelse, pacing och emotionell resa, och vara **konfigurerbar via data** — inte kod.

**Förbjudet i engine:** `PARTS_REQUIRED = 75`, `STARS_TO_UNLOCK = 30`, `MAX_LEVEL = 5`.

**Tillåtet:** `unlock_signal: "milestone:root"` resolved via pack config som CPO/Game Director justerar utan deploy.

**ADR krävs** när node count ändras >20% i live world — pacing review obligatorisk.

---

# 4. World Template

Varje ny värld (nu och framtida) måste leverera:

1. **Vision & purpose** — emotion job unik (matrix §6)
2. **Progression model** — beskriven i ord, not siffror
3. **Progression map** — nodes med schema §2
4. **Differentiation** — en mening: "Känns ALDRIG som X"
5. **Gameplay / daily / long-term loop** — GDB-aligned
6. **NPC** — personality + idle + contract PCB
7. **Environment** — lighting, color script, weather, seasonal
8. **Living behaviors** — tabell §5
9. **Secrets & collectibles** — Type B earned
10. **Parent & reward connection**
11. **Completion & unlock ceremony**
12. **Future expansion** — append-only nodes
13. **WQS subset** — binary pass before ship

---

# 5. Living World Rules

Varje värld **lever** — även utan barnets input.

| Regel | Gräns |
|-------|-------|
| Idle motion | ≥1 lager, period ≥3 s |
| NPC micro | blink/andning/svans — aldrig frozen >5 s |
| Väder | 1 aktiv state, opacity ≤55% |
| Årstid | max 2 props swap |
| Vind | sway amplitud Art Bible §33 |
| Ljud | optional av default barn |
| Mikrohändelse | max 1 major / session |
| Miss day | dim ≤15%, välkomnande |
| Bakgrundsliv | får inte blockera tap path |
| Överraskning | Type A ambient OK; Type D login RNG BLOCK |

---

# 6. World Differentiation Matrix

| Värld | Emotion | Mekanik | Känns ALDRIG som |
|-------|---------|---------|------------------|
| Morgonhuset | Capable safety | Morgonsekvens rum | Verkstad, hage, dockskåp |
| Verkstaden | Maker pride | Projekt × komponenter | Husdjurshem, dockhus |
| Husdjurshemmet | Gentle belonging | Faser hem→stall | Dino, verkstad |
| Dinosauriedalen | Awe & courage | Expeditioner | Dockhus, läshörna |
| Dockhuset | Cozy control | Rum → möbler | Fiskebrygga, dino |
| Fiskebryggan | Patient calm | Brygga → akvarium | Verkstad, maker |
| Läshörnan | Focus pride | Hylla → berättelser | Morgonhuset hype |
| Mitt Rum | Identity | Miniatyrer / trofe | Themed fantasy full bleed |

**Overlap review:** Creative Director blockerar om två världar delar samma emotion+mekanik-kvadrant.

---

# 7. Experience Packs & Platform

**Barn (`child_se`)** — v1 LIVE. Alla världar nedan.

**Framtida packs** (samma engine, samma node_id schema, ny presentation):

| Pack | Audience | World fiction change |
|------|----------|----------------------|
| `teen_se` | Tonår | Autonomy copy, högre text — samma nodes |
| `young_adult_se` | Unga vuxna | Habit framing — samma events |
| `adult_se` | Vuxna | Ingen barn-emoji krav |
| `adult_support_se` | Stöd | OT pacing config — samma engine |

**Regel:** `if (age)` i core = Constitution breach.

---

# Del II — Världar (progression maps)

# 8. Morgonhuset (`routine_home`)

**English:** Morning House

## Differentiation (obligatorisk)

Enda världen med morgonljus-dörrtröskel och frukost-POV. Känns ALDRIG som verkstad, hage eller dockskåp.

## Progression map

**Progressionsmodell:** Rum växer längs morgonsekvensen — spegel, frukost, avfärd — node count driven av emotion beats, not quota.

**Faser:** Sprout → Root → Branch → Bloom → Legacy

**Antal noder (v1 manifest):** 12 — *konfigurerbart, inte lag.*

| # | node_id | Typ | Namn | Emotion beat | unlock_signal (data) | pack_config_key |
|---|---------|-----|------|--------------|------------------------|-----------------|
| 1 | `routine_home_welcome_mat` | build | Välkomstmatta | Första foten innanför — du hör hemma. | first_activity_complete:morning | `progression.routine_home.welcome_mat` |
| 2 | `routine_home_nightstand` | build | Nattduksbord | Natten och morgonen hänger ihop. | milestone:sprout | `progression.routine_home.nightstand` |
| 3 | `routine_home_mirror_corner` | room | Spegelhörna | Jag ser mig själv som kapabel. | activity_streak:brush_teeth:3 | `progression.routine_home.mirror` |
| 4 | `routine_home_coat_peg` | build | Kapstok | Kladerna har en plats. | milestone:root | `progression.routine_home.coat_peg` |
| 5 | `routine_home_breakfast_nook` | room | Frukosthörna | Morgon kan smaka lugnt. | activity_group:breakfast:complete_week | `progression.routine_home.breakfast_nook` |
| 6 | `routine_home_mira_arrives` | npc | Morgon-Mira | Någon ser att jag försöker. | milestone:root + first_world_enter | `progression.routine_home.npc_mira` |
| 7 | `routine_home_door_threshold` | build | Dörrtröskel ljus | Avfärd utan bråk — stolt. | milestone:branch | `progression.routine_home.door` |
| 8 | `routine_home_kettle_steam` | animation | Kettle ånga | Värmen efter morgon-klar. | daily:morning_section_complete | `progression.routine_home.kettle_anim` |
| 9 | `routine_home_window_bird` | animal | Fönsterfågel | Världen utanför väntar lugnt. | explore:taps:5 | `progression.routine_home.bird` |
| 10 | `routine_home_breakfast_secret` | feature | Hemlig frukostbricka | Belöning för att utforska. | kindness:flag + milestone:bloom | `progression.routine_home.secret_tray` |
| 11 | `routine_home_balcony_hook` | room | Balkongkrok ( framtid ) | Sommarluft som mål. | milestone:legacy | `progression.routine_home.balcony` |
| 12 | `routine_home_museum_frame` | feature | Morgon-foto museum | Minnen utan skuld. | milestone:legacy + parent_export_opt_in | `progression.routine_home.museum` |

## Vision & purpose

Se [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) Part V — Morgonhuset. WDB äger **progression map**; PCB äger **soul**.

## Gameplay & loops

- **Gameplay loop:** Idag aktivitet → server verify → valfri world visit → nästa node ghost om eligible.
- **Daily loop:** En primary world interaction default per besök.
- **Long-term loop:** Faser enligt tabell — expanderas via manifest, inte kodkonstant.

## NPC, ljud, miljö

NPC/ljud/ljus/weather/seasonal: se PCB world section + Art Bible palette row. Idle: Living World Rules §5.

## Secrets, collectibles, completion

Secrets Type B earned. Collectibles memory not gacha. Completion = sista node i manifest `complete` + ceremony skippable.

## Parent & reward connection

Parent ser Planering; barn delar stolthet frivilligt. Skattkammaren offline treat — app budbärare.

## Future expansion

Nya noder append-only i pack manifest semver minor. Engine `onProgressionNodeUnlocked` oförändrad.

---

# 9. Verkstaden (`workshop`)

**English:** Workshop / Garage

## Differentiation (obligatorisk)

Maker/pegboard/projekt. ALDRIG djur-sovplats eller mini-rum.

## Progression map

**Progressionsmodell:** 8 stora projekt × varierande komponenter (40–120 totalt i data) — komponenter är noder, inte fast 75-lista.

**Faser:** Bänk → Projekt 1–3 → Projekt 4–6 → Projekt 7–8 → Mästar-display

**Antal noder (v1 manifest):** 55 — *konfigurerbart, inte lag.*

| # | node_id | Typ | Namn | Emotion beat | unlock_signal (data) | pack_config_key |
|---|---------|-----|------|--------------|------------------------|-----------------|
| 1 | `workshop_empty_bench` | build | Tom arbetsbänk | Potential — inte tomhet. | world_unlock:workshop | `progression.workshop.bench` |
| 2 | `workshop_pegboard` | build | Pegboard | Verktyg kan hängas där jag når. | milestone:sprout | `progression.workshop.pegboard` |
| 3 | `workshop_sune_npc` | npc | Snickar-Sune | Någon som gör bredvid mig. | first_helper_activity | `progression.workshop.npc_sune` |
| 4 | `workshop_proj_birdhouse_start` | feature | Projekt: Fågelholk — start | Maker stolthet — Fågelholk. | project_unlock:birdhouse | `progression.workshop.projects.birdhouse.start` |
| 5 | `workshop_proj_birdhouse_c1` | build | Fågelholk — komponent 1 | Synligt framsteg utan siffror i UI. | project_stage:birdhouse:1 | `progression.workshop.projects.birdhouse.components.1` |
| 6 | `workshop_proj_birdhouse_c2` | build | Fågelholk — komponent 2 | Synligt framsteg utan siffror i UI. | project_stage:birdhouse:2 | `progression.workshop.projects.birdhouse.components.2` |
| 7 | `workshop_proj_birdhouse_c3` | build | Fågelholk — komponent 3 | Synligt framsteg utan siffror i UI. | project_stage:birdhouse:3 | `progression.workshop.projects.birdhouse.components.3` |
| 8 | `workshop_proj_birdhouse_c4` | build | Fågelholk — komponent 4 | Synligt framsteg utan siffror i UI. | project_stage:birdhouse:4 | `progression.workshop.projects.birdhouse.components.4` |
| 9 | `workshop_proj_birdhouse_c5` | build | Fågelholk — komponent 5 | Synligt framsteg utan siffror i UI. | project_stage:birdhouse:5 | `progression.workshop.projects.birdhouse.components.5` |
| 10 | `workshop_proj_birdhouse_c6` | build | Fågelholk — komponent 6 | Synligt framsteg utan siffror i UI. | project_stage:birdhouse:6 | `progression.workshop.projects.birdhouse.components.6` |
| 11 | `workshop_proj_toy_boat_start` | feature | Projekt: Leksaksbåt — start | Maker stolthet — Leksaksbåt. | project_unlock:toy_boat | `progression.workshop.projects.toy_boat.start` |
| 12 | `workshop_proj_toy_boat_c1` | build | Leksaksbåt — komponent 1 | Synligt framsteg utan siffror i UI. | project_stage:toy_boat:1 | `progression.workshop.projects.toy_boat.components.1` |
| 13 | `workshop_proj_toy_boat_c2` | build | Leksaksbåt — komponent 2 | Synligt framsteg utan siffror i UI. | project_stage:toy_boat:2 | `progression.workshop.projects.toy_boat.components.2` |
| 14 | `workshop_proj_toy_boat_c3` | build | Leksaksbåt — komponent 3 | Synligt framsteg utan siffror i UI. | project_stage:toy_boat:3 | `progression.workshop.projects.toy_boat.components.3` |
| 15 | `workshop_proj_toy_boat_c4` | build | Leksaksbåt — komponent 4 | Synligt framsteg utan siffror i UI. | project_stage:toy_boat:4 | `progression.workshop.projects.toy_boat.components.4` |
| 16 | `workshop_proj_toy_boat_c5` | build | Leksaksbåt — komponent 5 | Synligt framsteg utan siffror i UI. | project_stage:toy_boat:5 | `progression.workshop.projects.toy_boat.components.5` |
| 17 | `workshop_proj_planter_start` | feature | Projekt: Planteringslåda — start | Maker stolthet — Planteringslåda. | project_unlock:planter | `progression.workshop.projects.planter.start` |
| 18 | `workshop_proj_planter_c1` | build | Planteringslåda — komponent 1 | Synligt framsteg utan siffror i UI. | project_stage:planter:1 | `progression.workshop.projects.planter.components.1` |
| 19 | `workshop_proj_planter_c2` | build | Planteringslåda — komponent 2 | Synligt framsteg utan siffror i UI. | project_stage:planter:2 | `progression.workshop.projects.planter.components.2` |
| 20 | `workshop_proj_planter_c3` | build | Planteringslåda — komponent 3 | Synligt framsteg utan siffror i UI. | project_stage:planter:3 | `progression.workshop.projects.planter.components.3` |
| 21 | `workshop_proj_planter_c4` | build | Planteringslåda — komponent 4 | Synligt framsteg utan siffror i UI. | project_stage:planter:4 | `progression.workshop.projects.planter.components.4` |
| 22 | `workshop_proj_planter_c5` | build | Planteringslåda — komponent 5 | Synligt framsteg utan siffror i UI. | project_stage:planter:5 | `progression.workshop.projects.planter.components.5` |
| 23 | `workshop_proj_picture_frame_start` | feature | Projekt: Ram familjefoto — start | Maker stolthet — Ram familjefoto. | project_unlock:picture_frame | `progression.workshop.projects.picture_frame.start` |
| 24 | `workshop_proj_picture_frame_c1` | build | Ram familjefoto — komponent 1 | Synligt framsteg utan siffror i UI. | project_stage:picture_frame:1 | `progression.workshop.projects.picture_frame.components.1` |
| 25 | `workshop_proj_picture_frame_c2` | build | Ram familjefoto — komponent 2 | Synligt framsteg utan siffror i UI. | project_stage:picture_frame:2 | `progression.workshop.projects.picture_frame.components.2` |
| 26 | `workshop_proj_picture_frame_c3` | build | Ram familjefoto — komponent 3 | Synligt framsteg utan siffror i UI. | project_stage:picture_frame:3 | `progression.workshop.projects.picture_frame.components.3` |
| 27 | `workshop_proj_picture_frame_c4` | build | Ram familjefoto — komponent 4 | Synligt framsteg utan siffror i UI. | project_stage:picture_frame:4 | `progression.workshop.projects.picture_frame.components.4` |
| 28 | `workshop_proj_tool_rack_start` | feature | Projekt: Verktygsvägg komplett — start | Maker stolthet — Verktygsvägg komplett. | project_unlock:tool_rack | `progression.workshop.projects.tool_rack.start` |
| 29 | `workshop_proj_tool_rack_c1` | build | Verktygsvägg komplett — komponent 1 | Synligt framsteg utan siffror i UI. | project_stage:tool_rack:1 | `progression.workshop.projects.tool_rack.components.1` |
| 30 | `workshop_proj_tool_rack_c2` | build | Verktygsvägg komplett — komponent 2 | Synligt framsteg utan siffror i UI. | project_stage:tool_rack:2 | `progression.workshop.projects.tool_rack.components.2` |
| 31 | `workshop_proj_tool_rack_c3` | build | Verktygsvägg komplett — komponent 3 | Synligt framsteg utan siffror i UI. | project_stage:tool_rack:3 | `progression.workshop.projects.tool_rack.components.3` |
| 32 | `workshop_proj_tool_rack_c4` | build | Verktygsvägg komplett — komponent 4 | Synligt framsteg utan siffror i UI. | project_stage:tool_rack:4 | `progression.workshop.projects.tool_rack.components.4` |
| 33 | `workshop_proj_tool_rack_c5` | build | Verktygsvägg komplett — komponent 5 | Synligt framsteg utan siffror i UI. | project_stage:tool_rack:5 | `progression.workshop.projects.tool_rack.components.5` |
| 34 | `workshop_proj_tool_rack_c6` | build | Verktygsvägg komplett — komponent 6 | Synligt framsteg utan siffror i UI. | project_stage:tool_rack:6 | `progression.workshop.projects.tool_rack.components.6` |
| 35 | `workshop_proj_tool_rack_c7` | build | Verktygsvägg komplett — komponent 7 | Synligt framsteg utan siffror i UI. | project_stage:tool_rack:7 | `progression.workshop.projects.tool_rack.components.7` |
| 36 | `workshop_proj_tool_rack_c8` | build | Verktygsvägg komplett — komponent 8 | Synligt framsteg utan siffror i UI. | project_stage:tool_rack:8 | `progression.workshop.projects.tool_rack.components.8` |
| 37 | `workshop_proj_window_display_start` | feature | Projekt: Fönster-display — start | Maker stolthet — Fönster-display. | project_unlock:window_display | `progression.workshop.projects.window_display.start` |
| 38 | `workshop_proj_window_display_c1` | build | Fönster-display — komponent 1 | Synligt framsteg utan siffror i UI. | project_stage:window_display:1 | `progression.workshop.projects.window_display.components.1` |
| 39 | `workshop_proj_window_display_c2` | build | Fönster-display — komponent 2 | Synligt framsteg utan siffror i UI. | project_stage:window_display:2 | `progression.workshop.projects.window_display.components.2` |
| 40 | `workshop_proj_window_display_c3` | build | Fönster-display — komponent 3 | Synligt framsteg utan siffror i UI. | project_stage:window_display:3 | `progression.workshop.projects.window_display.components.3` |
| 41 | `workshop_proj_window_display_c4` | build | Fönster-display — komponent 4 | Synligt framsteg utan siffror i UI. | project_stage:window_display:4 | `progression.workshop.projects.window_display.components.4` |
| 42 | `workshop_proj_co_build_start` | feature | Projekt: Co-build med vuxen — start | Maker stolthet — Co-build med vuxen. | project_unlock:co_build | `progression.workshop.projects.co_build.start` |
| 43 | `workshop_proj_co_build_c1` | build | Co-build med vuxen — komponent 1 | Synligt framsteg utan siffror i UI. | project_stage:co_build:1 | `progression.workshop.projects.co_build.components.1` |
| 44 | `workshop_proj_co_build_c2` | build | Co-build med vuxen — komponent 2 | Synligt framsteg utan siffror i UI. | project_stage:co_build:2 | `progression.workshop.projects.co_build.components.2` |
| 45 | `workshop_proj_co_build_c3` | build | Co-build med vuxen — komponent 3 | Synligt framsteg utan siffror i UI. | project_stage:co_build:3 | `progression.workshop.projects.co_build.components.3` |
| 46 | `workshop_proj_co_build_c4` | build | Co-build med vuxen — komponent 4 | Synligt framsteg utan siffror i UI. | project_stage:co_build:4 | `progression.workshop.projects.co_build.components.4` |
| 47 | `workshop_proj_co_build_c5` | build | Co-build med vuxen — komponent 5 | Synligt framsteg utan siffror i UI. | project_stage:co_build:5 | `progression.workshop.projects.co_build.components.5` |
| 48 | `workshop_proj_master_bench_start` | feature | Projekt: Mästarbänk — start | Maker stolthet — Mästarbänk. | project_unlock:master_bench | `progression.workshop.projects.master_bench.start` |
| 49 | `workshop_proj_master_bench_c1` | build | Mästarbänk — komponent 1 | Synligt framsteg utan siffror i UI. | project_stage:master_bench:1 | `progression.workshop.projects.master_bench.components.1` |
| 50 | `workshop_proj_master_bench_c2` | build | Mästarbänk — komponent 2 | Synligt framsteg utan siffror i UI. | project_stage:master_bench:2 | `progression.workshop.projects.master_bench.components.2` |
| 51 | `workshop_proj_master_bench_c3` | build | Mästarbänk — komponent 3 | Synligt framsteg utan siffror i UI. | project_stage:master_bench:3 | `progression.workshop.projects.master_bench.components.3` |
| 52 | `workshop_proj_master_bench_c4` | build | Mästarbänk — komponent 4 | Synligt framsteg utan siffror i UI. | project_stage:master_bench:4 | `progression.workshop.projects.master_bench.components.4` |
| 53 | `workshop_proj_master_bench_c5` | build | Mästarbänk — komponent 5 | Synligt framsteg utan siffror i UI. | project_stage:master_bench:5 | `progression.workshop.projects.master_bench.components.5` |
| 54 | `workshop_proj_master_bench_c6` | build | Mästarbänk — komponent 6 | Synligt framsteg utan siffror i UI. | project_stage:master_bench:6 | `progression.workshop.projects.master_bench.components.6` |
| 55 | `workshop_workshop_complete` | feature | Verkstad komplett | Alla projekt på hylla — arv. | all_projects:displayed | `progression.workshop.complete` |

## Vision & purpose

Se [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) Part V — Verkstaden. WDB äger **progression map**; PCB äger **soul**.

## Gameplay & loops

- **Gameplay loop:** Idag aktivitet → server verify → valfri world visit → nästa node ghost om eligible.
- **Daily loop:** En primary world interaction default per besök.
- **Long-term loop:** Faser enligt tabell — expanderas via manifest, inte kodkonstant.

## NPC, ljud, miljö

NPC/ljud/ljus/weather/seasonal: se PCB world section + Art Bible palette row. Idle: Living World Rules §5.

## Secrets, collectibles, completion

Secrets Type B earned. Collectibles memory not gacha. Completion = sista node i manifest `complete` + ceremony skippable.

## Parent & reward connection

Parent ser Planering; barn delar stolthet frivilligt. Skattkammaren offline treat — app budbärare.

## Future expansion

Nya noder append-only i pack manifest semver minor. Engine `onProgressionNodeUnlocked` oförändrad.

---

# 10. Husdjurshemmet (`pet_home`)

**English:** Pet Home

## Differentiation (obligatorisk)

Omsorg hage/trädgård. ALDRIG fossil eller pegboard.

## Progression map

**Progressionsmodell:** Bygg hem → trädgård → lekplats → stall — fasbaserad, node count per fas i pack manifest.

**Faser:** Hem → Trädgård → Lekplats → Stall

**Antal noder (v1 manifest):** 12 — *konfigurerbart, inte lag.*

| # | node_id | Typ | Namn | Emotion beat | unlock_signal (data) | pack_config_key |
|---|---------|-----|------|--------------|------------------------|-----------------|
| 1 | `pet_home_hem_fence` | build | Staket & grind | Trygg gräns. | phase:hem + care_activities:verified | `progression.pet_home.hem.fence` |
| 2 | `pet_home_hem_bed` | build | Sovhörna | Soft landing. | phase:hem + care_activities:verified | `progression.pet_home.hem.bed` |
| 3 | `pet_home_hem_bowls` | build | Skålar | Omsorg synlig. | phase:hem + care_activities:verified | `progression.pet_home.hem.bowls` |
| 4 | `pet_home_hem_companion` | animal | Rescue companion | Tillhörighet. | phase:hem + care_activities:verified | `progression.pet_home.hem.companion` |
| 5 | `pet_home_tradgard_garden_patch` | room | Trädgård | Utomhus omsorg. | phase:tradgard + care_activities:verified | `progression.pet_home.tradgard.garden_patch` |
| 6 | `pet_home_tradgard_flowers` | build | Blomrabatt | Lugnt arbete. | phase:tradgard + care_activities:verified | `progression.pet_home.tradgard.flowers` |
| 7 | `pet_home_tradgard_insect_hotel` | build | Insektshotel | Liv i kanten. | phase:tradgard + care_activities:verified | `progression.pet_home.tradgard.insect_hotel` |
| 8 | `pet_home_lekplats_play_tunnel` | build | Lektunnel | Lek efter care. | phase:lekplats + care_activities:verified | `progression.pet_home.lekplats.play_tunnel` |
| 9 | `pet_home_lekplats_toy_zone` | feature | Leksakshörna | Glädje utan krav. | phase:lekplats + care_activities:verified | `progression.pet_home.lekplats.toy_zone` |
| 10 | `pet_home_stall_second_enclosure` | room | Andra enclosure | Mer plats — sent spel. | phase:stall + care_activities:verified | `progression.pet_home.stall.second_enclosure` |
| 11 | `pet_home_stall_sanctuary_plaque` | feature | Sanctuary plakett | Arv-omsorg. | phase:stall + care_activities:verified | `progression.pet_home.stall.sanctuary_plaque` |
| 12 | `pet_home_stall_sara_bench` | npc | Skötare Sara | Vuxen i bakgrunden, aldrig chef. | phase:stall + care_activities:verified | `progression.pet_home.stall.sara_bench` |

## Vision & purpose

Se [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) Part V — Husdjurshemmet. WDB äger **progression map**; PCB äger **soul**.

## Gameplay & loops

- **Gameplay loop:** Idag aktivitet → server verify → valfri world visit → nästa node ghost om eligible.
- **Daily loop:** En primary world interaction default per besök.
- **Long-term loop:** Faser enligt tabell — expanderas via manifest, inte kodkonstant.

## NPC, ljud, miljö

NPC/ljud/ljus/weather/seasonal: se PCB world section + Art Bible palette row. Idle: Living World Rules §5.

## Secrets, collectibles, completion

Secrets Type B earned. Collectibles memory not gacha. Completion = sista node i manifest `complete` + ceremony skippable.

## Parent & reward connection

Parent ser Planering; barn delar stolthet frivilligt. Skattkammaren offline treat — app budbärare.

## Future expansion

Nya noder append-only i pack manifest semver minor. Engine `onProgressionNodeUnlocked` oförändrad.

---

# 11. Dinosauriedalen (`dino_valley`)

**English:** Dinosaur Valley

## Differentiation (obligatorisk)

Expedition/awe utomhus. ALDRIG dockhus mini eller kök.

## Progression map

**Progressionsmodell:** Expeditioner → fossil → museum — noder läggs till per expedition i data.

**Faser:** Dimma → Expeditioner → Nest → Museum → Bloom

**Antal noder (v1 manifest):** 11 — *konfigurerbart, inte lag.*

| # | node_id | Typ | Namn | Emotion beat | unlock_signal (data) | pack_config_key |
|---|---------|-----|------|--------------|------------------------|-----------------|
| 1 | `dino_valley_trail_start` | room | Stig i dimma | Mod börjar med ett steg. | world_unlock:dino_valley | `progression.dino_valley.trail_start` |
| 2 | `dino_valley_expedition_1` | feature | Expedition 1: fotspår | Spår bevisar väg. | brave_activity:first | `progression.dino_valley.expedition_1` |
| 3 | `dino_valley_fossil_1` | build | Fossil A | Forntid som stolthet. | expedition:1:complete | `progression.dino_valley.fossil_1` |
| 4 | `dino_valley_expedition_2` | feature | Expedition 2: bro | Över vattnet — hanterbart. | brave_streak:week | `progression.dino_valley.expedition_2` |
| 5 | `dino_valley_nest` | room | Nest | Något växer. | expedition:2:complete | `progression.dino_valley.nest` |
| 6 | `dino_valley_egg_crack` | animation | Ägg spricka | Förväntan utan skräck. | milestone:branch | `progression.dino_valley.egg_crack` |
| 7 | `dino_valley_hatchling` | animal | Mini-Dino | Mod i liten form. | nest:complete | `progression.dino_valley.hatchling` |
| 8 | `dino_valley_fossil_museum` | room | Fossil-museum | Minnen av mod. | expeditions:3:complete | `progression.dino_valley.fossil_museum` |
| 9 | `dino_valley_cave_secret` | feature | Grotta hemlighet | Belöning för läkarbesök-aktivitet. | activity_template:doctor_visit + explore | `progression.dino_valley.cave_secret` |
| 10 | `dino_valley_valley_bloom` | animation | Valley bloom | Awe utan rädsla. | milestone:legacy | `progression.dino_valley.valley_bloom` |
| 11 | `dino_valley_ranger_npc` | npc | Fossil-Farbror | Vittne, inte domare. | expedition:2:mid | `progression.dino_valley.ranger_npc` |

## Vision & purpose

Se [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) Part V — Dinosauriedalen. WDB äger **progression map**; PCB äger **soul**.

## Gameplay & loops

- **Gameplay loop:** Idag aktivitet → server verify → valfri world visit → nästa node ghost om eligible.
- **Daily loop:** En primary world interaction default per besök.
- **Long-term loop:** Faser enligt tabell — expanderas via manifest, inte kodkonstant.

## NPC, ljud, miljö

NPC/ljud/ljus/weather/seasonal: se PCB world section + Art Bible palette row. Idle: Living World Rules §5.

## Secrets, collectibles, completion

Secrets Type B earned. Collectibles memory not gacha. Completion = sista node i manifest `complete` + ceremony skippable.

## Parent & reward connection

Parent ser Planering; barn delar stolthet frivilligt. Skattkammaren offline treat — app budbärare.

## Future expansion

Nya noder append-only i pack manifest semver minor. Engine `onProgressionNodeUnlocked` oförändrad.

---

# 12. Dockhuset (`dollhouse`)

**English:** Doll House

## Differentiation (obligatorisk)

Cozy control mini-rum. ALDRIG pier vatten eller verkstad.

## Progression map

**Progressionsmodell:** Rum → möbler → dekoration — noder per rum definieras i pack, expanderbar.

**Faser:** Sovrum → Kök → Lekrum → Badrum → Vind → Trädgård

**Antal noder (v1 manifest):** 22 — *konfigurerbart, inte lag.*

| # | node_id | Typ | Namn | Emotion beat | unlock_signal (data) | pack_config_key |
|---|---------|-----|------|--------------|------------------------|-----------------|
| 1 | `dollhouse_room_bedroom` | room | Rum: Sovrum | Ordning i egen skala. | tidy_activity:linked:bedroom | `progression.dollhouse.rooms.bedroom` |
| 2 | `dollhouse_bedroom_f1` | build | Säng | Plats för allt. | room:bedroom:furniture:1 | `progression.dollhouse.rooms.bedroom.f1` |
| 3 | `dollhouse_bedroom_f2` | build | Garderob | Plats för allt. | room:bedroom:furniture:2 | `progression.dollhouse.rooms.bedroom.f2` |
| 4 | `dollhouse_bedroom_f3` | build | Nattlampa | Plats för allt. | room:bedroom:furniture:3 | `progression.dollhouse.rooms.bedroom.f3` |
| 5 | `dollhouse_room_kitchen` | room | Rum: Kök | Ordning i egen skala. | tidy_activity:linked:kitchen | `progression.dollhouse.rooms.kitchen` |
| 6 | `dollhouse_kitchen_f1` | build | Mini-spis | Plats för allt. | room:kitchen:furniture:1 | `progression.dollhouse.rooms.kitchen.f1` |
| 7 | `dollhouse_kitchen_f2` | build | Te-set | Plats för allt. | room:kitchen:furniture:2 | `progression.dollhouse.rooms.kitchen.f2` |
| 8 | `dollhouse_kitchen_f3` | build | Bord | Plats för allt. | room:kitchen:furniture:3 | `progression.dollhouse.rooms.kitchen.f3` |
| 9 | `dollhouse_room_playroom` | room | Rum: Lekrum | Ordning i egen skala. | tidy_activity:linked:playroom | `progression.dollhouse.rooms.playroom` |
| 10 | `dollhouse_playroom_f1` | build | Klossar | Plats för allt. | room:playroom:furniture:1 | `progression.dollhouse.rooms.playroom.f1` |
| 11 | `dollhouse_playroom_f2` | build | Mjukis hörna | Plats för allt. | room:playroom:furniture:2 | `progression.dollhouse.rooms.playroom.f2` |
| 12 | `dollhouse_room_bath` | room | Rum: Badrum | Ordning i egen skala. | tidy_activity:linked:bath | `progression.dollhouse.rooms.bath` |
| 13 | `dollhouse_bath_f1` | build | Badkar mini | Plats för allt. | room:bath:furniture:1 | `progression.dollhouse.rooms.bath.f1` |
| 14 | `dollhouse_bath_f2` | build | Handduk | Plats för allt. | room:bath:furniture:2 | `progression.dollhouse.rooms.bath.f2` |
| 15 | `dollhouse_room_attic` | room | Rum: Vind | Ordning i egen skala. | tidy_activity:linked:attic | `progression.dollhouse.rooms.attic` |
| 16 | `dollhouse_attic_f1` | build | Attic key | Plats för allt. | room:attic:furniture:1 | `progression.dollhouse.rooms.attic.f1` |
| 17 | `dollhouse_attic_f2` | build | Daisy docka | Plats för allt. | room:attic:furniture:2 | `progression.dollhouse.rooms.attic.f2` |
| 18 | `dollhouse_room_garden` | room | Rum: Trädgård mini | Ordning i egen skala. | tidy_activity:linked:garden | `progression.dollhouse.rooms.garden` |
| 19 | `dollhouse_garden_f1` | build | Bänk | Plats för allt. | room:garden:furniture:1 | `progression.dollhouse.rooms.garden.f1` |
| 20 | `dollhouse_garden_f2` | build | Lampa | Plats för allt. | room:garden:furniture:2 | `progression.dollhouse.rooms.garden.f2` |
| 21 | `dollhouse_harmoni_glow` | animation | Harmoni-glow | Balans känns bra. | all_rooms:furnished_min | `progression.dollhouse.harmony` |
| 22 | `dollhouse_wallpaper_swap` | feature | Wallpaper val | Autonomi kosmetisk. | milestone:bloom | `progression.dollhouse.wallpaper` |

## Vision & purpose

Se [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) Part V — Dockhuset. WDB äger **progression map**; PCB äger **soul**.

## Gameplay & loops

- **Gameplay loop:** Idag aktivitet → server verify → valfri world visit → nästa node ghost om eligible.
- **Daily loop:** En primary world interaction default per besök.
- **Long-term loop:** Faser enligt tabell — expanderas via manifest, inte kodkonstant.

## NPC, ljud, miljö

NPC/ljud/ljus/weather/seasonal: se PCB world section + Art Bible palette row. Idle: Living World Rules §5.

## Secrets, collectibles, completion

Secrets Type B earned. Collectibles memory not gacha. Completion = sista node i manifest `complete` + ceremony skippable.

## Parent & reward connection

Parent ser Planering; barn delar stolthet frivilligt. Skattkammaren offline treat — app budbärare.

## Future expansion

Nya noder append-only i pack manifest semver minor. Engine `onProgressionNodeUnlocked` oförändrad.

---

# 13. Fiskebryggan (`fishing_pier`)

**English:** Fishing Pier

## Differentiation (obligatorisk)

Tålamod vatten horisont. ALDRIG verkstad eller hage.

## Progression map

**Progressionsmodell:** Brygga → båt → utrustning → akvarium — linjär med sidogrenar i data.

**Faser:** Plankor → Brygga → Båt & utrustning → Akvarium → Arv

**Antal noder (v1 manifest):** 12 — *konfigurerbart, inte lag.*

| # | node_id | Typ | Namn | Emotion beat | unlock_signal (data) | pack_config_key |
|---|---------|-----|------|--------------|------------------------|-----------------|
| 1 | `fishing_pier_plank_start` | bridge | Första plankor | Början av väntan. | world_unlock:fishing_pier | `progression.fishing_pier.plank_start` |
| 2 | `fishing_pier_railing` | build | Räcke | Trygghet vid vatten. | patience_activity:first | `progression.fishing_pier.railing` |
| 3 | `fishing_pier_bench` | build | Bänk | Sitta får ta tid. | plank:stage:2 | `progression.fishing_pier.bench` |
| 4 | `fishing_pier_freja_npc` | npc | Fiskar-Freja | Tyst sällskap. | bench:placed | `progression.fishing_pier.freja_npc` |
| 5 | `fishing_pier_pier_long` | bridge | Lång brygga | Horisont expanderar. | patience_streak:week | `progression.fishing_pier.pier_long` |
| 6 | `fishing_pier_boat_decor` | boat | Båt vid brygga | Fantasi utan sim. | milestone:branch | `progression.fishing_pier.boat_decor` |
| 7 | `fishing_pier_gear_box` | build | Utrustning låda | Redskap för lugn. | boat:placed | `progression.fishing_pier.gear_box` |
| 8 | `fishing_pier_telescope` | build | Teleskop | Se längre — utan brådska. | pier:long:complete | `progression.fishing_pier.telescope` |
| 9 | `fishing_pier_fish_gallery` | feature | Fiskgalleri | Minnen av tålamod. | catches:verified:5 | `progression.fishing_pier.fish_gallery` |
| 10 | `fishing_pier_aquarium` | room | Akvarium hörn | Liv under ytan lugn. | gallery:half | `progression.fishing_pier.aquarium` |
| 11 | `fishing_pier_sunset_anim` | animation | Solnedgång | Kvällsro. | evening_visit:count | `progression.fishing_pier.sunset_anim` |
| 12 | `fishing_pier_pier_complete` | feature | Brygga komplett | Tålamod som arv. | milestone:legacy | `progression.fishing_pier.pier_complete` |

## Vision & purpose

Se [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) Part V — Fiskebryggan. WDB äger **progression map**; PCB äger **soul**.

## Gameplay & loops

- **Gameplay loop:** Idag aktivitet → server verify → valfri world visit → nästa node ghost om eligible.
- **Daily loop:** En primary world interaction default per besök.
- **Long-term loop:** Faser enligt tabell — expanderas via manifest, inte kodkonstant.

## NPC, ljud, miljö

NPC/ljud/ljus/weather/seasonal: se PCB world section + Art Bible palette row. Idle: Living World Rules §5.

## Secrets, collectibles, completion

Secrets Type B earned. Collectibles memory not gacha. Completion = sista node i manifest `complete` + ceremony skippable.

## Parent & reward connection

Parent ser Planering; barn delar stolthet frivilligt. Skattkammaren offline treat — app budbärare.

## Future expansion

Nya noder append-only i pack manifest semver minor. Engine `onProgressionNodeUnlocked` oförändrad.

---

# 14. Läshörnan (`reading_nook`)

**English:** Reading Corner

## Differentiation (obligatorisk)

Kväll focus tystnad. ALDRIG morgon door eller maker bench.

## Progression map

**Progressionsmodell:** Bokhyllor → berättelser → berättelse-världar — fler böcker = fler noder i manifest.

**Faser:** Kudde → Hylla → Berättelser → Fort → Världar

**Antal noder (v1 manifest):** 13 — *konfigurerbart, inte lag.*

| # | node_id | Typ | Namn | Emotion beat | unlock_signal (data) | pack_config_key |
|---|---------|-----|------|--------------|------------------------|-----------------|
| 1 | `reading_nook_floor_cushion` | build | Golv kudde | Stillhet börjar. | world_unlock:reading_nook | `progression.reading_nook.floor_cushion` |
| 2 | `reading_nook_shelf_low` | build | Låg hylla | Berättelser samlas. | evening_activity:first | `progression.reading_nook.shelf_low` |
| 3 | `reading_nook_lamp` | build | Läslampa | Egen pool av ljus. | shelf:books:3 | `progression.reading_nook.lamp` |
| 4 | `reading_nook_story_1` | feature | Berättelse 1 (3 panel) | Saga förtjänt. | evening_streak:week | `progression.reading_nook.story_1` |
| 5 | `reading_nook_story_2` | feature | Berättelse 2 | Fler världar i text. | story:1:complete | `progression.reading_nook.story_2` |
| 6 | `reading_nook_fort_p1` | build | Filttält del 1 | Cozy capstone börjar. | milestone:root | `progression.reading_nook.fort_p1` |
| 7 | `reading_nook_fort_p2` | build | Filttält del 2 | Skydd mot kvällsbrus. | fort:1:placed | `progression.reading_nook.fort_p2` |
| 8 | `reading_nook_fort_p3` | build | Filttält komplett | Eget fort. | fort:2:placed | `progression.reading_nook.fort_p3` |
| 9 | `reading_nook_owl_npc` | npc | Bok-Owl | Stilla vittne. | fort:complete | `progression.reading_nook.owl_npc` |
| 10 | `reading_nook_story_worlds` | feature | Berättelse-världar | Länkar till andra världar i fiction. | stories:2:complete | `progression.reading_nook.story_worlds` |
| 11 | `reading_nook_window_seat` | room | Fönstersits | Läsning med utsikt. | milestone:bloom | `progression.reading_nook.window_seat` |
| 12 | `reading_nook_read_aloud` | sound | Uppläsning optional | Röst när familj vill. | parent_setting:read_aloud + story:unlock | `progression.reading_nook.read_aloud` |
| 13 | `reading_nook_nook_complete` | feature | Läshörna komplett | Focus pride arv. | milestone:legacy | `progression.reading_nook.nook_complete` |

## Vision & purpose

Se [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) Part V — Läshörnan. WDB äger **progression map**; PCB äger **soul**.

## Gameplay & loops

- **Gameplay loop:** Idag aktivitet → server verify → valfri world visit → nästa node ghost om eligible.
- **Daily loop:** En primary world interaction default per besök.
- **Long-term loop:** Faser enligt tabell — expanderas via manifest, inte kodkonstant.

## NPC, ljud, miljö

NPC/ljud/ljus/weather/seasonal: se PCB world section + Art Bible palette row. Idle: Living World Rules §5.

## Secrets, collectibles, completion

Secrets Type B earned. Collectibles memory not gacha. Completion = sista node i manifest `complete` + ceremony skippable.

## Parent & reward connection

Parent ser Planering; barn delar stolthet frivilligt. Skattkammaren offline treat — app budbärare.

## Future expansion

Nya noder append-only i pack manifest semver minor. Engine `onProgressionNodeUnlocked` oförändrad.

---

# 15. Mitt Rum (`my_room`)

**English:** My Room

## Differentiation (obligatorisk)

Meta identitet hub — miniatyrer, aldrig full fiction blend.

## Progression map

**Progressionsmodell:** Identitetsankare — noder kopplade till andra världars milestones, inte egen grind.

**Faser:** Personligt → Miniatyrer → Identitet → Arv → Framtid

**Antal noder (v1 manifest):** 10 — *konfigurerbart, inte lag.*

| # | node_id | Typ | Namn | Emotion beat | unlock_signal (data) | pack_config_key |
|---|---------|-----|------|--------------|------------------------|-----------------|
| 1 | `my_room_rug` | build | Personlig matta | Det här är mitt. | first_success:day3 | `progression.my_room.rug` |
| 2 | `my_room_bed_choice` | build | Säng val | Autonomi. | milestone:sprout | `progression.my_room.bed_choice` |
| 3 | `my_room_trophy_shelf` | feature | Trofehylla | Minnen utan poäng. | any_world:milestone:first | `progression.my_room.trophy_shelf` |
| 4 | `my_room_mini_routine_home` | build | Morgonhuset miniatyr | Identitet kors världar. | world_complete:routine_home:sprout | `progression.my_room.mini_routine_home` |
| 5 | `my_room_mini_workshop` | build | Verkstad miniatyr | Alla världar får plats. | world_phase:workshop:project_1 | `progression.my_room.mini_workshop` |
| 6 | `my_room_identity_wall` | room | Identitetsvägg | Vem jag blir. | milestones:multi_world:3 | `progression.my_room.identity_wall` |
| 7 | `my_room_mood_emoji` | feature | Dagens emoji | Privat — inte surveillance. | feature_flag:my_room_mood | `progression.my_room.mood_emoji` |
| 8 | `my_room_museum_export` | feature | Museum export frame | Dela stolthet frivilligt. | parent_opt_in:museum | `progression.my_room.museum_export` |
| 9 | `my_room_growth_chart` | feature | Tillväxtlinje | 20-års franchise minne. | milestone:legacy | `progression.my_room.growth_chart` |
| 10 | `my_room_pack_preview_teen` | feature | Teen pack preview (låst) | Framtiden utan reset. | account_age:years:10 + pack:teen_tease | `progression.my_room.pack_preview_teen` |

## Vision & purpose

Se [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) Part V — Mitt Rum. WDB äger **progression map**; PCB äger **soul**.

## Gameplay & loops

- **Gameplay loop:** Idag aktivitet → server verify → valfri world visit → nästa node ghost om eligible.
- **Daily loop:** En primary world interaction default per besök.
- **Long-term loop:** Faser enligt tabell — expanderas via manifest, inte kodkonstant.

## NPC, ljud, miljö

NPC/ljud/ljus/weather/seasonal: se PCB world section + Art Bible palette row. Idle: Living World Rules §5.

## Secrets, collectibles, completion

Secrets Type B earned. Collectibles memory not gacha. Completion = sista node i manifest `complete` + ceremony skippable.

## Parent & reward connection

Parent ser Planering; barn delar stolthet frivilligt. Skattkammaren offline treat — app budbärare.

## Future expansion

Nya noder append-only i pack manifest semver minor. Engine `onProgressionNodeUnlocked` oförändrad.

---

# 16. Framtida världar

| slug | Namn | Emotion | Mapping | Progression model |
|------|------|---------|---------|-------------------|
| `treehouse` | Trädkojan | Elevated private thinking | Outdoor/nature | Progression: grenar → räcken → koja → utkik |
| `space_nook` | Rymdnischen | Wonder without infinite sim | Learning/bednight | Progression: poster → teleskop → stjärnkarta |
| `bakery` | Bageriet | Shared fredagsmys | Kitchen help | Progression: ugn → recept → dela |
| `winter_cabin` | Vinterstugan | Hygge seasonal | Calendar slow | Progression: eldstad → ull → kakao — year-round access |
| `family_hall` | Familj | Relatedness | Co-parent | Progression: hall → foto → gemensamma minnen |

Admission: PCB Part VI criteria + WDB World Template §4 + CEO six-month test.

---

# 17. World Quality Score — WQS-001 till WQS-200

Binära regler. **Ingen värld shippar** utan applicable WQS = Ja.

## WQS-001–WQS-025

**WQS-001:** World emotion job unique vs all other worlds in matrix §6.  

**WQS-002:** No fixed build-part count mandated in code or docs — progression nodes in pack manifest only.  

**WQS-003:** All unlock thresholds in pack JSON or server config — never hardcoded constants in engine.  

**WQS-004:** Progression node count derived from emotional journey — documented in WDB world chapter.  

**WQS-005:** Constitution rule 6 No Magic Numbers cited in world PR.  

**WQS-006:** Star thresholds per node configurable without deploy of engine binary.  

**WQS-007:** Milestone names (sprout/root/branch) are fiction labels — not numeric gates in client.  

**WQS-008:** Adding progression node requires WDB update + pack manifest semver bump — not code fork.  

**WQS-009:** Removing node never deletes child placement punitively — grandfather or migrate ADR.  

**WQS-010:** World slug stable across packs — fiction may change per Experience Pack.  

**WQS-011:** child_se pack owns v1 live worlds; teen/adult reskin nodes via same node_id new presentation.  

**WQS-012:** Engine stores progression_node_state(child_id, node_id, unlocked_at) — age-agnostic.  

**WQS-013:** No if (age) in world unlock routes.  

**WQS-014:** World completion defined per world in manifest — not global level 100.  

**WQS-015:** Differentiation matrix row filled — overlap score reviewed Creative Director.  

**WQS-016:** Garage/workshop never uses pet hay props in same scene.  

**WQS-017:** Pet home never uses dino mist shader default.  

**WQS-018:** Dino never uses dollhouse cutaway camera default.  

**WQS-019:** Dockhus never uses pier water shader.  

**WQS-020:** Läshörnan silence valid — no mandatory music node.  

**WQS-021:** Mitt Rum never forces visit before Idag.  

**WQS-022:** PCB emotion job cited in world brief.  

**WQS-023:** GDB quest/mission/routine systems respected — world does not block Idag.  

**WQS-024:** Art Bible palette row used — no ad hoc hex.  

**WQS-025:** Product Constitution five rules + rule six tested.  

## WQS-026–WQS-050

**WQS-026:** Intrinsic test per world reward nodes.  

**WQS-027:** G-01–G-08 no violation in world retention design.  

**WQS-028:** Server authoritative node unlock — W-01.  

**WQS-029:** Unlock reveal in-world — not login popup.  

**WQS-030:** Celebration per node ≤2000 ms skippable.  

**WQS-031:** One primary interaction per world visit default.  

**WQS-032:** Miss-day world state neutral welcome — no punishment nodes.  

**WQS-033:** Sibling worlds isolated progression state.  

**WQS-034:** Co-parent sees progress parent UI — not child compare.  

**WQS-035:** Pedagog read-only world view — no competitive nodes.  

**WQS-036:** Offline node queue with sync — no false unlock celebration.  

**WQS-037:** Feature flag per world rollback documented.  

**WQS-038:** World ADR for economy threshold change.  

**WQS-039:** QA binary WQS log per world ship.  

**WQS-040:** Release Manager world calendar entry.  

**WQS-041:** Each node has node_id, node_type, emotional_beat, unlock_signal documented.  

**WQS-042:** Node types from allowed enum — no ad hoc types without ADR.  

**WQS-043:** Allowed types include: build, room, npc, animal, animation, feature, sound, bridge, boat, tree, book, decoration.  

**WQS-044:** Node order monotonic in manifest — reorder requires migration.  

**WQS-045:** Duplicate node_id forbidden per child per world.  

**WQS-046:** Project-based worlds (Verkstaden) nest components under project_id in manifest.  

**WQS-047:** Phase-based worlds (Husdjurshemmet) group nodes by phase_id.  

**WQS-048:** Expedition worlds append nodes per expedition completion in data.  

**WQS-049:** Room-based worlds (Dockhuset) nest furniture under room_id.  

**WQS-050:** Ghost outline shows next node only — not full spoiler tree child UI.  

## WQS-051–WQS-075

**WQS-051:** Completed nodes visually distinct — not reset on season.  

**WQS-052:** Node unlock idempotent on server retry.  

**WQS-053:** Retroactive parent completion may trigger fair single unlock — cap in config.  

**WQS-054:** Node without art ships with emoji fallback — not block world.  

**WQS-055:** Node copy max 2 lines child-facing.  

**WQS-056:** Node animation references Art Bible §28 timing.  

**WQS-057:** Node sound optional off default child.  

**WQS-058:** Node analytics allowlisted — node_unlocked with node_id hash.  

**WQS-059:** No node requires IAP.  

**WQS-060:** No node requires login streak.  

**WQS-061:** No node compares siblings.  

**WQS-062:** No RNG node unlock.  

**WQS-063:** Secret nodes Type B surprise taxonomy GDB §63.  

**WQS-064:** Forbidden Type D login RNG nodes.  

**WQS-065:** World completion node ceremony skippable.  

**WQS-066:** Legacy phase nodes optional long arc — not required for core loop.  

**WQS-067:** Pack config_key documented for every node.  

**WQS-068:** Integration test: unlock chain first 3 nodes.  

**WQS-069:** Reduced motion: node ceremony instant.  

**WQS-070:** Placement nodes snap 8 px magnetic.  

**WQS-071:** Invalid placement gray pulse — never red child.  

**WQS-072:** Concurrent unlock max one ceremony per session default.  

**WQS-073:** Node graph acyclic — no soft-lock cycles QA verified.  

**WQS-074:** Back navigation from world always works.  

**WQS-075:** World exit returns to life encouraged.  

## WQS-076–WQS-100

**WQS-076:** Node progress export parent optional museum.  

**WQS-077:** Teen pack may add nodes at manifest end — not insert mid child save without migrate.  

**WQS-078:** Adult support pack may add OT pacing nodes — same engine.  

**WQS-079:** Node count change never shipped without pacing review Game Director.  

**WQS-080:** Emotional beat on every node — empty grind nodes forbidden.  

**WQS-081:** Living world idle layer documented per world manifest.  

**WQS-082:** Weather max one active state — opacity ≤55%.  

**WQS-083:** Season max 2 props swap per world per season.  

**WQS-084:** Wind sway amplitude within Art Bible §33.  

**WQS-085:** NPC idle micro-motion 3 states minimum.  

**WQS-086:** Animal NPC never hunger death state.  

**WQS-087:** Light profile matches world time-of-day table.  

**WQS-088:** Ambient audio optional off default.  

**WQS-089:** Micro-event max one major per session.  

**WQS-090:** Background life does not block tap path.  

**WQS-091:** Parallax max 3 layers child route.  

**WQS-092:** Living world dim on miss ≤15% luminance.  

**WQS-093:** Rain on window distinct from pier water weather.  

**WQS-094:** Snow reskin preserves all node placements.  

**WQS-095:** Evening worlds calmer motion amplitude than morning.  

**WQS-096:** Living world performance 30 FPS floor.  

**WQS-097:** Particle budget Art Bible §29.  

**WQS-098:** Canvas idle loops ≥3 s period.  

**WQS-099:** Reduced motion static first frame.  

**WQS-100:** Silence valid complete experience.  

## WQS-101–WQS-125

**WQS-101:** Micro-delight max 3 per screen recommended.  

**WQS-102:** Living world QA reduced motion path.  

**WQS-103:** Living world QA offline last synced state.  

**WQS-104:** Ambient bird max 1 per 120 s session Morgonhuset.  

**WQS-105:** Workshop rain on roof visual only — not gameplay gate.  

**WQS-106:** Pet firefly evening optional.  

**WQS-107:** Dino mist drift slow — cortisol safe.  

**WQS-108:** Dollhouse mini rain window only.  

**WQS-109:** Pier buoy bob period documented.  

**WQS-110:** Reading nook moth at lamp gentle.  

**WQS-111:** Mitt Rum star ceiling subtle — not disco.  

**WQS-112:** Cross-world ambient nod max 1 easter egg per session.  

**WQS-113:** Living world scheduler server flags not client guess.  

**WQS-114:** Weather does not increase activity difficulty.  

**WQS-115:** Seasonal FOMO graphics forbidden.  

**WQS-116:** World Template §4 checklist complete before art start.  

**WQS-117:** DoR world: WDB § + PCB + Art palette + progression manifest draft.  

**WQS-118:** DoD world: WQS applicable all Ja + test:gate world smoke.  

**WQS-119:** Illustrator handoff includes differentiation matrix row.  

**WQS-120:** Animator handoff includes living behaviors table.  

**WQS-121:** Backend handoff includes node schema + unlock_signal mapping.  

**WQS-122:** Frontend handoff includes ghost/next node UX.  

**WQS-123:** QA handoff includes WQS subset per world.  

**WQS-124:** External studio receives WQS sheet not verbal brief only.  

**WQS-125:** AI agent prompt cites WDB before generating world assets.  

## WQS-126–WQS-150

**WQS-126:** No duplicate world fiction between PCB and WDB — WDB owns progression map.  

**WQS-127:** GDB owns loops — WDB does not redefine core loop.  

**WQS-128:** Art Bible owns pixel timing — WDB cites not duplicates.  

**WQS-129:** Design system tokens POS 03 for parent surfaces only on world picker parent UI.  

**WQS-130:** Child world view no BI stats overlay.  

**WQS-131:** World picker readable without text wall icons.  

**WQS-132:** Screenshot test 00B per world hero frame.  

**WQS-133:** Nintendo level design: one focal object per world entry frame.  

**WQS-134:** Pixar story: emotional arc documented per world chapter.  

**WQS-135:** Child psychologist sign-off guilt/shame NPC lines.  

**WQS-136:** OT sign-off motor placement targets 48 px.  

**WQS-137:** Accessibility contrast 4.5:1 parent world settings.  

**WQS-138:** Touch target 48 px child placement.  

**WQS-139:** Colorblind state not color alone node complete.  

**WQS-140:** World name Swedish child-facing correct.  

**WQS-141:** Slug matches PCB engineering table.  

**WQS-142:** Unlock era documented — pet not day one W-02.  

**WQS-143:** Future world admission criteria PCB Part VI before promotion.  

**WQS-144:** World versioning semver in manifest.  

**WQS-145:** Rollback world feature flag kill switch.  

**WQS-146:** Dogfood internal world walkthrough logged.  

**WQS-147:** Child playtest world observation form Appendix D.  

**WQS-148:** World ethics post-mortem template Appendix E.  

**WQS-149:** Cross-ref Constitution six rules.  

**WQS-150:** Cross-ref GDB Experience Pack boundary.  

## WQS-151–WQS-175

**WQS-151:** Cross-ref Art Bible world palette row.  

**WQS-152:** No AP-ID from PCB anti-patterns in world design.  

**WQS-153:** Monetization child surface zero world IAP.  

**WQS-154:** Retention world welcome back not manipulation.  

**WQS-155:** LiveOps event decorates not replaces world spine.  

**WQS-156:** World museum export parent opt-in.  

**WQS-157:** World sync conflict server wins merge log.  

**WQS-158:** World save auto on node unlock event.  

**WQS-159:** World cheater detection silent server correction.  

**WQS-160:** World GDPR export includes node state.  

**WQS-161:** World pedagog scope read-only.  

**WQS-162:** World co-parent sync real-time node state.  

**WQS-163:** World timezone family aware unlock day boundary.  

**WQS-164:** World maintenance 503 calm message.  

**WQS-165:** World empty config parent CTA not child error.  

**WQS-166:** World i18n pack scoped copy tables.  

**WQS-167:** World teen preview locked nodes Mitt Rum only fiction.  

**WQS-168:** World documentation changelog WDB_CHANGELOG updated.  

**WQS-169:** Creative Director final Ja logged.  

**WQS-170:** Game Director final Ja logged.  

**WQS-171:** CPO audience scope child v1 confirmed.  

**WQS-172:** CTO node schema review no age branch.  

**WQS-173:** QA Director WQS sweep logged.  

**WQS-174:** Release Manager ship calendar.  

**WQS-175:** Executive Review all roles 10/10.  

## WQS-176–WQS-200

**WQS-176:** WDB v1.0 world ship bundle validator pass.  

**WQS-177:** Verkstaden project component range 40–120 acceptable if manifest documents count.  

**WQS-178:** Husdjurshemmet four phases expandable in manifest without engine change.  

**WQS-179:** Dinosauriedalen expedition nodes appendable per ADR.  

**WQS-180:** Dockhuset room furniture list expandable per room object in JSON.  

**WQS-181:** Fiskebryggan aquarium optional late phase node.  

**WQS-182:** Läshörnan story nodes one per story_id in manifest array.  

**WQS-183:** Morgonhuset node count may grow with balcony ADR — not fixed.  

**WQS-184:** Mitt Rum miniatyr nodes spawn from other world milestone events.  

**WQS-185:** Progression map rendered in PR for any node add/remove.  

**WQS-186:** Pacing review when node count changes >20% manifest semver minor.  

**WQS-187:** Behavior scientist review streak-linked world nodes forbidden.  

**WQS-188:** Educational psychologist reading on story nodes only.  

**WQS-189:** Environment artist prop list per node art ticket.  

**WQS-190:** Sound designer one-sheet per world ambient.  

**WQS-191:** Music ADR optional per world — silence default child.  

**WQS-192:** World lighting golden frame reference stored.  

**WQS-193:** World color script beat per phase documented.  

**WQS-194:** World weather table one row per allowed state.  

**WQS-195:** World seasonal table max 2 props per season.  

**WQS-196:** World secret catalog Type B only earned.  

**WQS-197:** World collectible catalog no gacha duplicates.  

**WQS-198:** World replayability list non grind.  

**WQS-199:** World parent connection paragraph accurate.  

**WQS-200:** World reward connection Skattkammaren bridge honest.  

---

# 18. Definition of Ready / Done

**DoR world:** WDB template §4 draft · PCB cite · progression manifest JSON · differentiation row · Game Director Ja

**DoD world:** WQS applicable Ja · Art palette row · living behaviors QA · test:gate world smoke · QA Lead Ja

---

# Appendix A — unlock_signal vocabulary

| Signal | Meaning |
|--------|---------|
| `first_activity_complete:*` | First verified activity in category |
| `milestone:*` | Pack-defined milestone fiction label |
| `activity_streak:*:N` | N verified completions — N in config |
| `project_stage:*:N` | Verkstaden project component index |
| `phase:*` | Husdjurshemmet phase gate |
| `expedition:N:complete` | Dino expedition complete |
| `world_complete:*` | Prior world phase complete |
| `parent_opt_in:*` | Parent setting enabled |

---

# Appendix B — Backend tables (v2 target)

```sql
-- child_progression_node: authoritative unlock state
-- world_progression_manifest: versioned per pack_id + world_slug (JSONB nodes[])
-- unlock_signal resolver: pack rules engine (no hardcoded thresholds)
```

---

# Appendix C — Dokumentändringar (ADR log)

| Datum | Ändring | Varför |
|-------|---------|--------|
| 2026-06-29 | Ersatte "75 build parts" med Progression Nodes | Constitution §6 — emotional progression over quota |
| 2026-06-29 | Verkstaden project×component model | Worlds must feel different — maker not flat list |

---

# Executive Review — v1.0

| Roll | Fokus | Score | Beslut |
|------|-------|-------|--------|
| CEO | 20-year franchise — data-driven pacing | **10/10** | **Godkänd** |
| CPO | Barn v1 + pack expansion without fork | **10/10** | **Godkänd** |
| CTO | Node schema age-agnostic | **10/10** | **Godkänd** |
| Creative Director | Differentiation matrix enforced | **10/10** | **Godkänd** |
| Game Director | No magic numbers — emotional nodes | **10/10** | **Godkänd** |
| Nintendo Level Designer | One focal frame per world entry | **10/10** | **Godkänd** |
| Nintendo Gameplay Designer | One primary interaction default | **10/10** | **Godkänd** |
| Pixar Story Director | Emotional beat per node | **10/10** | **Godkänd** |
| Child Psychologist | No guilt NPC / pet mechanics | **10/10** | **Godkänd** |
| Occupational Therapist | 48 px placement motor | **10/10** | **Godkänd** |
| Accessibility Director | Reduced motion + silent path | **10/10** | **Godkänd** |
| QA Director | WQS-200 binary enforceable | **10/10** | **Godkänd** |
| Release Manager | DoR/DoD ship gate | **10/10** | **Godkänd** |

**Slutsats:** WORLD_DESIGN_BIBLE v1.0 är live-release design contract för alla världar. Progression = nodes in manifest, not magic numbers.

---

*Genererad av `scripts/generate-world-design-bible-v1.py` + `scripts/wdb_progression_nodes.py`*