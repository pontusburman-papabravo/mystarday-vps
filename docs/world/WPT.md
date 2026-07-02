# World Production Template (WPT)

**Version:** 1.0  
**Status:** Normative  
**Authority:** Subordinate to [World Constitution](../../.ai/product/bibles/WORLD_BIBLE.md) §1 · implements [RBS Part III](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs)  
**Reference implementation:** [`specs/100-home.md`](./specs/100-home.md) + [`data/100-home.yaml`](./data/100-home.yaml)

> **WPT is normative.** Every room production spec MUST follow these sections in order. Deviations require ADR in POS `14_DECISION_LOG.md`.

---

## Purpose of WPT

WPT standardizes **how** rooms are specified — not **what** they contain. Cursor, artists, engineers, and QA read the same structure every time.

| Without WPT | With WPT |
|-------------|----------|
| "Här finns en soffa, ett bord, ett fönster" | Why the room exists, how it feels, what happens in 5 seconds |
| Inventories without intent | Emotional contract + simulation hooks |
| Art before data | YAML contract before pixels |

**Workflow:**

```text
WPT (this document)
        ↓
data/XXX-room.yaml      ← machine contract (Cursor reads first)
        ↓
specs/XXX-room.md       ← human narrative (why, QA, ecology)
        ↓
LWES pack + Art Bible   ← runtime + visuals
```

---

## Dual-format rule

| Format | Location | Owns |
|--------|----------|------|
| **YAML** | `docs/world/data/*.yaml` | IDs, enums, edges, simulation keys, budgets |
| **Markdown** | `docs/world/specs/*.md` | Purpose, story, micro-stories, QA judgment |

If YAML and MD conflict on **contracts** → YAML wins. If MD adds narrative not in YAML → add YAML keys or mark `TBD`.

---

## Core sections (1–14) — required in every room

Each section below MUST appear in `specs/XXX-room.md` and map to keys in `data/XXX-room.yaml`.

---

### 1. Purpose

**What to write:** Why this room exists in the child's world — not a furniture list. One paragraph + optional bullet consequences ("If this fails, the whole world feels wrong").

**YAML contract field:**

```yaml
purpose:
  summary: string              # 1–3 sentences
  failure_impact: string         # What breaks if emotion wrong
  constitution_pillars: []     # capability | ownership | comfort | curiosity | imagination
room:
  description: string          # Child-facing place label (sv)
```

**Definition of done:** A stranger can explain why the room matters without naming objects. At least one Constitution pillar named.

**Anti-patterns:**

- "Här finns soffa, bord, fönster" without emotional job
- "Belöningsskärm för stjärnor"
- Purpose copied from another room with find-replace

---

### 2. Emotional Contract

**What to write:** Primary feeling + motor tuning block. How Director, audio, and lighting should behave.

**YAML contract field:**

```yaml
emotional_contract:
  primary_emotion: Comfort       # Sluten lista — World Bible Part III
  secondary_emotion: Ownership   # Max 1
  stress_level: lowest           # lowest | low | medium | high
  activity_level: calm           # calm | moderate | lively | energetic
  music_density: low             # none | low | medium | high
  ambient_density: medium        # low | medium | high
  light_temperature: warm        # cool | neutral | warm | golden | amber
  constitution_pillar: comfort
  calmness_target: 80            # Director — LWES §93
```

**Definition of done:** All seven tuning fields set. Primary emotion matches `room.primary_emotion`. Secondary does not contradict primary.

**Anti-patterns:**

- Multiple primary emotions
- `stress_level: high` in comfort anchor rooms (Home, bedroom)
- Abstract "mysigt" without YAML numbers/enums

---

### 3. First Impression

**What to write:** Sequence diagram for first **5 seconds** after enter. No popup, dialog, reward, tutorial, or paywall (LWES §119.4).

**YAML contract field:**

```yaml
first_impression:
  duration_ms: 5000
  forbidden:
    - popup
    - dialog
    - reward_toast
    - tutorial_overlay
    - paywall
  sequence:
    - step: 1
      id: door_opens
      description: string
      duration_ms: TBD
    - step: 2
      id: light_falls_in
      # ...
```

**Definition of done:** ≥4 timed beats. Ends with child agency ("barnet får kontroll"). Matches LWES first-five-seconds table.

**Anti-patterns:**

- Achievement toast in second 0–5
- Forced tap to dismiss intro
- Black screen load without readable scene

---

### 4. Room Story

**What to write:** Narrative identity — lived in, not new, not worn out. Who lives here? What happened before the child arrived?

**YAML contract field:**

```yaml
room_story:
  identity: string               # Narrative paragraph
  lived_in: true
  patina_level: subtle           # none | subtle | moderate — never "worn out"
  inhabitants: []                # child, pet, family (fiction)
  open_questions: []             # ≥1 unanswered — child invents answer
```

**Definition of done:** Reader feels "someone lives here." No museum-showroom tone. ≥1 open question listed.

**Anti-patterns:**

- "Nybyggt perfekt hus"
- "Slitet och smutsigt" (guilt/shame)
- Lore dump in UI copy

---

### 5. Hero Object

**What to write:** Exactly **one** hero per room — highest visual weight, story anchor. Theme variant table if `theme_support` > 1.

**YAML contract field:**

```yaml
hero_object:
  id: fireplace_hero
  description: string
  story_purpose: string
  interaction_level: inspect_primary
theme_hero_variants:
  house: { id: fireplace_hero, label_sv: Eldstaden }
  castle: { id: great_fireplace, label_sv: Stor öppen spis }
  # ...
landmark:
  id: chimney_landmark
  description: string            # Part I emotional geography
```

**Definition of done:** One hero ID. Theme table covers all `room.theme_support` entries. Hero does not compete with nav hotspots in same pixel zone.

**Anti-patterns:**

- Two heroes "equally important"
- Hero = UI button or menu icon
- Theme variant that changes layout geometry (skin only)

---

### 6. Environmental Storytelling

**What to write:** List of micro-stories — props that imply life without explanation. Minimum count: **Home = 20+**, other rooms ≥12 unless ADR.

**YAML contract field:**

```yaml
environmental_storytelling:
  minimum_count: 20
  micro_stories:
    - id: open_book
      prop_ref: TBD
      description_sv: En bok ligger öppen
      explained: false
```

**Definition of done:** Count meets minimum. Each entry is observable, not quest-linked. Cross-ref [World Bible Ecology](../../.ai/product/bibles/WORLD_BIBLE.md) if Part VI exists.

**Anti-patterns:**

- "Talk to NPC to learn why book is open"
- Collectible counter on micro-story
- Random clutter without implied narrative

---

### 7. Pet Behaviour

**What to write:** Simulation-driven states when pet is present — not random teleport. Which spots, which animations, what triggers transition.

**YAML contract field:**

```yaml
pet_behaviour:
  simulation_driven: true
  states:
    - id: sleep
      anchor: fireplace_hero
      weight: simulation
    - id: look_out_window
      anchor: window_perch
  forbidden:
    - random_teleport
    - hunger_timer
    - guilt_dialogue
pet_contract:
  allowed: true
  pets: [{ id: dog_companion, home_anchor: fireplace_hero }]
```

**Definition of done:** ≥3 states. `simulation_driven: true`. No hunger/sick mechanics (LWES §26).

**Anti-patterns:**

- `Math.random()` narrative in spec without simulation hook
- Pet blocks navigation
- Pet begs for food

---

### 8. Ambient Life

**What to write:** Two lists — **Always active** vs **Sometimes** (weather, season, discovery-gated).

**YAML contract field:**

```yaml
ambient_life:
  always_active: [light, wind, curtains, shadows, fire, dust, clock, plants, birds]
  sometimes: [butterflies, rain, snow, sunbeams, silence]
ambient_runtime:
  ambient_ids: []
  rare_events: []
```

**Definition of done:** Both lists populated. Always list has ≥5 entries for interior rooms. Sometimes includes explicit "nothing" / silence beat.

**Anti-patterns:**

- Constant particle spam
- Ambient that requires tap
- Same density in reduced-motion path without fallback

---

### 9. Build Progression

**What to write:** Day 1 vs weeks later — what changes visually as child completes real-life routines. Tie to WDB nodes where known.

**YAML contract field:**

```yaml
build_progression:
  day_1:
    description: string
    visible_elements: []
  weeks_later:
    description: string
    visible_elements: []
build_slots: []                  # Full slot defs — RBS Part III
```

**Definition of done:** Before/after narrative exists. Each build slot links to `progression_key` or `TBD`.

**Anti-patterns:**

- Pay-to-skip build
- Slots that reset daily
- Stars purchase build parts (R-02)

---

### 10. Memory Points

**What to write:** What memories appear **in the room** — trophies, photos, first pet — never as separate list UI.

**YAML contract field:**

```yaml
memory_points:
  - id: first_pet
    display: in_world
    progression_key: TBD
  - id: family_photos
    display: in_world
    slot_ref: hall_museum_frame
story_anchors:
  past: []
  present: []
  future: []
```

**Definition of done:** ≥3 memory types identified. All `display: in_world`. No modal gallery.

**Anti-patterns:**

- "Minnen"-tab
- Achievement grid
- Parent-uploaded photo without child placement fiction

---

### 11. Navigation

**What to write:** Intuitive exits — child walks, no menus. Landmark labels (sv). Comfort zone / return anchor if applicable.

**YAML contract field:**

```yaml
navigation:
  edges:
    - nav_id: door_garden
      from_scene: home_hall
      to_scene: garden
      landmark_label_sv: Trädgården
      transition_profile: door_fade_pan
  return_anchor: door_from_exterior
  comfort_zone: true
navigation_targets: [garden, trophy_room, museum, reading_corner, pet_house]
```

**Definition of done:** Every exit has `nav_id`, `to_scene`, `landmark_label_sv`. No URL/tab navigation. Shipped vs planned targets marked.

**Anti-patterns:**

- Hamburger menu for world travel
- "Back to hub" breaking fiction
- Invisible hit areas without landmark

---

### 12. Audio

**What to write:** Every sound has a **visible or logical source** in the room. No abstract drone pad without diegetic anchor.

**YAML contract field:**

```yaml
audio_contract:
  profile_id: string
  diegetic_sources:
    - id: clock_tick
      source_object: wall_clock
    - id: fire_crackle
      source_object: fireplace_hero
  abstract_ambient_allowed: false
```

**Definition of done:** ≥4 diegetic sources listed. `master_gain_max` ≤ 0.65 for home comfort zones.

**Anti-patterns:**

- Generic "cozy ambient.mp3" with no source
- Sudden volume spikes on enter
- Voiceover explaining the room

---

### 13. Weather

**What to write:** Per-weather behaviour — audio, light, props (blanket out, open window). Atmosphere only — not gameplay difficulty.

**YAML contract field:**

```yaml
weather_support:
  inherit_world: true
  effects:
    - weather: rain
      audio: rain_on_glass
      visual: window_droplets
      light_shift: none
    - weather: snow
      light_shift: warmer_interior
```

**Definition of done:** ≥3 weather types. Each has audio and/or visual note. No gameplay penalty.

**Anti-patterns:**

- Weather blocks child from leaving
- Scary storm in home comfort zone
- Weather only as shader with no fiction

---

### 14. QA

**What to write:** Qualitative acceptance criteria — human judgment, not automated metrics alone. Bullets a parent/designer can verify.

**YAML contract field:**

```yaml
qa:
  acceptance_criteria:
    - id: stay_without_rewards
      text_sv: string
  quality_gates:
    designer: pending
    artist: pending
    ai_gen: pending
    engineer: pending
```

**Definition of done:** ≥5 qualitative bullets. All four quality gates addressed before `status: approved`.

**Anti-patterns:**

- "Looks good" without testable criteria
- QA only = screenshot attached
- Ship with `constitution_violation: true`

---

## Appendix sections (production) — required before art ship

Appendix content lives primarily in YAML; MD expands with art/engineering notes. Mark `TBD` explicitly — never omit section.

| Appendix | YAML keys | Notes |
|----------|-----------|-------|
| **Camera** | `camera_contract`, `spatial_contract.camera_anchor` | Fixed 2.5D default; LWES rendering |
| **Layout** | `spatial_contract` | Zones, walking area, entrance |
| **Lighting** | `lighting_contract` | Primary/secondary source, time variants |
| **Time of Day** | `lighting_contract.time_variants` | morning / evening / night |
| **NPC** | `npc_contract` | No quest giver; G-01 wins only |
| **Interactions** | `interactive_objects` | LWES §22 types only |
| **Build Slots** | `build_slots` | WDB progression keys |
| **Discoveries** | `discoveries` | common / rare / seasonal / hidden |
| **Season** | `seasonal_variants` | global_sync with world |
| **Theme Variants** | `theme_variants`, `theme_hero_variants` | Skin only — same layout |
| **Accessibility** | `performance_budget.reduced_motion_path`, a11y notes in spec | MO-03, 44pt targets |
| **Performance** | `performance_budget` | 60 fps, hotspot caps |
| **Prompt** | `prompt_manifest` | Art Prompt Catalog refs |
| **Ecology** | `environmental_storytelling`, cross-ref World Bible ecology | Cause-effect chains |

---

## Room status lifecycle

```yaml
status: draft       # WPT sections 1–14 drafted
        review      # QA + constitution check
        approved    # Quality gates pass — art may start
        shipped     # In production pack + code
```

**Gate:** Do **not** start next catalog room (e.g. 101 Hall) until prior room **QA section** is approved (see [`README.md`](./README.md)).

---

## File checklist per room

| File | Required |
|------|----------|
| `data/XXX-room.yaml` | Yes — full WPT key coverage |
| `specs/XXX-room.md` | Yes — sections 1–14 + appendix headers |
| Entity Bible rows | Before art — hero + interactives |
| LWES `scenes.json` entry | Before ship |

---

## Cross-references

| Document | Role |
|----------|------|
| [World Bible Part III RBS](../../.ai/product/bibles/WORLD_BIBLE.md#part-iii--room-blueprint-standard-rbs) | Schema depth, interaction types |
| [LWES](../../.ai/product/LIVING_WORLD_ENGINE_SPEC.md) | Runtime, Director, §119 Home effect |
| [Art Bible](../../.ai/product/ART_BIBLE.md) | Palette, QG, prompt style |
| [WDB](../../.ai/product/WORLD_DESIGN_BIBLE.md) | Progression nodes |
| [`_TEMPLATE.room.yaml`](./_TEMPLATE.room.yaml) | Copy-paste starter |
| [`_TEMPLATE.room.md`](./_TEMPLATE.room.md) | MD mirror |

---

*WPT v1.0 — 2026-07-02. Reference room: **100 Home**.*
