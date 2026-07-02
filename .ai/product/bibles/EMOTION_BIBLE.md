# Emotion Bible — How Each Feeling Is Built

**Version:** 0.1 (skeleton)  
**Status:** Skeleton — unique cross-cutting vocabulary  
**Priority:** ⭐⭐⭐⭐⭐ (parallel refinement after World Bible #1)  
**Authority:** Subordinate to PCB (five feelings filter), Art Bible (craft), LWES Part VI (runtime enum)  
**Map:** [DOCUMENTATION_MAP.md](../DOCUMENTATION_MAP.md)  

---

## Purpose

The Emotion Bible defines **how feelings are constructed** in Min värld — not as adjectives in copy, but as **bundles of light, form, motion, material, sound, and affordance**.

An illustrator, animator, or AI agent MUST be able to produce a scene that *feels* trygg without guessing.

Cross-ref: PCB five feelings filter · LWES Appendix H emotion enum · Part VI §77–90 · [WORLD_BIBLE.md](./WORLD_BIBLE.md) emotional geography

---

## Two emotion systems (do not conflate)

| System | Layer | Values |
|--------|-------|--------|
| **Five Feelings filter** (PCB / Appendix J) | Content gate — *should this exist?* | capability · ownership · comfort · curiosity · imagination |
| **Emotion enum** (LWES Appendix H.1) | Runtime intent — *what one feeling does this beat create?* | pride · wonder · calm · comfort · curiosity · belonging · surprise · achievement · safety |

This bible maps **Swedish child-facing feel words** → both systems → **production levers**.

---

## Feel vocabulary — production bundles

Each feel is built from levers. Not every lever required — but removing all levers removes the feel.

| Lever | Examples |
|-------|----------|
| Light | Warm/cool, soft/hard, direction, flicker |
| Form | Round/sharp, scale, density |
| Motion | Speed, easing, amplitude |
| Material | Wood, textile, ceramic, glass |
| Sound | Layer density, reverb, rhythm |
| Affordance | Open/closed, reachable/hidden |
| NPC/pet | Presence, state, distance |

---

## 1. Trygghet (*"Det känns tryggt."*)

**Maps to:** Five Feelings → **comfort** · Runtime → **safety**, **calm**, **comfort**

| Lever | Specification |
|-------|---------------|
| Light | Warm, low contrast, golden morning or lamp glow — no harsh overhead |
| Form  | Soft forms — rounded furniture, plush edges |
| Motion | Slow ambient — curtain drift, pet breathing, clock tick |
| Material | Wood, wool, ceramic, woven textile |
| Sound | Muffled exterior (rain on window), floor creak soft, distant clock |
| Affordance | Enclosed but not cramped — visible exit, no trap corners |
| Pet/NPC | Sleeping pet, gentle idle — never startled |

**Examples:** Rain on window · sleeping pet in basket · fire glow (safe, enclosed) · coat hooks with familiar items · hall rug underfoot

**Anti-patterns:** Flashing UI · sudden loud SFX · guilt copy · dark corners without light source

---

## 2. Nyfikenhet (*"Vad är det?"*)

**Maps to:** Five Feelings → **curiosity** · Runtime → **curiosity**, **wonder**

| Lever | Specification |
|-------|---------------|
| Light | Partial mystery — half-shadow, light spill under door |
| Form | Half-open doors, paths that bend, objects partially occluded |
| Motion | Small movement at edge of vision — bird hop, flag flutter |
| Material | Paper, string, packaging, footprints in dust/snow |
| Sound | Small sounds — letter slide, bird, distant knock |
| Affordance | Half-open doors · visible but unreachable (until unlock) · trails |
| Story | Unanswered question — no quest log exposition |

**Examples:** Birds outside window · footprints · package by door · letter in mailbox · shadow under furniture · path disappearing behind tree

**Anti-patterns:** Tooltip explaining mystery · forced tap sequence · countdown timer

---

## 3. Mysigt

**Maps to:** Five Feelings → **comfort**, **imagination** · Runtime → **calm**, **comfort**, **belonging**

| Lever | Specification |
|-------|---------------|
| Light | Small warm pools — lamp, string lights, screen glow (gentle) |
| Form | Enclosed scale — child-sized nook, blanket fort affordance |
| Motion | Very slow — steam, candle flicker (safe), page turn |
| Material | Knit, blanket, mug, book, cushion |
| Sound | Low room tone, fabric rustle, soft music stem |
| Affordance | Sit/lie affordances · hide partially · co-presence (pet nearby) |

**Examples:** Reading corner · blanket on chair · warm drink steam · low lamp · evening window with stars

---

## 4. Magiskt

**Maps to:** Five Feelings → **imagination** · Runtime → **wonder**, **surprise**

| Lever | Specification |
|-------|---------------|
| Light | Single accent glow — not entire scene neon |
| Form | Unexpected scale or shimmer on ordinary object |
| Motion | Slow reveal — not explosive particle spam |
| Material | Glass, crystal, starlight, bioluminescent (fantasy themes) |
| Sound | Soft chime, breath, space — one accent |
| Affordance | Discovery beat — child finds, not told |

**Examples:** First snow sparkle · hidden fairy door (theme) · star path · object that wasn't there yesterday (story seed)

**Anti-patterns:** Casino sparkle · loot explosion · always-on magic particles

---

## 5. Lugnt

**Maps to:** Five Feelings → **comfort** · Runtime → **calm**, **safety**

| Lever | Specification |
|-------|---------------|
| Light | Even, desaturated slightly, no strobing |
| Form | Horizontal lines, open breathing room |
| Motion | Minimal — Director calmness ≥ 75 |
| Sound | Silence allowed · single nature layer |
| Interaction | Ends in calm (LWES §80.1) — every beat |

**Examples:** Bedroom before sleep · swing still · rain-only ambient · post-celebration settle

---

## 6. Varmt

**Maps to:** Five Feelings → **comfort**, **ownership** · Runtime → **comfort**, **belonging**

| Lever | Specification |
|-------|---------------|
| Light | Amber/walnut tones, sunset, fireside |
| Material | Wood grain, honey light, baked goods (kitchen) |
| Sound | Home sounds — kettle, distant voice (ambient only) |
| Social fiction | Kitchen table set · two mugs · child's drawing on fridge |

**Distinct from trygghet:** Varmt emphasises **relationship and hearth**; trygghet emphasises **safety and shelter**.

---

## 7. Personligt

**Maps to:** Five Feelings → **ownership** · Runtime → **belonging**, **pride**

| Lever | Specification |
|-------|---------------|
| Objects | Named/placed items from child actions |
| Build slots | Visible customisation — chair they placed |
| NPC | Pet with child's chosen name |
| Memory | Trophy, drawing, photo — fiction-safe |

**Examples:** Build slot filled · child's emoji on hook · pet collar · height mark on doorframe (subtle)

---

## 8. "Mitt" (*"Det här är mitt."*)

**Maps to:** Five Feelings → **ownership** (supreme) · Runtime → **belonging**, **pride**

| Lever | Specification |
|-------|---------------|
| Layout | Consistent "their" corners — same hook, same bed |
| Persistence and build persistence | LWES Rule 3 — world remembers |
| Copy | Never "your account" — always place fiction |
| Entry ritual | Home effect — exhale on return (LWES §119.3) |

**Test:** Child can describe *where their things live* without UI labels.

---

## Mapping table — feel word → systems

| Feel (SV) | Five Feelings | Appendix H enum | Primary scenes |
|-----------|---------------|-------------------|----------------|
| Trygghet | comfort | safety, calm, comfort | home_hall, bedroom |
| Nyfikenhet | curiosity | curiosity, wonder | garden, path junctions |
| Mysigt | comfort, imagination | calm, comfort, belonging | bedroom, reading nook |
| Magiskt | imagination | wonder, surprise | garden night, fantasy theme |
| Lugnt | comfort | calm, safety | bedroom, swing |
| Varmt | comfort, ownership | comfort, belonging | kitchen, hall evening |
| Personligt | ownership | belonging, pride | any with build slots |
| Mitt | ownership | belonging, pride | home anchor scenes |

---

## Per-scene feel recipe (template)

```yaml
feel_recipe:
  scene_id: string
  primary_feel_sv: trygghet | nyfikenhet | mysigt | magiskt | lugnt | varmt | personligt | mitt
  five_feelings: []
  emotion_intent: enum          # Appendix H.1 — one primary per beat
  levers:
    light: string
    forms: string
    motion: string
    materials: []
    sounds: []
    affordances: []
  anti_patterns: []
  lwes_calmness_target: number
  reference_entities: []        # Entity Bible ids
```

---

## Example — `home_hall` feel recipe

```yaml
feel_recipe:
  scene_id: home_hall
  primary_feel_sv: trygghet
  five_feelings: [comfort, ownership, curiosity]
  emotion_intent: safety
  levers:
    light: Warm morning side-window, soft fill, no harsh shadow
    forms: Rounded bench, soft rug, low horizon for child scale
    motion: Curtain slow drift, pet sleep breathing, clock tick
    materials: [wood_floor, wool_rug, ceramic_mug, woven_coat_hook]
    sounds: [rain_optional, floor_soft, distant_bird_low]
    affordances: [mailbox_half_story, door_tease_garden, coat_hook_personal]
  anti_patterns: [achievement_toast_on_entry, streak_ui, popup_tutorial]
  lwes_calmness_target: 80
  reference_entities: [mailbox_1, pet_basket_1, door_garden, rug_build_slot_1]
```

---

## Definition of Done (per feel × scene)

- [ ] Mapped to Five Feelings + Appendix H enum  
- [ ] ≥3 levers specified with concrete assets  
- [ ] Anti-patterns listed  
- [ ] World Bible scene cross-ref  
- [ ] Art Bible motion/light caps respected  
- [ ] Child test: one-word feel match (team observation)  

---

**Cross-ref:** [WORLD_BIBLE.md](./WORLD_BIBLE.md) §13 · LWES Appendix H · Appendix J · [ART_BIBLE.md](../ART_BIBLE.md)
