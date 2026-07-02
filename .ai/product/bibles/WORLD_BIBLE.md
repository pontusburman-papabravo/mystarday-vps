# World Bible — Min värld Spatial & Emotional Architecture

**Version:** 0.1 (skeleton)  
**Status:** In progress — **priority #1** production bible  
**Authority:** Subordinate to PCB (soul), WDB (progression nodes), LWES (runtime)  
**Audience:** Art directors, level designers, animators, AI agents, engineers  
**Map:** [DOCUMENTATION_MAP.md](../DOCUMENTATION_MAP.md)  

---

## Purpose

The World Bible defines **how Min värld is structured as one continuous place** — not a collection of screens.

It answers:

- How rooms connect (graph, emotional geography)  
- How the child moves (navigation philosophy)  
- What is visible from where  
- How the world grows over years without rewrite  
- Per-scene production specs (emotion, landmarks, entity counts, build slots)  

**This is NOT WDB.** WDB owns progression nodes and WQS-200. This bible owns **spatial and emotional architecture** — the neighborhood before each house, the hall inside it, the garden beyond.

Cross-ref: LWES Part V (data) · Part IX (experience orchestration) · WDB progression nodes · [EMOTION_BIBLE.md](./EMOTION_BIBLE.md)

---

## 1. How the world is structured

### 1.1 One world graph

Min värld is a **directed graph of scenes** — not coordinates on a global map.

```
World (e.g. home)
  └── Scene (e.g. home_hall)
        └── Entities (objects, NPCs, nav edges, build slots)
```

- One `world_id` per PCB world (Mitt hem, Skogen, …)  
- Scenes declare **neighbors only** — no hardcoded x/y world positions (LWES §71)  
- Sibling worlds (PCB seven worlds) are **separate graphs** — never nested tabs  

Reference pack: `config/experience-packs/child_se/worlds.json` · LWES §67

### 1.2 Layers inside a scene

| Layer (back → front) | Role |
|----------------------|------|
| Sky / weather | Season, time-of-day inherit |
| Background | Fixed silhouette, identity |
| Midground | Interactive entities, paths |
| Foreground | Parallax depth, framing |
| Ambient overlay | Particles, light shafts (budgeted) |
| UI chrome | Forbidden as primary navigation |

Art Bible § layer order · LWES Part III

### 1.3 World vs scene vs room

| Term | Meaning |
|------|---------|
| **World** | PCB fiction unit (Mitt hem, pirate island, …) |
| **Scene** | One visitable place (`scene_id`) |
| **Room** | Child-facing name for a scene (Hallen, Trädgården) |

---

## 2. How rooms connect — graph & emotional geography

### 2.1 Navigation graph (data)

Scenes connect via **navigation edges** only:

```
home_hall ──door_garden──► garden
home_hall ──door_bedroom──► bedroom
home_hall ──door_trophy──► trophy_room
garden ──path_workshop──► workshop
```

Pack field: `navigation_edge` (LWES §71.2, Appendix C)

```yaml
navigation_edge:
  nav_id: door_garden
  from_scene_id: home_hall
  to_scene_id: garden
  transition_profile: door_fade_pan   # semantic — not code branch
  nav_type: Door                    # closed enum §19.3
  landmark_at_junction: mailbox_1   # World Bible — visual memory
```

### 2.2 Emotional geography

Each scene carries a **default emotional job** (extends WDB emotion job):

| Room type | Emotional geography | Default atmosphere |
|-----------|---------------------|-------------------|
| Home / hall | Arrival, safety, orientation | Warm, calm, familiar (calmness ≥ 75) |
| Bedroom / cozy | Rest, comfort, pretend | Soft, quiet, low density |
| Garden / outdoor | Exploration, wonder, scale | Open, light, medium density |
| Workshop / build | Capability, making | Focused, tactile, moderate activity |
| Treasure / reward | Pride, ownership | Celebratory but not casino |
| Museum / memory | Reflection, growth visible | Still, respectful, no grind |
| Kitchen / social | Ritual, togetherness | Lively but not chaotic |
| Pet space | Attachment, care | Gentle, responsive NPC/pet |

Pack field: `emotional_geography` enum per scene (LWES §118.3)

### 2.3 Landmarks at junctions

Where paths split, the world MUST offer **visual landmarks** — not floating UI labels.

Child remembers: *"Turn at the big oak"* — not *"Tap Rewards icon"*.

---

## 3. How the child moves — navigation philosophy

From **LWES Part IX** (§116–118). Normative for World Bible authoring:

| Rule | Requirement |
|------|-------------|
| Walking, not paging | Movement = door open, path scroll, camera travel — never `window.location` |
| No menu primary nav | No tab bar, hamburger, icon grid listing rooms |
| Place transition | Enter/exit via `child-living-world-transition.js` — portal feel |
| Emotional continuity | Transition profile matches geography (door vs path vs gate) |
| Return path visible | Dead-end rooms show return affordance in first camera frame |
| One mental map | Consistent left/right layout between visits |

Navigation types (closed enum): Door · Gate · Bridge · Path · Stairs · Ladder · Portal (fantasy themes only)

---

## 4. What is visible from different places

### 4.1 Sightlines & tease

Scenes SHOULD **hint at neighbors** without requiring travel:

| From | Visible / audible tease |
|------|-------------------------|
| `home_hall` | Garden light through door glass; mailbox; coat hooks |
| `garden` | House silhouette; workshop smoke (if unlocked) |
| `bedroom` | Window weather; pet bed corner |

Pack field: `sightline_teases[]` — `{ target_scene_id, tease_type, entity_id }`

### 4.2 Unlock visibility

New areas appear **in the map** — not in a separate list UI. A new door, path, or bridge is the unlock affordance.

Cross-ref: WDB progression node → World Bible `unlock_reveals_nav_id`

---

## 5. How the world grows over time

### 5.1 Growth without rewrite

| Mechanism | How |
|-----------|-----|
| New scenes | Add nodes + edges to graph — engine unchanged |
| New entities | Entity Bible entries + pack `entities[]` |
| Seasonal reskin | Theme system swaps art — not emotional logic |
| Progression reveal | WDB node unlocks nav edge or build slot |
| Extension pack | New `experience_pack` version — migration one release |

LWES §73 plugin philosophy · Part V pack schema

### 5.2 Day 1 / 7 / 30 density curve

| Phase | World feel |
|-------|------------|
| Day 1 | Home hall + 1–2 rooms; 5–8 meaningful interactives |
| Day 7 | Garden or bedroom open; pet visible; first build slot used |
| Day 30 | Workshop or trophy path; seasonal variant; one story seed chain |

Detail: [ECONOMY_PROGRESSION_BIBLE.md](./ECONOMY_PROGRESSION_BIBLE.md) (planned) · WDB nodes

---

## 6. Build slot map philosophy

Build slots are **fiction surfaces** — not inventory grids.

| Principle | Rule |
|-----------|------|
| Placement = ownership | Child sees their chair in the hall tomorrow |
| Slots are scarce | 3–6 per scene max at launch — quality over count |
| Slot types | Floor · Wall · Shelf · Garden plot · Hook |
| No guilt empty slots | Empty slot = invitation (subtle), not broken promise |

Pack: `BuildSlot` component on entity (LWES §68) · WDB living-object rules

---

## 7. Theme system impact

Themes swap **art skins**, not emotional geography or graph topology.

```
theme_skin_key: house_default | house_winter | house_birthday
```

| Changes with theme | Does NOT change |
|--------------------|-----------------|
| Textures, decals, palette accents | Nav graph |
| Seasonal props (snow, lights) | Entity ids |
| Ambient density tier (Director) | Progression thresholds |
| Audio stem mix | Scene emotional_geography |

Cross-ref: Art Bible §3 palettes · LWES §37 lighting

---

## 8. How new areas add in five years (extension without rewrite)

Checklist for new scene:

1. World Bible entry (this document) — emotional geography, landmarks, counts  
2. WDB progression node — unlock condition  
3. Entity Bible entries — every object  
4. Pack: `scenes.json` + `navigation_edge` + entities  
5. Animation / Prompt / Audio bible entries  
6. WQS spot-check (LWES Part X)  

**Forbidden:** `if (scene_id === 'new_room')` in engine code.

---

## 9. Seasons affect everything

When `seasonal_enabled: true` on world:

| System | Seasonal behaviour |
|--------|-------------------|
| Art | Theme skin + prop variants |
| Audio | Bird density, wind, indoor warmth |
| Ambient | Snow particles, leaf fall (budgeted) |
| Light | Shorter days → warmer interior |
| Events | World Events Bible — snow, harvest, birthday |

Season is **atmosphere**, not FOMO. No "you missed winter" guilt.

---

## 10. Pet movement between rooms

Pets use **Persistent + Pet + Creature** components (LWES §26, §68).

| Behaviour | Rule |
|-----------|------|
| Home scene | Pet has `home_scene_id` + optional `follows_child` |
| Cross-room | Pet transitions via same nav graph as child — not teleport UI |
| States | Sleep · Idle · Eat · Follow · Play · Explore · Sit · Happy · Excited |
| Forbidden | Hungry · Sick · Dying · Sad · Lonely (guilt) |

World Bible declares: `pet_spawn_scenes[]`, `pet_rest_entity_id`, `pet_path_preferences[]`

---

## 11. Alive without interaction

From LWES Rule 1 (§2): world never waits for taps.

| Ambient tier | Examples |
|--------------|----------|
| Subtle | Curtain sway, clock tick, distant bird |
| Medium | Pet stretch, kettle steam, mailbox flag |
| Hero | One per visit max — Director budget |

Every scene MUST pass **first five seconds** test (LWES §119.4): readable → alive → one affordance.

---

## 12. Per-scene template

Copy this block for every `scene_id`.

```yaml
scene_spec:
  scene_id: string                    # REQUIRED — matches pack
  display_name_sv: string
  world_id: string
  status: draft | review | complete

  # Emotional
  emotional_geography: enum           # §2.2 table
  strengthens_feeling: []             # Five Feelings filter (Appendix J)
  primary_emotion: enum               # LWES Appendix H.1
  calmness_target: 0-100              # Director §93

  # Spatial
  nav_edges_out: []                   # nav_id list
  nav_edges_in: []
  sightline_teases: []
  landmarks: []                       # junction + identity objects
  emotional_anchor_entity_id: string  # LWES §87

  # Density targets
  meaningful_interactives: 5-10       # not 50
  ambient_entities: 3-8
  build_slots: 0-6
  toy_density_target: number

  # Identity (screenshot test §119.1)
  signature_silhouette: string
  signature_colour_accent: string
  signature_soundscape: string

  # Cross-refs
  wdb_nodes: []                       # progression node ids
  lwes_profiles:
    camera_profile: string
    lighting_profile: string
    music_profile: string
    transition_profiles: []

  # Play (Appendix J)
  pretend_affordances: []
  story_anchor_entity_id: string
  open_questions: []
  comfort_zone: boolean
```

---

## 13. Example scene — `home_hall` (Mitt hem)

**Status:** Reference example — first production target (`docs/child-worlds-index.md`)

### 13.1 Identity

| Field | Value |
|-------|-------|
| `scene_id` | `home_hall` |
| `display_name_sv` | Hallen |
| `world_id` | `home` |
| `emotional_geography` | Home / hall — arrival, safety, orientation |
| `strengthens_feeling` | comfort, imagination, ownership |
| `primary_emotion` | safety (Appendix H) |
| `calmness_target` | 80 |

### 13.2 Emotion & landmarks

| Element | Purpose |
|---------|---------|
| Warm morning light through side window | Trygghet — see Emotion Bible |
| Soft wood floor, textile rug | Comfort, capability (shoes off ritual) |
| Coat hooks with child's item | Ownership — *"Det här är mitt"* |
| Mailbox / package slot | Curiosity — half-story, no quest log |
| Sleeping pet in basket (corner) | Trygghet + attachment |
| Door to garden (glass/light) | Nyfikenhet — tease outdoor |
| Door to bedroom (soft light leak) | Calm invitation |

**Emotional anchor:** `mailbox_1` or `pet_basket_1` (pack decision)

### 13.3 Navigation graph

```
home_hall ──door_garden──► garden
home_hall ──door_bedroom──► bedroom
home_hall ──door_trophy──► trophy_room   # locked until WDB node
```

Transition profiles: `door_fade_pan` (garden), `door_soft_drift` (bedroom)

### 13.4 Counts & slots

| Target | Count |
|--------|-------|
| Meaningful interactives | 8 |
| Ambient entities | 5 (clock, curtain, plant, light shaft, distant sound) |
| Build slots | 4 (floor rug area, wall hook, shelf, hall table) |
| `toy_density_target` | 8 |

### 13.5 Sightlines

| Tease | From entity |
|-------|-------------|
| Garden green through door | `door_garden` |
| Bedroom soft glow | `door_bedroom` |
| Trophy door ribbon (if locked) | `door_trophy` |

### 13.6 WDB cross-ref

| WDB node (example) | Reveals in hall, not UI |
|--------------------|--------------------------|
| `home_first_visit` | Hall fully readable day 1 |
| `garden_unlock` | `door_garden` nav edge active |
| `trophy_room_unlock` | `door_trophy` opens |

### 13.7 LWES Part V pack sketch

```yaml
scene:
  id: home_hall
  display_name_sv: Hallen
  camera_profile: hall_fixed_2_5d
  music_profile: home_day
  lighting_profile: morning
  weather_inherit: true
  navigation:
    - nav_id: door_garden
      target_scene_id: garden
    - nav_id: door_bedroom
      target_scene_id: bedroom
    - nav_id: door_trophy
      target_scene_id: trophy_room
```

### 13.8 First five seconds (QA)

| Second | Pass criteria |
|--------|---------------|
| 0–1 | Hall readable — no popup |
| 1–3 | Curtain or pet subtle motion |
| 3–5 | Mailbox or door affordance obvious |

---

## 14. Scene index (planned)

| scene_id | display_name_sv | Status |
|----------|-----------------|--------|
| `home_hall` | Hallen | Example above — **GO** |
| `garden` | Trädgården | TODO |
| `bedroom` | Sovrummet | TODO |
| `trophy_room` | Troférum | TODO |
| `workshop` | Verkstaden | TODO |

---

## 15. Definition of Done (per scene)

- [ ] Template §12 filled  
- [ ] Emotional geography + Five Feelings pass  
- [ ] Nav edges declared — graph only  
- [ ] Landmarks at junctions  
- [ ] Counts within LWES density guidance  
- [ ] WDB nodes linked  
- [ ] Entity Bible entries exist for all entities  
- [ ] First five seconds + Home test pass (LWES §119, §88)  
- [ ] No function→room anti-pattern (LWES §126)  

---

**Next work:** Complete `home_hall` entity list → Entity Bible.  
**Cross-ref:** [EMOTION_BIBLE.md](./EMOTION_BIBLE.md) · [TECHNICAL_ARCHITECTURE_BIBLE.md](./TECHNICAL_ARCHITECTURE_BIBLE.md)
