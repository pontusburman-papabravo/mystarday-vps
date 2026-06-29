# 02 — Product Principles

**Version:** 1.0  
**Authority:** Subordinate to [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md); implements [01_PRODUCT_VISION.md](./01_PRODUCT_VISION.md)

---

## Purpose

Translate constitution and vision into **decision rules** for product, design, game, and engineering. When two principles conflict, this document defines resolution — then escalate to constitution if still unresolved.

## Scope

All personas (child, parent, pedagog, admin-as-operator). Does not duplicate domain specs in 04–09 — those add detail.

## Definitions

| Term | Definition |
|------|------------|
| **Reality-first** | Real-world routine outcome beats in-app outcome |
| **Configuration debt** | Every setting we ask a parent to manage |
| **Delight budget** | Limited animation/celebration time per session — must not delay next real action |

---

## Core Principle (supreme among principles)

> **The app is not about stars, points, or gamification. It is about improving real life. Gamification only exists to strengthen reality. Reality always wins.**

---

## Child Principles

### What children should think

| Desired thought | Design implication |
|-----------------|-------------------|
| "I want to **build**." | Assembly/customization in world — [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) |
| "I want to **visit my pet**." | Pet room as reward destination — not login reward |
| "I wonder **what changed**." | Gentle discovery after real completions — not push spam |

### What children must never think

| Forbidden thought | Why |
|-------------------|-----|
| "I need **more points**." | Points-first destroys mission — [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) |
| "I must open the app or I lose." | FOMO / streak anxiety — conflicts with calm homes |

### Interaction hierarchy (Target State)

1. **Touch / drag / assemble** — preferred over buttons where feasible
2. **Complete** — one tap on activity when drag not applicable (Current State: tap-first on Today)
3. **Explore** — Skattkammaren after progress
4. **Never configure** — no forms, schedules, or admin patterns in child UI

See [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md).

---

## Parent Principles

### What parents should feel

| Desired feeling | Product mechanism |
|-----------------|-------------------|
| "I **argue less**." | Shared visible routine + child ownership |
| "My child **reminds me**." | Child protagonist loop |
| "This app **actually helps**." | First Success within 48h |

### What parents must never feel

| Forbidden feeling | Why |
|-------------------|-----|
| "My child wants **more screen time**." | Screen time is not the product |
| "I'm doing it wrong." | Violates Constitution Rule 4 |
| "I need a degree to configure this." | Configuration debt |

### Parent UI rules

- **No dashboards** — no enterprise analytics home — [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md)
- **No generic cards** — every card is actionable or affirming
- **Coach over menu** — Journey-led next step
- **Approve, don't micromanage** — stars/redemptions as exceptions, not default mode

---

## Design Principles

| Principle | Standard |
|-----------|----------|
| **Handcrafted feel** | No stock UI; every surface intentional — [03_DESIGN_SYSTEM.md](./03_DESIGN_SYSTEM.md) |
| **Nintendo quality** | Responsive, joyful motion with purpose |
| **Pixar warmth** | Emotional safety; never punitive tone |
| **Apple polish** | Consistent spacing, typography, accessibility baseline |
| **No enterprise UI** | No data tables on parent home |
| **No boring statistics** | Insights only when actionable |

---

## Engineering Principles

Architecture must support **without rewrites**:

| Capability | Requirement |
|------------|-------------|
| iPhone / Android / Web | Capacitor remote WebView + PWA — Current State |
| Offline (child) | IndexedDB cache + write queue — Current State partial |
| Animations | CSS + JS celebrations; future: centralized motion tokens |
| Future multiplayer | Family-scoped data model today; no shared child accounts |
| Future AI | Journey + engine facts layer; LLM in `starter-plan` only today |
| Future content packs | Component/feature flags + library import |
| Future worlds | `universe-engine` + room modules extensible |

Detail: [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md).

---

## AI Development Principles

1. **Reduce ambiguity** — every task links to a POS section
2. **Never assume** — verify in code; SYSTEM_ANALYSIS for Current State
3. **Document decisions** — [14_DECISION_LOG.md](./14_DECISION_LOG.md)
4. **Target State default** — unless task says "hotfix legacy"
5. **No scope creep** — one constitutional rule per PR when possible

See [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md).

---

## Conflict Resolution Matrix

When principles collide, apply **first matching row**:

| Conflict | Winner | Why |
|----------|--------|-----|
| Reality vs gamification | **Reality** | Company mission |
| Child delight vs speed to school | **Speed to school** | Reality |
| Parent insight vs child screen time | **Child screen time** | Parent principle |
| Rule 1 (lead) vs child free exploration | **Lead** until routine established; then exploration | Journey phase dependent |
| Shipping fast vs Rule 4 (uncertainty) | **Rule 4** | Trust compounds |
| SEO growth vs surprise (Rule 2) | **Rule 2** in-app; SEO separate | Product vs marketing boundary |
| Pedagog feature vs core family | **Core family** until First Success metrics hit target | Focus |

Escalate unresolved conflicts to CEO + CPO; log in Decision Log.

---

## Current State vs Target State

| Area | Current State | Target State |
|------|---------------|--------------|
| Child interaction | Tap-to-complete dominant; limited drag/build | Drag/assemble in world; tap-complete on Today acceptable |
| Parent home | Dashboard-like schedule cards + possible triple coach | Single coach; action-oriented cards only |
| Gamification framing | Stars visible; milestone confetti | Stars de-emphasized in copy; celebration tied to routine completion |
| Statistics | Star history chart on dashboard | Actionable weekly story only — no raw charts on home |
| AI in product | Starter plan LLM at onboarding | Journey-aware coaching; bounded AI surfaces |
| Screen time | Not systematically measured or limited | Session-appropriate child UX; no engagement loops |

---

## Rules (numbered for citation)

**P-01** Reality wins over all gamification.  
**P-02** Child is protagonist; parent is helper.  
**P-03** No child-facing dashboards, forms, or admin patterns.  
**P-04** No parent-facing enterprise dashboards or generic stat cards on Hem.  
**P-05** Play is reward, never goal.  
**P-06** Every new setting must justify configuration debt.  
**P-07** Completions beat logins for all retention logic.  
**P-08** One product authority (Journey) for "what's next."  
**P-09** Swedish families first — copy, tone, legal.  
**P-10** Extensibility without rewrites — follow 10_TECH_ARCHITECTURE boundaries.

---

## Examples

### ✅ P-01 compliant

Child finishes brushing teeth → 2-second star animation → next activity highlighted — not "you earned 5 points toward level 7."

### ❌ P-03 violation

Child settings screen with text fields for schedule editing.

### ✅ P-08 path (Target)

`journey-coach.js` only mount on Hem; readiness and engine mounts removed.

---

## Anti-patterns

- "Parents love data" → dashboard proliferation
- "Kids love games" → mini-games without routine gate
- "We'll merge the coaches later" → permanent dual authority
- Optimizing push copy for CTR without Journey Gate

---

## Acceptance Criteria

Feature PR includes:

- [ ] Listed principles (P-01–P-10) satisfied or exception logged in Decision Log
- [ ] Conflict matrix consulted if tradeoffs exist
- [ ] Current vs Target State labeled in PR description

---

## Implementation Guidance

- Coach consolidation tracked as Target State milestone — do not add fourth coach surface.
- New parent metrics require CPO approval and must pass P-04.
- New child animations require game design review against delight budget — [06_GAME_DESIGN.md](./06_GAME_DESIGN.md).

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md) | Supreme rules |
| [01_PRODUCT_VISION.md](./01_PRODUCT_VISION.md) | Mission |
| [03_DESIGN_SYSTEM.md](./03_DESIGN_SYSTEM.md) | Visual execution |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Child detail |
| [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) | Parent detail |
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Play boundary |
| [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md) | Agent rules |

---

## AI Instructions

Apply conflict matrix before proposing solutions. Cite principle IDs (P-01 etc.) in plans. If user request violates P-01 or P-05, refuse and suggest reality-first alternative.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Conflict matrix makes tradeoffs explicit — reduces founder bottleneck |
| **CPO** | Child/parent desired/forbidden thoughts are memorable and testable |
| **CTO** | Engineering extensibility list matches codebase — achievable |
| **Principal Engineer** | P-08 aligns with consolidation work — clear north star |
| **Senior Game Designer** | Delight budget reference prevents celebration arms race |
| **UX Director** | No dashboards rule clear for parent and child |
| **Art Director** | Nintendo/Pixar/Apple triad gives quality bar without pixel specs |
| **QA Director** | P-codes usable in test plans |
| **Security Engineer** | Child data minimization implied — detail in child doc |
| **AI Systems Architect** | Matrix + P-codes machine-citable |

**Approved:** All roles — v1.0.
