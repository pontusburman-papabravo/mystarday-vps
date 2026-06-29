# 00 — Project Constitution

**Version:** 1.0  
**Status:** Normative — supreme authority within the Product Operating System  
**Supersedes:** `docs/PRODUCT-CONSTITUTION.md` where conflicts exist (this document wins)

---

## Purpose

Define the immutable laws governing every product, design, engineering, and AI decision at Stjärndag. When two rules conflict, this document defines how to resolve the conflict.

## Scope

Applies to: product features, UX, game design, backend, frontend, mobile, admin, marketing copy inside the app, AI-generated code, and third-party integrations.

Does **not** apply to: one-off legal text, accounting, HR, or external press (those follow separate governance).

## Definitions

| Term | Definition |
|------|------------|
| **POS** | Product Operating System — `/product-operating-system/` |
| **Reality** | The family's actual morning, day, evening, and relationships — not in-app metrics |
| **First Success** | First time a family feels daily life got easier because of the app |
| **Child protagonist** | The child acts; the parent supports — not the reverse |
| **Journey** | Family Journey — authoritative lifecycle system (`src/lib/journey/`) |
| **Gate** | Journey Gate — sole authority for outbound communication decisions |
| **Current State** | What the codebase and live flags do today |
| **Target State** | What we are building toward; normative for new work |

---

## The Five Constitutional Rules

These rules cannot be overridden by feature requests, sprint pressure, or legacy behavior.

### Rule 1 — The product leads

The user never guesses the next step. The app shows one meaningful next action — not a menu of possibilities.

**Test:** Can a new parent open Hem and know what to do without instructions?

### Rule 2 — The product never surprises

Every screen feels like a natural continuation. Nothing appears without context.

**Test:** Would a parent ask "why am I seeing this now?" — if yes, we failed.

### Rule 3 — Always a next step

There is always a clear next step, or a clear reason nothing is needed now. Empty states are forbidden.

**Test:** Is there a dead screen, dead button, or path with no continuation?

### Rule 4 — Reduce uncertainty

After every action the parent feels: *"I'm doing this right."* Copy and UI must confirm progress.

**Test:** Does the UI answer "gör jag rätt?" without the user searching?

### Rule 5 — Feel complete after signup

Registration must feel more complete than before — not a blank tool waiting for configuration.

**Test:** Did the family receive something done-for-them, not a form?

---

## Supreme Product Laws (above features)

| Law | Statement |
|-----|-----------|
| **Reality wins** | The app exists to improve real life — not to maximize screen time, stars, or logins |
| **Play is the reward** | Entertainment follows accomplishment; never replaces it |
| **Child first** | Design for the child's experience; parent UI serves the child's success |
| **No family conflict** | The product must never increase arguments or become a battleground |
| **Ownership for children** | Children should feel the routine and world are *theirs* |
| **Trust for parents** | Parents must trust data, PIN gates, and approvals |

When **Rule 1 (product leads)** conflicts with **child ownership (drag/build)** → choose the interaction that produces real-world completion first, then delight. See [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md).

When **growth metrics** conflict with **Rule 4 (reduce uncertainty)** → choose Rule 4. Growth that erodes trust destroys the company mission.

---

## Document Hierarchy

When documents conflict, resolve in this order:

1. **00_PROJECT_CONSTITUTION.md** (this file)
2. **01_PRODUCT_VISION.md** — mission and north star
3. **02_PRODUCT_PRINCIPLES.md** — decision rules
4. Domain documents (04–09) — child, parent, game, rewards, build, world
5. **03_DESIGN_SYSTEM.md** — visual and interaction standards
6. **10_TECH_ARCHITECTURE.md** — technical boundaries
7. **11_AI_DEVELOPER_GUIDE.md** — agent execution rules
8. **12_QA_SYSTEM.md**, **13_RELEASE_PROCESS.md**
9. **14_DECISION_LOG.md** — point-in-time decisions
10. Legacy docs (`docs/*`, `CLAUDE.md`) — reference only; **POS wins**

**SYSTEM_ANALYSIS.md** is the verified snapshot of the codebase at POS creation. It informs Current State; it does not override Target State in POS.

---

## Current State vs Target State

### Current State (verified in SYSTEM_ANALYSIS.md)

| Area | Reality today |
|------|---------------|
| Product authority | **Fragmented** — readiness UI, Product Engine (`core-engine`), Family Journey, Activation Program coexist |
| Home coach | Up to three surfaces: `home-readiness.js`, `engine-coach.js`, `journey-coach.js` |
| Journey flags | Implemented Fas 1–5; **most flags default OFF** in live |
| Constitution compliance | Partial — empty states and config-heavy paths still exist |
| Legacy docs | `docs/PRODUCT-CONSTITUTION.md` still referenced in repo |

### Target State

| Area | Required end state |
|------|-------------------|
| Product authority | **Family Journey + Journey Gate only** — one coach mount on Hem |
| Legacy systems | Readiness UI removed; Product Engine shadow-only then retired; Activation Program sunset |
| Constitution | All five rules testable on every parent and child flow |
| This constitution | Single entry point; legacy constitution archived with pointer to POS |

---

## Rules for Change

1. **Constitution changes** require CEO + CPO approval and an entry in [14_DECISION_LOG.md](./14_DECISION_LOG.md).
2. **Principle changes** (02) require CPO + UX Director approval.
3. **Technical changes** that affect user-visible behavior require constitution test in PR description: *"How does this fulfill the five rules?"*
4. **AI agents** must read this file before any user-facing change.

---

## Examples

### ✅ Allowed

- Journey coach shows "Klara av morgonrutinen med [barn]" after first schedule exists — leads, no surprise, next step clear.
- Child completes activity → brief celebration → return to schedule — play as reward.
- Parent sees one approval card — reduces uncertainty.

### ❌ Forbidden

- Home shows three different "next step" cards from three systems.
- Empty Hem with "Skapa ditt första schema" when onboarding already seeded activities.
- Child screen with star leaderboard comparing siblings — increases conflict.
- Push notification optimized for open rate that does not map to a Journey phase.

---

## Anti-patterns

| Anti-pattern | Why forbidden |
|--------------|---------------|
| "We'll add a menu so users can choose" | Violates Rule 1 |
| "Empty state is fine for v1" | Violates Rule 3 |
| "Metrics dashboard for parents" | Violates parent principles — see [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) |
| "Ship behind flag forever" | Creates permanent dual product; flags are rollout tools, not architecture |
| "Copy legacy doc because it's there" | POS supersedes stale specs |

---

## Acceptance Criteria

A feature or release satisfies the constitution when:

- [ ] All five rules pass manual test on affected flows
- [ ] Reality-win check: does this improve real mornings/evenings?
- [ ] Child-first check: does the child benefit before the parent configures?
- [ ] No new empty states introduced
- [ ] PR description cites specific rules satisfied
- [ ] If touching Home: only **one** coach authority active — see Target State

---

## Implementation Guidance

- **Home coach consolidation:** Mount `#coachMount` only; feed from `GET /api/me/journey-context`. Retire `#engineCoachMount` and readiness mount in Target State.
- **Feature flags:** Use for rollout only; each flag has a sunset date in Decision Log.
- **New screens:** Start with "what is the next step?" not "what data do we display?"

Code anchors: `src/lib/journey/context-builder.js`, `public/js/journey-coach.js`, `docs/retention-migration-plan.md` (ADR — Journey authority).

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [01_PRODUCT_VISION.md](./01_PRODUCT_VISION.md) | Mission and company goal |
| [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) | Operational principles |
| [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) | Rule 1–4 on Hem |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Child protagonist law |
| [14_DECISION_LOG.md](./14_DECISION_LOG.md) | ADR-001 Journey authority |
| [../SYSTEM_ANALYSIS.md](../SYSTEM_ANALYSIS.md) | Current State evidence |

---

## AI Instructions

1. Read this file first on every task.
2. If a user request violates a constitutional rule, **refuse and explain which rule**.
3. When implementing, prefer Target State over Current State unless explicitly told "maintenance only."
4. Never copy rules from `docs/PRODUCT-CONSTITUTION.md` without checking this file.
5. Cite rule numbers in commit messages for user-facing changes.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Aligns company mission with enforceable daily decisions; Reality-wins clause protects brand |
| **CPO** | Five rules + hierarchy give clear conflict resolution; Target State addresses authority fragmentation |
| **CTO** | Implementation guidance points to Journey without mandating rewrite — pragmatic |
| **Principal Engineer** | Single coach mount and flag sunset rules reduce dual-system debt |
| **Senior Game Designer** | Play-as-reward encoded at supreme level — prevents points-first drift |
| **UX Director** | Empty-state ban and surprise rule are testable — good for QA |
| **Art Director** | No visual rules here — correctly delegated to 03 |
| **QA Director** | Acceptance checklist is executable |
| **Security Engineer** | PIN/trust mentioned; detail in 10/12 |
| **AI Systems Architect** | Hierarchy and AI Instructions block ambiguous agent behavior |

**Approved:** All roles — v1.0 ready for use.
