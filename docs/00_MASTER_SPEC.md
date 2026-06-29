# Min Stjärndag — Master Specification <!-- pragma: allowlist secret -->

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Living Document |
| **Priority** | Highest |

This document is the **highest authority** in the entire project.

If any other specification, document, prompt or implementation conflicts with this document, **this document always wins**.

---

## 1. Vision

Min Stjärndag exists to make everyday life calmer, clearer and more motivating for families. <!-- pragma: allowlist secret -->

We are not building a game.

We are not building a task manager.

We are not building a reward app.

We are building the world's best companion for children's everyday routines.

Everything else is secondary.

---

## 2. Mission

Help children become more independent.

Reduce conflicts at home.

Reduce reminders.

Reduce stress.

Increase confidence.

Increase motivation.

Make everyday routines something children are proud of completing.

---

## 3. The North Star

Every design decision must improve at least one of these:

- Child motivation
- Parent trust
- Simplicity
- Emotional reward
- Visual quality

If it improves **none** of these, it should not be built.

---

## 4. Product Philosophy

Children should never feel punished.

Children should never feel manipulated.

Children should never feel they failed.

The product should always reward effort.

Never shame.

Never guilt.

Never remove earned progress.

---

## 5. Core Loop

The real world always comes first.

```
Reality
  ↓
Daily routine
  ↓
Activity completed
  ↓
Reward
  ↓
Positive emotion
  ↓
Repeat tomorrow
```

The digital experience must always reinforce the real-world behaviour.

It must **never** replace it.

---

## 6. Dual Reward System

Every completed activity creates **TWO** rewards.

### Reward A — Stars

**Purpose:** Parent-controlled rewards.

**Examples:** Movie night, ice cream, book, extra Minecraft, extra bedtime story.

### Reward B — Build Parts

**Purpose:** Child motivation.

The child should think: *"I built something."*

Not: *"I got points."*

**Stars are for parents. Build Parts are for children.**

Both systems are equally important.

Neither replaces the other.

See [`01_PRODUCT_PRINCIPLES.md`](01_PRODUCT_PRINCIPLES.md) for implementation detail.

---

## 7. What We Are Building

We are building **memories**.

Not features.

Children should remember:

- "My dog."
- "My garage."
- "My dinosaur."
- "My room."

Not:

- "My progress bar."

---

## 8. Emotional Design

Every interaction should create emotion.

**Examples:** Joy, curiosity, pride, wonder, ownership, surprise, calm, safety.

If an interaction creates **no emotion** it should be redesigned.

---

## 9. Product Hierarchy

```
Reality
  ↓
Routine
  ↓
Motivation
  ↓
Building
  ↓
Unlock
  ↓
Play
```

**Never reverse this order.**

Play is a reward.

Never the objective.

---

## 10. Child Psychology

Children do not optimise.

Children explore.

Children collect.

Children decorate.

Children build.

Children imagine.

Design for those behaviours.

Never design around statistics.

---

## 11. Parent Psychology

Parents are the customer.

Children are the user.

Every feature must satisfy **BOTH**.

Parents should think: *"This makes mornings easier."*

Children should think: *"I want to log in."*

Both must happen simultaneously.

---

## 12. Design Philosophy

The product should feel:

Warm · Premium · Playful · Safe · Magical

**Never:**

Corporate · Administrative · Technical · Generic · Cheap

See [`02_DESIGN_SYSTEM.md`](02_DESIGN_SYSTEM.md).

---

## 13. World Philosophy

Every world is someone's favourite.

Garage is not "the car world". It is **THE garage**.

Pet Home is not "the pet world". It is **MY pet home**.

Every world must feel alive.

Every world must feel personal.

See [`04_WORLD_DESIGN.md`](04_WORLD_DESIGN.md).

---

## 14. Quality Philosophy

Good enough is never good enough.

Working is not enough.

Beautiful is required.

Responsive is required.

Delight is required.

If a feature works but feels boring it is **unfinished**.

---

## 15. Visual Quality Target

Every screen should be good enough to appear in:

- App Store
- Google Play
- Marketing website
- Press kit

…without needing redesign.

---

## 16. Coding Philosophy

Readable code beats clever code.

Simple architecture beats smart architecture.

Maintainability beats micro-optimisation.

Never sacrifice UX to reduce code.

Never sacrifice design to save time.

---

## 17. AI Constitution

Every AI working on this project must follow these laws.

| Law | Rule |
|-----|------|
| **1** | Never optimise for writing less code. Optimise for a better product. |
| **2** | Never build dashboards for children. |
| **3** | Never use placeholder graphics if proper assets can reasonably be created. |
| **4** | Never replace interaction with buttons. |
| **5** | Never implement features without understanding why they exist. |
| **6** | Never mark work as complete without verification. |
| **7** | Never ignore visual quality. |
| **8** | Always prefer emotional value over technical elegance. |
| **9** | If two solutions exist: choose the one that creates the better child experience. |
| **10** | When uncertain: **STOP.** Do not guess. Explain the uncertainty. Propose options. Wait. |

See [`05_AI_DEVELOPER_GUIDE.md`](05_AI_DEVELOPER_GUIDE.md).

---

## 18. Decision Framework

When making decisions always evaluate in this order:

1. Does it improve the child's experience?
2. Does it improve the parent's experience?
3. Does it improve visual quality?
4. Does it improve maintainability?
5. Does it improve performance?
6. Does it reduce complexity?
7. Does it reduce code?

**Reducing code is the least important objective.**

---

## 19. Definition of Amazing

Amazing means:

- Children smile.
- Parents relax.
- The product feels premium.
- The product feels alive.
- Animations feel natural.
- Interactions feel satisfying.
- Nothing feels unfinished.
- Nothing feels generic.
- Nothing feels copied.

Amazing is not subjective.

If the feature would not impress a family seeing it for the first time, it is **not amazing**.

---

## 20. Definition of Done

A feature is **DONE** only when:

- [ ] Product goal achieved
- [ ] UX approved
- [ ] Mobile tested
- [ ] Tablet tested
- [ ] Performance acceptable
- [ ] No console errors
- [ ] No visual glitches
- [ ] Accessibility verified
- [ ] Tests pass
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] AI self-review completed
- [ ] Screenshots taken
- [ ] The feature matches this Master Specification

Otherwise: the feature is still in development.

---

## Final Principle

Min Stjärndag is not trying to become the biggest children's game. <!-- pragma: allowlist secret -->

It is trying to become the world's most loved everyday companion for children and families.

Every single decision must move the product towards that goal.

---

## Document map

| Doc | Purpose |
|-----|---------|
| [`00_MASTER_SPEC.md`](00_MASTER_SPEC.md) | Vision, laws, decision framework (this file) |
| [`01_PRODUCT_PRINCIPLES.md`](01_PRODUCT_PRINCIPLES.md) | How the product works — loops, gates, psychology |
| [`02_DESIGN_SYSTEM.md`](02_DESIGN_SYSTEM.md) | Visual language, assets, quality bar |
| [`03_GAME_ENGINE.md`](03_GAME_ENGINE.md) | PixiJS runtime, BuildEngine, architecture |
| [`04_WORLD_DESIGN.md`](04_WORLD_DESIGN.md) | All 7 worlds — build + play |
| [`05_AI_DEVELOPER_GUIDE.md`](05_AI_DEVELOPER_GUIDE.md) | How Cursor/agents work on this repo |

Legacy technical docs (subordinate to this suite):

- [`build-mode-spec.md`](build-mode-spec.md) — BUILD MODE detail index
- [`build-loop-mvp.md`](build-loop-mvp.md) — API/migrations MVP
- [`build-play-worlds-spec.md`](build-play-worlds-spec.md) — Play-world checklist
