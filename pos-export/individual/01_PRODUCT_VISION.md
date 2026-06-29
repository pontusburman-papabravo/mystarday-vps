# 01 — Product Vision

**Version:** 1.0  
**Authority:** Subordinate to [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md)

---

## Purpose

State why Stjärndag exists, what success looks like for families and the company, and how we measure progress without confusing proxies for the mission.

## Scope

Product vision, company mission, north-star metrics, market positioning, and long-term company goal. Does not define UX patterns (see 04–05) or technical architecture (see 10).

## Definitions

| Term | Definition |
|------|------------|
| **North Star (family)** | First Success — first felt relief in daily life |
| **North Star (company)** | Families retained because life is measurably calmer |
| **Proxy metric** | Measurable signal (stars, completions) — never the mission itself |
| **Category** | Positive family routines — visual schedules + earned rewards + guided journey |

---

## Company Mission

> Help millions of families experience **calmer mornings**, **fewer conflicts**, and **happier children**.

The product must become something **children genuinely love** while parents experience **measurable improvements in daily life**.

**Entertainment is never the goal. Real life is always the goal.**

---

## Product Mission

> Stjärndag helps each family succeed with the **next small step** in daily routines — not with configuration, dashboards, or gamification for its own sake.

We are building **Europe's best family app** — category-defining, not a checklist routine tracker.

---

## Long-Term Company Goal

| Horizon | Goal |
|---------|------|
| **Near** | Become the default positive-routine app in Sweden |
| **Mid** | Become **Europe's largest family app** for daily routines |
| **Long** | Global leader in **positive family routines** |
| **Outcome** | Build a company valuable enough to **acquire** — every decision must move toward scale without sacrificing trust |

---

## Vision Shift (strategic)

| From (legacy product) | To (Target State) |
|----------------------|-------------------|
| Parent builds routines | Product leads family to next win |
| Tool that reacts | Guide that leads |
| Empty states + configuration | Pre-filled + obvious next step |
| Parent is protagonist | **Child is protagonist; parent is helper** |
| Login = success | **Completion = success** |

Source: verified pivot in `docs/FIRST-SUCCESS.md`; Current State still partially legacy per SYSTEM_ANALYSIS §3.4.

---

## What Success Looks Like (qualitative)

**Parents say:**
- "Morgonen går smidigare."
- "Vi bråkar mindre."
- "Barnet påminner mig — inte tvärtom."

**Children say / do:**
- "Jag vill kolla hur det går med [husdjur/rum]."
- "Jag fixade morgonen själv."

**We never want:**
- "Barnet sitter bara i appen."
- "Det handlar om stjärnor."

---

## Metrics

### Primary (mission-aligned)

| Metric | Definition | Notes |
|--------|------------|-------|
| **First Success within 48h** | Family meets First Success criteria within 48h of registration | Primary proxy for mission |
| **D7 retention with completion** | Family still active day 7 **with at least one completion in last 3 days** | Login alone insufficient — per retention ADR |
| **Conflict reduction (qualitative)** | Survey / interview signal | Future systematic collection |

### Secondary (diagnostic only)

| Metric | Use |
|--------|-----|
| Stars given | Loop health — not success itself |
| Redemptions | Reward relevance |
| Onboarding completion | Funnel — not value |
| App opens | **Deprecated as success signal** for retention decisions |

### Anti-metrics (do not optimize)

- Raw session length (child)
- Push open rate without completion follow-through
- Feature count / settings depth

---

## Market & Positioning

| Dimension | Current State | Target State |
|-----------|---------------|--------------|
| **Geography** | Sweden-first (Swedish UI, SEO, legal) | Nordics → EU expansion with i18n infrastructure |
| **Audience** | Parents 3–10 age band (implicit); NPF-adjacent SEO | Same core; professional (pedagog) channel as trust amplifier |
| **Differentiation** | Visual schedule + Skattkammaren + journey coach | **Guided family journey** + world-quality child experience |
| **Competitors** | Bildschema tools, reward charts, generic habit apps | Category: *positive family routines* — not gamified todo lists |

---

## Product Pillars (strategic)

1. **Guided routine** — Journey leads; see [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md)
2. **Beloved child world** — Skattkammaren / universe; see [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md), [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md)
3. **Trusted parent partner** — approvals, calm UI; see [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md)
4. **Reality-linked rewards** — stars → real treats; see [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md)
5. **Extensible platform** — content packs, worlds, AI; see [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md)

---

## Rules

1. Every roadmap item must link to a pillar and a constitutional rule.
2. Features that do not move First Success or retention-with-completion are deprioritized.
3. European scale requires **trust** (GDPR, child safety, no dark patterns) — non-negotiable.
4. Acquisition value comes from **retention + brand + data moat (journey intelligence)** — not feature count.

---

## Examples

### ✅ On-vision

- Journey phase `FIRST_USE` → coach: "Visa barnet morgonrutinen" — ties to First Success.
- Child unlocks pet room after real completions — pillar 2 + reality wins.

### ❌ Off-vision

- Parent analytics dashboard with 30-day login charts — optimizes anti-metrics.
- Daily login bonus with no routine connection — gamification without reality.

---

## Anti-patterns

- Treating star count as OKR
- Shipping educator features before core family loop excels
- Expanding to new countries before Journey authority is consolidated

---

## Acceptance Criteria

Vision-aligned release when:

- [ ] Release notes state which pillar(s) improved
- [ ] At least one metric ties to First Success or completion-based retention
- [ ] No new anti-metric optimization introduced
- [ ] Swedish family can describe value without mentioning "stjärnor"

---

## Implementation Guidance

- **Journey experiences** copy lives in `config/journey-experience-registry.json` + DB registry — must reference phase purpose from this vision.
- **Analytics allowlist** — only whitelist events that map to pillars; see `src/lib/analytics-tracker.js` patterns.
- **Roadmap items** in [14_DECISION_LOG.md](./14_DECISION_LOG.md) tagged by pillar.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md) | Supreme rules |
| [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) | How vision becomes daily decisions |
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Play vs reality boundary |
| [14_DECISION_LOG.md](./14_DECISION_LOG.md) | ADR-001, ADR-002 |
| [../SYSTEM_ANALYSIS.md](../SYSTEM_ANALYSIS.md) §2–3 | Current State evidence |

---

## AI Instructions

1. Evaluate feature requests against **five pillars** and **company mission** before coding.
2. If a request improves metrics but hurts mission ("more screen time"), reject.
3. Default market language: **Swedish** for user-facing copy unless task specifies otherwise.
4. Reference Target State when proposing architecture — not legacy readiness/activation patterns.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Clear path from mission → EU scale → acquisition; anti-metrics protect brand |
| **CPO** | First Success + completion-based retention aligns product and ADR |
| **CTO** | Pillars map to existing modules — no fantasy scope |
| **Principal Engineer** | Metric deprecation (login) matches code direction |
| **Senior Game Designer** | "Children genuinely love" tied to world pillar — not points |
| **UX Director** | Qualitative parent/child quotes usable as design review tests |
| **Art Director** | World quality implied in pillar 2 — detail in 03/04 |
| **QA Director** | Acceptance criteria measurable at release level |
| **Security Engineer** | Trust called out for EU scale — GDPR in 10 |
| **AI Systems Architect** | Pillars give agents a scoring rubric for features |

**Approved:** All roles — v1.0.
