# 09 — World Engine

**Version:** 1.0  
**Authority:** Child universe / Skattkammaren world simulation — play as reward

---

## Purpose

Define how the **world** (rooms, themes, pet, avatar, achievements) evolves in response to **real** child behavior — the engine behind "I want to visit my pet."

## Scope

`src/lib/universe-engine.js`, `src/routes/child-universe.js`, `db/child-universe.js`, client room modules (`child-skatt-house.js`, `child-pet.js`, etc.).

## Definitions

| Term | Definition |
|------|------------|
| **Universe** | Per-child persistent world state |
| **Room** | Skattkammaren area (chest, pet, museum, …) |
| **Theme** | Visual skin: castle, treehouse, space |
| **Unlock rule** | JSON rule evaluated against stats |
| **syncUnlocks** | Server function applying new unlocks |

---

## North Star

The world **changes because life changed** — not because the child grinded app logins.

---

## Current State (verified)

### Server (`universe-engine.js`)

**Room unlock thresholds (lifetime stars):**

| Stars | Rooms |
|------:|-------|
| 0 | chest, dreams, shop |
| 10 | trophy, shelf |
| 15 | avatar |
| 30 | story, collections |
| 50 | pet |
| 100 | museum |

**Themes:**

| Theme | Min lifetime stars |
|-------|-------------------:|
| castle | 0 |
| treehouse | 75 |
| space | 150 |

**Rule types:** `first_completion`, `completions`, `redemptions`, `lifetime_stars`, `streak`

**Flow:** `getUniverseState()` → `syncUnlocks()` merges rooms/themes into `house_config` JSONB.

### API (`child-universe.js`)

GET/PATCH `/api/me/universe` — avatar, house, pet, collectibles.

### Client

`child-universe-client.js`, `child-skatt-house.js` (10 rooms UI), `child-layer-router.js` hash `universe` → rewards tab.

### Feature gate

`skattkammar_universum` → `basic_app` component — `config/component-feature-map.js`.

### Tests

**None dedicated** — SYSTEM_ANALYSIS gap.

---

## Target State

| Area | Target |
|------|--------|
| **Tests** | Golden tests for `evaluateRule()` and threshold edges |
| **Adaptive thresholds** | Optional cohort tuning — not one-size for all ages |
| **Discovery UX** | Subtle "something unlocked" when entering world after completion |
| **Content packs** | New rooms via DB + module plug-in — no monolith edit |
| **Multiplayer** | Family sees each child's world separately — no shared world yet |
| **AI** | Narrative flavor text from Journey phase — bounded |
| **Invalidation** | Keep `ChildUniverse.invalidate()` on completion bus |

---

## World Design Rules

**W-01** Unlocks tied to `evaluateRule` types — no hardcoded client-only unlocks.  
**W-02** Pet room requires sustained engagement (50 stars) — not day one.  
**W-03** Themes are cosmetic — no gameplay advantage.  
**W-04** Achievements/collectibles defined in DB — admin manages definitions.  
**W-05** No paid room skips.  
**W-06** World state survives offline read — server wins on sync conflict.  
**W-07** Museum is late-game — preserves long-term retention without early overwhelm.

---

## Room Narrative (product fiction)

| Room | Child fantasy |
|------|---------------|
| chest | My treasures from stars |
| dreams | What I'm working toward |
| shop | Redeem treats |
| pet | My companion who grows with me |
| museum | Memories of wins |

Copy in Swedish — warm, never competitive.

---

## Examples

### ✅ Good unlock

Child completes first ever activity → `first_completion` → collectible appears in chest.

### ❌ Bad unlock

Daily login → pet food.

---

## Anti-patterns

- Client-side only unlock (bypass API)
- Room that requires IAP stars
- World state that shames incomplete routine

---

## Acceptance Criteria

World change complete when:

- [ ] W-01–W-07 pass
- [ ] Unit tests for changed rules
- [ ] Child world renders on iOS/Android WebView
- [ ] Lifetime stars consistent with reward system — [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md)

---

## Implementation Guidance

Edit thresholds in `ROOM_UNLOCKS` / `THEME_UNLOCKS` only with game design + Decision Log entry.

New room: add to engine array + `child-*` renderer + admin achievement defs if needed.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Motivation |
| [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) | Lifetime stars |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Min värld |
| [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md) | Extensibility |

---

## AI Instructions

Never add unlock logic only in client JS. Run sync through universe-engine.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Long-term retention via museum — aligned with scale goal |
| **CPO** | Room fiction table helps copy consistency |
| **CTO** | Test gap flagged — priority quick win |
| **Principal Engineer** | Server-authoritative unlocks correct |
| **Senior Game Designer** | Threshold table documented from code — accurate |
| **UX Director** | Discovery UX marked Target |
| **Art Director** | Three themes — art pipeline needed |
| **QA Director** | Demands tests before threshold changes |
| **Security Engineer** | PATCH universe scoped to child JWT |
| **AI Systems Architect** | Rule types enumerable — good for agents |

**Approved:** All roles — v1.0.
