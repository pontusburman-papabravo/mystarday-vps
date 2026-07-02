# Stjärndag — Living World Engine Specification

**LWES v1.0 — NORMATIVE RUNTIME CONTRACT** <!-- pragma: allowlist secret -->

**Document type:** Living World Engine Specification (LWES)  
**Version:** 1.0  
**Status:** **COMPLETE — Parts I–X (engine + experience orchestration + WQS gate)**  
**Created:** 2026-07-02  
**Language:** English (technical) · Swedish examples where child-facing  
**Audience:** Game engine architects, frontend, backend, animators, AI agents, QA  

---

## §0 — LWES Scope Boundary

| In scope (LWES v1.0) | Out of scope (Production Bibles) |
|----------------------|----------------------------------|
| **Parts I–X** — engine runtime + experience orchestration + LWES-WQS | Per-scene entity rows, prompt sheets, animation frames |
| Runtime contracts, schemas, event bus | Illustration prompts, audio stems |
| System boundaries, update loop, Director | Day 1/7/30 unlock graphs (Progression Bible) |
| Data architecture (entity, component, pack) | Art generation → implementation handoff |
| **Part IX** — journey, navigation, spatial memory | |
| **Part X** — LWES-WQS-001–025 ship gate | |

**LWES v1.0 = how the engine works and how the child experiences one world.** Parts I–X are **complete**.

**Per-asset production specs** live in **[Production Bibles](./bibles/README.md)** — World, Entity, Animation, Prompt, Audio, Progression, World Events, Art Prompt Catalog.

**World progression ship gate:** WDB WQS-001–200. **Experience orchestration ship gate:** LWES Part X + Appendix K (complements WDB — both required).

**No new LWES parts without ADR** in `product-operating-system/14_DECISION_LOG.md`.

**Authority chain for implementation:**

```
Vision (PCB, LWES principles)
  → Production Bibles (concrete specs)
  → Art Generation → Implementation
```

See [AODS.md](./AODS.md) for AI orchestration rules enforcing this chain.

---

## Document metadata

### Min värld — five feelings filter

**Supreme content filter** for Min värld (LWES, PCB fiction, WDB rooms, Art Bible scenes). Every feature MUST pass before ship:

> **Nothing exists only because it is fun.**
>
> **Everything exists because it strengthens the child's feeling of capability, ownership, comfort, curiosity, or imagination.**

| Feeling | Swedish child anchor | Question for every feature |
|---------|---------------------|---------------------------|
| **Capability** | *"Jag klarar det."* | Does it mirror real growth? |
| **Ownership** | *"Det här är mitt."* | Does the child claim it? |
| **Comfort** | *"Det känns tryggt."* | Is it safe, calm, welcoming? |
| **Curiosity** | *"Vad är det?"* | Does it invite wonder without explaining? |
| **Imagination** | *"Tänk om…"* | Does it leave room for the child's story? |

If the answer is *"none"* or *"only because it's cool"* — it does **not** belong in Min värld.

Pack field (optional audit): `strengthens_feeling: capability | ownership | comfort | curiosity | imagination` (Appendix J).

### Purpose

LWES v1.0 is the **single normative contract** for how Min värld **behaves, updates, persists, and feels alive** at runtime.

An engineer, animator, or AI agent MUST be able to implement or extend the Living World without inventing gameplay rules that belong in PCB, WDB, GDB, or Art Bible.

LWES does **not** replace those documents. It **operationalises** them in code.

### Craft quality bar

**10/10 MUST NOT mean "the most possible."**

**10/10 MUST mean "nothing feels cheap."**

Nintendo does not ship 200 animations for a 10/10 room. They ship **20 perfect animations**.

Pixar does not add more detail. They add **the right detail**.

LWES applies this bar to **every system**: fewer authored beats, each flawless — never more features to compensate for weak craft.

### Min värld mantra

> **A child should never see an "app that contains a world".**
>
> **A child should feel they are visiting a world that happens to exist inside an app.**

This mantra governs Parts I–X. If implementation reads as a reward page with illustration on top, it fails — regardless of feature count.

Part VI operationalises **how every tap feels** — the heart between PCB soul and Art Bible pixels.

Part VII orchestrates **when** systems speak — the invisible conductor between Part IV intelligence and Part VI feel.

Part VIII defines **why the child stays** — play, imagination, and pretend; the child is the storyteller.

Part IX orchestrates **how the child moves through the world** — continuous journey, spatial memory, emotional geography; no screens, only places.

Part X defines **LWES-WQS** — the experience-orchestration ship gate (complements WDB WQS-001–200).

Per-scene production detail (entity rows, prompts, asset sheets) lives in **[Production Bibles](./bibles/README.md)** — not duplicated in LWES.

### Authority hierarchy

```
1. Product Constitution (docs/PRODUCT-CONSTITUTION.md)
2. POS — product-operating-system/
3. PCB — PRODUCT_CONTENT_BIBLE.md (why the world exists)
4. WDB — WORLD_DESIGN_BIBLE.md (what exists, progression nodes)
5. GDB — GAME_DESIGN_BIBLE.md (loops, motivation, game feel)
6. Art Bible — ART_BIBLE.md (how it looks, moves in pixel/time)
7. DENNA LWES v1.0 (how the world behaves at runtime)
8. Implementation — MUST follow LWES; MUST NOT override above
```

**Conflict rules:**

| Conflict | Winner |
|----------|--------|
| Fiction / emotion job | PCB |
| Progression structure / node types | WDB |
| Core loop / motivation ethics | GDB + POS 06 |
| Pixel timing / motion tokens / illustration craft | Art Bible |
| Runtime behaviour / system boundaries | **LWES** |
| Camera, streaming, layer compositing at runtime | **LWES Part III** (implements Art Bible) |
| Ethical child safety (no guilt, no punishment) | POS + GDB — always |

Implementation MUST NEVER invent gameplay that violates LWES or any document above LWES.

### Cross-references

| Document | LWES uses it for |
|----------|------------------|
| [PRODUCT_CONTENT_BIBLE.md](./PRODUCT_CONTENT_BIBLE.md) | World soul, sandbox ethics, NPC contract |
| [WORLD_DESIGN_BIBLE.md](./WORLD_DESIGN_BIBLE.md) | Scenes, progression nodes, living rules |
| [GAME_DESIGN_BIBLE.md](./GAME_DESIGN_BIBLE.md) | Activity → reward → world loop, anti-frustration |
| [ART_BIBLE.md](./ART_BIBLE.md) | Layer order, ambient amplitude, motion caps, QG-001–500 |
| Part VI–IX (LWES) | Feel, Director, play, experience orchestration cross-refs |
| Part X (LWES) | Experience/emotional ship gate — complements WDB §17 |
| [docs/child-image-assets.md](../../docs/child-image-assets.md) | Asset paths and scene inventory |
| `src/platform-engine/` | Server-side Event Bus + progression skeleton |
| `public/js/child-living-world-transition.js` | Enter/exit chrome (place, not page) |

### What LWES owns vs does not own

| LWES owns | LWES does not own |
|-----------|-------------------|
| Scene lifecycle, entity model, event bus contract | World fiction copy (PCB) |
| Update loop priorities, three clocks | Progression node definitions (WDB pack manifest) |
| Persistence boundaries, world state schema | Unlock thresholds / star economy (server + POS 09) |
| Interaction, navigation, ambient runtime rules | Illustration briefs, palette (Art Bible) |
| Discovery / surprise delivery mechanics | Parent dashboard, Idag routine UI |
| Rendering runtime (camera, layers, stream) | Illustration pixel craft (Art Bible) |
| Living intelligence (memory, ambient choice, familiarity) | ML/LLM prediction, engagement optimisation |
| Data contracts (entity, component, pack schema) | Business rules in route handlers per room |
| Play & imagination (pretend, sandbox, child agency) | Clinical child psychology · engagement optimisation |
| Experience orchestration (journey, spatial memory, session acts) | Per-scene production sheets ([bibles/](./bibles/README.md)) |
| World Quality Standard — experience/emotional ship gate (Part X) | WDB WQS-001–200 progression node gates |
| Error isolation philosophy | Activity definitions, schedule truth |

---

## Table of contents

### Part I — Engine Foundation

| § | Chapter |
|---|---------|
| 1 | Purpose |
| 2 | Core Philosophy (Rules 1–7) |
| 3 | Engine Overview |
| 4 | Runtime Philosophy |
| 5 | Core Systems |
| 6 | Scene Runtime |
| 7 | Entity System |
| 8 | World State & Persistence |
| 9 | Event Bus |
| 10 | Update Loop |
| 11 | Time |
| 12 | Performance & Memory |
| 13 | Error Philosophy |
| 14 | Engine Quality Principles |
| 15 | Definition of Done (Engine Foundation) |
| 16 | Executive Principle |

### Part II — Gameplay Runtime

| § | Chapter |
|---|---------|
| 17 | Gameplay Runtime Purpose |
| 18 | Gameplay Loop |
| 19 | Navigation Runtime |
| 20 | Camera Transition |
| 21 | Hotspot Runtime |
| 22 | Interaction Types |
| 23 | Discovery Runtime |
| 24 | Surprise Engine |
| 25 | NPC Runtime |
| 26 | Pet Runtime |
| 27 | Build Runtime |
| 28 | Inventory Runtime |
| 29 | Ambient Runtime (Gameplay) |
| 30 | Definition of Done (Gameplay Runtime) |

### Part III — Rendering Runtime

| § | Chapter |
|---|---------|
| 31 | Rendering Runtime Purpose |
| 32 | Rendering Philosophy |
| 33 | Min Värld Mantra |
| 34 | Camera |
| 35 | Scene Composition |
| 36 | Scene Layers & Parallax |
| 37 | Lighting & Shadows |
| 38 | Color & Materials |
| 39 | Weather & Seasons |
| 40 | Motion |
| 41 | Particles |
| 42 | Visual Focus |
| 43 | Asset Streaming & Performance |
| 44 | Loading & Accessibility |
| 45 | Visual Polish |
| 46 | Quality Tests |
| 47 | Definition of Done (Rendering Runtime) |

### Part IV — Living Intelligence Runtime

| § | Chapter |
|---|---------|
| 48 | Living Intelligence Purpose |
| 49 | Philosophy & Golden Rule |
| 50 | Memory System |
| 51 | Event Engine |
| 52 | Ambient Intelligence |
| 53 | Story Seeds & Curiosity |
| 54 | Relationships & Pet Intelligence |
| 55 | World Invitations & Discovery Chains |
| 56 | World Evolution & Surprise Runtime |
| 57 | Parent Events & Daily Mood |
| 58 | Social Intelligence & Living Objects |
| 59 | Observation & Calmness |
| 60 | Intelligence Budget |
| 61 | Definition of Done (Living Intelligence) |
| 62 | Final Principle — Game vs Home |

### Part V — Data Architecture & Engine Contracts

| § | Chapter |
|---|---------|
| 63 | Data Architecture Purpose |
| 64 | Engine Philosophy — Generic Concepts |
| 65 | Runtime Layers |
| 66 | Experience Packs |
| 67 | World & Scene Definitions |
| 68 | Entity & Component System |
| 69 | State & Inventory Contracts |
| 70 | Theme, Asset, Animation & Audio |
| 71 | Interaction & Navigation Contracts |
| 72 | Save, Versioning & Events |
| 73 | Plugin, AI & Testing Philosophy |
| 74 | Debug & Performance Contracts |
| 75 | Definition of Done (Data Architecture) |
| 76 | Final Engineering Principle |

### Part VI — Feel, Delight & Emotional Runtime

| § | Chapter |
|---|---------|
| 77 | Emotional Runtime Purpose |
| 78 | Acknowledgement vs Reward |
| 79 | Golden Rule — One Emotion |
| 80 | Emotion Timeline & Delight Budget |
| 81 | Reward Curve & Anticipation |
| 82 | Physical Feel — Weight, Softness, Friction |
| 83 | Imperfection, Joy & Surprise |
| 84 | Discovery, Wonder & Ownership |
| 85 | Silence, Pacing & Celebration |
| 86 | Micro & Macro Delight |
| 87 | Emotional Anchors |
| 88 | Feel Quality Tests |
| 89 | Definition of Done (Emotional Runtime) |
| 90 | Final Principle & Team Rule |

### Part VII — Living World Director

| § | Chapter |
|---|---------|
| 91 | Director Purpose & Philosophy |
| 92 | Orchestra Principle & Responsibilities |
| 93 | Attention & Calmness |
| 94 | Activity, Silence & Curiosity |
| 95 | Density & Emotional Budgets |
| 96 | NPC & Ambient Scheduling |
| 97 | Scene Focus & Ceremonies |
| 98 | Session Rhythm — Opening & Ending |
| 99 | Agency, Parents & Rare Events |
| 100 | Seasonal, Birthday & Adaptive Rhythm |
| 101 | Definition of Done (Director) |
| 102 | Final Principle — Quiet Life |

### Part VIII — Child Play & Imagination Runtime

| § | Chapter |
|---|---------|
| 103 | Play Runtime Purpose |
| 104 | Sandbox & Core Philosophy |
| 105 | Five Rules of Play |
| 106 | Open Narrative & Pretend Play |
| 107 | Toy Density & Story Anchors |
| 108 | Ownership, Naming & Identity |
| 109 | Imagination Budget & Questions |
| 110 | Agency, Repetition & Slow Discovery |
| 111 | Rituals, Comfort & Favorite Places |
| 112 | Curiosity, Collecting & Emotional Safety |
| 113 | Growing Together & The Bedroom Test |
| 114 | Definition of Done (Play Runtime) |
| 115 | Final Principle — Places & Imagination |

### Part IX — Experience Orchestration

| § | Chapter |
|---|---------|
| 116 | Experience Orchestration Purpose |
| 117 | One World Principle |
| 118 | Navigation as Walking & Emotional Geography |
| 119 | Room Identity, Home Effect & First Five Seconds |
| 120 | Spatial Memory, Familiarity & Emotional Landmarks |
| 121 | Flow Rhythm & Session Three Acts |
| 122 | No Interruption, Invisible Tutorials & Discoverability |
| 123 | Emotional Contrast, Ritual Support & No Urgency |
| 124 | Parent Gifts In-World, Living Time & Memory Spaces |
| 125 | Emotional Loop — One Impression Per Visit |
| 126 | Anti-Pattern: Function→Emotional Room Mapping |
| 127 | Definition of Done (Experience Orchestration) |
| 128 | Final Principle — Journey Between Rooms |

### Part X — World Quality Standard (WQS)

| § | Chapter |
|---|---------|
| 129 | World Quality Standard Purpose & Philosophy |
| 130 | Rule Zero & Five Questions Gate |
| 131 | WQS Authority — LWES vs WDB |
| 132 | Category A — World (WQS-A001–A005) |
| 133 | Category B — Interaction (WQS-B001–B005) |
| 134 | Category C — Animation (WQS-C001–C005) |
| 135 | Category D — Audio (WQS-D001–D005) |
| 136 | Category E — Delight (WQS-E001–E005) |
| 137 | Category F — Child Psychology (WQS-F001–F005) |
| 138 | Category G — Ownership (WQS-G001–G005) |
| 139 | Category H — Living World (WQS-H001–H005) |
| 140 | Category I — Visual Excellence (WQS-I001–I005) |
| 141 | Category J — Performance (WQS-J001–J005) |
| 142 | Quality Gates (Emotional, Observation, Craft) |
| 143 | Ship Criteria — All Approvals Required |
| 144 | World Quality Score (0–10 dimensions) |
| 145 | Definition of Done (World Quality) |
| 146 | Final Principle — Nothing Cheap Ships |

> **Parts I–X complete (LWES engine contract).** Per-scene entity catalogs, prompts, and asset sheets → [bibles/](./bibles/README.md).

### Appendices

| § | Chapter |
|---|---------|
| A | Normative Event Catalog |
| B | Implementation Mapping (v1 skeleton) |
| C | Scene Pack Schema (normative minimum) |
| D | Interaction Verb Registry |
| E | Hotspot State Machine |
| F | Event Categories & Memory Schema |
| G | Experience Pack Layout & Component Registry |
| H | Emotion Registry & Interaction Beats |
| I | Director State & Budget Schema |
| J | Five Feelings Filter & Room Play Checklist |
| K | WQS Checklist Template |

---

# Part I — Engine Foundation

# 1. Purpose

The Living World Engine exists to make the child's world feel **alive**.

The child MUST never feel they are opening:

* a menu
* a dashboard
* a reward page

The child MUST always feel they are returning to:

> **their own place.**

Everything inside the world SHOULD behave like a small handcrafted universe.

---

# 2. Core Philosophy

The Living World Engine follows six immutable rules.

## Rule 1 — The world never waits for interaction to feel alive

When the child does nothing, the world continues.

Ambient systems MUST run at low amplitude without demanding taps.

## Rule 2 — Every object has purpose

Nothing is decoration only.

Every entity SHOULD either:

* react
* evolve
* animate
* tell a story
* become useful later

## Rule 3 — The world remembers

Nothing magically resets.

If the child built a chair yesterday, the chair MUST still be there tomorrow.

Server-owned World State is authoritative. Rendering is a view.

## Rule 4 — Nothing creates guilt

No dying pets. No broken houses. No weeds because you did not play. No punishment.

Only welcome.

Timers MUST NOT create obligation (see WDB living-objects — prefer state transitions tied to visits, not guilt clocks).

## Rule 5 — Small things matter

The engine prioritises:

**100 tiny delightful moments**

over

**1 huge animation.**

## Rule 6 — Reality always wins

The engine exists only because real life improved first.

No gameplay MAY become more important than routines (POS 04, GDB core loop).

The Living World Engine MUST NOT activate before a real accomplishment on the routine path, except for onboarding scenes explicitly defined in WDB.

## Rule 7 — Craft over quantity

Ship fewer beats. Each beat MUST be perfect.

Do not add animations, particles, or props to mask a flat scene.

Remove until nothing feels cheap — then stop.

**10/10 = nothing feels cheap.** Not maximum content.

---

# 3. Engine Overview

```
Real World
    ↓
Activities (Idag)
    ↓
Completion Engine (server)
    ↓
Rewards (stars + build parts)
    ↓
Living World Engine
    ↓
Scene Runtime
    ↓
Rendering Runtime
    ↓
Interaction Runtime
    ↓
Ambient Runtime
    ↓
Persistence Runtime
```

The Living World Engine begins only after a real accomplishment, unless WDB defines a zero-progress onboarding beat (e.g. first room visit after First Success).

---

# 4. Runtime Philosophy

The engine is not a AAA game engine.

It is a **Living World Runtime.**

Its only responsibility is answering one question:

> "What is happening in my world right now?"

Every frame the engine evaluates:

```
What exists?
What is moving?
What reacts?
What changed?
What should happen next?
```

Logic and rendering MUST be separated. World State MUST survive scene unload.

---

# 5. Core Systems

LWES consists of ten independent systems.

```
Scene Runtime
Entity Runtime
Interaction Runtime
Navigation Runtime
Ambient Runtime
Animation Runtime
Discovery Runtime
NPC Runtime
Persistence Runtime
Rendering Runtime
```

Each system communicates **only** through Events.

No system MAY directly manipulate another system's internal state.

| System | Responsibility |
|--------|----------------|
| **Scene Runtime** | Load/unload one location; owns layer graph |
| **Entity Runtime** | Spawn, update, destroy entities from state |
| **Interaction Runtime** | Tap/hotspot → validated action → event |
| **Navigation Runtime** | Scene links, doors, back navigation |
| **Ambient Runtime** | Idle life: curtains, clouds, birds, light drift |
| **Animation Runtime** | Placement, reactions, reduced-motion paths |
| **Discovery Runtime** | Surprises, collectibles, visible rewards |
| **NPC Runtime** | Companion state machines; celebrate, never guilt |
| **Persistence Runtime** | Read/write World State; server sync |
| **Rendering Runtime** | Layers, theme variants, 2.5D compositing |

---

# 6. Scene Runtime

## 6.1 Scene definition

A **Scene** represents one navigable location.

Examples:

```
home_hall
bedroom
kitchen
trophy_room
garden
playground
workshop
pet_area
museum
```

Scenes are independent.

Loading a scene MUST NOT require loading the entire world graph into memory.

## 6.2 Scene ownership

Each Scene owns:

```
Background layers
Foreground layers
Lighting
Weather (optional)
Ambient sound hooks
Entity spawn list
Hotspots
Navigation links
Build slots
Camera rules (fixed 2.5D — no free camera)
```

Nothing outside the Scene MAY modify these directly. Other systems MUST emit events.

## 6.3 Scene graph (render order)

Every Scene is built from layers (bottom → top):

```
Sky
Far Background
Background
Buildings / architecture
Ground
Objects (placed build parts)
Characters / creatures
Effects (particles, weather)
Foreground (occluders)
UI Overlay (minimal — not a dashboard)
```

Each layer renders independently.

Each layer MAY animate independently within Art Bible amplitude caps.

## 6.4 Scene lifecycle

Every scene MUST follow the same lifecycle:

```
Load
  ↓
Initialize
  ↓
Spawn Entities (from World State + pack manifest)
  ↓
Play Ambient
  ↓
Interaction Enabled
  ↓
Runtime Loop
  ↓
Pause (app background)
  ↓
Unload
```

No Scene MAY skip lifecycle events.

Entering Min värld from the child shell MUST use **place transition** (portal), not full page navigation — see `child-living-world-transition.js`.

---

# 7. Entity System

## 7.1 Everything is an Entity

Everything inside the world is an **Entity**. The engine MUST NOT special-case object types in code when a pack-driven definition suffices.

Examples:

```
Chair · Dog · Flower · Lamp · Mailbox · Butterfly · Cloud · Tree · Window · Rock
```

## 7.2 Entity record

Every Entity owns:

```
id
scene_id
position          (normalised 0–1 or slot_id)
rotation
scale
layer
animation_state
interaction_state
discovery_state
theme_variant     (skin key — same entity, different art)
metadata          (pack-defined, JSON)
```

Entities MUST NOT hold references to other Entities.

They communicate only through Events.

## 7.3 Entity categories

```
Static
Furniture
Decoration
Creature
NPC
Interactive
Collectible
BuildSlot
ParticleSource
NavigationObject
```

Each category has predefined capabilities declared in the Experience Pack scene manifest (Appendix C).

---

# 8. World State & Persistence

## 8.1 World State

The world exists independently of rendering.

**World State** is the single source of truth.

Example fields:

```
home_theme
placed_parts[]        { slot_id, part_id, placed_at, theme_variant }
inventory[]           { part_id, granted_at }   // not yet placed
unlocked_scenes[]
pet                   { species, name, mood, last_interaction_at }
achievements[]
story_memories[]      // parent-approved real-world rewards
season
weather
visited_scenes[]
discovered_events[]
```

Rendering is only a visualisation of World State + pack manifest.

## 8.2 Persistence rules

Everything important MUST persist:

```
Chair placed
Lamp state
Pet name
Collected feather
Opened chest
Unlocked museum
```

Nothing important MAY be recreated from defaults on every launch unless the child explicitly resets (which LWES does not offer in v1).

Server tables / JSONB MUST be authoritative. Client cache is disposable.

---

# 9. Event Bus

No object directly controls another.

Everything happens through **Events**.

## 9.1 Principles

* Handlers MUST be deterministic for a given World State + event sequence.
* Handlers MUST complete within budget (server: ADR-005 same-tick flush; client: frame budget).
* Handlers MUST NOT call each other directly.
* Unknown events MUST be ignored safely.

## 9.2 Core events (minimum)

See **Appendix A** for the normative catalog.

Examples:

```
ActivityCompleted
StarsGranted
BuildPartGranted
ObjectPlaced
PetFed
DoorOpened
SceneEntered
SceneExited
ItemCollected
SurpriseDiscovered
onProgressionNodeUnlocked    (server platform-engine)
```

Systems subscribe. Systems never invoke peer systems directly.

---

# 10. Update Loop

Every frame (client):

```
Process Events
  ↓
Update Entities
  ↓
Update NPC AI
  ↓
Update Ambient
  ↓
Update Animations
  ↓
Update Camera (fixed — parallax only if defined)
  ↓
Render
```

Every system MUST be deterministic given the same inputs.

## 10.1 Tick priorities

| Priority | Systems |
|----------|---------|
| **Highest** | Input · Navigation · Critical animations (placement confirm) |
| **Medium** | NPC · Particles · Ambient reactions |
| **Lowest** | Butterflies · Leaves · Clouds · Dust |

Performance MUST always prioritise interaction over ambient decoration.

Target: **60 FPS** on mid-range Android portrait (POS 03B, Art Bible motion caps).

---

# 11. Time

LWES has three clocks.

## 11.1 Frame Time

Rendering clock. 60 FPS target. Drives animation interpolation only.

## 11.2 Session Time

How long the child has been in Min värld this session.

Used for ambient pacing (e.g. don't spam surprises in first 10 seconds).

MUST NOT be used for guilt mechanics.

## 11.3 World Time

Persistent. Survives app close.

Used for:

* seasons
* weather
* memories
* scheduled world events (authored, not FOMO)

World Time continues when the app is closed, but MUST NOT punish absence.

---

# 12. Performance & Memory

## 12.1 Memory rules

The engine MUST unload everything outside the active Scene.

Only persistent World State survives scene unload.

Entities are recreated from state when entering a Scene.

## 12.2 Asset rules

* Critical scene background: preload before interaction enabled.
* Optional overlays: lazy load after first paint.
* Theme swap MUST NOT require full scene reload if layers are declared per theme in pack.

---

# 13. Error Philosophy

The world never crashes for the child.

| Failure | Behaviour |
|---------|-----------|
| Entity fails to spawn | Omit entity; log server-side |
| Animation fails | Skip animation; keep state |
| Ambient system fails | Disable that system only |
| API sync fails | Show last known good state; retry quietly |

The child MUST NEVER see technical errors, stack traces, or broken black screens.

---

# 14. Engine Quality Principles

Every feature MUST satisfy:

| Check | Question |
|-------|----------|
| ✅ Alive | Does it make the world feel more alive? |
| ✅ Routine | Does it support real-world routines? |
| ✅ Ownership | Does it create "det här är min värld"? |
| ✅ No guilt | Does it avoid punishment or obligation? |
| ✅ Reuse | Can every Scene use the same system? |

If not, it belongs outside LWES (parent UI, marketing, admin).

---

# 15. Definition of Done (Engine Foundation)

A Living World Engine **foundation** implementation is complete only when:

- [ ] Every Scene uses the Scene Lifecycle (§6.4).
- [ ] Every world object is an Entity (§7).
- [ ] No object communicates directly with another — Events only (§9).
- [ ] All gameplay flows through the Event Bus.
- [ ] World State is persistent and server-authoritative (§8).
- [ ] Scenes load independently (§6.1).
- [ ] Rendering is separated from logic (§4).
- [ ] Navigation is data-driven from pack manifest.
- [ ] Objects and slots are reusable across theme variants.
- [ ] Performance targets met on supported mobile devices (§10.1).
- [ ] The world feels alive without player input (§2 Rule 1).
- [ ] `prefers-reduced-motion` honoured on all non-essential motion (Art Bible + POS 03B).
- [ ] POS 06 / GDB guilt rules verified (§2 Rule 4).
- [ ] **Part II Gameplay Runtime** DoD (§30) also satisfied for any child-facing scene.
- [ ] **Part III Rendering Runtime** DoD (§47) also satisfied for any child-facing scene.
- [ ] **Part IV Living Intelligence** DoD (§61) also satisfied for any child-facing scene.
- [ ] **Part V Data Architecture** DoD (§75) also satisfied — no room-specific engine branches.
- [ ] **Part VI Emotional Runtime** DoD (§89) also satisfied for any child-facing interaction.
- [ ] **Part VII Director** DoD (§101) also satisfied — no competing hero events.
- [ ] **Part VIII Play Runtime** DoD (§114) also satisfied — child invents stories without prompts.
- [ ] **Part IX Experience Orchestration** DoD (§127) also satisfied for any child-facing scene.
- [ ] **Part X World Quality Standard** — all applicable WQS-A001–J005 = Ja and gates passed (§143–145, Appendix K).

---

# 16. Executive Principle

If a child opens **Min värld**, puts the phone on the table for one minute, and then picks it up again…

…something subtle SHOULD have happened.

A butterfly landed.

The dog stretched.

The curtains moved.

The sunlight shifted.

A bird sang.

Nothing demanded attention.

Nothing asked for a tap.

But the child immediately feels:

> **"My world was alive even while I was just watching."**

That is the defining goal of the Living World Engine v1.0.

---

# Part II — Gameplay Runtime

Part II defines **how the child interacts with the world**. This is where Min värld stops being an illustration and becomes a place.

Part II is **theme-agnostic**. The same runtime MUST work whether the child is in a house, castle, space base, or pirate ship — only art skins and pack manifests change.

---

# 17. Gameplay Runtime Purpose

The Gameplay Runtime transforms static illustrations into a **living world**.

The child MUST never feel they are pressing buttons.

The child MUST feel they are interacting with their own place.

Every interaction MUST answer one of four emotional questions — and nothing else belongs inside the Living World:

| Question | Swedish child feeling | Examples |
|----------|----------------------|----------|
| **Can I explore?** | *"Vad finns här?"* | Doors, paths, inspect, navigate |
| **Can I build?** | *"Det här är mitt."* | Place build parts, activate objects |
| **Can I care?** | *"Min kompis."* | Feed, pet, brush, play with pet |
| **Can I discover?** | *"Oj, vad är det?"* | Packages, letters, collectibles, surprises |

If an interaction does not serve explore, build, care, or discover — it belongs in Idag, Skattkammaren, or parent UI.

---

# 18. Gameplay Loop

Every interaction MUST follow the same structure:

```
Observe
  ↓
Interact
  ↓
Reaction
  ↓
Persistence
  ↓
Return to Ambient
```

**Example — mailbox:**

```
Child taps mailbox
  ↓
Mailbox opens (animation)
  ↓
Letter appears
  ↓
Letter saved as discovered (server)
  ↓
Mailbox closes
  ↓
Bird lands on roof (ambient reaction event)
```

The world MUST always return to calm after interaction. No interaction MAY leave the scene in a permanently demanding state.

**Celebration budget:** Placement and milestone reactions MUST complete within GDB / Art Bible caps (≤2 s skippable for routine-blocking animations; placement sequence ≤5 s total per §27).

---

# 19. Navigation Runtime

The child never "changes page."

The child **travels**.

Scenes connect through **Navigation Nodes** declared in the scene pack (Appendix C). Navigation Nodes are Entities with category `NavigationObject`.

## 19.1 Navigation node examples

```
Front Door · Garden Gate · Workshop Door · Bridge · Ladder · Path · Tree Stump · Elevator
```

Navigation MUST always feel physical.

## 19.2 Navigation rules

Navigation MUST always be:

| Property | Requirement |
|----------|-------------|
| **Simple** | One tap to travel when hotspot is visible |
| **Predictable** | Same door always leads to same scene |
| **Visible** | Never hidden behind undiscoverable gestures |
| **Honest** | Child understands destination before tap |

The child MUST always understand:

> "If I press this door I will enter that room."

## 19.3 Navigation types (closed enum)

```
Door
Gate
Bridge
Path
Stairs
Ladder
Portal          (fantasy themes only — castle, space, pirate)
```

Menus MUST NOT replace physical navigation when a location exists in fiction.

Page navigation (`window.location`, full shell reload) MUST NOT be used for in-world travel. Use Scene transition (§20) via `NavigationRuntime`.

## 19.4 Navigation events

| Event | When |
|-------|------|
| `NavigationRequested` | Hotspot tapped, validation passed |
| `DoorOpened` | Transition begins |
| `SceneExited` | Old scene unloading |
| `SceneEntered` | New scene ready, interaction enabled |

---

# 20. Camera Transition

When changing Scene, the default sequence is:

```
Fade (or dissolve)
  ↓
Camera Pan (if authored for link)
  ↓
Character / pet arrives (optional)
  ↓
Ambient starts
  ↓
Interaction Enabled
```

Instant teleportation MUST NOT be used except:

* `prefers-reduced-motion: reduce` — fade only, no pan
* Accessibility override declared in pack

Transition MUST NOT block the child from exiting Min värld (back to shell) at any time.

Existing shell integration: `child-living-world-transition.js` handles enter/exit from child chrome; **in-world** scene changes use the same visual language at smaller scale.

---

# 21. Hotspot Runtime

Everything interactive is a **Hotspot**.

Hotspots are hit areas bound to Entities. They own **no gameplay logic** — they only emit Events.

## 21.1 Hotspot examples

```
Bed · Lamp · Dog · Tree · Mailbox · Treasure Chest · Toy · Chair · Bookshelf · Build Slot
```

## 21.2 Hotspot states (closed enum)

No other states allowed without ADR.

```
Hidden
Visible
Highlighted
Pressed
Disabled
Completed
```

| State | Meaning |
|-------|---------|
| `Hidden` | Not yet discoverable; no hit target |
| `Visible` | Tappable; default calm state |
| `Highlighted` | Draw attention per §21.3 rules only |
| `Pressed` | During interaction animation |
| `Disabled` | Visible but not yet available (locked hint OK) |
| `Completed` | One-shot interaction done; may still be inspectable |

See Appendix E for allowed transitions.

## 21.3 Highlight rules

Hotspots MUST NOT constantly pulse.

Highlight ONLY when:

* First discovered
* New interaction available (e.g. build part in inventory matches slot)
* Build slot has placeable part
* Tutorial beat (WDB onboarding node, max once per node)

Otherwise the world MUST remain calm.

## 21.4 Hotspot contract

```json
{
  "hotspot_id": "mailbox_1",
  "entity_id": "mailbox",
  "hit_area": { "x": 0.72, "y": 0.55, "w": 0.1, "h": 0.12 },
  "interaction": "open",
  "target": "surprise:letter_morning_3",
  "states": ["visible", "completed"]
}
```

---

# 22. Interaction Types

Every interaction belongs to exactly one category (Appendix D). No custom interaction types without ADR in `product-operating-system/14_DECISION_LOG.md`.

```
Inspect · Open · Place · Collect · Feed · Pet · Talk · Move · Activate · Navigate
```

## 22.1 Inspect

Used for curiosity.

Examples: look at painting, flower, sign; watch fish.

Inspect rarely grants rewards. Purpose is **delight**.

Emits: `InteractionRequested` → `InspectCompleted` (client only unless mapped to progression).

## 22.2 Open

Examples: mailbox, chest, drawer, gift, closet.

Opening MUST feel satisfying:

**Animation before reward. Never reward before animation.**

Emits: `OpenStarted` → `OpenCompleted` → optional `ItemCollected` / `SurpriseDiscovered`.

## 22.3 Place

Used by Build Parts (§27).

```
Ghost Slot visible
  ↓
Tap
  ↓
Placement Preview (optional 1 frame)
  ↓
Snap Animation
  ↓
Persist (server)
  ↓
Ambient Update (e.g. bird nests on new bush)
```

Placement is **permanent** in v1 unless decoration mode is unlocked later via WDB node.

## 22.4 Collect

Examples: feather, shell, flower, book, stone, apple.

Collection MUST leave visual feedback in the world.

Example: apple disappears from tree; feather remains on shelf in trophy room.

Emits: `ItemCollected` → Persistence.

## 22.5 Care

Used for pets (§26).

Examples: feed, brush, pet, play, sleep.

Care MUST NEVER become obligation:

* No hunger timers
* No punishment for absence
* No "sick" or "dying" states

Emits: `PetFed`, `PetPlayed`, etc. — server records optional, never guilt.

## 22.6 Talk

NPC interaction only.

| Rule | Limit |
|------|-------|
| Maximum bubbles per beat | **3** |
| Maximum characters per bubble | WDB copy table + reading level |
| Reading time | Child spends more time playing than reading |

Emits: `TalkStarted` → `TalkCompleted`.

## 22.7 Activate

Toggle or one-shot world objects.

Examples: turn lamp on, ring bell, start fountain, wind music box.

Object state MUST persist until another Event changes it.

Emits: `Activate` → `ObjectStateChanged`.

## 22.8 Move

Rare in v1 — used when child directs pet to location.

Example: tap bed → pet walks to bed.

Emits: `MoveRequested` → NPC Runtime handles path (simple, not pathfinding engine).

## 22.9 Navigate

See §19. Emits navigation event chain.

---

# 23. Discovery Runtime

Discovery is **not random**. Discovery is **authored**.

Every discoverable object belongs to exactly one category.

## 23.1 Ambient discoveries

Pure delight. No reward.

Examples: butterfly, rainbow, bird, snowflake, firefly.

Emits: `AmbientDiscovery` (analytics optional, no inventory).

## 23.2 World discoveries

Permanent additions to the scene.

Examples: decorations, flowers, paintings, furniture, posters, books.

Emits: `WorldDiscovery` → Persistence → Entity spawn.

## 23.3 Reward discoveries

Examples: stars (already handled on Idag), build parts, food, pet toys, decorations.

MUST happen **sparingly**. Never duplicate Skattkammaren shop UX inside the world.

## 23.4 Story discoveries

Examples: letters, packages, NPC gifts, birthday surprises, seasonal surprises.

These create **memories** — link to `story_memories[]` in World State (§8).

## 23.5 Discovery rules

Every Discovery MUST satisfy:

| Rule | Requirement |
|------|-------------|
| **Visible** | Child sees it without hunting entire scene |
| **Understandable** | No cryptic symbols |
| **Positive** | No fear, no loss |
| **Short** | Interaction ≤ celebration budget |

No grinding. No gacha. No hidden-only loot.

---

# 24. Surprise Engine

The Surprise Engine creates **handcrafted moments** — not randomness.

The child SHOULD think:

> "I wonder what happened today."

The child MUST NEVER think:

> "I hope the RNG gives me something."

## 24.1 Surprise categories

Each category has independent rules in the pack manifest:

```
Daily · Milestone · Seasonal · NPC · Parent · Story · Ambient
```

## 24.2 Daily surprises

Examples: fresh flower, package, bird nest, cloud shape, letter.

**Maximum: one per calendar day** per child (server-enforced).

MUST be visible near a landmark (door, path, mailbox) — not random coordinates.

## 24.3 Milestone surprises

Unlocked after achievements (WDB nodes).

Examples: dog brings toy, mailbox invitation, garden growth beat, fireworks (≤2 s).

MUST feel meaningful — tied to real accomplishment.

## 24.4 Parent surprises

Parents MAY trigger surprises via approved parent flows (Skattkammaren / memories).

Examples: movie ticket, ice cream, treasure map, special gift.

Become `story_memories[]` entries — never pay-to-win inside child world.

## 24.5 Surprise delivery

```
Trigger condition met (server)
  ↓
SurpriseScheduled event
  ↓
Child enters scene OR landmark visible
  ↓
SurpriseDiscovered (tap to open)
  ↓
Persist + optional reward
```

Surprises MUST NOT popup over Idag routine screen.

---

# 25. NPC Runtime

NPCs never stand still forever.

Every NPC owns a state machine:

```
Idle · Move · Observe · React · Celebrate · Sleep
```

## 25.1 Default transition loop

```
Idle
  ↓
Observe (child nearby or event)
  ↓
Move (optional)
  ↓
Idle
  ↓
React (to child action or world event)
  ↓
Celebrate (milestone only, ≤2 s)
  ↓
Idle
```

No NPC MAY loop the same animation forever. Minimum variation: **2 idle variants** per NPC.

## 25.2 NPC contract (PCB aligned)

NPCs MAY: celebrate, remember, react warmly.

NPCs MUST NOT: guilt, manipulate, beg, punish, block exit.

Dialogue: §22.6 limits.

---

# 26. Pet Runtime

Pets are special NPCs with **personality**, not statistics.

## 26.1 Pet states (closed enum)

```
Sleep · Idle · Eat · Follow · Play · Explore · Sit · Happy · Excited
```

**Forbidden states:** Hungry · Sick · Dying · Sad (guilt) · Lonely (manipulation).

## 26.2 Pet personality

Each species defines in pack (not gameplay power):

```
walking_speed · curiosity · playfulness · bravery · energy
favorite_activities[] · voice · favorite_toy
```

Personality affects **which idle animation plays** and **optional follow behaviour** — not stat checks or gates.

## 26.3 Care loop

```
Child taps food bowl
  ↓
Pet moves to bowl (Move)
  ↓
Eat animation
  ↓
Happy state (brief)
  ↓
Return Idle
```

No depletion meter. Feeding is **optional delight**.

---

# 27. Build Runtime

Build Parts enter **Inventory** first (§28). Nothing appears in the world until the child places it.

```
BuildPartGranted (server, after activity)
  ↓
Inventory
  ↓
Child chooses slot (or guided to single available slot)
  ↓
Placement (Place interaction)
  ↓
Animation
  ↓
Permanent World State
```

Nothing builds automatically. The child ALWAYS performs the final placement.

## 27.1 Placement rules

Placement MUST consist of:

```
Ghost visible (slot accepts part)
  ↓
Preview (optional)
  ↓
Snap
  ↓
Celebration (≤2 s, skippable)
  ↓
Persistence (server confirm)
  ↓
Ambient Update (authored reaction)
```

**Maximum total duration: 5 seconds.**

If server persist fails, client MUST roll back optimistic placement and show calm retry — never lose the part.

---

# 28. Inventory Runtime

## 28.1 Inventory contents

```
Build Parts · Decorations · Pet Toys · Seasonal Items · Story Objects
```

No consumables except optional pet treats (care delight, not requirement).

## 28.2 Inventory philosophy

Inventory is not a backpack.

Inventory is a **memory of what the child owns**.

Large inventories SHOULD feel like collections, not storage grids.

UI MUST NOT resemble a shop or loot screen. Presentation: **"Du har det här att bygga med"** — not slot machine.

## 28.3 Inventory access

Child accesses inventory only in context:

* Near compatible build slot (ghost highlights)
* Optional shelf object in home (inspect → place later)

No global inventory menu in v1.

---

# 29. Ambient Runtime (Gameplay)

Ambient runs continuously, independent from gameplay (§5).

Examples: leaves, clouds, dust, rain, light shifts, birds, wind, butterflies.

Nothing in Ambient MAY require interaction.

## 29.1 Ambient budget

Per minute, per scene:

| Tier | Max count | Examples |
|------|-----------|----------|
| **Major** | 1 | Rain start, rainbow, pet runs across |
| **Medium** | 3 | Bird lands, curtain gust, butterfly |
| **Subtle** | Unlimited | Dust mote, light drift, cloud parallax |

The world MUST never feel busy.

## 29.2 Idle rule

If the child puts the phone down, the world continues — slowly, calmly, beautifully.

Never aggressively asking for attention. No push notification from ambient systems.

## 29.3 Ambient reactions to gameplay

After `ObjectPlaced`, `SurpriseDiscovered`, or `PetFed`, Ambient MAY play a **single** authored reaction (e.g. bird nests on new bush). Counts toward medium budget.

---

# 30. Definition of Done (Gameplay Runtime)

Gameplay Runtime is complete when:

- [ ] Navigation feels physical — no page changes inside world (§19).
- [ ] Every interactive object uses Hotspot + Interaction verb from closed enums (§21, §22, Appendix D).
- [ ] No interaction requires scene-specific custom code — pack-driven only.
- [ ] NPCs use state machine with ≥2 idle variants (§25).
- [ ] Pets use allowed states only; no guilt mechanics (§26).
- [ ] Discoveries are authored, visible, positive (§23).
- [ ] Surprises are handcrafted; max one daily (§24).
- [ ] Building follows Place loop ≤5 s (§27).
- [ ] Inventory is contextual, not a loot UI (§28).
- [ ] Ambient budget respected (§29).
- [ ] After every interaction, world returns to calm (§18).
- [ ] Child feels: *"I wonder what I want to do next"* — not *"What does the game want me to do?"*

---

# Part III — Rendering Runtime

Part III defines **how data becomes emotion** at runtime. It implements Art Bible craft in the engine — camera, layers, light, motion, materials, streaming.

Part III is **theme-agnostic** and **scene-agnostic**. One renderer, one visual language, all themes.

**Craft bar (repeated):** Fewer beats, each perfect. 10/10 = nothing feels cheap.

---

# 31. Rendering Runtime Purpose

The Rendering Runtime exists to transform data into **emotion**.

It does not merely render pixels.

It renders **atmosphere**.

Every frame SHOULD communicate:

> This world is handcrafted.

> This place belongs to me.

The renderer is responsible for making every interaction feel **premium**.

A child SHOULD be able to recognise a screenshot of Min värld immediately — without seeing the logo.

---

# 32. Rendering Philosophy

Rendering follows five immutable principles.

## Principle 1 — Everything has depth

Nothing is flat.

Even the smallest room MUST feel like a place with air inside it.

## Principle 2 — Light tells the story

Objects do not exist because they are drawn.

They exist because **light touches them**.

## Principle 3 — Motion reveals life

Nothing moves because it looks cool.

Everything moves because **it exists**.

## Principle 4 — Materials matter

Wood MUST feel warm. Stone MUST feel heavy. Glass MUST feel transparent. Fabric MUST feel soft.

Nothing MUST look like plastic unless intentionally designed (Art Bible material system).

## Principle 5 — Technology disappears

The player notices beauty without noticing rendering.

If the child thinks about FPS, layers, or WebGL — the renderer has failed.

---

# 33. Min Värld Mantra

Normative for all rendering, animation, and scene authorship:

> **A child should never see an "app that contains a world".**
>
> **A child should feel they are visiting a world that happens to exist inside an app.**

Every rendering decision MUST be tested against this sentence.

---

# 34. Camera

## 34.1 Camera philosophy

The camera is **invisible**.

The player MUST never think: *"I'm moving the camera."*

They think: *"I'm looking around."*

## 34.2 Camera rules

| Rule | Requirement |
|------|-------------|
| Orientation | **Portrait only** (POS 06A, 060-mobile-first) |
| Count | **Single camera** — one visual language across Min värld |
| Consistency | NEVER different camera systems per theme or scene |
| Safety | Consistency creates safety for children |

## 34.3 Camera angle

Fixed **2.5D** perspective:

```
~35° from horizontal
Slightly above child eye level
Looking gently downward
```

Enough depth to create space. NEVER enough to distort reality or cause disorientation.

## 34.4 Allowed camera motion

```
Small pans
Soft zoom
Follow interaction (brief)
Door / scene transitions (§20)
Cinematic reveals (milestone only, ≤2 s)
```

## 34.5 Forbidden camera motion

```
Fast movement
Camera shake
Sudden rotation
Instant zoom
Dramatic cuts
```

## 34.6 Camera speed

Movement MUST feel physical. The camera has **weight** — slow acceleration, soft stop.

Never snap unless `prefers-reduced-motion: reduce` (§44).

## 34.7 Camera focus

Every interaction temporarily becomes the visual centre.

**Example — mailbox:**

```
Child taps mailbox
  ↓
Camera gently centres mailbox (≤400 ms)
  ↓
Letter appears (animation before reward — §22.2)
  ↓
Camera returns to neutral
```

The player barely notices the movement.

---

# 35. Scene Composition

## 35.1 Layer stack (composition)

```
Foreground (occluders)
  ↓
Gameplay Area (hotspots, slots, walk plane)
  ↓
Background (architecture, mid-ground)
  ↓
Sky
```

The child MUST immediately understand **where interaction happens**.

## 35.2 Rule of silence

Every scene MUST contain **empty space**.

Not every corner contains objects. Silence makes important objects feel important.

Minimum **22 %** gameplay floor whitespace (Art Bible J.1 — placement ghost readable).

## 35.3 Visual hierarchy

Every object belongs to exactly one importance level:

```
Hero · Interactive · Supporting · Ambient · Decorative
```

Only **Hero** objects MAY dominate the frame.

## 35.4 Reading time

The player MUST understand the room in **under 2 seconds**:

| Question | Must be answered |
|----------|------------------|
| Where am I? | Scene identity without reading paragraph |
| What can I do? | Interactive / highlighted hotspots |
| What changed? | Since last visit — visible diff |

---

# 36. Scene Layers & Parallax

## 36.1 Render layers (normative order)

Extends §6.3. Each layer renders and animates independently:

```
Sky
Far Background
Background
Buildings / architecture
Ground
Navigation (paths, doors — visual only)
Gameplay Objects (placed parts)
NPC / creatures
Player representation (if shown)
Particles
Foreground
Lighting (composite pass)
UI Overlay (minimal)
```

Pack manifest `layers[]` MUST use this vocabulary or map 1:1 in `scenes.json`.

## 36.2 Parallax

Parallax exists **only** to create depth — never as spectacle.

Movement MUST be barely noticeable. The player feels **space**, not **motion**.

Parallax amplitude: Art Bible caps; default ≤3 % horizontal shift per layer tier.

---

# 37. Lighting & Shadows

## 37.1 Lighting philosophy

Lighting is **emotional**, not photorealistic.

Every scene has **one primary light source** the child can identify:

```
Morning window · Campfire · Moon · Lantern · Sunset · Workshop lamp
```

## 37.2 Light rules

* No object emits unexplained light.
* No floating glow.
* No magical bloom unless fantasy theme explicitly requires it (castle, space) — still subtle.

## 37.3 Shadow rules

Every object touching the floor MUST cast a shadow.

| Property | Requirement |
|----------|-------------|
| Edge | Soft |
| Temperature | Warm |
| Consistency | Same sun direction per scene |
| Colour | Never pure black |
| Distraction | Never competes with gameplay area |

---

# 38. Color & Materials

## 38.1 Color script

Scenes follow **emotional palettes** (PCB + Art Bible §3). Examples:

| Scene mood | Palette direction |
|------------|-------------------|
| Morning home | Warm yellows, oat, honey wood |
| Workshop | Honey wood, amber lamp |
| Garden | Natural greens, sky calm |
| Museum | Warm neutral |
| Library / evening | Dusty afternoon |

Each scene owns a palette; themes swap art, not emotional logic.

## 38.2 Material system

Materials behave consistently across all scenes (Art Bible §6):

| Material | Feel |
|----------|------|
| Wood | Warm, rounded, visible grain |
| Stone | Heavy, cool, slight texture |
| Glass | Reflective, transparent, ellips highlight only |
| Fabric | Soft, subtle folds |
| Metal | Smooth, light reflections |

Children learn visual language through **consistency**, not variety.

Renderer MUST NOT invent new material shaders per scene without Art Bible update.

---

# 39. Weather & Seasons

## 39.1 Weather runtime

Weather affects **atmosphere only** — NEVER gameplay blocking.

```
Gentle rain · Snow · Fog · Sunny · Cloudy · Wind
```

Interaction hotspots MUST remain reachable in all weather states.

## 39.2 Seasonal runtime

World follows **real calendar** (subtle, not grind):

| Season | Example ambient |
|--------|-----------------|
| Spring | Flowers |
| Summer | Butterflies |
| Autumn | Leaves |
| Winter | Snow |

Season changes SHOULD feel like discovering your own neighbourhood again — not a battle pass reset.

---

# 40. Motion

## 40.1 Ambient motion

Nothing stands perfectly still.

```
Curtains breathe · Grass moves · Clouds drift · Birds fly · Dust floats
```

Amplitude: low. The world is alive, not noisy.

## 40.2 Motion budget (rendering)

Per **visible scene**, per minute — aligns with §29.1:

| Tier | Max | Examples |
|------|-----|----------|
| **Hero** | 1 | Placement celebration, milestone reveal |
| **Medium** | 3 | Bird lands, curtain gust, pet crosses frame |
| **Subtle** | Unlimited | Dust, light drift, cloud parallax |

Too much movement creates stress. **Remove motion before adding motion.**

## 40.3 Animation layers

Animations belong to categories that MUST NOT compete in the same frame:

```
Hero · Interaction · Idle · Ambient · Particles · Transition
```

Priority: Interaction > Hero > Idle > Ambient > Particles (see §10.1).

---

# 41. Particles

## 41.1 Purpose

Particles support **emotion**, never spectacle.

```
Dust · Fireflies · Leaves · Snow · Sparkles · Steam
```

Particles MUST NOT reduce readability of hotspots or slots.

## 41.2 Particle rules

Particles react to environment:

```
Rain falls downward
Leaves follow wind
Dust follows light beam
```

Everything behaves naturally. No arcade particle fountains.

---

# 42. Visual Focus

The renderer guides attention through:

```
Contrast · Light · Motion · Scale
```

**Forbidden:** flashing · arrows · excessive pulsing highlights (§21.3).

---

# 43. Asset Streaming & Performance

## 43.1 Asset streaming

Scenes stream **independently**.

Only visible assets remain in memory.

Entering a room loads:

```
Scene layers (critical path first)
NPCs in scene
Ambient overlays for scene
Adjacent transition thumbnails (optional, low res)
```

Everything else MUST unload.

Reference pattern: `garden-asset-pipeline.js` — generalise to `scene-asset-pipeline.js`.

## 43.2 Performance targets

| Target | Value |
|--------|-------|
| Reference device | Mid-range Android + modern iPhone (POS 15) |
| Target FPS | **60** |
| Minimum FPS | **30** under extreme load only |
| Load perception | Child never notices loading (§44) |

## 43.3 LOD

Prefer **authored resolution tiers** (430 / 860 / 1280 webp srcset) over dynamic 3D LOD.

Fewer assets at perfect quality > many assets at mediocre quality (Rule 7).

---

# 44. Loading & Accessibility

## 44.1 Loading philosophy

Loading MUST feel like **entering another room** — not loading a file.

```
Camera moves · Door opens · Fade · Ambient starts
```

**Forbidden:** loading spinners in child world.

## 44.2 Reduced motion

When `prefers-reduced-motion: reduce`:

| Disable | Keep |
|---------|------|
| Parallax | Static composition beauty |
| Camera pan | Fade transitions |
| Ambient particles | Lighting, materials, placed objects |
| Large transitions | Instant cut acceptable |

The world MUST still feel beautiful and handcrafted.

---

# 45. Visual Polish

Every scene MUST contain **few** tiny handcrafted details — not clutter.

Examples:

```
A forgotten sock · Tiny crack in flower pot · Ladybug · Steam from tea
Books not perfectly aligned · Feather on floor
```

**One perfect detail** beats ten generic props.

Details create authenticity. They MUST NOT create visual noise.

---

# 46. Quality Tests

Every scene MUST pass before ship.

## 46.1 Five-second test

If the player watches 5 seconds without interacting, they notice something new — not because it spawned, but because they had not seen it before.

Good worlds reward **observation**, not **notifications**.

## 46.2 Screenshot test (Art Bible AD-03)

Hide UI. Screenshot.

> Would someone want this as wallpaper?

If no — scene is not finished.

## 46.3 Nintendo test

Ask repeatedly until no obvious answer:

* Can one interaction become more satisfying?
* Can one sound be softer?
* Can one animation be smoother?
* Can one object tell more story?

Then **stop**. Do not add a 21st animation.

## 46.4 Pixar test

Every room answers without text:

* Who lives here?
* What happened this morning?
* What might happen tomorrow?

## 46.5 Premium test

The player MUST never think: *"This is nice for an app."*

They think: *"This is beautiful."*

---

# 47. Definition of Done (Rendering Runtime)

Rendering Runtime is complete when:

- [ ] Every scene has emotional lighting with identifiable primary source (§37).
- [ ] Every object has believable material treatment (§38).
- [ ] Depth exists everywhere — no flat illustration-with-buttons (§32, §36).
- [ ] Camera disappears — invisible, weighted, portrait 2.5D (§34).
- [ ] Animation feels natural; motion budget respected (§40).
- [ ] Performance is invisible — 60 FPS target, no spinners (§43–44).
- [ ] No corner feels forgotten; Rule of Silence honoured (§35).
- [ ] Screenshot test passes (§46.2).
- [ ] Nintendo test: no obvious improvement left without adding quantity (§46.3).
- [ ] Nothing looks procedurally generated or stock (POS 00B).
- [ ] Mantra test passes (§33): world inside app, not app containing world.
- [ ] Child believes: *"This place exists even when I'm not here."*

---

# Part IV — Living Intelligence Runtime

Part IV defines **how the world thinks** — not with AI, not with prediction, but with **memory, authored rules, and believable situations**.

| Part | Question |
|------|----------|
| I | What is the engine? |
| II | How does the child interact? |
| III | How does the world render? |
| **IV** | **How does the world feel aware?** |

**Critical boundary:** Living Intelligence is **deterministic authored reactivity** — server truth + pack rules + memory. It is **NOT** machine learning, LLM dialogue, or engagement optimisation. If a feature requires a model to "decide," it requires ADR and CPO review.

---

# 48. Living Intelligence Purpose

The Living Intelligence Runtime makes the world feel **aware**.

Not intelligent.

**Aware.**

The world SHOULD react to the child:

* Not because it predicts behaviour.
* Not because it uses AI.
* Because it **remembers**.

---

# 49. Philosophy & Golden Rule

Children create stories through **interpretation**.

The engine MUST avoid scripted stories that tell the child what to feel.

It MUST generate **believable situations**.

| Wrong (scripted) | Right (situation) |
|------------------|-------------------|
| "The dog asks for food." | Dog walks to bowl · looks at it · sits down |
| "You completed 73 tasks!" | "I remember when you built your first little lamp." |
| Quest arrow on mailbox | Mailbox flag raised · child notices |

## Golden Rule

**Never tell the child what to imagine.**

Create situations.

Let imagination do the rest.

---

# 50. Memory System

Everything important CAN become a **memory**.

Examples:

```
First pet · Favorite toy · First snow · Birthday gift · First trophy
Favorite tree · First letter · Best friend
```

Memories MUST NOT disappear (R-06 lifetime progress ethic; no punitive resets).

## 50.1 Memory types

| Type | Persistence | Examples |
|------|-------------|----------|
| **Permanent** | Never deleted | Pet name · Buildings placed · Achievements · Collected story memories |
| **Seasonal** | May return each calendar year | Christmas · Birthday · Summer vacation beats |
| **Temporary** | Fades naturally | Footprints in snow · Rain puddles · Campfire smoke · Fresh flowers |

Temporary memories MUST NOT guilt the child when gone — they are **seasonal poetry**, not loss.

## 50.2 World memory

The world remembers physical truth:

```
Flower planted three weeks ago · Tree that has grown · Toy beside bed · Museum shelf filling
```

World memory is server-authoritative (§8). Rendering reads state; it does not invent history.

## 50.3 Emotional memory

NPCs remember **emotional events**, not statistics.

| Forbidden | Allowed |
|-----------|---------|
| "You have completed 73 tasks." | "I remember when you built your first little lamp." |
| Streak counts in dialogue | Warm reference to a named past moment |
| Leaderboard comparison | Familiarity tone over time |

Children remember **stories**. Not numbers.

NPC copy limits: §22.6 (max 3 bubbles). Emotional memory MUST be one short beat.

---

# 51. Event Engine

The Event Engine is the **heart** of the Living World. Nothing decides alone — everything flows through Events (§9, Appendix A).

```
ActivityCompleted
  ↓
StarsGranted
  ↓
BuildPartGranted
  ↓
InventoryUpdated
  ↓
SceneStateUpdated
  ↓
NpcReact (authored)
  ↓
AmbientUpdated
  ↓
WorldSaved
```

Handlers MUST remain deterministic and auditable. No hidden imperative chains between systems.

## 51.1 Event categories (closed enum)

Every event belongs to exactly one category (Appendix F):

```
System · Player · Parent · Season · NPC · Story · Ambient · Rendering
```

Pack authors tag events for debugging and calmness budget — not for parallel logic paths that bypass the bus.

---

# 52. Ambient Intelligence

Every few seconds (configurable, default 8–15 s idle), the engine evaluates:

> Should something subtle happen?

Valid answers:

```
Nothing · Bird lands · Leaf falls · Dog stretches · Curtain moves · Cloud passes
```

**Nothing is a valid and preferred answer.**

## 52.1 Ambient probability (default weights)

The engine MUST prefer **silence**. Silence makes events meaningful.

| Outcome | Default weight | Notes |
|---------|----------------|-------|
| **Nothing** | 70 % | Configurable per scene in pack |
| **Small event** | 20 % | Subtle tier (§29, §40) |
| **Interesting event** | 8 % | Medium tier |
| **Special event** | 2 % | Rare; must be authored, never loot |

Weights are **pack-configurable**. Sum MUST normalise to 100 %.

## 52.2 Calmness integration

If calmness budget (§59) is exhausted for the current minute, probability MUST force **Nothing** until reset.

---

# 53. Story Seeds & Curiosity

## 53.1 Story seeds

**Story Seeds** are unfinished moments — never explained by the engine.

```
Package outside · Bird carrying straw · Mysterious key · Balloon · Sleeping fox
```

The engine NEVER resolves the meaning. Children invent it.

Seeds MUST be visible (§23.5). One seed active per scene default.

## 53.2 Curiosity engine

Objects attract curiosity **without quest markers**.

```
Mailbox flag raised · Flower glowing softly · Tree shaking · Book slightly open
```

Curiosity uses **visual affordance** (§42) — not arrows, not pulsing exclamation marks.

Highlight rules: §21.3 only.

## 53.3 Quest philosophy — world invitations

**No traditional quests.** No quest log. No "!" icons.

Instead: **world invitations**.

```
The dog found something · Mailbox contains a letter · Bird built a nest
```

The child chooses whether to interact. Ignoring invitations MUST be guilt-free.

---

# 54. Relationships & Pet Intelligence

## 54.1 Relationship system

NPCs build **familiarity**, not levels.

| Forbidden | Allowed |
|-----------|---------|
| Affection bars | Dog follows more often over time |
| Hearts filling up | Bird sits closer |
| "Level 5 friendship" | Rabbit sleeps beside player sometimes |

Familiarity is expressed through **behaviour frequency** and **dialogue tone** — never UI meters.

## 54.2 Pet intelligence

Pets make **independent decisions** within authored state machine (§26):

```
Sleep somewhere new · Choose favorite toy · Watch butterflies · Sit in sunlight
Run to player · Explore garden
```

Children SHOULD occasionally be surprised — gently, never alarmingly.

Pets MUST NOT block routine exit or demand care.

---

# 55. World Invitations & Discovery Chains

## 55.1 Discovery chains

One discovery MAY enable another — **authored in pack**, invisible to child.

```
Plant flower
  ↓
Bee appears (later visit)
  ↓
Honey visual (later)
  ↓
Bear visits (milestone)
  ↓
Decoration unlock
```

The child never sees the chain graph. They experience moments.

Chains MUST NOT require grinding. Each step MUST map to real life or prior world action.

## 55.2 Repetition protection

The same ambient or story beat MUST NOT repeat too frequently.

```
If butterfly appeared yesterday → prefer bird today
```

Server or client memory: `recent_ambient_events[]` with TTL. Prefer **novelty** within calmness limits.

---

# 56. World Evolution & Surprise Runtime

## 56.1 World evolution

The world slowly changes because **time passes** and **life happened** — not because of grind.

```
Tree grows · Fence ages gently · Grass greener · Museum fills · Garden richer
```

Evolution states are **authored milestones** (WDB nodes), not procedural generators.

## 56.2 Surprise runtime (intelligence layer)

Surprises are handcrafted (§24). Intelligence layer adds **timing context**:

Every surprise MUST answer:

> **Why today?**

Not:

> **Why now?** (RNG, login timer, FOMO)

Examples:

* Birthday because calendar.
* Package because parent scheduled.
* Bird nest because bush placed last week.

---

# 57. Parent Events & Daily Mood

## 57.1 Parent events

Parents MAY place surprises through approved flows (§24.4).

```
Birthday gift · Movie ticket · Ice cream · Treasure map · Letter
```

Child belief target:

> **The world remembered.**

Parent events MUST NOT impersonate the child or other children.

## 57.2 Daily mood

Each session receives a **subtle mood** (authored, calendar + scene):

```
Sunny Morning · Rainy Day · Golden Evening · Snow Morning · Windy Garden
```

Mood MAY affect:

```
Lighting · Ambient · Music · Particles · NPC idle selection
```

Mood MUST NOT affect:

```
Gameplay gates · Star rates · Build part drops · Routine requirements
```

---

# 58. Social Intelligence & Living Objects

## 58.1 Social intelligence

NPCs notice each other without player trigger.

```
Dog watches butterfly · Bird lands beside rabbit · Cat sleeps near fireplace
```

Social beats count toward **medium** ambient budget — max one social beat per minute default.

## 58.2 Living objects

Objects own **tiny behaviours** — not gameplay, atmosphere:

| Object | Behaviour |
|--------|-----------|
| Chair | Occasionally creaks |
| Book | Sometimes opens slightly |
| Clock | Ticks (subtle audio optional) |
| Lamp | Moth passes (rare) |

Nothing is perfectly static. Nothing demands tap.

Living object behaviours MUST be pack-declared. No per-scene hardcoding.

---

# 59. Observation & Calmness

## 59.1 Observation system

The engine MAY track **what the child enjoys** — for atmosphere only.

```
Child often pets dog → dog greets first on enter
Child often visits museum → museum ambient enriches slightly
```

| Allowed | **Forbidden** |
|---------|----------------|
| Weight ambient/NPC familiarity | Engagement optimisation |
| Comfort tuning per child | Monetisation profiles |
| Server-side preference hints | Parent surveillance dashboards |
| Anonymous event counts | Cross-child comparison |

Observation data MUST stay within child scope, minimal retention, GDPR-aligned — no PII in analytics metadata.

**Optimise for comfort. Never for addiction.**

## 59.2 Calmness budget

Each minute, the engine asks:

> How calm is the world?

If too many events occurred (ambient + social + surprise):

```
↓ pause non-essential intelligence
↓ force ambient "Nothing" weight
```

Children need **breathing room**. Calmness overrides interesting probability.

Default caps align with §29.1 + §40.2: max 1 major, 3 medium per minute **total** across all intelligence systems.

---

# 60. Intelligence Budget

The child MUST never think:

> "The game is deciding everything."

They think:

> "The world feels alive."

Intelligence MUST **disappear** behind the experience.

| Signal of failure | Signal of success |
|-------------------|-------------------|
| NPC lectures | NPC sits nearby |
| Popups explain seeds | Child notices package |
| Urgent timers | Gentle return to calm |
| Visible "smart" UI | Invisible memory |

Apply Rule 7: **few perfect beats** beat many mediocre reactive ones.

---

# 61. Definition of Done (Living Intelligence)

Living Intelligence Runtime is complete when:

- [ ] World remembers — permanent, seasonal, temporary memory types work (§50).
- [ ] NPCs feel alive without statistics in dialogue (§50.3).
- [ ] Pets surprise gently within forbidden-state list (§54.2).
- [ ] Stories emerge from situations, not scripts (§49).
- [ ] Nothing feels random-loot; surprises answer "why today?" (§56.2).
- [ ] Ambient prefers silence (70 % default) (§52.1).
- [ ] Calmness budget pauses noise when needed (§59.2).
- [ ] Observation tunes comfort only — no engagement optimisation (§59.1).
- [ ] No affection meters, quest logs, or guilt mechanics.
- [ ] Child invents stories without being told.
- [ ] Every session feels slightly different; world welcomes, never demands.
- [ ] **NOT AI test:** all behaviour traceable to pack rules + memory — no LLM in loop.

---

# 62. Final Principle — Game vs Home

A successful Living World does not entertain the child every second.

It creates a place where the child wants to spend **quiet time**.

That is the difference between a **game** and a **home**.

Min värld succeeds when a child says *"mitt hus"* or *"min hund"* — not *"jag ska spela belöningsappen"*.

---

# Part V — Data Architecture & Engine Contracts

Part V defines **how the engine is built** — so development stays manageable at 10 rooms today or 500 rooms in five years.

Parts I–IV describe behaviour. Part V makes that behaviour **data**, not code.

---

# 63. Data Architecture Purpose

The Living World Engine is **entirely data-driven**.

| Rule | Requirement |
|------|-------------|
| No room-specific gameplay | MUST NOT hardcode behaviour for `hall`, `garden`, etc. |
| No room-specific engine forks | New room = new data + assets |
| New world | Adding data, not writing logic |

**Absolute rule (Stjärndag):**

> **If a new room requires new engine logic, it is almost always a design fault.**

Fix the data model or component library — do not patch the engine.

---

# 64. Engine Philosophy — Generic Concepts

The engine knows nothing about castles, dogs, pirate ships, flowers, trophies, or space stations.

It only understands **generic concepts**:

| Fiction (pack data) | Engine concept |
|---------------------|----------------|
| Dog | `Creature` + `Pet` component |
| Mailbox | `InteractiveObject` + `Interactable` |
| Castle door | `NavigationNode` |
| Welcome mat | `BuildSlot` |
| Trophy | `Collectible` + persistent fact |

```javascript
// FORBIDDEN in engine code
if (world === 'home') { ... }
if (sceneId === 'hall') { ... }
```

Pack data MAY specialise labels, art, and triggers. Engine code MUST NOT.

---

# 65. Runtime Layers

Four independent layers — top depends on bottom, never the reverse:

```
Game Engine          (LWES runtime — rarely changes)
    ↓
Experience Pack      (child_se, teen_se — swappable)
    ↓
World Data           (worlds, scenes, entities — content)
    ↓
Player State         (per-child facts — server truth)
```

| Layer | Changes when |
|-------|----------------|
| **Game Engine** | LWES version, bugfix, new **generic** component (ADR) |
| **Experience Pack** | Locale, pacing, copy, audience band |
| **World Data** | New room, theme skin, NPC, build part |
| **Player State** | Child plays |

The Game Engine MUST remain boring (§76).

---

# 66. Experience Packs

Experience Packs define the child's experience slice.

Examples:

```
child_se · teen_se · adult_se · special_needs_se
```

The engine NEVER checks age. It loads a **pack_id** from server resolution (`resolvePackForChild`).

Current reference: `config/experience-packs/child_se/manifest.json`

```json
{
  "pack_id": "child_se",
  "version": "1.0.0",
  "audience_band": "child",
  "locale": "sv-SE",
  "includes": {
    "progression": "progression.json",
    "scenes": "scenes.json",
    "intelligence": "intelligence.json",
    "copy": "copy.json"
  }
}
```

Pack loader: `src/platform-engine/pack/` — MUST validate all includes against LWES schemas (Appendix G).

---

# 67. World & Scene Definitions

## 67.1 World definition (data only)

```yaml
world:
  id: home
  display_name_sv: Mitt hem
  default_theme: house
  starting_scene_id: home_hall
  music_profile: calm_home
  weather_enabled: true
  seasonal_enabled: true
  pet_allowed: true
```

No world-specific `if` in engine. World record is JSON/YAML in pack.

## 67.2 Scene definition (data only)

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

Scenes own **configuration only** — no logic. Full schema: Appendix C.

Scenes MUST NOT store coordinates of neighbours — only **graph edges** (§71).

---

# 68. Entity & Component System

## 68.1 Entity contract

Every entity follows the same schema:

```yaml
entity:
  id: string              # unique within scene
  type: enum              # Appendix G — Creature, BuildSlot, NavigationNode, ...
  position: { x, y }        # normalised 0–1 OR slot_id reference
  rotation: number
  layer: string           # scene layer id
  components: string[]    # component ids attached
  theme_skin_key: string  # resolves art per theme
  metadata: object        # pack-defined, opaque to engine
```

No exceptions. Special cases become new **components**, not schema forks.

## 68.2 Component system

Entities gain behaviour through **components** — never class inheritance.

```
Dog  → Creature + Interactable + Animated + Persistent + Pet
Chair → Renderable + Persistent + Decoration + LivingObject (optional creak)
```

## 68.3 Component library (closed enum)

New components require **ADR** in `14_DECISION_LOG.md`.

```
Renderable · Animated · Interactable · Persistent · Collectible
Creature · NPC · Pet · Navigation · Ambient · BuildSlot
LightSource · ParticleSource · AudioSource · LivingObject
```

Engine registers handlers per component type. Pack attaches components to entities.

## 68.4 State machine contract

Each component owns its state machine. Engine **coordinates** (event bus); component **decides** transitions.

Example `Pet` component:

```
Idle ↔ Sleep · Idle ↔ Eat · Idle ↔ Play · Idle ↔ Follow · Idle ↔ Explore
```

Forbidden pet states remain in §26. State machines MUST be declarable in pack where possible (`component_states.json`).

---

# 69. State & Inventory Contracts

## 69.1 World state — facts only

Player / world state contains **facts**, never rendering:

```yaml
# ALLOWED (server JSONB)
home_theme: castle
pet_name: Luna
lamp_on: true
chair_placed: true
bird_seen: true
memories: [...]
inventory: [...]

# FORBIDDEN in persistent state
camera_position
animation_frame
particle_count
hover_target
shadow_mesh
```

Rendering state is **session-local** and disposable.

Aligns with §8 World State.

## 69.2 Inventory contract

Inventory holds **references**, not embedded object definitions:

```yaml
inventory_item:
  part_id: welcome_mat        # defined in pack catalog
  quantity: 1
  granted_at: ISO-8601
  metadata: {}                  # optional, pack-scoped
```

Item definitions (name, which slots accept, art keys) live in Experience Pack `catalog.json` or `scenes.json` slots.

---

# 70. Theme, Asset, Animation & Audio

## 70.1 Theme system

Themes change **presentation only** — never gameplay rules.

| Theme | Same `NavigationNode` | Different skin |
|-------|----------------------|----------------|
| `house` | `door_main` | `door_wood.webp` |
| `castle` | `door_main` | `castle_gate.webp` |
| `space` | `door_main` | `airlock.webp` |

`home_theme` in player state selects skin column. Progression is identical across themes.

## 70.2 Asset contract

Gameplay references **semantic IDs** only:

```yaml
asset_id: chair_small
```

Theme resolver maps:

```
chair_small + house  → chair_small_house.webp
chair_small + castle → chair_small_castle.webp
```

Engine MUST NOT embed filenames in logic. Manifest: `docs/child-image-assets.md` + pack `assets.json`.

## 70.3 Animation contract

Animations are **semantic**, not file-based:

```
idle · walk · run · sleep · celebrate · open · close · place_snap · react
```

Pack maps `(animation_id, theme)` → sprite sheet / CSS keyframes / Lottie. Engine emits semantic intent.

## 70.4 Audio contract

Gameplay emits events; theme resolves sound:

```
DoorOpened + house  → wood_creak.ogg
DoorOpened + castle → gate_heavy.ogg
DoorOpened + space  → airlock_hiss.ogg
```

Same event. Different sound. No audio paths in engine code.

---

# 71. Interaction & Navigation Contracts

## 71.1 Interaction pipeline (mandatory)

Every interaction MUST follow identical flow (§18, §22):

```
Input
  ↓
Validation (server where persistent)
  ↓
Animation (semantic id)
  ↓
Event (Appendix A)
  ↓
Persistence (if required)
  ↓
Ambient Reaction (optional, budgeted)
```

No interaction MAY bypass this pipeline. No shortcut `onClick` handlers with inline persist.

## 71.2 Navigation contract — graph only

Navigation is **graph-based**. Scenes know **neighbors**, not world coordinates.

```
home_hall ──door_garden──► garden
home_hall ──door_bedroom──► bedroom
garden ──path_workshop──► workshop
```

```yaml
navigation_edge:
  nav_id: door_garden
  from_scene_id: home_hall
  to_scene_id: garden
  transition_profile: door_fade_pan   # semantic, not code branch
```

Rooms MUST NOT hardcode global map positions.

---

# 72. Save, Versioning & Events

## 72.1 Save contract

| Persistent (survive restart) | Transient (session only) |
|------------------------------|---------------------------|
| World facts · Inventory · Pets · Buildings · Achievements · Memories | Camera · Particles · Animation frame · Selection · Hover · UI highlight |

## 72.2 Versioning

Every save / world state record MUST include:

```yaml
engine_version: "lwes-1.0"
experience_pack_id: child_se
experience_pack_version: "1.0.0"
world_data_version: "1.0.0"
asset_manifest_version: "2026-07-02"
```

Migrations MUST be automatic and backward-compatible for **one release** (POS REL-02 pattern). No breaking child worlds without migration script + test.

## 72.3 Event contract

Every event payload MUST include:

```yaml
event_id: string
category: enum          # Appendix F.1
source: string          # system id
target: string | null   # entity_id or scene_id
timestamp: ISO-8601
child_id: uuid
payload: object         # no rendering fields
```

Events MUST NOT contain textures, positions used only for render, or UI state.

---

# 73. Plugin, AI & Testing Philosophy

## 73.1 Plugin philosophy

Future content behaves like **plugins**:

Adding `pirate_cove` MUST require:

```
New assets · New data · New pack configuration
```

NOT:

```
Engine code changes
```

If engine change is needed, promote to **generic component** (ADR) usable by all worlds.

## 73.2 AI / agent compatibility

All content MUST be **machine-readable** (JSON/YAML):

* Every scene, entity, interaction, animation hook, theme skin

No behaviour MAY exist only in source code without a pack mirror. This enables Cursor, external studios, and validation scripts to author worlds without reading `child-morgonhus.js`.

## 73.3 Testing philosophy

Every system MUST be testable **without graphics**.

```
npm run test:living-world-sim   # target — simulate 100 in-game days, zero pixels
```

Server: `platform-engine` integration tests already headless. Client: simulation mode steps Event Bus + state only.

Gameplay and visuals MUST remain independently testable.

---

# 74. Debug & Performance Contracts

## 74.1 Debug runtime (dev / family_features only)

Engine SHOULD expose inspectors (never child-facing):

```
Scene Inspector · Entity Inspector · Event Log · Navigation Graph
Memory Viewer · Ambient Probability Viewer · Animation State Viewer
```

Gated behind `family_features` or `NODE_ENV=development`. MUST NOT ship enabled in production child builds.

## 74.2 Performance contract

Engine MUST support **hundreds of entities** per scene without per-scene optimisation hacks.

| Responsibility | Owner |
|----------------|-------|
| Culling, layer batching, idle tick budget | Engine |
| Asset count, hero object count | World designer (WDB + Art Bible) |

Designers MUST NOT be asked to "optimise" by removing interactivity.

---

# 75. Definition of Done (Data Architecture)

Data architecture is complete when:

- [ ] A new scene can ship with **only** pack data + assets — no engine diff.
- [ ] A new theme is presentation-only — same slots, hotspots, progression.
- [ ] Every object uses entity + component schema (§68).
- [ ] Every interaction uses mandatory pipeline (§71.1).
- [ ] Player state stores facts only — no render leakage (§69.1).
- [ ] Saves include version tuple + migrate cleanly (§72.2).
- [ ] Headless simulation can run progression + intelligence without DOM.
- [ ] Assets replaceable by ID without gameplay change (§70.2).
- [ ] New features land as **data or generic component** before engine code.
- [ ] **Room rule:** zero `if (sceneId === ...)` in `public/js/living-world/`.

---

# 76. Final Engineering Principle

> **The engine should be boring.**
>
> **The worlds should be magical.**

| Architecture failed | Architecture succeeded |
|---------------------|------------------------|
| Developers edit engine for each new room | Developers add data, assets, components |
| Special cases accumulate | Generic components grow slowly (ADR) |
| Fear of touching motor | Confidence adding content |

If the team mostly edits `config/experience-packs/` and `public/images/child/world/` — the platform is working.

---

# Part VI — Feel, Delight & Emotional Runtime

Part VI defines **game feel** — how every button press feels handcrafted.

Not technology. Not graphics alone. **Feel.**

Nintendo has practiced this for decades without documenting it. LWES Part VI makes it **normative and testable**.

Cross-reference: [GAME_DESIGN_BIBLE.md](./GAME_DESIGN_BIBLE.md) (motivation), [ART_BIBLE.md](./ART_BIBLE.md) (motion caps, celebration ≤2000 ms). Part VI owns **emotional sequencing at runtime**.

---

# 77. Emotional Runtime Purpose

Nothing SHOULD feel digital, mechanical, or automatic.

Every interaction SHOULD feel **handcrafted**.

| Child thinks | Status |
|--------------|--------|
| "The app responded." | **Failed** |
| "My world responded." | **Succeeded** |

---

# 78. Acknowledgement vs Reward

A Living World does not only **reward** actions.

It **acknowledges** them.

| Reward | Acknowledgement |
|--------|-----------------|
| "You gained something." | "I noticed." |
| Points-forward | Relationship-forward |
| Casino psychology risk | Warmth, belonging |

Children seek acknowledgement at least as much as rewards (PCB, GDB SDT). Stars remain fuel (GDB) — but **feel** comes from being seen in the world.

---

# 79. Golden Rule — One Emotion

Every interaction MUST create **exactly one** intended emotion.

Never two. Never five. **One.**

Closed enum (Appendix H). Examples:

```
Pride · Wonder · Calm · Comfort · Curiosity · Belonging
Surprise · Achievement · Safety
```

If an interaction creates conflicting emotions — **redesign**.

Pack field: `emotion_intent` REQUIRED on every interaction beat (Appendix H.2).

---

# 80. Emotion Timeline & Delight Budget

## 80.1 Emotion timeline

Every interaction follows this curve:

```
Notice
  ↓
Expectation
  ↓
Interaction
  ↓
Reaction
  ↓
Satisfaction
  ↓
Calm
```

Experience MUST end in **calm**, not excitement.

Excitement is temporary. Calm creates attachment.

## 80.2 Delight budget

Delight is expensive. Use carefully.

| Size | Frequency |
|------|-----------|
| Small delights | Often (micro — §86) |
| Big delights | Rarely (macro — §86) |

Rarity increases memorability. Rule 7 applies: **few perfect beats**.

## 80.3 The 80/20 rule

```
80 % — Quiet beauty
20 % — Visible magic
```

**Never reverse this ratio.**

Aligns with ambient probability (§52.1: 70 % nothing) and calmness budget (§59.2).

---

# 81. Reward Curve & Anticipation

## 81.1 One beat at a time

The child MUST NEVER receive simultaneously:

```
Stars + confetti + dialogue + music + sparkles + fireworks + achievement popup
```

**Forbidden stack** on routine path (POS 03B, GDB celebration budget).

**Correct sequence** after task complete:

```
Smile / acknowledgement copy
  ↓
Stars (brief)
  ↓
Tiny sparkle (optional, skippable)
  ↓
Return to world calm
```

One beat at a time. Each beat ≤ Art Bible / GDB timing caps.

## 81.2 Anticipation

Children love **anticipation** more than the reward itself.

| Wrong | Right |
|-------|-------|
| Chest opens instantly | Chest shakes → soft sound → lid opens → light → reward |

Identical reward feels larger with anticipation. Maximum anticipation sequence: **3 beats** before reveal (§27 placement cap still applies).

Pack declares beats in `interaction_beats[]` (Appendix H.2).

---

# 82. Physical Feel — Weight, Softness, Friction

## 82.1 Weight

Every object has implied weight in animation easing:

| Class | Behaviour |
|-------|-----------|
| Light | Bounce, quick settle |
| Heavy | Drop, slow settle |
| Doors | Swing |
| Curtains | Float |
| Books | Drop with soft impact |

Not full physics simulation — **believable motion** (Art Bible motion tokens).

## 82.2 Softness

Nothing stops or starts instantly.

Every movement MUST ease in and out. Everything **breathes** at low amplitude when idle.

`prefers-reduced-motion`: instant state changes OK; beauty from composition, not motion (§44).

## 82.3 Friction

Tiny friction creates believability:

```
Drawer — slight resistance before open
Chair — tiny wobble on place
Mailbox — soft bounce on close
```

Not realism. **Believability.**

---

# 83. Imperfection, Joy & Surprise

## 83.1 Imperfection

Perfect feels artificial.

Every room SHOULD contain slight asymmetry and variation:

```
Books not aligned · Flower leaning · Frame slightly rotated · Blanket folded differently
```

Imperfection creates warmth (Art Bible patina, Scandinavian Rule §88).

## 83.2 Joy

Joy emerges naturally — never forced.

| Wrong | Right |
|-------|-------|
| 🎉 AMAZING!! | A bird lands quietly beside the child |

## 83.3 Surprise

Surprises **invite**, never interrupt.

| Bad | Good |
|-----|------|
| LOOK!! popup | Player notices something on their own |

Aligns with §24 surprise delivery and visible-not-hidden rule (§23.5).

---

# 84. Discovery, Wonder & Ownership

## 84.1 Discovery order

```
Child notices (observation)
  ↓
Child touches / interacts
  ↓
Discovers item / fact
  ↓
Later — optional NPC comment
```

**Never** explain before the child discovers (§49 Golden Rule).

## 84.2 Wonder

Wonder comes from **questions**, not answers.

| Good | Bad |
|------|-----|
| "Why is there a tiny ladder on the tree?" | "This ladder belongs to forest elves." |

Leave room for imagination.

## 84.3 Ownership

Child believes:

> "I made this."

Not:

> "The game unlocked this."

Placement loop (§27) + persistent world (§50) + copy tone (PCB) reinforce ownership.

---

# 85. Silence, Pacing & Celebration

## 85.1 Silence

Silence is part of the experience.

Moments without animation, dialogue, or reward are **necessary** (§52.1, §80.3).

## 85.2 Pacing rhythm

Natural rhythm:

```
Fast → Slow → Still → Magic → Still
```

Engine MUST return to **Still** after every magic beat.

## 85.3 Celebration scaling

| Success level | Celebration |
|---------------|-------------|
| Small daily win | Small — nod, sparkle, one line |
| Milestone | Larger ceremony — still ≤2 s skippable on routine path |

World MUST understand the difference. Milestone definition: WDB nodes only — no invented milestones in code.

## 85.4 Repetition variation

Nothing repeats **identically**:

```
Celebrations · Dialogue · Bird paths · Pet reactions · Ambient sounds
```

Tiny variations create life (§55.2 repetition protection). Same emotion, different motion seed.

---

# 86. Micro & Macro Delight

## 86.1 Micro delight

At least **one** tiny pleasant moment per minute of active play (not forced if child is idle):

```
Pet yawns · Butterfly lands · Curtain moves · Leaf falls · Bell rings gently
```

None are rewards. All are acknowledgement of a living place.

Counts toward subtle ambient tier only (§40.2).

## 86.2 Macro delight

Every few sessions — **one** memorable event:

```
Snow arrives · Birthday package · Garden blooms · Festival lights
```

These become memories (§50). Server-scheduled, authored — max one daily surprise (§24.2).

---

# 87. Emotional Anchors

Every scene MUST contain **one object** that immediately creates emotion — the room's story in one glance.

| Scene | Anchor example |
|-------|----------------|
| Bedroom | Favorite teddy |
| Workshop | Half-built birdhouse |
| Garden | Swing |
| Museum | First trophy |

Declared in pack: `scene.emotional_anchor_entity_id`.

---

# 88. Feel Quality Tests

Every scene and interaction MUST pass before ship.

## 88.1 The Home Test

> Would I enjoy simply sitting here?

If no — room unfinished (extends §46.2 screenshot test).

## 88.2 The Return Test

Player wants to revisit **without** needing rewards — because it feels nice.

## 88.3 The Child Test

Watch a child:

| Success | Failure |
|---------|---------|
| Invents stories | Immediately asks "What do I do?" |

## 88.4 The Parent Test

Parents smile watching — not because rewards drop, because the world feels **warm**.

## 88.5 The Nintendo Rule

Every interaction MUST feel **slightly better than technically necessary**.

## 88.6 The Pixar Rule

Every room reveals something about the child **without dialogue**.

## 88.7 The LEGO Rule

The child builds. The designer suggests. **Never the opposite.**

## 88.8 The Scandinavian Rule

```
Less · Better · Warmer · Calmer · Higher quality · No clutter
```

Aligns with POS 00B and Rule 7 craft bar.

---

# 89. Definition of Done (Emotional Runtime)

A feature is emotionally complete only if:

- [ ] Creates exactly **one** intended emotion (`emotion_intent` in pack).
- [ ] Never overwhelms — one beat at a time (§81.1).
- [ ] Never interrupts calm unnecessarily — ends in calm (§80.1).
- [ ] Leaves space for imagination — no over-explaining (§84.2).
- [ ] Strengthens ownership (§84.3).
- [ ] Encourages curiosity, not obligation.
- [ ] Rewards observation before exposition (§84.1).
- [ ] Feels handcrafted, not algorithmic.
- [ ] Still enjoyable after the **50th** interaction (variation §85.4).
- [ ] Passes Home, Return, Child tests (§88.1–88.3) for scenes touched.

---

# 90. Final Principle & Team Rule

> **Children rarely remember what a game gave them.**
>
> **They remember how a place made them feel.**

The Living World Engine exists so children remember years later:

> *"Mitt lilla hus."* · *"Min hund."* · *"Min värld."*

## Team rule (normative for Min värld PRs)

> **Every pull request must improve at least one feeling.**

Not only a feature, performance metric, or asset — an actual **felt** improvement for the child.

PR description MUST name:

```
Emotion improved: [enum from Appendix H]
How tested: [Child test / Home test / observation]
```

If no feeling improves, the PR is **data-only plumbing** — acceptable only when explicitly tagged `no-child-surface` and does not touch interaction paths.

---

# Part VII — Living World Director

Part VII is the **invisible conductor** — the system almost no engines document, but every Nintendo room embodies.

It does not render. It does not define gameplay rules. It does not use AI.

It owns **rhythm**.

The player MUST never notice the Director. They only notice that everything feels *right*.

Part VII **orchestrates** Part IV (intelligence), Part III (rendering density), and Part VI (feel timing). When systems conflict, **Director wins on timing**; Part VI wins on emotional intent; Art Bible wins on pixels.

---

# 91. Director Purpose & Philosophy

## 91.1 Purpose

Make the world feel alive **without** feeling busy.

## 91.2 Philosophy

The Director **never creates content**.

It **orchestrates** existing content.

Every bird, butterfly, NPC line, ambient sound, surprise, and celebration beat MUST pass through the Director gate before playing.

```
System proposes event
  ↓
Director evaluates budgets
  ↓
Approve · Delay · Suppress · Replace with Nothing
  ↓
If approved → Event Bus (§9)
```

---

# 92. Orchestra Principle & Responsibilities

## 92.1 Orchestra principle

The world is an orchestra. Each subsystem is an instrument.

The Director decides **who plays, when, and for how long**.

Without the Director, everyone plays at once → **noise**.

## 92.2 Primary responsibilities (exclusive)

The Director owns **only**:

```
Rhythm · Pacing · Attention · Calmness · Surprise frequency
Emotional balance · Visual density · Audio density · Ambient density
```

The Director MUST NOT own: fiction copy, unlock rules, render shaders, or ML.

---

# 93. Attention & Calmness

## 93.1 Attention budget

Children cannot observe everything. Maximum **simultaneous**:

| Tier | Max concurrent |
|------|----------------|
| **Hero** | 1 |
| **Medium** | 2 |
| **Tiny** | Unlimited (subtle tier) |

If a new Hero event is requested while one is active — **queue or suppress**. Never stack heroes.

Aligns with §40.2 motion budget and §29.1 ambient caps — Director enforces globally.

## 93.2 Calmness meter

Every scene owns a **Calmness Score** (session-local + smoothed):

```
100 = peaceful
 75 = lively      ← default target
 50 = active
 25 = busy
  0 = overwhelming (FORBIDDEN — Director must suppress)
```

Director adjusts activity to stay **≥ 50** default; target **75** for home scenes.

## 93.3 Calmness actions

| Score dropping | Director action |
|----------------|-----------------|
| Below 75 | Reduce medium events, extend silence window |
| Below 50 | Suppress surprises, NPC dialogue, particles |
| Below 25 | **Hard stop** — only subtle ambient until recovery |

---

# 94. Activity, Silence & Curiosity

## 94.1 Activity budget

Each minute the Director asks:

> How much has happened?

If enough happened — **do nothing**. Doing nothing is often correct (§52.1, §85.1).

## 94.2 Silence windows

Every session MUST contain windows where **nothing new** happens:

* No surprises · No NPC dialogue · No rewards

Only existing ambient life. Silence lets emotion settle (§80.1 ends in calm).

Minimum silence window: **15 s** after any Hero beat before next medium+ beat.

## 94.3 Curiosity curve

Curiosity rises **slowly**. Never spike repeatedly.

**Good rhythm:**

```
Butterfly → Mailbox → Nothing → Dog moves → Nothing → Letter appears
```

**Forbidden rhythm:**

```
Butterfly → Chest → NPC → Fireworks → Gift → Achievement → Dialogue
```

Director enforces minimum gap between **interesting** events (default 45 s).

---

# 95. Density & Emotional Budgets

## 95.1 Visual density

Each scene declares `max_visual_density` in pack. Director MAY suppress:

```
Particles · NPC movement · Ambient creatures · Cloud frequency · Leaf frequency
```

Not for FPS alone — for **beauty** (§35 Rule of Silence, §80.3 80/20).

## 95.2 Surprise budget

Every surprise **spends** Surprise Budget. Budget regenerates slowly.

| Surprise size | Cost |
|---------------|------|
| Daily small | 1 |
| Milestone | 3 |
| Parent moment | 4 |
| Rare event | 8 |

Prevents emotional inflation (§86.2 macro delight).

## 95.3 Wonder budget

If child discovered **three** interesting things this session, the fourth MUST wait.

Wonder must breathe (§84.2).

## 95.4 Emotional fatigue protection

Too many positive events → child stops noticing.

Director MAY insert **nothing beats** to protect joy. Tomorrow becomes meaningful.

---

# 96. NPC & Ambient Scheduling

## 96.1 NPC scheduling

NPCs MUST NOT all move simultaneously.

```
Dog explores → Bird lands → Dog sleeps → Butterfly arrives → Rabbit runs
```

Natural. Never synchronized. Director maintains **one medium NPC motion** at a time default.

## 96.2 Ambient scheduler

Distributes ambient over time:

```
Clouds · Wind · Leaves · Steam · Dust · Fireflies
```

Nothing repeats mechanically (§85.4). Director picks from weighted pool with repetition protection (§55.2).

Ambient Intelligence (§52) **proposes**; Director **approves**.

---

# 97. Scene Focus & Ceremonies

## 97.1 Scene focus

Every scene has **one emotional center** at a time:

```
Pet sleeping · New chair · Mailbox · Campfire · Sunlight beam
```

Declared: `scene.focus_entity_id` or dynamic (newest placement).

Director **protects focus** — nothing competes with it for Hero tier.

## 97.2 Build ceremony

On `ObjectPlaced`:

```
Director pauses ambient medium+ events
  ↓
World stills (subtle)
  ↓
Placement animation (§27)
  ↓
Celebration beat (§89, one emotion)
  ↓
Silence beat (≥1 s)
  ↓
Ambient resumes
```

Player subconsciously understands: **this mattered**.

## 97.3 Trophy ceremony

Large achievements get **breathing room**:

```
Achievement beat → Pause → Music → Animation → Smile → Silence
```

**Forbidden:**

```
Achievement → popup → popup → popup
```

Director serialises all milestone UI. One hero at a time (§81.1).

---

# 98. Session Rhythm — Opening & Ending

## 98.1 Daily opening

First **10 seconds** set the session.

**Good:**

```
Morning light → Dog stretches → Bird song → Nothing → Player explores
```

**Forbidden:**

```
Popup → Reward → Dialog → Tutorial
```

Director blocks non-ambient events for first 10 s unless parent surprise flagged.

## 98.2 Session ending

Sessions end naturally — not abruptly.

```
Sunlight softens · Pet lies down · Music quiets · Player leaves
```

No forced exit modal. Director may trigger **wind-down** ambient when session > 8 min without interaction (optional, pack-config).

---

# 99. Agency, Parents & Rare Events

## 99.1 Child agency

Director **never interrupts** player intention.

If child walks toward mailbox — Director **defers** ambient medium events until interaction completes or child changes focus.

**Player actions always win** over ambient proposals.

**Pretend play:** When `PretendPlayDetected` (sustained repeat interaction on same object — §105 Rule 2, Appendix J.4), Director MUST suppress medium+ events and new NPC dialogue for the pretend window. Engine becomes **quieter**, not louder. Repetition protection (§55.2) MUST NOT interrupt active pretend loops.

## 99.2 Parent moments

`ParentSurprisePlaced` receives **temporary priority**.

Everything else steps back quietly. World acknowledges parent without saying so (§57.1).

## 99.3 Rare events

Extremely rare — Director tracks lifetime + cooldown:

```
Shooting star · Rainbow · Northern lights · White owl · Golden butterfly
```

Children remember rarity. Minimum cooldown: **30 days** per rare id per child unless seasonal override.

---

# 100. Seasonal, Birthday & Adaptive Rhythm

## 100.1 Seasonal director

Season shifts **pacing**, not rules:

| Season | Director bias |
|--------|----------------|
| Spring | More birds, shorter silence |
| Summer | More insects |
| Autumn | More leaves |
| Winter | Longer silence, softer ambient |

Emotionally different seasons — not content resets.

## 100.2 Birthday mode

When `birthday_today` in world state:

```
Slower pacing · Quieter surprises · Warmer lighting bias · No noisy celebrations
```

World celebrates quietly (§80.3).

## 100.3 Failure handling

If event cannot occur (asset missing, budget exhausted):

Director chooses **another approved event** or **Nothing**.

Player MUST never see failure.

## 100.4 Adaptive rhythm

| Session length | Director bias |
|----------------|---------------|
| Short (&lt; 3 min) | Less ambient, faster to one meaningful beat |
| Long (&gt; 10 min) | Richer ambience, slower pacing, more silence windows |

Not randomness — **orchestration** from session signals.

## 100.5 Twenty-minute rule

No 20-minute session should feel identical — because of **director sequencing**, not RNG.

---

# 101. Definition of Done (Director)

Director succeeds when:

- [ ] Player never feels overwhelmed (calmness ≥ 50 always).
- [ ] World never feels empty (micro delight still allowed).
- [ ] Events never compete — max 1 hero (§93.1).
- [ ] Silence windows exist every session (§94.2).
- [ ] Wonder survives session-long (§95.3).
- [ ] NPCs feel intelligent via scheduling, not dialogue volume (§96.1).
- [ ] Build/trophy ceremonies pause ambient (§97).
- [ ] Opening 10 s free of popups (§98.1).
- [ ] Player agency overrides ambient (§99.1).
- [ ] No system fights another — all pass Director gate.
- [ ] Player never notices Director — only that things feel *right*.

---

# 102. Final Principle — Quiet Life

> **A beautiful world is not created by adding more life.**
>
> **It is created by knowing when life should be quiet.**

---

# Part VIII — Child Play & Imagination Runtime

Part VIII is **why Nintendo feels different** — not features, but **how people naturally play**.

The engine is never the storyteller. **The child is.**

Part VIII governs all fiction-facing behaviour together with PCB. When Part VIII conflicts with engagement mechanics — **Part VIII wins** (with POS child dignity).

Audience: ages **4–10** primary (`child_se` pack); patterns MUST scale via experience pack, not engine forks.

---

# 103. Play Runtime Purpose

The Living World exists **not to entertain** — but to **support imagination**.

The engine provides:

```
Places · Objects · Characters · Moments
```

The child creates **meaning**.

| Engine is | Engine is not |
|-----------|----------------|
| Stage | Playwright |
| Toy box | Game master |
| Quiet witness | Narrator |

---

# 104. Sandbox & Core Philosophy

## 104.1 Sandbox principle

The world is never the game.

The world is the **toy**.

Children naturally create games. Our job is **good toys** (five feelings filter).

## 104.2 Children play to answer questions

Children do not play to complete objectives.

They play to answer **"What if…?"**

```
"What if my dog sleeps here?"
"What if this chair belongs to grandma?"
"What if the castle has a dragon?"
```

The engine MUST NEVER answer these questions.

It MUST **encourage** them.

---

# 105. Five Rules of Play

## Rule 1 — Never explain everything

Mystery creates imagination (§109).

## Rule 2 — Never interrupt pretend play

If the child repeatedly interacts with the same object — engine becomes **quieter**, not louder.

Director (§99.1) MUST defer events during sustained pretend loops.

## Rule 3 — Repetition is not failure

Watching the same butterfly ten times can still be meaningful.

Never assume repetition equals boredom.

Director repetition protection (§55.2) MUST NOT override active pretend play.

## Rule 4 — Children assign personalities

Objects MUST feel **expressive** through consistent behaviour — not speech.

## Rule 5 — Small stories beat big stories

```
Day 1: Dog sleeps beside fireplace.
Day 2: Dog sleeps beside bed.
```

Child invents the reason. Engine shows **difference**, not **plot**.

---

# 106. Open Narrative & Pretend Play

## 106.1 Open narrative

Engine creates **situations**, never **conclusions**.

| Wrong | Right |
|-------|-------|
| "The rabbit lost its toy." | A toy lying beside the rabbit |

## 106.2 Pretend play by room type

Every room MUST support pretend play **without objectives**:

| Room | Pretend affordance |
|------|-------------------|
| Kitchen | Pretend cooking |
| Workshop | Pretend building |
| Garden | Pretend picnic |
| Bedroom | Pretend bedtime |
| Museum | Pretend showing trophies |

Pack declares `pretend_affordances[]` per scene (Appendix J).

---

# 107. Toy Density & Story Anchors

## 107.1 Toy density

Enough objects to inspire stories — never so many that stories become impossible.

**Target: 5–10 meaningful interactive objects per room.**

Not 50. Rule of Silence (§35.2) applies.

## 107.2 Story anchors

Every room contains **one** object children naturally invent stories around:

```
Old teddy · Treehouse · Mailbox · Campfire · Bookshelf · Dog bed · Swing
```

Pack: `story_anchor_entity_id` (extends `emotional_anchor` §87).

---

# 108. Ownership, Naming & Identity

## 108.1 Ownership

Children develop attachment. Engine MUST protect:

```
Named pets · Favorite chair · Favorite flower · Favorite room
```

**None may disappear** without explicit child/parent action (no decay, no guilt).

## 108.2 Naming

Everything important MUST be nameable:

```
Pets · Home · Favorite tree · Boat · Robot · Dragon (child's label)
```

Names strengthen ownership. Server-persisted in world state (§8).

## 108.3 Identity

World becomes unique through **choices**, not statistics:

```
Furniture · Decorations · Pet names · Layout · Theme
```

Child recognises their world **instantly** — screenshot test (§46.2) per child, not generic.

---

# 109. Imagination Budget & Questions

## 109.1 Imagination budget

Engine MUST NOT describe everything.

| Good | Bad |
|------|-----|
| "A tiny door appeared." | "A fairy lives here." |

Leave space (§84.2 Wonder).

## 109.2 Questions per room

Every room MUST contain **at least one unanswered question**:

```
Who planted this flower? · Who built this ladder? · Why is this feather here?
```

Questions > answers. NPCs MAY comment **after** discovery only (§84.1).

---

# 110. Agency, Repetition & Slow Discovery

## 110.1 Child agency

Children decide what matters — not the engine.

Five minutes watching fish = **successful play**.

No redirect. No "try this instead" prompts.

## 110.2 Non-optimal play

All valid:

```
Watching rain · Walking in circles · Petting dog repeatedly · Opening same mailbox
```

Engine MUST NOT punish or redirect (POS C-04, §26 pet states).

## 110.3 Slow discovery

Best discoveries happen slowly — **no tutorial**:

```
Day 1: Flower · Day 4: Bee · Day 8: Butterfly · Day 12: Bird
```

Authored in WDB discovery chains (§55.1); invisible to child.

---

# 111. Rituals, Comfort & Favorite Places

## 111.1 Rituals

Children invent rituals:

```
Good morning to dog · Check mailbox · Visit museum first
```

Engine **quietly supports** — never replaces with automated reward.

Observation (§59.1) MAY note ritual patterns for **comfort only**.

## 111.2 Favorite places

Engine remembers places that feel important — **atmosphere only**:

```
Favorite room → slightly richer subtle ambient (not more popups)
```

## 111.3 Comfort zones

Every world MUST contain ≥1 **comfort space** — always calm:

```
Reading corner · Pet bed · Tree swing · Fireplace
```

Director calmness target **≥ 85** in comfort zones (§93.2).

---

# 112. Curiosity, Collecting & Emotional Safety

## 112.1 Curiosity

Emerges naturally. Engine rarely says "Look here."

Child notices → child acts (§53.2, §84.1).

## 112.2 Collecting memories

Children collect **memories**, not numbers.

```
Feather · Shell · Drawing · Flower
```

Collection UI tells **where it came from** — story, not count.

## 112.3 Emotional objects

First pet bed, first trophy, first birthday gift, favorite book — **never removed** in redesigns.

Flag: `emotional_object: true` in pack — migration MUST preserve.

## 112.4 Emotional safety

Nothing creates shame:

```
No failure · No punishment · No lost progress · No disappointment-as-retention
```

Wonder always safer than pressure (POS 06, GDB).

---

# 113. Growing Together & The Bedroom Test

## 113.1 Growing together

World grows **with** child — not faster, not slower.

Child feels: *"I changed, so my world changed."*

Tied to real completions (Layer 1) + placement (§27) — not artificial level gates.

## 113.2 Adult perspective

Parents understand why child loves the world — not rewards, but **childhood imagination made visible**.

## 113.3 The bedroom test

Child in bed thinks:

> *"I wonder what Luna is doing now."*

NOT:

> *"I hope I don't lose my streak."*

If first thought happens — engine succeeded.

Streaks, FOMO, login bonuses remain **forbidden** (G-01, GDB).

---

# 114. Definition of Done (Play Runtime)

A room is complete only if:

- [ ] Supports pretend play without objectives (§106.2).
- [ ] Contains ≥1 unanswered question (§109.2).
- [ ] Invites exploration without arrows (§112.1).
- [ ] Respects repetition — quieter during pretend loops (§105 Rules 2–3).
- [ ] Creates emotional attachment — nameable, persistent (§108).
- [ ] Allows rituals — does not automate them away (§111.1).
- [ ] Feels safe — emotional safety checklist (§112.4).
- [ ] Never pressures — passes bedroom test (§113.3).
- [ ] Encourages imagination over instruction (§109.1).
- [ ] Child invents stories **without prompts** — child test (§88.3).
- [ ] Passes **five feelings filter** — names at least one feeling strengthened (Appendix J).

---

# 115. Final Principle — Places & Imagination

> **Children don't fall in love with mechanics.**
>
> **They fall in love with places.**
>
> Places become unforgettable when they leave room for imagination.

Min värld succeeds when the child owns the story — and the engine knows when to be silent.

---

# Part IX — Experience Orchestration

Part IX is **how the child experiences the world as one place** — not a collection of screens.

Parts I–X define engine behaviour, feel, direction, play, and journey orchestration. Part IX defines **orchestration of the child's journey**: spatial continuity, emotional geography, session rhythm, and the rules that prevent the world from collapsing into an app with illustrations.

When Part IX conflicts with navigation shortcuts (tabs, modals, deep links to "features") — **Part IX wins**.

Cross-ref: Part VII Director (rhythm/budgets) · Part VIII Play (pretend/ritual) · WDB scene graph · `child-living-world-transition.js`.

---

# 116. Experience Orchestration Purpose

The child MUST never experience Min värld as:

```
Screens · Tabs · Feature pages · Reward overlays · Dashboard rooms
```

The child MUST experience Min värld as:

> **One continuous place they are visiting.**

## 116.1 Continuous journey, not screens

Each "feature" (Skattkammaren, pet home, museum, workshop) is **not a page**.

It is a **room in the same world** — reachable by walking, visible from adjacent spaces where possible, and emotionally consistent with its neighbours.

| Wrong mental model | Right mental model |
|--------------------|-------------------|
| "Open rewards app" | "Walk to the treasure room" |
| "Go to stats" | "Visit the diary shelf" (if fiction supports — see §126 anti-pattern) |
| "Back to menu" | "Walk home" |

Implementation MUST NOT use browser-history semantics the child can feel (`history.back()` as primary exit, URL bar as navigation).

## 116.2 Experience orchestration owns

```
Spatial continuity · Emotional geography · Session acts · Journey memory
Room identity · Home effect · Discoverability without UI chrome
Parent gift placement · Living time (atmosphere) · One impression per visit
```

Experience orchestration MUST NOT own: unlock thresholds (WDB), star economy (POS 09), illustration craft (Art Bible).

---

# 117. One World Principle

## 117.1 All features are rooms

Every child-facing capability MUST map to a **physically connected room** (or outdoor zone) in the world graph.

```
Idag routine     → Morning path / hall (entry from app shell — exception: POS Idag authority)
Skattkammaren    → Treasure chamber (connected room)
Pet              → Pet's place (bed, garden corner, house)
Build/placement  → Workshop or garden plot (in-world surface)
Parent surprise  → Object in scene (§124)
```

No capability MAY exist **only** as a modal, toast destination, or orphan route (`/child-rewards.html` feel).

## 117.2 Physical connection

Rooms MUST connect via **visible affordances**:

```
Doors · Paths · Gates · Stairs · Bridges · Trails · Boat docks
```

Pack declares `nav_edges[]` between `scene_id` pairs (Appendix C). Dead-end rooms MUST have **return path** visible within first camera frame.

## 117.3 One world graph

The child holds **one mental map**. Sibling worlds (PCB seven worlds) are separate graphs — never nested tabs inside one shell.

Within one world: **no parallel universes**, no "mode switch" that replaces the entire scene without transition (§32).

---

# 118. Navigation as Walking & Emotional Geography

## 118.1 Navigation = walking

Movement between rooms MUST feel like **walking through a place**:

```
Character or camera travel · Door open animation · Path scroll
Cross-fade WITH spatial cue (doorway, tunnel, gate) — not arbitrary wipe
```

`child-living-world-transition.js` MUST treat enter/exit as **place change**, not page load. Loading chrome MUST NOT show URLs, spinners with "Laddar…" as primary metaphor, or tab highlights.

## 118.2 No menus as primary navigation

Forbidden as **primary** child navigation:

```
Bottom tab bar · Hamburger menu · Icon grid · "More" drawer
Breadcrumb · Back chevron without in-world door equivalent
```

Secondary parent-gated system menu (PIN) is allowed for account — MUST NOT list world rooms as app sections.

## 118.3 Emotional geography

Each room type carries a **default emotional job** (extends WDB emotion job):

| Room type | Emotional geography | Default atmosphere |
|-----------|---------------------|-------------------|
| **Home / hall** | Arrival, safety, orientation | Warm, calm, familiar (calmness ≥ 75) |
| **Bedroom / cozy** | Rest, comfort, pretend | Soft, quiet, low density |
| **Garden / outdoor** | Exploration, wonder, scale | Open, light, medium density |
| **Workshop / build** | Capability, making | Focused, tactile, moderate activity |
| **Treasure / reward** | Pride, ownership | Celebratory but not casino |
| **Museum / memory** | Reflection, growth visible | Still, respectful, no grind |
| **Kitchen / social** | Ritual, togetherness | Lively but not chaotic |
| **Pet space** | Attachment, care | Gentle, responsive NPC/pet |

Pack: `emotional_geography` enum per scene. Director (§93) and Emotional Runtime (§81) MUST align density to geography — not one global mood.

## 118.4 Landmarks at junctions

Where paths split, the world MUST offer **visual landmarks** (tree, signpost, lighthouse, mailbox) — not text labels floating in UI.

Child remembers: *"Turn at the big oak"* — not *"Tap Rewards icon"*.

---

# 119. Room Identity, Home Effect & First Five Seconds

## 119.1 Room identity

Every room MUST be **instantly recognisable** in a screenshot without UI chrome:

```
Unique silhouette · Signature colour accent · Anchor object (§107.2)
Distinct ambient soundscape (or deliberate silence)
```

Generic "room template" reuse MUST vary ≥3 identity markers per instance (Art Bible § room fantasy).

## 119.2 Returning home

**Home** (or world's primary hall) is the emotional anchor — not a loading screen.

When the child returns home:

```
Familiar layout preserved · Welcome ambient (not login bonus)
Optional pet/NPC greeting (subtle tier only — §96)
No recap modal · No "while you were away" pressure
```

Home MUST feel **unchanged enough to trust**, **changed enough to notice growth** (placement, unlocks visible in-world).

## 119.3 Home effect

The home effect: child exhales. Shoulders drop. Pace slows.

Director calmness target **≥ 80** in home scenes (§93.2). First visit of session MAY use slightly richer ambient; return visits within session MUST NOT escalate.

## 119.4 First five seconds

Every room entry — especially home — MUST pass the **first five seconds** test:

| Second | Child should feel |
|--------|-------------------|
| 0–1 | "I'm here" — scene readable, no popups |
| 1–3 | "It's alive" — subtle ambient motion or sound |
| 3–5 | "I can choose" — one obvious interactive affordance, no forced path |

Forbidden in first 5 s: achievement toast, streak reminder, tutorial overlay, paywall, parent message modal, multi-step celebration.

---

# 120. Spatial Memory, Familiarity & Emotional Landmarks

## 120.1 Spatial memory

The engine MUST help the child **build a mental map**:

```
Consistent left/right layout between visits
Permanent landmark positions (oak tree stays oak tree)
New unlocks appear IN the map — not in a separate list UI
```

Camera default on re-entry SHOULD respect last meaningful position when safe (not mid-transition).

## 120.2 Familiarity (orchestration layer)

Familiarity (§52.3 NPC familiarity) extends to **places**:

```
visit_count per scene_id (server or client smoothed)
favorite_place flag from ritual observation (§111.1)
```

High-familiarity rooms: slightly warmer lighting, richer subtle ambient — **never** new popups or "you've been here 10 times!" copy.

## 120.3 Emotional landmarks

Each world MUST contain ≥2 **emotional landmarks** — places the child names unprompted:

```
The swing · Grandma's chair · The broken fence they fixed · Luna's bed
```

Pack: `emotional_landmark: true` on entities/scenes. These MUST survive redesigns (§112.3).

## 120.4 Memory of journey

When crossing zones, the world MAY show **distant visibility** of landmarks (garden sees house roof, path sees tower) — reinforces "one place", not teleports.

---

# 121. Flow Rhythm & Session Three Acts

## 121.1 Heavy / light rhythm

Experience flow alternates **heavy** and **light** beats — not constant stimulation.

| Beat | Weight | Example |
|------|--------|---------|
| **Heavy** | Full attention, interaction, placement | Build ceremony, first pet feed, milestone unlock reveal |
| **Light** | Ambient, optional, skippable | Butterfly, wind, NPC stretch, rain |

Director (§94) enforces gaps. Experience orchestration MUST NOT schedule two heavy beats adjacent without light between.

## 121.2 Session three acts

Every typical visit SHOULD follow three acts — **invisible to the child**:

### Act I — Arrival (0–30 s)

```
Enter home or last scene · Orient · Exhale
No demands · Subtle welcome only
Director opening grace (§98.1)
```

### Act II — Exploration (core)

```
Child-led path · Pretend play · Discovery chains
One primary impression target (§125)
Heavy beats sparse · Light beats fill silence
```

### Act III — Return (exit or home)

```
Gentle convergence toward home or natural stop point
No "session complete" screen · No XP summary
Optional comfort ritual supported (§111.1)
Closing calm (§98.2)
```

Acts MUST NOT appear as UI phases. If the child leaves mid Act II — **no penalty**, no resume nag.

## 121.3 Visit length agnostic

Short visit (30 s) = valid. Long visit (20 min) = valid.

Orchestration MUST NOT optimize for session length (no engagement timers).

---

# 122. No Interruption, Invisible Tutorials & Discoverability

## 122.1 No interruption mid-interaction

If the child is in an interaction state (§45):

```
Inspect · Open · Talk · Pretend loop (§105 Rule 2) · Placement drag
```

The engine MUST NOT interrupt with:

```
Toasts · Modals · NPC approach · Surprise spawn · Navigation force
Parent message · Achievement · Streak · New unlock overlay
```

Queue until interaction completes or child cancels. Director `suppress` during active interaction (Appendix I).

## 122.2 Invisible tutorials

The child MUST learn by **doing in the world** — never by instruction slides.

| Allowed | Forbidden |
|---------|-----------|
| Glowing hotspot first visit only (subtle, skippable) | Multi-step coach marks |
| NPC one-line hint AFTER child tries | Arrow pointing "Tap here!" |
| Object affordance (door looks openable) | Text tutorial modal |

First-time affordances MUST fade after use — never repeat every visit.

## 122.3 Discoverability without arrows

Discoverability comes from:

```
Visual affordance · Environmental storytelling · Slow discovery chain (§110.3)
Audio cue from off-screen · NPC glance (not chase)
```

Forbidden: pulsing arrows, bouncing icons, "NEW!" badges on hotspots, red notification dots in world view.

## 122.4 Parent/system exceptions

Parent PIN gate, offline honesty, and critical safety messages MAY overlay — MUST be rare, calm copy, dismiss in one tap. Never during celebration or pretend play peak.

---

# 123. Emotional Contrast, Ritual Support & No Urgency

## 123.1 Emotional contrast

Rooms SHOULD contrast emotionally to make each place memorable:

```
Cozy bedroom after bright garden · Quiet museum after lively kitchen
```

Contrast is **atmosphere**, not shock. Forbidden: jump-scare, guilt contrast ("you missed this").

## 123.2 Ritual support

Engine observes rituals (§111.1) and **supports** without automating:

```
Mailbox check path stays available · Pet greeting timing stable
Favorite room ambient slightly enriched
```

Engine MUST NOT: "Complete your ritual for bonus stars", streak for ritual, or replace ritual with auto-play animation.

## 123.3 No timers, no urgency

Forbidden in child world UI and orchestration:

```
Countdown timers · "Hurry!" copy · Limited-time room · Daily reset pressure
Streak loss warnings · "Come back before midnight"
FOMO badges · Energy that refills on timer
```

Living time (§124.2) affects **sky/light/birds only** — never gates play.

POS G-01, GDB anti-frustration, bedroom test (§113.3) apply.

---

# 124. Parent Gifts In-World, Living Time & Memory Spaces

## 124.1 Parent gifts in-world

Parent-initiated surprises (stars, messages, placed objects) MUST arrive **in the world**:

```
Wrapped gift on path · Letter in mailbox · Object on bench · Balloon in garden
```

Forbidden: push notification that opens modal reward, fullscreen "Mom sent you a gift!" with no scene placement.

Server: `ParentSurprisePlaced` (Appendix A) → Discovery Runtime spawns entity before child sees it.

## 124.2 Living time (atmosphere only)

Time-of-day and season MAY affect:

```
Sky gradient · Window light · Cricket vs bird ambient · Fire lit or not
NPC idle animation selection (cozy vs playful)
```

Time MUST NOT affect:

```
Shop refresh · Lockouts · "Morning only" activities in world (Idag owns schedule truth)
Punishment for night visits · Different star rates
```

Pack: `living_time_profile` optional — defaults to family timezone soft curve, not real-time simulation stress.

## 124.3 Memory spaces

Dedicated memory rooms (museum shelf, photo wall, trophy case) MUST feel **reflective** — not competitive.

```
Show growth story · Name milestones in fiction · No leaderboard
Sibling isolation — never compare in same frame (WDB WQS-034)
```

Memory objects link to **when/where** in fiction — not raw stats strings.

---

# 125. Emotional Loop — One Impression Per Visit

## 125.1 One impression per visit

Each visit SHOULD leave **one primary emotional impression** — not five mediocre ones.

```
"This visit I noticed the new bridge."
"This visit I sat with Luna."
"This visit I found the feather."
```

Director + Experience orchestration coordinate: **one Hero beat maximum per short visit** (§93.1). Additional beats MUST be light tier.

## 125.2 Impression types

| Type | When |
|------|------|
| **Discovery** | New chain step, hidden path |
| **Connection** | Pet/NPC moment, parent gift found |
| **Pride** | Build visible, placement admired |
| **Calm** | Intentional nothing — rain, swing |

Pack MAY declare `primary_impression_hint` for QA — child still chooses path.

## 125.3 Leave wanting to return

End state SHOULD feel **complete but open** — not exhausted.

Good: child puts phone down mid-swing, content.  
Bad: child closes app to escape notification pile-up.

---

# 126. Anti-Pattern: Function→Emotional Room Mapping

## 126.1 The anti-pattern

**Never** map app functions to emotional rooms by lazy metaphor:

| Function anti-pattern | Why it fails |
|-----------------------|--------------|
| Stats → Diary room | Turns reflection into spreadsheet guilt |
| Achievements → Museum | Trophy case becomes grind wall |
| Settings → Control room | Breaks C-01, exposes parent mechanics |
| Shop → Market stall | Violates R-02 stars-not-purchasable in world fiction |
| Notifications → Mailbox spam | Destroys mailbox ritual |
| Leaderboard → Sports hall | Sibling comparison, forbidden |

## 126.2 Correct mapping

Map by **child emotion job** (PCB + five feelings filter):

```
Pride in growth → visible world change (new bridge, taller tree)
Comfort → pet bed, reading nook
Curiosity → unexplained detail, not quest log
Ownership → named objects, placement slots
Capability → workshop affordances tied to real completions
```

If a function has **no honest emotional room** — it does not belong in Min värld (parent UI, Idag shell).

## 126.3 Review gate

Every new room proposal MUST answer:

```
1. What feeling does this strengthen? (metadata filter)
2. Would a child describe it as a PLACE or a FEATURE?
3. Does it pass §126.1 anti-pattern table?
```

"No" to (2) → redesign or reject.

---

# 127. Definition of Done (Experience Orchestration)

A child-facing scene ships orchestration-complete only if:

- [ ] Connected in world graph — not orphan route (§117).
- [ ] Reachable by walking metaphor — transition uses place change (§118.1).
- [ ] No primary tab/menu navigation to this room (§118.2).
- [ ] `emotional_geography` declared and Director targets match (§118.3).
- [ ] Room identity — screenshot recognisable (§119.1).
- [ ] First five seconds — no popup, one affordance (§119.4).
- [ ] Home effect preserved for home scenes (§119.3).
- [ ] Spatial memory — landmarks stable (§120.1).
- [ ] Session acts supported — arrival calm, no exit summary (§121.2).
- [ ] No mid-interaction interruption (§122.1).
- [ ] No arrow tutorials (§122.3).
- [ ] No timers or urgency copy (§123.3).
- [ ] Parent gifts spawn in-world (§124.1).
- [ ] Living time atmosphere-only (§124.2).
- [ ] One impression per visit achievable (§125.1).
- [ ] Anti-pattern table reviewed (§126).
- [ ] Passes **five feelings filter** (Appendix J).
- [ ] Passes **WQS-A001–J005** applicable criteria + gates (Part X, Appendix K).

---

# 128. Final Principle — Journey Between Rooms

> **Screens are forgotten.**
>
> **Journeys are remembered.**
>
> The magic is not in any single room — it is in walking from the garden to the house, wondering what changed, and feeling that it is all one place.

---

# Part X — World Quality Standard (WQS)

Part X is the **experience and emotional ship gate** for child-facing Min värld — binary pass/fail criteria before any scene reaches production.

Part X does **not** replace [WORLD_DESIGN_BIBLE.md](./WORLD_DESIGN_BIBLE.md) §17 (WQS-001–200). It **complements** it:

| Document | WQS scope |
|----------|-----------|
| **WDB §17** | Progression nodes, unlocks, world differentiation, economy, ship calendar |
| **LWES Part X** | World feel, interaction craft, delight, psychology, ownership, living behaviour, visual excellence, performance — the **experience layer** |

Cross-ref: Part VI (feel) · Part VII (Director) · Part VIII (play) · Part IX (orchestration) · [ART_BIBLE.md](./ART_BIBLE.md) (QG-001–500) · Appendix J (five feelings filter).

---

# 129. World Quality Standard Purpose & Philosophy

## 129.1 Purpose

WQS exists so teams cannot ship:

```
Beautiful assets with broken journey · Correct unlocks with tab-bar navigation
Good animations with popup rewards · Safe ethics with casino pacing
Technically correct scenes that feel unfinished
```

## 129.2 Quality = presence of care

**Quality is not the absence of bugs.**

Quality is the **presence of care** — evidence that someone asked *"Would a child feel proud to show this?"* before ship.

A scene with zero crashes but a pulsing reward button **fails** WQS.

A scene with one perfect placement animation and calm return **passes**.

## 129.3 Craft bar (normative)

**10/10 MUST NOT mean "the most possible."**

**10/10 MUST mean "nothing feels cheap."** (metadata craft bar)

Every criterion is **binary**: Ja/Nej. "Mostly" = Nej.

---

# 130. Rule Zero & Five Questions Gate

## 130.1 Rule Zero

> **If it feels unfinished, it is unfinished.**

No checklist override. No "we'll polish later." No ship with known cheap corners.

Rule Zero applies **before** WQS-A001–J005 scoring. If any reviewer says *"something feels off"* and cannot name the fix within one iteration — **HOLD**.

## 130.2 Five Questions gate

Every child-facing scene MUST pass **all five** before WQS category review:

| # | Question | Pass when |
|---|----------|-----------|
| 1 | **Nintendo gate** | No obvious improvement left without adding quantity (§142.6, §46.3) — then **stop** |
| 2 | **Pixar gate** | Room answers who lives here, what happened this morning, what might happen tomorrow — **without text** (§142.7, §46.4) |
| 3 | **Child smile gate** | Child observation (§142.4): unprompted smile, exploration, or story invention within 5 min |
| 4 | **Parent smile gate** | Parent observation (§142.5): parent says *"I understand why they love this"* — not *"it's a reward app"* |
| 5 | **Five-year gate** | Team would be proud showing this scene unchanged in five years — timeless, not trend-chasing (§142.8) |

Failure on any question = **HOLD** until resolved or ADR documents intentional exception.

---

# 131. WQS Authority — LWES vs WDB

## 131.1 Two layers, both required

| Layer | Document | ID range | Owns |
|-------|----------|----------|------|
| **World progression** | WDB §17 | WQS-001–200 | Nodes, unlocks, world differentiation, economy gates |
| **Experience quality** | LWES Part X | WQS-A001–J005 | Feel, interaction, animation, audio, delight, psychology, ownership, living world, visual, performance |

A scene MUST pass **all applicable** criteria from **both** layers before child-facing ship.

## 131.2 Applicability

| Ship type | WDB WQS | LWES WQS (A–J) |
|-----------|---------|----------------|
| New world / major node | Full applicable WDB set | Full WQS-A001–J005 + gates |
| New room in existing world | WDB node + world rows | Full WQS-A001–J005 |
| Scene reskin / art pass | WDB art/palette rows | Re-verify WQS-I + gates |
| Engine change affecting feel/nav | As impacted | Re-run full WQS + Appendix K |

## 131.3 Traceability

PR MUST include:

```markdown
## WQS
- WDB: WQS-___ through WQS-___ = Ja (list N/A)
- LWES: WQS-A001–J005 = Ja/N/A (Appendix K attached)
- Gates: Emotional · Screenshot · Five Minute · Child · Parent · Nintendo · Pixar · Scandinavian · Timeless
- World Quality Score: ___ / 10 avg (≥9.5 required)
```

QA maintains signed Appendix K per `scene_id` — not self-attestation alone.

---

# 132. Category A — World (WQS-A001–A005)

**WQS-A001:** Child never experiences Min värld as menu, dashboard, or reward page — mantra test passes (§33, §116).

**WQS-A002:** Scene reads as a **place with air and depth** within 2 s — not flat illustration-with-buttons (§32, §35).

**WQS-A003:** Scene is a node in pack `nav_edges[]` graph — physically connected, not orphan HTML feature page (§117, Part IX).

**WQS-A004:** World feels alive without input for 60 s — subtle ambient motion or sound visible (§16, §2 Rule 1).

**WQS-A005:** Five feelings filter — pack + PR name ≥1 strengthened feeling; not *"fun only"* (Appendix J).

---

# 133. Category B — Interaction (WQS-B001–B005)

**WQS-B001:** Every interactive hotspot maps to closed interaction verb (Appendix D) — no custom verbs without ADR.

**WQS-B002:** Every interaction follows Observe → Interact → Reaction → Persistence → Return to Ambient (§18).

**WQS-B003:** After interaction, world returns to calm within celebration budget — ends in `calm` (Appendix H, §85).

**WQS-B004:** No interaction requires scene-specific custom code — pack-driven only (§30, Part V).

**WQS-B005:** Every interaction serves explore, build, care, or discover — not parent/admin mechanics (§17).

---

# 134. Category C — Animation (WQS-C001–C005)

**WQS-C001:** Motion budget respected — max 1 hero, 3 medium, unlimited subtle per visible scene per minute (§40, §29).

**WQS-C002:** `prefers-reduced-motion` path tested — instant/skip for non-essential motion (§44, Art Bible MO-03).

**WQS-C003:** Placement sequence ≤5 s total; routine celebrations ≤2 s skippable (§27, §81, GDB).

**WQS-C004:** NPCs ≥2 idle animation variants — no infinite identical loop (§25.1).

**WQS-C005:** Animation before reward — never reward before animation completes (§22.2, §82).

---

# 135. Category D — Audio (WQS-D001–D005)

**WQS-D001:** Every scene has authored ambient soundscape **or** intentional documented silence — not accidental mute.

**WQS-D002:** Audio never blocks exit, creates obligation, or spikes without narrative reason (§124, POS calm).

**WQS-D003:** Interaction sounds align with animation timing — soft attack, no harsh peaks (Art Bible audio row).

**WQS-D004:** No guilt audio — no sad pet, failure sting, or countdown tick (§26, G-01).

**WQS-D005:** Reduced-motion path disables non-essential motion-coupled audio (wind whoosh on disabled parallax, etc.).

---

# 136. Category E — Delight (WQS-E001–E005)

**WQS-E001:** Exactly **one** primary `emotion_intent` per interaction beat — Appendix H enum only (§79).

**WQS-E002:** Delight beats Director-approved — no competing hero events (§95, Part VII).

**WQS-E003:** Surprises visible, positive, authored — no hidden grind or RNG loot (§23, §24, G-03).

**WQS-E004:** ≥1 handcrafted micro-delight detail per scene — not generic filler (§45, §86).

**WQS-E005:** Every beat `ends_in: calm` — no interaction leaves scene permanently demanding (Appendix H.2).

---

# 137. Category F — Child Psychology (WQS-F001–F005)

**WQS-F001:** No guilt mechanics — forbidden pet states, streaks, login bonuses, decay (§26, §112.4, G-01).

**WQS-F002:** Miss-day / absence welcome neutral — no punishment copy or visual (WDB WQS-032, §119.2).

**WQS-F003:** Child agency respected — no forced redirect, no *"try this instead"* during pretend play (§110, §105 Rule 2).

**WQS-F004:** Bedroom test passes — child wonders what pet is doing, not about lost streak (§113.3).

**WQS-F005:** Emotional safety checklist — no failure, punishment, lost progress, disappointment-as-retention (§112.4).

---

# 138. Category G — Ownership (WQS-G001–G005)

**WQS-G001:** Placed objects persist server-side — unchanged on revisit unless authored event (§8, §3 Rule 3).

**WQS-G002:** Nameable entities (pet, home label, favorites) persist and display child-chosen names (§108).

**WQS-G003:** Theme swap preserves all placement and inventory — no progress loss on skin change (§70, vision).

**WQS-G004:** Screenshot identifiable as **this child's** world — not generic template (§108.3, §119.1).

**WQS-G005:** Child can point to ≥1 thing only they have — proof of ownership in QA child test (§88.3).

---

# 139. Category H — Living World (WQS-H001–H005)

**WQS-H001:** Ambient systems run without tap — world alive on idle (§2 Rule 1, §29.2).

**WQS-H002:** Five-second test — observer notices something new without spawn notification (§46.1).

**WQS-H003:** NPC/pet state machine active on entry — not frozen mannequin (§25, §26).

**WQS-H004:** World remembers prior session — placements, discoveries, pet mood consistent (§8, §50).

**WQS-H005:** Director calmness ≥ geography target — home ≥80, comfort zone ≥85 (§93, §111.3, §118.3).

---

# 140. Category I — Visual Excellence (WQS-I001–I005)

**WQS-I001:** Screenshot gate — hide UI; wallpaper-worthy (§46.2, Art Bible AD-03).

**WQS-I002:** Art Bible palette + material rules — no ad hoc hex; materials readable (§38, QG-011).

**WQS-I003:** Rule of Silence — empty space present; not every corner filled (§35.2).

**WQS-I004:** Pixar test — who lives here without text (§46.4, §142.7).

**WQS-I005:** Premium test — *"This is beautiful"* not *"nice for an app"* (§46.5).

---

# 141. Category J — Performance (WQS-J001–J005)

**WQS-J001:** 60 FPS target on mid-range Android portrait; minimum 30 under load (§43, §10.1).

**WQS-J002:** Scene entry — no loading spinner as primary metaphor; door/place transition (§44, §118.1).

**WQS-J003:** Input → visible response perceived <200 ms on routine path (POS 15, §10.1).

**WQS-J004:** Reduced-motion + low-power paths tested on device matrix (§44, 060-mobile-first).

**WQS-J005:** Inactive scenes unloaded — memory rules; no full-world preload (§12.1, §43).

---

# 142. Quality Gates (Emotional, Observation, Craft)

Gates run **after** Rule Zero and Five Questions, **with** category checklist. All gates MUST pass.

## 142.1 Emotional gate

Scene and each shipped interaction declare **one dominant emotion** from Appendix H:

```
pride · wonder · calm · comfort · curiosity · belonging · surprise · achievement · safety
```

Secondary competing emotion in same beat = **FAIL**. Re-sequence beats (§79).

## 142.2 Screenshot gate

Hide UI. Capture portrait screenshot.

> Would someone want this as wallpaper?

If no — **HOLD** (§46.2, WQS-I001).

## 142.3 Five minute gate

Child plays ≥5 min without instruction.

Pass when: exploration, pretend play, or repeat delight occurs — **without** prompts, arrows, or redirect.

Watching rain or petting dog repeatedly = **pass** (§110.1).

## 142.4 Child observation gate

Structured child test (ages 4–10 primary):

- Unprompted smile, story invention, or *"look at this!"* to adult
- No confusion about where to go (unless intentional mystery per §109)
- No distress, boredom exit within 2 min, or *"is it broken?"*

Document: child alias, date, observer, pass/fail note in Appendix K.

## 142.5 Parent observation gate

Parent (or UX reviewer as proxy) after watching child:

- *"I see why they love this"* — not *"it's gamified chores"*
- No concern about manipulation, guilt, or unsafe copy
- Would show screenshot to friend without embarrassment

## 142.6 Nintendo gate

Repeat until no obvious answer — then **stop**:

- Can one interaction become more satisfying?
- Can one sound be softer?
- Can one animation be smoother?
- Can one object tell more story?

Do **not** add a 21st animation to pass (§46.3, craft bar).

## 142.7 Pixar gate

Room answers without text:

- Who lives here?
- What happened this morning?
- What might happen tomorrow?

## 142.8 Scandinavian gate

Calm, warm, honest — not loud, neon, or casino:

- No FOMO copy, no streak badges in frame, no loot-box visual language
- Swedish child tone when copy present — short, kind, never preachy (POS 00A, 00B)
- Hygge over hype; silence is a feature (Part VII)

## 142.9 Timeless gate

Team asks: *"Will this feel dated in five years?"*

Reject: trend UI, meme references, seasonal UI chrome without pack support, engagement-dark patterns that will embarrass us in ADR review.

---

# 143. Ship Criteria — All Approvals Required

**No child-facing scene ships** without **all** of:

| # | Approval | Owner |
|---|----------|-------|
| 1 | Applicable **WDB WQS-001–200** = Ja (WDB §17) | QA + Game |
| 2 | **WQS-A001–J005** = Ja or approved N/A (Appendix K) | QA |
| 3 | **All nine gates** §142 = pass | UX + Game |
| 4 | **Five Questions** §130.2 = pass | Product + UX |
| 5 | **World Quality Score** §144 ≥ 9.5 average | QA Lead |
| 6 | **Part IX §127** Experience Orchestration DoD | Engineering |
| 7 | **Part VIII §114** Play Runtime DoD | Game |
| 8 | **Part VII §101** Director DoD (if Director active) | Engineering |
| 9 | **Appendix K** signed by QA | QA Lead |
| 10 | **Five feelings filter** named (Appendix J) | Product |
| 11 | Self-review **180** — all eight hats | Author |
| 12 | `npm run test:gate` green if code touched (130-testing) | CI |

Violations block merge — same authority as POS 15 anti-ship list.

### N/A rules

Criterion MAY be N/A only when truly not applicable, documented in Appendix K with reason, QA Lead initials.

*"Hard to test"* is not N/A.

Navigation/orchestration refactor MUST re-run Appendix K for **all** live scenes.

---

# 144. World Quality Score (0–10 dimensions)

In addition to binary WQS rows, each scene receives a **World Quality Score** — ten dimensions, **0.0–10.0** each.

| Dim | Dimension | Scores |
|-----|-----------|--------|
| 1 | **World** — place not page | |
| 2 | **Interaction** — tap feels intentional | |
| 3 | **Animation** — motion craft | |
| 4 | **Audio** — soundscape calm | |
| 5 | **Delight** — micro-magic | |
| 6 | **Psychology** — safe, no guilt | |
| 7 | **Ownership** — mine, not template | |
| 8 | **Living** — alive on idle | |
| 9 | **Visual** — Art Bible bar | |
| 10 | **Performance** — invisible tech | |

**Ship requirement:** average ≥ **9.5** across scored dimensions (N/A dimensions excluded from average).

Score **< 9.0** on any single dimension = automatic **HOLD** unless ADR exception.

Scoring sheet lives in Appendix K. QA Lead records scores; author may not self-score alone.

---

# 145. Definition of Done (World Quality)

LWES WQS work is complete only if:

- [ ] Rule Zero — no reviewer "feels unfinished" blockers open.
- [ ] Five Questions gate §130.2 — all five pass.
- [ ] All applicable **WQS-A001–J005** = Ja or approved N/A.
- [ ] All nine **gates** §142 pass.
- [ ] **World Quality Score** average ≥ 9.5 (§144).
- [ ] WDB applicable **WQS-001–200** = Ja.
- [ ] Appendix K filled, QA-signed.
- [ ] §127 Experience Orchestration DoD satisfied.
- [ ] §114 Play Runtime DoD satisfied.
- [ ] §101 Director DoD satisfied where Director active.
- [ ] Self-review 180 — UX, Game, QA hats explicitly include WQS.
- [ ] SW/cache bumped if scene assets changed (150-release).

---

# 146. Final Principle — Nothing Cheap Ships

> **WQS is not bureaucracy.**
>
> **It is the promise that a child never feels the seams —**
>
> **only the world.**
>
> Quality is presence of care. If it feels unfinished, it is unfinished.

---

# Appendix A — Normative Event Catalog

Events marked **server** are emitted by `src/platform-engine/` or completion routes. Events marked **client** are emitted by the Living World Runtime. Events marked **both** require server confirmation before client celebrates.

| Event | Owner | Payload (minimum) | Subscribers |
|-------|-------|-------------------|-------------|
| `onActivityComplete` | server | `child_id`, `activity_template_id`, `completed_date` | ProgressionRuntime, RewardRuntime |
| `onStarGranted` | server | `child_id`, `amount`, `reason` | RewardRuntime, UI toast |
| `BuildPartGranted` | server | `child_id`, `part_id`, `slot_id?` | Persistence, Discovery |
| `onProgressionNodeUnlocked` | server | `child_id`, `world_slug`, `node_id` | WorldRuntime, RewardRuntime |
| `ObjectPlaced` | both | `child_id`, `scene_id`, `slot_id`, `part_id` | Ambient, NPC, Discovery |
| `SceneEntered` | client | `child_id`, `scene_id` | Ambient, Analytics (allowlist) |
| `SceneExited` | client | `child_id`, `scene_id` | Persistence flush |
| `PetFed` | both | `child_id`, `pet_id` | NPC Runtime |
| `DoorOpened` | client | `from_scene`, `to_scene` | Navigation |
| `ItemCollected` | both | `child_id`, `item_id` | Discovery, Persistence |
| `SurpriseDiscovered` | both | `child_id`, `event_id` | Discovery, UI (visible, skippable) |
| `SurpriseScheduled` | server | `child_id`, `surprise_id`, `scene_id` | Discovery Runtime |
| `NavigationRequested` | client | `from_scene`, `to_scene`, `nav_node_id` | Navigation Runtime |
| `InteractionRequested` | client | `hotspot_id`, `verb`, `entity_id` | Interaction Runtime |
| `InspectCompleted` | client | `entity_id` | Ambient (optional) |
| `OpenStarted` / `OpenCompleted` | client | `entity_id`, `target_id?` | Animation, Discovery |
| `Activate` / `ObjectStateChanged` | both | `entity_id`, `new_state` | Persistence, Rendering |
| `TalkStarted` / `TalkCompleted` | client | `npc_id`, `beat_id` | NPC Runtime |
| `MoveRequested` | client | `npc_id`, `target_entity_id` | NPC Runtime |
| `PetPlayed` | both | `child_id`, `pet_id`, `activity` | NPC Runtime |
| `AmbientDiscovery` | client | `entity_id`, `discovery_id` | Analytics (optional) |
| `WorldDiscovery` | both | `child_id`, `discovery_id` | Persistence, Entity spawn |
| `MemoryRecorded` | server | `child_id`, `memory_id`, `memory_type` | NPC, Story |
| `AmbientIntelligenceTick` | client | `scene_id`, `session_time` | Ambient Intelligence |
| `AmbientBeatChosen` | client | `scene_id`, `beat_id` \| `nothing` | Rendering, NPC |
| `StorySeedSpawned` | server | `child_id`, `seed_id`, `scene_id` | Discovery |
| `FamiliarityChanged` | server | `child_id`, `npc_id`, `delta` | NPC Runtime |
| `CalmnessBudgetExceeded` | client | `scene_id` | Ambient Intelligence |
| `DailyMoodApplied` | server | `child_id`, `mood_id` | Rendering, Ambient |
| `ParentSurprisePlaced` | server | `child_id`, `surprise_id` | Discovery, Story |
| `WorldEvolutionStep` | server | `child_id`, `evolution_id` | Scene State |
| `interaction.completed` | client | `entity_id`, `verb` | ProgressionRuntime (if mapped) |

New events MUST be added to this appendix before implementation.

---

# Appendix B — Implementation Mapping (v1 skeleton)

LWES v1.0 is **not fully implemented**. This table maps systems to current code and target modules.

| LWES System | Current (2026-07-02) | Target module |
|-------------|----------------------|---------------|
| Event Bus | `src/platform-engine/event-bus.js` (server) | + `public/js/living-world/event-bus.js` (client mirror) |
| Scene Runtime | `child-morgonhus.js`, `child-garden.js` (slices) | `public/js/living-world/scene-runtime.js` |
| Hotspot Runtime | Emoji buttons in morgonhus slice | `living-world/hotspot-runtime.js` |
| Interaction Runtime | Not shipped | `living-world/interaction-runtime.js` |
| Navigation | `child-living-world-transition.js` (shell only) | `living-world/navigation-runtime.js` |
| Discovery / Surprise | Not shipped | `living-world/discovery-runtime.js` |
| NPC / Pet | Not shipped | `living-world/npc-runtime.js`, `pet-actor.js` |
| Build / Placement | Not shipped | `living-world/placement-controller.js` |
| Inventory | Not shipped | server `child_world_state.inventory` + contextual UI |
| Persistence | `child_progression_node`, `living_object_instance` | `db/child-world-state.js` + API `/api/me/world/*` |
| Rendering | `garden-asset-pipeline.js` | `living-world/scene-asset-pipeline.js`, `rendering-runtime.js` |
| Camera / composition | Not shipped | `living-world/camera-runtime.js` |
| Materials / lighting | Art Bible CSS tokens only | `living-world/lighting-pass.js` (2.5D composite) |
| Ambient | CSS animations in garden/morgonhus CSS | `living-world/ambient-engine.js` |
| Emotional / feel | Toast-only feedback today | `living-world/emotional-runtime.js` + pack `interaction_beats` (Appendix H) |
| **Director** | Not shipped (budgets implicit in §29/§52) | `living-world/director-runtime.js` — gate all proposals (Appendix I) |
| **Play / imagination** | Not shipped | `living-world/play-runtime.js` — pretend detection, ritual comfort (Appendix J) |
| Living Intelligence | Not shipped | `living-world/intelligence-runtime.js` |
| Memory store | `child_progression_node` (partial) | `db/child-world-memory.js` + `memories[]` in world state |
| Ambient probability | Not shipped | pack `intelligence.json` + `ambient-intelligence.js` |
| Story seeds / chains | Not shipped | pack-authored + `discovery-chains.js` |
| Observation (comfort) | Not shipped | server preference hints — **no** engagement ML |
| Calmness budget | Not shipped | `calmness-controller.js` |
| Pack data | `config/experience-packs/child_se/` | `scenes.json`, `intelligence.json`, `catalog.json`, `assets.json` (Appendix G) |
| Pack validation | `validate:experience-packs` (partial) | Full schema for G.1 + anti-pattern lint G.5 |
| Headless sim | `test:platform-engine` (server) | `test:living-world-sim` (client state, no DOM) |

**Rule:** New Min värld features MUST extend the target modules. Do not add parallel `child-*-playable.js` slices without ADR.

---

# Appendix C — Scene Pack Schema (normative minimum)

Experience Pack MUST declare scenes in `scenes.json` (or equivalent include). Minimum schema:

```json
{
  "version": "1.0.0",
  "scenes": [{
    "scene_id": "home_hall",
    "display_name_sv": "Hemmet",
    "theme_variants": ["house", "castle", "space"],
    "layers": ["sky", "bg", "ground", "objects", "fg"],
    "slots": [{
      "slot_id": "hall_welcome_mat",
      "accepts": ["welcome_mat"],
      "position": { "x": 0.32, "y": 0.78 },
      "ghost_asset": "welcome_mat_ghost",
      "placed_assets": { "house": "welcome_mat_house", "castle": "welcome_mat_castle" }
    }],
    "hotspots": [{
      "hotspot_id": "door_garden",
      "target_scene": "garden",
      "hit_area": { "x": 0.85, "y": 0.4, "w": 0.12, "h": 0.5 }
    }],
    "ambient": ["curtain_sway", "light_dust", "bird_outside"]
  }]
}
```

WDB owns which nodes unlock which parts. LWES owns how slots, hotspots, and layers behave at runtime.

---

# Appendix D — Interaction Verb Registry

Closed enum — §22. New verbs require ADR.

| Verb | Category | Server persist | Typical events |
|------|----------|----------------|----------------|
| `inspect` | Explore | No | `InteractionRequested` → `InspectCompleted` |
| `open` | Discover | Often | `OpenStarted` → `OpenCompleted` |
| `place` | Build | **Yes** | `InteractionRequested` → `ObjectPlaced` |
| `collect` | Discover | **Yes** | `ItemCollected` |
| `feed` | Care | Optional | `PetFed` |
| `pet` | Care | No | `PetPlayed` |
| `talk` | Discover | No | `TalkStarted` → `TalkCompleted` |
| `move` | Care | No | `MoveRequested` |
| `activate` | Build / Explore | **Yes** | `Activate` → `ObjectStateChanged` |
| `navigate` | Explore | No | `NavigationRequested` → `SceneEntered` |

Pack manifest field: `hotspots[].interaction` MUST use one of these verbs.

---

# Appendix E — Hotspot State Machine

Allowed transitions (no other transitions without ADR):

```
Hidden ──(unlock condition)──► Visible
Visible ──(highlight rules §21.3)──► Highlighted
Highlighted ──(tap)──► Pressed
Visible ──(tap)──► Pressed
Pressed ──(animation end)──► Visible | Completed
Visible ──(locked)──► Disabled
Disabled ──(unlock)──► Visible
Completed ──(inspect only)──► Visible
```

| From | Event | To |
|------|-------|-----|
| `Hidden` | WDB node / discovery unlock | `Visible` |
| `Visible` | Inventory has matching part | `Highlighted` |
| `Highlighted` | Tap | `Pressed` |
| `Pressed` | Interaction complete (one-shot) | `Completed` |
| `Pressed` | Interaction complete (repeatable) | `Visible` |
| `Visible` | Prerequisites missing | `Disabled` |

`Pressed` MUST NOT persist across scene unload.

---

# Appendix F — Event Categories & Memory Schema

## F.1 Event categories (§51.1)

| Category | Source examples | Purpose |
|----------|-----------------|---------|
| `System` | `WorldSaved`, `SceneLoaded` | Engine lifecycle |
| `Player` | `InteractionRequested`, `ObjectPlaced` | Child actions |
| `Parent` | `ParentSurprisePlaced` | Approved parent beats |
| `Season` | `DailyMoodApplied`, calendar hooks | Atmosphere |
| `NPC` | `FamiliarityChanged`, `NpcReact` | Companions |
| `Story` | `MemoryRecorded`, `StorySeedSpawned` | Memories & seeds |
| `Ambient` | `AmbientBeatChosen`, `CalmnessBudgetExceeded` | Living intelligence |
| `Rendering` | Layer swap, theme applied | Presentation |

## F.2 Memory record (minimum)

```json
{
  "memory_id": "first_lamp_placed",
  "memory_type": "permanent",
  "child_id": "uuid",
  "emotional_label_sv": "Första lampan",
  "scene_id": "home_hall",
  "entity_ref": "slot:hall_lamp",
  "recorded_at": "ISO-8601",
  "npc_may_reference": true,
  "parent_authored": false
}
```

## F.3 Intelligence pack snippet (`intelligence.json`)

```json
{
  "version": "1.0.0",
  "ambient_probability": {
    "nothing": 0.70,
    "small": 0.20,
    "interesting": 0.08,
    "special": 0.02
  },
  "ambient_tick_ms": { "min": 8000, "max": 15000 },
  "calmness": { "max_major_per_minute": 1, "max_medium_per_minute": 3 },
  "story_seeds": [{ "seed_id": "package_door", "scene_id": "home_hall", "trigger": "surprise:daily" }],
  "discovery_chains": [{ "chain_id": "flower_bee", "steps": ["slot:garden_flower", "ambient:bee", "decoration:honey"] }]
}
```

## F.4 Forbidden intelligence patterns

| Pattern | Status |
|---------|--------|
| LLM / chatbot NPC | **Forbidden** without ADR |
| Affection meters / hearts UI | **Forbidden** |
| Quest log / objective tracker | **Forbidden** |
| Engagement-scored observation | **Forbidden** |
| Random loot tables | **Forbidden** (G-03) |
| Login timers / FOMO surprises | **Forbidden** (G-01) |

---

# Appendix G — Experience Pack Layout & Component Registry

## G.1 Pack directory layout (normative target)

```
config/experience-packs/{pack_id}/
  manifest.json          # pack root — version, includes, pacing
  progression.json         # WDB nodes (existing)
  worlds.json            # world display metadata (existing)
  scenes.json            # scenes, entities, slots, hotspots (Appendix C)
  intelligence.json      # ambient weights, seeds, chains (Appendix F.3)
  catalog.json           # build parts, collectibles definitions
  copy.json              # child-facing strings (existing)
  assets.json            # asset_id → theme → file path
  component_states.json  # optional declarative state machines
```

Existing `child_se` pack MUST gain `scenes.json`, `intelligence.json`, `catalog.json`, `assets.json` without breaking current includes. `validate:experience-packs` MUST cover new files.

## G.2 Entity types (engine enum)

```
Static · Furniture · Decoration · Creature · NPC · Interactive
Collectible · BuildSlot · ParticleSource · NavigationObject · LightSource
```

Maps to fiction in pack; engine uses enum only.

## G.3 Component registry

| Component | Implements (LWES §) | Persist |
|-----------|---------------------|---------|
| `Renderable` | Part III layers | No |
| `Animated` | Semantic animations | No |
| `Interactable` | Part II hotspots | Optional |
| `Persistent` | World state facts | **Yes** |
| `BuildSlot` | §27 placement | **Yes** |
| `Pet` | §26, §54 | **Yes** |
| `NPC` | §25 | Partial |
| `Navigation` | §19, §71.2 | No |
| `Ambient` | §29, §52 | No |
| `LivingObject` | §58.2 | Optional |
| `Collectible` | §22.4 | **Yes** |
| `LightSource` | §37 | Optional |
| `ParticleSource` | §41 | No |
| `AudioSource` | §70.4 | No |

New row = ADR + tests + Appendix G update.

## G.4 CI validation requirements

Before merge of pack or engine changes:

```bash
npm run validate:experience-packs   # schema + cross-ref
npm run test:platform-engine        # headless event + progression
# target: npm run test:living-world-sim
```

Pack MUST fail validation if:

* Scene references unknown `asset_id`
* Hotspot uses verb not in Appendix D
* Navigation edge points to missing `scene_id`
* Component list contains unknown component
* `ambient_probability` weights do not sum to 1.0

## G.5 Anti-pattern lint (engine code)

Forbidden patterns in `public/js/living-world/` and `src/lib/*-playable.js` successors:

```
if (sceneId === '...')     # use pack data
if (world === 'home')      # use pack data
require('.../hall.png')    # use asset_id resolver
```

Enforce via `npm run lint:living-world` (target) or code review gate.

---

# Appendix H — Emotion Registry & Interaction Beats

## H.1 Emotion enum (closed)

Used by `emotion_intent` on interactions, scenes, and PR checklist (§90).

```
pride · wonder · calm · comfort · curiosity · belonging
surprise · achievement · safety
```

One primary emotion per interaction. Secondary emotion = redesign required.

## H.2 Interaction beat schema (pack)

Every rewarded or acknowledged interaction MUST declare beats — engine plays in order:

```json
{
  "interaction_id": "chest_open_first",
  "emotion_intent": "wonder",
  "beats": [
    { "type": "animation", "semantic": "chest_shake", "duration_ms": 400 },
    { "type": "audio", "semantic": "wood_rattle_soft", "duration_ms": 200 },
    { "type": "animation", "semantic": "chest_open", "duration_ms": 600 },
    { "type": "light", "semantic": "glow_soft", "duration_ms": 300 },
    { "type": "reveal", "semantic": "item_show", "duration_ms": 500 }
  ],
  "max_total_ms": 2000,
  "skippable": true,
  "ends_in": "calm"
}
```

| Field | Rule |
|-------|------|
| `max_total_ms` | ≤2000 on routine path; ≤5000 placement only (§27) |
| `skippable` | **true** if child can be blocking exit |
| `ends_in` | MUST be `calm` |

## H.3 Routine completion beat template (Idag → world)

Normative minimum after activity complete (§81.1):

```json
{
  "interaction_id": "activity_complete_ack",
  "emotion_intent": "achievement",
  "beats": [
    { "type": "copy", "semantic": "du_klarade_det", "duration_ms": 800 },
    { "type": "stars", "semantic": "star_burst_small", "duration_ms": 600 },
    { "type": "optional", "semantic": "build_part_hint", "duration_ms": 400 }
  ],
  "max_total_ms": 2000,
  "skippable": true,
  "ends_in": "calm"
}
```

No confetti stack. `build_part_hint` is optional whisper — not modal.

## H.4 PR feel checklist (copy into PR template)

```markdown
## LWES Part VI — Feel
- [ ] Emotion improved: ___
- [ ] One emotion only (Appendix H.1)
- [ ] Ends in calm
- [ ] Tested: Home / Child / Return (as applicable)
- [ ] Or tagged: no-child-surface
```

---

# Appendix I — Director State & Budget Schema

## I.1 Session director state (client + server sync optional)

```json
{
  "calmness_score": 75,
  "calmness_target": 75,
  "attention": { "hero_active": null, "medium_active": [] },
  "surprise_budget": { "current": 5, "max": 10, "regen_per_hour": 2 },
  "wonder_count_session": 2,
  "wonder_cap_session": 3,
  "last_hero_at": "ISO-8601",
  "last_silence_window_at": "ISO-8601",
  "recent_event_ids": ["butterfly_1", "dog_stretch"],
  "session_opening_complete": false,
  "birthday_mode": false
}
```

## I.2 Director decision API (internal)

```typescript
// Pseudocode — normative behaviour
director.request(eventProposal) → 'approve' | 'delay' | 'suppress' | 'nothing'
```

All proposals from: Ambient Intelligence (§52), NPC Runtime (§25), Discovery (§23), Emotional Runtime (§81), Surprise Engine (§24).

## I.3 Pack overrides (`director.json`)

```json
{
  "version": "1.0.0",
  "scenes": {
    "home_hall": {
      "calmness_target": 80,
      "max_visual_density": 0.65,
      "opening_grace_ms": 10000,
      "silence_min_after_hero_ms": 15000
    }
  },
  "rare_events": [
    { "id": "shooting_star", "cooldown_days": 30, "surprise_cost": 8 }
  ]
}
```

## I.4 Event catalog additions (Director)

| Event | Owner | When |
|-------|-------|------|
| `DirectorEventApproved` | client | Proposal passed gate |
| `DirectorEventDelayed` | client | Queued for later |
| `DirectorEventSuppressed` | client | Budget/calmness denied |
| `CalmnessScoreChanged` | client | Score crossed threshold |
| `SilenceWindowStarted` | client | Forced rest period |
| `PretendPlayDetected` | client | Sustained repeat interaction — Director quiets (§105 Rule 2) |
| `RitualObserved` | server | Comfort weight only — no engagement scoring |

---

# Appendix J — Five Feelings Filter & Room Play Checklist

## J.1 Five feelings (supreme filter)

See document metadata. Every scene, entity, interaction, and PR MUST strengthen ≥1:

```
capability · ownership · comfort · curiosity · imagination
```

PR addition to §90 template:

```markdown
- [ ] Five feelings: strengthens ___
```

## J.2 Room pretend play checklist

Before ship, per `scene_id`:

- [ ] `pretend_affordances[]` declared (≥1)
- [ ] `story_anchor_entity_id` set
- [ ] `open_questions[]` ≥ 1 (unanswered in copy)
- [ ] Meaningful interactives: 5–10 (not 50)
- [ ] `comfort_zone: true` OR links to global comfort scene
- [ ] `emotional_object` entities flagged for migration safety
- [ ] Child test: invents story without prompt (§88.3)
- [ ] Bedroom test: no streak/FOMO hooks in scene (§113.3)

## J.3 Pack scene fields (play runtime)

```json
{
  "scene_id": "home_hall",
  "strengthens_feeling": ["comfort", "imagination"],
  "pretend_affordances": ["pretend_arrival_home", "pretend_mail"],
  "story_anchor_entity_id": "mailbox_1",
  "open_questions": ["who_sent_the_letter"],
  "comfort_zone": false,
  "toy_density_target": 8
}
```

## J.4 Director + play integration

When `PretendPlayDetected`:

```
Director suppresses medium+ proposals for 60s default
Emotional runtime avoids new dialogue
Ambient stays subtle tier only
```

When pretend ends — normal Director budgets resume.

---

# Appendix K — WQS Checklist Template

Copy per ship. One checklist per `scene_id`. Store in PR or `docs/qa/wqs/` — path not normative; completion is.

```markdown
# LWES WQS Checklist — Appendix K

**Scene / world:** _______________  
**Pack version:** _______________  
**PR / release:** _______________  
**QA Lead sign-off:** _______________  **Date:** _______________

---

## Rule Zero & Five Questions (§130)

- [ ] Rule Zero — no open "feels unfinished" blockers
- [ ] Nintendo gate (§142.6)
- [ ] Pixar gate (§142.7)
- [ ] Child smile gate (§142.4) — observer: ______ date: ______
- [ ] Parent smile gate (§142.5) — observer: ______ date: ______
- [ ] Five-year / Timeless gate (§142.8–142.9)

## Authority

- [ ] WDB WQS applicable rows attached (WQS-___ – WQS-___)
- [ ] LWES Part X §131 dual-layer review complete

---

## Category A — World (WQS-A001–A005)

| ID | Criterion | Ja | Nej | N/A | Notes |
|----|-----------|:--:|:---:|:---:|-------|
| WQS-A001 | Not menu/dashboard/reward page | | | | |
| WQS-A002 | Place with air and depth ≤2 s | | | | |
| WQS-A003 | nav_edges[] graph node | | | | |
| WQS-A004 | Alive 60 s without input | | | | |
| WQS-A005 | Five feelings named (Appendix J) | | | | |

## Category B — Interaction (WQS-B001–B005)

| ID | Criterion | Ja | Nej | N/A | Notes |
|----|-----------|:--:|:---:|:---:|-------|
| WQS-B001 | Closed interaction verb (Appendix D) | | | | |
| WQS-B002 | Observe→Interact→Reaction→Persist→Ambient | | | | |
| WQS-B003 | Returns to calm after interaction | | | | |
| WQS-B004 | Pack-driven — no scene custom code | | | | |
| WQS-B005 | Explore/build/care/discover only | | | | |

## Category C — Animation (WQS-C001–C005)

| ID | Criterion | Ja | Nej | N/A | Notes |
|----|-----------|:--:|:---:|:---:|-------|
| WQS-C001 | Motion budget (1/3/unlimited) | | | | |
| WQS-C002 | prefers-reduced-motion tested | | | | |
| WQS-C003 | Placement ≤5 s; celebration ≤2 s | | | | |
| WQS-C004 | NPC ≥2 idle variants | | | | |
| WQS-C005 | Animation before reward | | | | |

## Category D — Audio (WQS-D001–D005)

| ID | Criterion | Ja | Nej | N/A | Notes |
|----|-----------|:--:|:---:|:---:|-------|
| WQS-D001 | Ambient soundscape or intentional silence | | | | |
| WQS-D002 | Audio never blocks exit / obligation | | | | |
| WQS-D003 | Soft interaction sounds | | | | |
| WQS-D004 | No guilt audio | | | | |
| WQS-D005 | Reduced-motion audio path | | | | |

## Category E — Delight (WQS-E001–E005)

| ID | Criterion | Ja | Nej | N/A | Notes |
|----|-----------|:--:|:---:|:---:|-------|
| WQS-E001 | One emotion_intent per beat (Appendix H) | | | | |
| WQS-E002 | Director-approved delight | | | | |
| WQS-E003 | Surprises visible, authored | | | | |
| WQS-E004 | ≥1 micro-delight detail | | | | |
| WQS-E005 | ends_in: calm | | | | |

## Category F — Child Psychology (WQS-F001–F005)

| ID | Criterion | Ja | Nej | N/A | Notes |
|----|-----------|:--:|:---:|:---:|-------|
| WQS-F001 | No guilt mechanics | | | | |
| WQS-F002 | Miss-day welcome neutral | | | | |
| WQS-F003 | Child agency — no forced redirect | | | | |
| WQS-F004 | Bedroom test | | | | |
| WQS-F005 | Emotional safety checklist | | | | |

## Category G — Ownership (WQS-G001–G005)

| ID | Criterion | Ja | Nej | N/A | Notes |
|----|-----------|:--:|:---:|:---:|-------|
| WQS-G001 | Placements persist server-side | | | | |
| WQS-G002 | Nameable entities persist | | | | |
| WQS-G003 | Theme swap preserves progress | | | | |
| WQS-G004 | Screenshot = this child's world | | | | |
| WQS-G005 | Child ownership proof in test | | | | |

## Category H — Living World (WQS-H001–H005)

| ID | Criterion | Ja | Nej | N/A | Notes |
|----|-----------|:--:|:---:|:---:|-------|
| WQS-H001 | Ambient without tap | | | | |
| WQS-H002 | Five-second observation test | | | | |
| WQS-H003 | NPC/pet state machine active | | | | |
| WQS-H004 | Session memory consistent | | | | |
| WQS-H005 | Director calmness ≥ target | | | | |

## Category I — Visual Excellence (WQS-I001–I005)

| ID | Criterion | Ja | Nej | N/A | Notes |
|----|-----------|:--:|:---:|:---:|-------|
| WQS-I001 | Screenshot / wallpaper gate | | | | |
| WQS-I002 | Art Bible palette + materials | | | | |
| WQS-I003 | Rule of Silence | | | | |
| WQS-I004 | Pixar test (no text) | | | | |
| WQS-I005 | Premium test | | | | |

## Category J — Performance (WQS-J001–J005)

| ID | Criterion | Ja | Nej | N/A | Notes |
|----|-----------|:--:|:---:|:---:|-------|
| WQS-J001 | 60 FPS target / 30 min | | | | |
| WQS-J002 | No spinner — place transition | | | | |
| WQS-J003 | Input <200 ms perceived | | | | |
| WQS-J004 | Reduced-motion device tested | | | | |
| WQS-J005 | Scene unload / memory rules | | | | |

---

## Quality gates (§142)

| Gate | Pass | Fail | Notes |
|------|:----:|:----:|-------|
| Emotional — one dominant emotion (Appendix H) | | | emotion: ______ |
| Screenshot — wallpaper-worthy | | | |
| Five minute — unprompted play | | | |
| Child observation | | | |
| Parent observation | | | |
| Nintendo — no obvious cheap fix left | | | |
| Pixar — story without text | | | |
| Scandinavian — calm, no casino/FOMO | | | |
| Timeless — proud in 5 years | | | |

---

## World Quality Score (§144)

| Dim | Dimension | Score /10 |
|-----|-----------|-----------|
| 1 | World | |
| 2 | Interaction | |
| 3 | Animation | |
| 4 | Audio | |
| 5 | Delight | |
| 6 | Psychology | |
| 7 | Ownership | |
| 8 | Living | |
| 9 | Visual | |
| 10 | Performance | |

**Average:** ______ (≥9.5 required; no dim <9.0 without ADR)

---

## Cross-doc DoD

- [ ] Part IX §127 Experience Orchestration DoD
- [ ] Part VIII §114 Play Runtime DoD
- [ ] Part VII §101 Director DoD (if active)
- [ ] Part VI §89 Emotional Runtime DoD (if beats ship)
- [ ] Five feelings: _______________

## Ship decision

- [ ] **SHIP** — all applicable = Ja; gates pass; score ≥9.5
- [ ] **HOLD** — blockers:

```

N/A rows REQUIRE reason + QA Lead initials in Notes.

---

**Document:** LIVING_WORLD_ENGINE_SPEC.md  
**Version:** LWES v1.0 **COMPLETE** (Parts I–X — engine, orchestration, WQS gate)  
**Production specs:** [bibles/README.md](./bibles/README.md)  
**Next review:** When first scene passes Appendix K + WDB applicable WQS rows
