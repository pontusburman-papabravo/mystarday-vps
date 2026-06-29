# 14 — Decision Log

**Version:** 2.0  
**Owner:** CEO + CPO + CTO  
**Authority:** Append-only architectural record

---

## Purpose

**Why** decisions were made — so teams and AI do not re-litigate. Product philosophy lives in 00–15; this file records **forks in the road**.

## Format

| Field | Content |
|-------|---------|
| **ID** | ADR-NNN |
| **Date** | ISO |
| **Status** | Accepted / Superseded / Proposed |
| **Decision** | What |
| **Motivation** | Why |
| **Consequences** | Actions |
| **Links** | POS docs |

---

## ADR-001 — Family Journey as sole product authority

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** One lifecycle brain (**Journey**) and one outbound brain (**Gate**) for "what's next" and communications.

**Motivation:** Overlapping coach systems confuse users and agents. Completions beat logins.

**Consequences:** Retire duplicate coaches; wire comms to Gate; no new coach surfaces (PA-01).

**Links:** [00](./00_PROJECT_CONSTITUTION.md), [05](./05_PARENT_EXPERIENCE.md)

---

## ADR-002 — Reality wins over gamification

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** Stars, streaks, unlocks are proxies for real routine success — not goals.

**Links:** [01](./01_PRODUCT_VISION.md), [06](./06_GAME_DESIGN.md), [07](./07_REWARD_SYSTEM.md)

---

## ADR-003 — Child protagonist, parent helper

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** Primary loop = child action; parent supports.

**Links:** [04](./04_CHILD_EXPERIENCE.md), [05](./05_PARENT_EXPERIENCE.md)

---

## ADR-004 — Build System = Bibliotek + Planering

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** No separate "Build Mode" product name/route — build lives in library + planning.

**Links:** [08](./08_BUILD_SYSTEM.md)

---

## ADR-005 — Per-component paywall

**Date:** 2026-06-23 · **Status:** Accepted

**Decision:** Gate features via components — no global subscription middleware.

**Links:** [10](./10_TECH_ARCHITECTURE.md)

---

## ADR-006 — Store IAP only (no web checkout)

**Date:** 2026-06-23 · **Status:** Accepted

**Decision:** Native billing via store + RevenueCat; Stripe removed.

**Consequences:** Web monetization gap — OQ-001.

**Links:** [01](./01_PRODUCT_VISION.md), [10](./10_TECH_ARCHITECTURE.md)

---

## ADR-007 — Remote native shell

**Date:** Pre-POS · **Status:** Accepted

**Decision:** Native apps load live web UI — one UI codebase; binary for store/plugins.

**Links:** [10](./10_TECH_ARCHITECTURE.md), [04](./04_CHILD_EXPERIENCE.md)

---

## ADR-008 — POS supersedes legacy docs

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** `/product-operating-system/` normative over `docs/*`, `CLAUDE.md`. `SYSTEM_ANALYSIS.md` = historical evidence only.

**Links:** [00](./00_PROJECT_CONSTITUTION.md), [11](./11_AI_DEVELOPER_GUIDE.md)

---

## ADR-009 — Win-back v1 deprecated

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** Do not re-enable legacy win-back; re-engage via Gate with evidence.

**Links:** [05](./05_PARENT_EXPERIENCE.md)

---

## ADR-010 — Activation Program sunset

**Date:** 2026-06-29 · **Status:** Accepted (planned)

**Decision:** Sunset parallel 7-day program when Journey phase parity reached — one retention brain.

**Links:** [01](./01_PRODUCT_VISION.md)

---

## ADR-011 — POS v2: vision-first, code-agnostic

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** Product Operating System v2 describes **ten-year product truth**, not current codebase layout. When code and POS conflict, **rewrite code**. Remove Current/Target implementation tables from normative docs.

**Motivation:** POS must steer 80% rewrites and EU scale; code-centric docs expire in months.

**Consequences:** Agents read 00/00A/00B + domain doc; SYSTEM_ANALYSIS demoted; quality bar in doc 15.

**Links:** [00](./00_PROJECT_CONSTITUTION.md), [11](./11_AI_DEVELOPER_GUIDE.md), [15](./15_PRODUCT_QUALITY_STANDARD.md)

---

## ADR-012 — Experience Manifesto as design supreme court

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md) is primary inspiration for designers and UX review — equal to taste doc for sensory calls.

**Links:** [00A](./00A_EXPERIENCE_MANIFESTO.md), [03A](./03A_ART_DIRECTION.md)

---

## ADR-013 — Product Quality Standard blocks release

**Date:** 2026-06-29 · **Status:** Accepted

**Decision:** [15_PRODUCT_QUALITY_STANDARD.md](./15_PRODUCT_QUALITY_STANDARD.md) is mandatory gate — QA may block regardless of sprint.

**Links:** [15](./15_PRODUCT_QUALITY_STANDARD.md), [12](./12_QA_SYSTEM.md), [13](./13_RELEASE_PROCESS.md)

---

## Open Questions

| ID | Question | Owner |
|----|----------|-------|
| **OQ-001** | Web monetization post-founder limit? | CEO |
| **OQ-002** | Journey prod wave 1 timing? | CPO |
| **OQ-003** | Retire Product Engine entirely? | CTO |
| **OQ-004** | Adaptive universe thresholds by age? | Game Director |
| **OQ-005** | Multi-instance / Redis threshold? | CTO |
| **OQ-006** | Onboarding vs engine state conflict? | CPO |

---

## Superseded

| Item | By |
|------|-----|
| POS v1 code-centric tables | ADR-011 |
| `docs/PRODUCT-CONSTITUTION.md` alone | POS 00 |
| Global paywall middleware | ADR-005 |
| Stripe | ADR-006 |

---

## How to Add

1. Draft ADR-NNN in PR  
2. Owner approval (CPO product / CTO tech)  
3. Append — never rewrite accepted entries except Status→Superseded

---

## AI Instructions

Grep ADRs before architecture changes. Do not override Accepted without escalation + new ADR.

---

## CXO Review Summary

All roles **10/10** — v2.0.
