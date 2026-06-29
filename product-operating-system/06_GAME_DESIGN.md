# 06 — Game Design

**Version:** 1.0  
**Authority:** Play, motivation, and celebration design — subordinate to Reality Wins ([02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) P-01)

---

## Purpose

Define **how** Stjärndag motivates children without becoming a points game — Nintendo-quality delight in service of real routines.

## Scope

Motivation loops, celebrations, progression framing, session design. Economy numbers live in [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) and [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md).

## Definitions

| Term | Definition |
|------|------------|
| **Intrinsic loop** | Child wants to complete routine for real-world outcome |
| **Extrinsic layer** | Stars, rooms, pet — reinforce intrinsic |
| **Delight budget** | ~2 seconds max celebration before next action |
| **Progress fiction** | Narrative wrapper (Skattkammaren) — not separate game |

---

## Game Design North Star

> **Play is the reward. Reality is the goal.**

The app is **not** a game that happens to have routines — it is a **routine product** with game-quality presentation.

Children should **never** optimize for points at the expense of brushing teeth.

---

## Motivation Stack (Target State)

```
Layer 4: Discovery     — "What changed in my world?"
Layer 3: Identity      — "This is MY pet / MY room"
Layer 2: Progress      — "I'm getting through my day"
Layer 1: Reality       — "Morning works better"
```

All layers must connect to **Layer 1**. If Layer 4 doesn't require Layer 1 progress, reject the feature.

---

## Current State (verified)

| Mechanism | Location | Assessment |
|-----------|----------|------------|
| Star on completion | daily-log pipeline | Core extrinsic — OK if de-emphasized in copy |
| Milestone 25/50/75% | `child-dashboard-celebrations.js` | Good — tied to daily routine |
| Confetti | celebrations + duplicate in child-dashboard | Consolidate |
| Room unlocks | `universe-engine.js` lifetime stars | OK — long horizon |
| Achievements/collectibles | DB-driven rules | Untested — risk |
| Streak | `streak-updater.js` midnight | **Risk:** FOMO if surfaced aggressively |
| Pet | `child-pet.js` | Good reward destination |
| Pending redemption banner | `child-rewards-engine.js` | Links to real treat |

---

## Target State

| Mechanism | Target behavior |
|-----------|-----------------|
| **Celebrations** | Single module; `prefers-reduced-motion` support |
| **Copy** | "Du klarade det!" > "Du fick 3 stjärnor" |
| **Streak** | Private gentle badge — never guilt copy |
| **Unlock pacing** | Early rooms fast (0–10 stars); museum late (100) — tune for 200-family cohort |
| **No grind** | No repeatable meaningless actions for stars |
| **Session end** | After routine complete, world exploration OK — no infinite loop |
| **Adaptive difficulty** | Consider lowering thresholds for low-activity children (Decision Log future) |

---

## Rules

**G-01** No mechanic that rewards opening app without completion.  
**G-02** No sibling leaderboards or comparisons.  
**G-03** No random loot boxes.  
**G-04** Celebrations ≤ delight budget.  
**G-05** Every unlock rule must map to `evaluateRule()` type tied to real behavior — [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md).  
**G-06** No pay-to-win — IAP unlocks features, not stars.  
**G-07** Pedagog/educator gamification forbidden on child UI.  
**G-08** New mini-games require CEO + Game Director approval.

---

## Celebration Design

| Event | Current | Target |
|-------|---------|--------|
| Activity complete | Star + optional rating | Brief haptic + checkmark + optional 1s burst |
| Daily milestone | Confetti at 25/50/75% | Same; reduced motion fallback |
| Room unlock | Server sync | In-world reveal animation when child enters |
| Redemption approved | Banner | Child sees treat acknowledgment — link to real world |

**Anti-pattern:** Full-screen 5s animation blocking "next activity."

---

## Examples

### ✅ Good game design

After completing all morning tasks: "Morgonen klar! Kolla om något hänt i Skattkammaren" — optional, skippable.

### ❌ Bad game design

Daily login bonus star.

---

## Anti-patterns

- Points shop for cosmetic-only items with no routine gate
- "Streak broken!" shame messages
- Achievement pop-ups during time-sensitive school prep
- Variable ratio rewards (casino psychology)

---

## Acceptance Criteria

Game feature approved when:

- [ ] Layer 1 connection documented
- [ ] G-01–G-08 pass
- [ ] Delight budget measured in ms
- [ ] Tested with `prefers-reduced-motion: reduce`
- [ ] Senior Game Designer sign-off in PR (human)

---

## Implementation Guidance

Extend `child-dashboard-celebrations.js` — do not add parallel celebration systems.

Universe rules: edit via admin achievement definitions + `universe-engine.js` — always add tests when changing thresholds (Target — currently gap).

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Surfaces |
| [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) | Economy |
| [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) | Unlocks |
| [03_DESIGN_SYSTEM.md](./03_DESIGN_SYSTEM.md) | Motion |

---

## AI Instructions

Reject features that increase "time in app" without completion correlation. Cite G-rules in review.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Layer stack prevents casino drift |
| **CPO** | Copy guidance supports mission |
| **CTO** | Points to existing modules — no fantasy systems |
| **Principal Engineer** | Test gap on universe rules flagged |
| **Senior Game Designer** | Streak FOMO risk correctly flagged |
| **UX Director** | Skippable exploration — good |
| **Art Director** | Room reveal — art opportunity |
| **QA Director** | Reduced motion in acceptance |
| **Security Engineer** | N/A |
| **AI Systems Architect** | G-rules citable |

**Approved:** All roles — v1.0.
