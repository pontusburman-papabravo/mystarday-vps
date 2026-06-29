# 04 — World Design

| | |
|---|---|
| **Authority** | Subordinate to [`00_MASTER_SPEC.md`](00_MASTER_SPEC.md) |
| **Version** | 1.0 |
| **Scope** | All 7 MVP adventures — build progression + play mechanics |

---

## 1. Shared rules (all worlds)

| Rule | Value |
|------|-------|
| Macro parts per adventure | **75** |
| Micro-steps per macro (target) | **3–8** animations |
| Active projects per child | **1** |
| Unlock play | `parts_collected >= 75` |
| Build trigger | 1 part per completed schedule activity |
| Stars | Unchanged — parallel loop (§01) |
| Rendering | PixiJS world pack (§03) |
| Guide | Named character per world (see below) |

**Milestones:** 15 / 30 / 45 / 60 / 75 — perk unlock + guide dialogue.

---

## 2. World index

| # | Slug | Name | Guide | Build noun | Play route |
|---|------|------|-------|------------|------------|
| 1 | `racerbil` | Mecka med bilen | Meckis 🔧 | garaget | `/child/garage` |
| 2 | `husdjur` | Ta hand om husdjur | Bella 🐶 | husdjurshemmet | `/child/pet-home` |
| 3 | `dinosaurie` | Forska om dinosaurier | Professorn 🦴 | dino-dalen | planned |
| 4 | `dockhus` | Dockor & dockhus | Lilla Lisa 🪆 | dockhuset | planned |
| 5 | `fiske` | Fiska & båtliv | Kaptenen ⚓ | båtkajen | planned |
| 6 | `laxor` | Läxor & lärande | Lärar-Owl 🦉 | läxbordet | planned |
| 7 | `vardag` | Vardagsäventyr | Stjärnan ⭐ | mitt rum | planned |

**First full vertical:** `husdjur` (build → unlock → play). **Play quality reference:** `racerbil` (garage).

---

## 3. Build progression template

Visual stages (approximate part thresholds):

| Parts | Stage |
|------:|-------|
| 0 | Empty lot / empty space |
| 10 | Foundation / fence |
| 20 | Walls / structure started |
| 30 | Roof / enclosure |
| 40 | Doors / windows / functional area |
| 50 | Furniture / tools / core props |
| 60 | Decoration / playground |
| 75 | **Complete → unlock play** |

Per-world labels differ — see §4–10.

---

## 4. Racerbil — Garaget

### Build (75 parts)

| Parts | Stage |
|------:|-------|
| 0 | Tom tomt |
| 10 | Grund |
| 20 | Väggar |
| 35 | Tak |
| 50 | Port |
| 65 | Verktyg |
| 75 | Garaget klart |

**Milestone perks:** colour · star decal · sport wheels · honk boost · world unlock

**Style anchor:** `build-car-hero.png`, `build-garage-scene.png`, `build-car-progress.png`

### Play (after unlock)

- Wash car (scrub)
- Change colour
- Swap wheels / tyres
- Tune engine (wrench minigame)
- Honk / drive animation
- Car gets dirty over time

**Status:** DOM pilot live — **migrate to Pixi** `worlds/garage/`.

---

## 5. Husdjur — Husdjurshemmet ⭐ FIRST VERTICAL

### Build (75 parts)

| Parts | Stage |
|------:|-------|
| 0 | Tom hage |
| 12 | Staket |
| 25 | Hundkoja påbörjad |
| 40 | Matplats |
| 55 | Leksaker |
| 70 | Lekplats |
| 75 | Hemmet klart |

**Macro example — "Hundkoja" micro sequence:**

```
Golv → Väggar → Tak → Måla → Namnskylt → Hundsäng → Matskål → Leksaker
```

**Milestone perks:** puppy stickers · brush · food bowl · leash · world unlock

**Style anchor:** `build-pet-hero.png`; scene PNG TBD (`build-pet-scene.png`)

### Play (after unlock)

**Pets:** hund, katt, kanin, häst (facit PNG per species over time)

| Interaction | Mechanic |
|-------------|----------|
| Feed | Drag bag → bowl → pet |
| Groom | Select brush, scrub fur (pointer path) |
| Play | Throw ball — pet chases |
| Pet | Tap/rub head — hearts |
| Treat | Drag treat to pet |
| Rest | Drag blanket — sleep animation |

**Needs decay** over time (hunger, happiness, cleanliness, energy) — world feels alive.

**Greetings:** use child name; absence messages; celebrate recent builds.

**Status:** DOM pilot `/child/pet-home` — **rewrite in Pixi** `worlds/pet-home/`.

---

## 6. Dinosaurie — Dino-dalen

### Build

| Parts | Stage |
|------:|-------|
| 0 | Tom dal |
| 12 | Grävplats |
| 25 | Ben |
| 40 | Skelett |
| 55 | Skylt |
| 70 | Museum |
| 75 | Dino-dalen klart |

### Play

- Dig (scrub/drag soil)
- Brush fossils
- Assemble skeleton (snap pieces)
- Hatch egg
- Read fact signs
- **Not** a "Feed dinosaur" button

---

## 7. Dockhus — Dockhuset

### Build

Room-by-room: floor → walls → rooms → furniture → decor.

### Play

- Drag furniture
- Paint walls
- Move dolls
- Invite guests
- Vacuum/clean (scrub)
- **Not** "Clean room" stat button

---

## 8. Fiske — Båtkajen

### Build

Shore → dock → boat → rod → hammock → fish display.

### Play

- Build/customize rod & boat
- Cast line (throw gesture)
- Reel fish (drag)
- Land catch animation
- **Not** tap-to-catch

---

## 9. Läxor — Läxbordet

### Build

Desk → books → pencils → board → gold stars.

### Play

- Letters, numbers, reading, writing, math — **as play**, not school drill UI
- Tied to `laxor` activities / homework completion in schedule

---

## 10. Vardag — Mitt rum

### Build

Bed → wardrobe → toothbrush corner → breakfast table → star wall.

### Play

Mirrors family's real `activity_template` — making bed, dressing, teeth, breakfast rituals as **interactive play**, not a duplicate checklist.

**Direct link:** `vardag` project ↔ daily schedule activities.

---

## 11. Living world snapshots (all)

On return visit, apply subtle diffs:

| World | Example diff |
|-------|----------------|
| Husdjur | Ball moved, cat on sofa |
| Garage | Lights on, car dusty if long absence |
| Dino | Dino sleeping |
| Fiske | Fish swimming |
| Dockhus | Doll moved to kitchen |
| Läxbord | Book open on desk |
| Vardag | Bed unmade until routine done |

Implement via seeded `world_snapshot` in `customization` JSON.

---

## 12. Rare finds (all)

Catalog entries may have `rarity: common | rare | legendary`.

- Common: chair, bolt, plank
- Rare: golden lamp, turbo kit, crown collar
- Track `found_count / pool_size` for child-facing "1 of 200"

Never block progression on rare drops.

---

## 13. World pack checklist (definition of done)

Per world, before marking live:

- [ ] Build scene 0→75 in Pixi with facit art
- [ ] Part-land animation + guide line
- [ ] Unlock ceremony
- [ ] Play scene ≥ 3 interaction types (drag/scrub/throw/…)
- [ ] Touch-tested 390px width
- [ ] Save/load via API
- [ ] Play gated for live users
- [ ] Preview mode documented
- [ ] Smoke test or manual QA script
- [ ] App Store-quality screenshot

---

## 14. Related documents

| Doc | Content |
|-----|---------|
| [`01_PRODUCT_PRINCIPLES.md`](01_PRODUCT_PRINCIPLES.md) | Dual loop, gates |
| [`02_DESIGN_SYSTEM.md`](02_DESIGN_SYSTEM.md) | Art direction |
| [`03_GAME_ENGINE.md`](03_GAME_ENGINE.md) | Pixi architecture |
| `src/lib/build-progress.js` | Milestone data source |
