# 01 — Product Principles

| | |
|---|---|
| **Authority** | Subordinate to [`00_MASTER_SPEC.md`](00_MASTER_SPEC.md) |
| **Version** | 1.0 |
| **Scope** | How Min Stjärndag works — routines, rewards, building, unlock, play | <!-- pragma: allowlist secret -->

---

## 1. What the product is

The app is a **vardagsapp** (everyday companion) for children aged 4–10 and their families. <!-- pragma: allowlist secret -->

It helps children complete real routines: breakfast, brushing teeth, getting dressed, packing bags, homework, bedtime.

It is **not** a game first. It is **not** a dashboard. It is **not** a click-reward farm.

BUILD MODE (byggdelar + belöningsvärldar) is an **emotional layer** on top of the existing schema — it does not replace stars or Skattkammaren.

---

## 2. Dual reward system (detailed)

Every completed activity in the child's daily schedule produces **two parallel outcomes** from the **same real-world action**.

### Reward A — Stars (parent loop)

| | |
|---|---|
| **Who** | Parent controls via Skattkammaren |
| **Amount** | 1–5 ⭐ per activity (unchanged) |
| **Meaning** | Real-world rewards parent approves |
| **Examples** | Ice cream, movie, book, Lego, Minecraft time |
| **Child thinks** | Often indirectly ("eventually I get something from mum/dad") |
| **Must** | Remain exactly as today. Never weakened. Never removed. |

```
Brush teeth → +2 ⭐ → 30 ⭐ total → Parent approves → Ice cream
```

### Reward B — Build parts (child loop)

| | |
|---|---|
| **Who** | Automatic — emotional hook for the child |
| **Amount** | 1 build part per completed activity |
| **Meaning** | Digital progression — costs parent nothing |
| **Destination** | Active build world grows visually |
| **Child thinks** | "I want to finish my pet home" / "I need that wall for the garage" |
| **Must** | Feel like building, not "+1 point" |

```
Brush teeth → "You found a new part!" → Dog house grew → "3 parts until the stable is done!"
```

### Same trigger, two systems

```
Activity marked complete (daily log)
       │
       ├── Star logic (existing) ──→ Skattkammaren
       │
       └── tryGrantBuildPart (build) ──→ parts_collected +1
```

**Technical:** `src/routes/daily-logs` → `tryGrantBuildPart` + existing star flow. Backend already wired; UX must make both loops **felt**.

### Design intent

- Child should **almost forget stars** while building — but stars remain for parent and Skattkammaren.
- Build world **does not replace** stars — it makes routines **more valuable** to the child without parent giving more.

---

## 3. Product path (happy path)

Live user flow. Preview/dev is exception (§7).

```
REAL WORLD
  Child brushes teeth, eats breakfast, does homework …
       ↓
APP — Daily schedule
  Activity marked complete in dagbok
       ↓
       ├─→ +1–5 ⭐  (Skattkammaren — parent loop)
       └─→ +1 build part (build scene — child loop)
       ↓
Build part lands (animation, not a number)
  World grows visibly on screen
       ↓
75 macro parts collected
       ↓
UNLOCK ceremony
       ↓
PLAY world (gated — §6)
  drag, scrub, throw, paint, build …
       ↓
Parent approves stars → real reward in Skattkammaren
```

**Never reverse:** Play is not the objective. Routine is.

---

## 4. Product hierarchy (enforced)

```
Reality → Routine → Motivation → Building → Unlock → Play
```

| Stage | Rule |
|-------|------|
| **Routine** | Always accessible. Core product. |
| **Building** | Visible reward after each activity. Always on while project active. |
| **Play** | Only after 75 parts (+ optional parent gates). Belöning för vardagen. |

If a child begs to "just play" without doing routines, the product has failed its purpose.

---

## 5. One active build project

- Each child chooses **one adventure** at a time (7 MVP worlds).
- **75 macro parts** per adventure.
- When complete → world unlocks → play mode for that world.
- Child may start a new adventure later (future seasons); MVP = one active.

---

## 6. Play gate (live deploy)

| Mode | Access |
|------|--------|
| Schema, stars, dagbok | Always |
| Build scene, part landing | When active `child_build_project` exists |
| **Play world** | `parts_collected >= 75` AND (`garage_unlocked` OR `status === 'completed'`) |

**Optional (future parent settings):**

- Play only after today's schedule complete
- Daily play time limit (minutes)
- Preview `?preview=1` for dev/demo only — not product path

**Principle:** Lekvärlden konkurrerar inte med vardagen — den är belöningen för den.

---

## 7. Nintendo principle (macro × micro)

75 = **macro parts** per world. Each macro part should be a **small experience**, not `+1 item`.

```
Macro: "Engine"
  Micro: bolts → pistons → exhaust → turbo (animated in sequence)
```

```
Macro: "Dog house" (one activity may advance one micro-step)
  Micro: floor → walls → roof → paint → name sign → bed → bowl → toys
```

Child feels: *"I built the engine."* Not: *"+1 engine."*

MVP may ship 1 animation per macro part; full Nintendo feel is the target.

---

## 8. Visible progression (not progress bars)

**Forbidden as main experience:** lone progress bar, dashboard of numbers, `32/75` without a changing scene.

**Required:** child sees empty lot → foundation → walls → roof → windows → furniture → decoration → complete world.

Milestones at 15 / 30 / 45 / 60 / 75 unlock perks and guide dialogue — secondary to the **scene**.

---

## 9. Emotional systems (target)

### 9.1 Greetings & memory

World/guide remembers the child:

| Situation | Example |
|-----------|---------|
| Daily return | "Hi Alex! I missed you! Look — I've been waiting here." |
| Absence | "I've been waiting for you ❤️" |
| Recent build | "WOW! Now we have a real home!" |
| Homework done | "We got a bookshelf!" |

Short, warm, world-specific. Not a chatbot.

### 9.2 Living worlds

On return, scene has changed subtly:

- Dog moved the ball
- Cat on the sofa
- Lamp on, flowers grown
- Dino asleep

Seeded from `last_seen_at` — feels alive, not frozen screenshot.

### 9.3 Rare finds

~99%: "You got: A chair."

~1%: ✨ "WOW!! You found the golden lamp! 1 of 200"

Surprise without breaking progression. No extra parent cost.

---

## 10. Parent value proposition

Parents are the **customer**. Children are the **user**.

| Parent gets | Child gets |
|-------------|------------|
| Fewer morning battles | Something to look forward to |
| Routine actually happens | "I want to build my home" |
| Stars still work for real rewards | Emotional progression for free |
| Optional play limits | Unlock feels earned |

Feature fails if it creates **new** conflict ("can I play now?") without reducing routine conflict.

---

## 11. What we are not building

| Forbidden | Why |
|-----------|-----|
| Dashboard for children | Admin feel |
| Forms ("Feed pet" button) | No physical interaction |
| Emoji buttons as primary UI | Cheap, not App Store |
| Static progress bar as hero | Child remembers bar, not world |
| Click games (`+8 Happiness`) | No emotion |
| Play replacing schedule | Breaks core loop |
| Build replacing stars | Breaks parent loop |
| Removing earned progress | Shame/guilt — violates Master Spec §4 |

---

## 12. First vertical: Pet Home

All BUILD MODE work must prove full chain here first:

```
Build 0 → 75 (visible scene, part landing, guide)
  → unlock ceremony
  → play (hund, katt, kanin, häst)
  → facit-quality art
```

Garage remains **play quality reference**; Pet Home is **full chain reference** (build → unlock → play).

Details: [`04_WORLD_DESIGN.md`](04_WORLD_DESIGN.md).

---

## 13. API summary (unchanged backend)

```
GET   /api/me/build
POST  /api/me/build/start
POST  /api/me/build/part          ← idempotent per daily_log_item
GET   /api/me/build/play/:slug
PATCH /api/me/build/play/:slug
```

Storage: `child_build_project.parts_collected`, `customization` JSONB, `garage_unlocked`.

---

## 14. Related documents

| Doc | Content |
|-----|---------|
| [`00_MASTER_SPEC.md`](00_MASTER_SPEC.md) | Vision, laws, definition of done |
| [`03_GAME_ENGINE.md`](03_GAME_ENGINE.md) | PixiJS, BuildEngine |
| [`04_WORLD_DESIGN.md`](04_WORLD_DESIGN.md) | Per-world design |
| [`build-loop-mvp.md`](build-loop-mvp.md) | Migrations, sprint backlog |
