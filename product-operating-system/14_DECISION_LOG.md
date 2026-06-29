# 14 — Decision Log

**Version:** 1.0  
**Authority:** Record of architectural and product decisions — append-only

---

## Purpose

Capture **why** decisions were made, **what** they require, and **consequences** — so future teams and AI agents do not re-litigate settled questions.

## Scope

Product, architecture, and process decisions from POS v1.0 forward. Incorporates verified ADRs from repo history.

## Format

Each entry:

| Field | Content |
|-------|---------|
| **ID** | ADR-NNN |
| **Date** | ISO date |
| **Status** | Accepted / Superseded / Proposed |
| **Decision** | What we decided |
| **Motivation** | Why |
| **Consequences** | Positive, negative, actions required |
| **POS links** | Related documents |

---

## ADR-001 — Family Journey as sole product authority

| Field | Value |
|-------|-------|
| **Date** | 2026-06-29 |
| **Status** | Accepted |
| **Decision** | **Family Journey** (`src/lib/journey/`) is the only authoritative source for lifecycle state and "what's next." **Journey Gate** (`communication-gate.js`) is the only authority for outbound communications. |
| **Motivation** | SYSTEM_ANALYSIS identified three overlapping coach systems and 14 schedulers with duplicate segmentation. Retention ADR (`docs/retention-migration-plan.md`) measured win-back at 0% effect. Completions beat logins as success signal. |
| **Consequences** | (+) Single coach on Hem; clearer AI agent rules. (−) Migration work: retire readiness UI, sunset Product Engine after shadow parity, wire schedulers to Gate. **Actions:** Enable journey flags in waves; remove `#engineCoachMount` and readiness mount in Target; no new coach surfaces (PA-01). |
| **POS links** | [00](./00_PROJECT_CONSTITUTION.md), [05](./05_PARENT_EXPERIENCE.md), [10](./10_TECH_ARCHITECTURE.md) |

---

## ADR-002 — Reality wins over gamification

| Field | Value |
|-------|-------|
| **Date** | 2026-06-29 |
| **Status** | Accepted |
| **Decision** | Stars, streaks, and universe unlocks are **proxies** for real routine success. No feature may optimize engagement at the expense of real-world outcomes. |
| **Motivation** | Company mission: calmer mornings, fewer conflicts. Product data: >80% drop before felt value. Points-first UX violates long-term brand for EU scale. |
| **Consequences** | (+) Coherent child/parent principles. (−) May reduce short-term DAU. **Actions:** De-emphasize star copy (Target); no login bonuses; G-01 enforced. |
| **POS links** | [01](./01_PRODUCT_VISION.md), [02](./02_PRODUCT_PRINCIPLES.md), [06](./06_GAME_DESIGN.md), [07](./07_REWARD_SYSTEM.md) |

---

## ADR-003 — Child protagonist, parent helper

| Field | Value |
|-------|-------|
| **Date** | 2026-06-29 |
| **Status** | Accepted |
| **Decision** | Design primary loop for **child action**; parent UI supports, approves, and configures — not the reverse. |
| **Motivation** | First Success v2 shift; child completion is retention north star per retention ADR. |
| **Consequences** | (+) Child worlds investment justified. (−) Parent dashboard stats deprioritized. **Actions:** C-03 one primary action; remove star chart from Hem (Target). |
| **POS links** | [04](./04_CHILD_EXPERIENCE.md), [05](./05_PARENT_EXPERIENCE.md) |

---

## ADR-004 — Build System = Bibliotek + Schedule (no separate Build Mode)

| Field | Value |
|-------|-------|
| **Date** | 2026-06-29 |
| **Status** | Accepted |
| **Decision** | Name and govern content construction as **Build System** mapped to `library.*` and `schedule.*` — do **not** create a separate "Build Mode" feature or route. |
| **Motivation** | SYSTEM_ANALYSIS §9: zero codebase matches for build mode. Avoid duplicate systems and AI agent confusion. |
| **Consequences** | (+) Clear ownership. (−) Mission language "build" must map to library/world docs explicitly. **Actions:** AI agents extend library modules (B-08). |
| **POS links** | [08](./08_BUILD_SYSTEM.md), [11](./11_AI_DEVELOPER_GUIDE.md) |

---

## ADR-005 — Per-component paywall (no global subscription middleware)

| Field | Value |
|-------|-------|
| **Date** | 2026-06-23 (refactor Fas 5) — **ratified in POS 2026-06-29** |
| **Status** | Accepted |
| **Decision** | Subscription gating via `requireComponent()` on specific routes — **not** global `requireActiveSubscription` in `app.js`. |
| **Motivation** | Lifetime-free founders, component packaging (pedagog, reporting), clearer 402/403 semantics. Verified by `paywall-model-contract.test.js`. |
| **Consequences** | (+) Flexible packaging. (−) Client must call `/api/subscription/access` for UI. **Actions:** Never re-add global middleware; promote paywall test to gate. |
| **POS links** | [10](./10_TECH_ARCHITECTURE.md), [12](./12_QA_SYSTEM.md) |

---

## ADR-006 — RevenueCat IAP only (Stripe removed)

| Field | Value |
|-------|-------|
| **Date** | 2026-06-23 |
| **Status** | Accepted |
| **Decision** | Native IAP via RevenueCat webhook; **no web checkout**. Stripe columns dropped. |
| **Motivation** | App Store / Play billing compliance; simplified stack. |
| **Consequences** | (+) Single payment path on mobile. (−) Post-founder web users cannot pay on web — **open product gap**. **Actions:** OQ-001 tracking; IAP webhook tests (Target). |
| **POS links** | [01](./01_PRODUCT_VISION.md), [10](./10_TECH_ARCHITECTURE.md) |

---

## ADR-007 — Capacitor remote WebView

| Field | Value |
|-------|-------|
| **Date** | Pre-POS (verified in capacitor.config.ts) |
| **Status** | Accepted |
| **Decision** | Native apps load **live site URL** (`capacitor.config.ts`, AGENTS.md) — web deploy updates all platforms for UI. |
| **Motivation** | Single codebase; fast iteration. |
| **Consequences** | (+) No duplicate releases for copy/CSS. (−) Native offline limited; network required. (−) App review depends on live site stability. **Actions:** REL-05 mobile QA on web deploy. |
| **POS links** | [10](./10_TECH_ARCHITECTURE.md), [04](./04_CHILD_EXPERIENCE.md) |

---

## ADR-008 — POS supersedes legacy docs

| Field | Value |
|-------|-------|
| **Date** | 2026-06-29 |
| **Status** | Accepted |
| **Decision** | `/product-operating-system/` is **normative**. On conflict, POS beats `docs/*`, `CLAUDE.md`, `docs/PRODUCT-CONSTITUTION.md`. `SYSTEM_ANALYSIS.md` is evidence for Current State only. |
| **Motivation** | Documentation drift documented in SYSTEM_ANALYSIS Appendix B (14 contradictions). |
| **Consequences** | (+) Single source of truth for AI. (−) Legacy docs need archival banners. **Actions:** Update CLAUDE.md pointers; archive old constitution. |
| **POS links** | [00](./00_PROJECT_CONSTITUTION.md), [11](./11_AI_DEVELOPER_GUIDE.md) |

---

## ADR-009 — Win-back v1 deprecated

| Field | Value |
|-------|-------|
| **Date** | 2026-06-29 |
| **Status** | Accepted |
| **Decision** | Win-back email scheduler **not started** in server; do not re-enable without new experiment + Gate. Measured 0% effect. |
| **Motivation** | `docs/retention-migration-plan.md` ADR. |
| **Consequences** | (+) Less email noise. (−) Need Journey-based re-engagement. **Actions:** `WIN_BACK_ENABLED` stays false; use Gate. |
| **POS links** | [05](./05_PARENT_EXPERIENCE.md), [10](./10_TECH_ARCHITECTURE.md) |

---

## ADR-010 — Activation Program sunset path

| Field | Value |
|-------|-------|
| **Date** | 2026-06-29 |
| **Status** | Accepted (sunset planned, not yet executed) |
| **Decision** | 7-day Activation Program will sunset when Journey Fas 4 flags complete — no dual retention programs (retention ADR rule 6). |
| **Motivation** | Parallel systems confuse users and AI agents; AP heavily tested but contradicts Journey authority. |
| **Consequences** | (+) Single retention brain. (−) Lose AP experiment isolation. **Actions:** Follow `family-journey-fas2-5-roadmap.md` Fas 4; do not expand AP. |
| **POS links** | [01](./01_PRODUCT_VISION.md), [14](./14_DECISION_LOG.md) |

---

## Open Questions (not decided)

| ID | Question | Owner | Blocks |
|----|----------|-------|--------|
| **OQ-001** | Web monetization for families beyond founder limit (#225)? | CEO | Revenue EU scale |
| **OQ-002** | When to enable Journey prod wave 1? | CPO + Ops | Target State UX |
| **OQ-003** | Retire Product Engine entirely or keep shadow forever? | CTO | Engine code removal |
| **OQ-004** | Adaptive universe thresholds by age cohort? | Game Director | W-engine tuning |
| **OQ-005** | Redis / multi-instance — at what family count? | CTO | REL scale |
| **OQ-006** | `onboarding_completed` vs Engine `coreState` conflict | CPO | Coach copy |

---

## Superseded Decisions

| ID | Superseded by | Note |
|----|---------------|------|
| `docs/PRODUCT-CONSTITUTION.md` alone | POS 00 | Archive with pointer |
| Global paywall middleware | ADR-005 | Removed from app.js |
| Stripe billing | ADR-006 | See ARKIVERAT-STRIPE |
| Render hosting (CLAUDE.md) | VPS deploy docs | Infrastructure |

---

## How to Add a Decision

1. Propose in PR with **ADR-NNN** draft
2. Require approval from domain owner (CPO product, CTO tech)
3. Append to this file — never edit old entries except Status→Superseded
4. Cross-link affected POS docs

---

## Cross References

| Document | Relationship |
|----------|--------------|
| All POS | Linked from each ADR |
| [../SYSTEM_ANALYSIS.md](../SYSTEM_ANALYSIS.md) | Evidence base |
| `docs/retention-migration-plan.md` | Source for ADR-001, 009, 010 |

---

## AI Instructions

Before architectural changes: grep this file for related ADR. If conflict, escalate — do not silently override Accepted ADRs.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | OQ-001 surfaced for monetization scale |
| **CPO** | ADR-001/010 clarify retention direction |
| **CTO** | ADR-005/006/007 accurate to code |
| **Principal Engineer** | Consequences include concrete actions |
| **Senior Game Designer** | ADR-002/004 clear |
| **UX Director** | ADR-003 drives Hem simplification |
| **Art Director** | N/A |
| **QA Director** | Test promotion in ADR-005 |
| **Security Engineer** | ADR-006 web pay gap noted |
| **AI Systems Architect** | ADR-008 critical for agents |

**Approved:** All roles — v1.0.
