# ALL DOCUMENTS — Stjärndag Product Operating System v1.0


================================================================================
FILE: product-operating-system/README.md
================================================================================

# Stjärndag Product Operating System

**Version:** 1.0  
**Status:** Normative — supersedes conflicting legacy specs  
**Created:** 2026-06-29  
**Evidence base:** [SYSTEM_ANALYSIS.md](../SYSTEM_ANALYSIS.md)

---

## What This Is

The **single source of truth** for building Stjärndag. Every product, design, engineering, QA, and AI decision must trace to these documents.

> If legacy `docs/*` or `CLAUDE.md` contradicts this folder — **this folder wins.**  
> See [14_DECISION_LOG.md](./14_DECISION_LOG.md) ADR-008.

---

## Company Mission (summary)

Help millions of families experience **calmer mornings**, **fewer conflicts**, and **happier children** — toward becoming **Europe's best family app**.

**Reality always wins.** Play is the reward, not the goal.

Full vision: [01_PRODUCT_VISION.md](./01_PRODUCT_VISION.md)

---

## Reading Order

Read in this sequence on first onboarding. Subsequent tasks: read **00** + relevant domain doc only.

| Step | Document | Why |
|------|----------|-----|
| 1 | [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md) | Supreme rules — non-negotiable |
| 2 | [01_PRODUCT_VISION.md](./01_PRODUCT_VISION.md) | Mission, metrics, pillars |
| 3 | [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) | Decision rules + conflict matrix |
| 4 | [14_DECISION_LOG.md](./14_DECISION_LOG.md) | Settled ADRs — do not re-litigate |
| 5 | [03_DESIGN_SYSTEM.md](./03_DESIGN_SYSTEM.md) | Visual/interaction standards |
| 6 | [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Child worlds |
| 7 | [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) | Parent magic UI + coach |
| 8 | [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Play vs reality |
| 9 | [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) | Stars & Skattkammaren |
| 10 | [08_BUILD_SYSTEM.md](./08_BUILD_SYSTEM.md) | Library / schedule (content build) |
| 11 | [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) | Universe unlocks |
| 12 | [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md) | Stack & extension points |
| 13 | [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md) | Agent playbook |
| 14 | [12_QA_SYSTEM.md](./12_QA_SYSTEM.md) | Test gates |
| 15 | [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md) | Ship pipeline |

**AI agents:** Follow [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md) read order on every task.

---

## Document Map

```
product-operating-system/
├── README.md                    ← You are here
├── 00_PROJECT_CONSTITUTION.md   ← Supreme law
├── 01_PRODUCT_VISION.md         ← Mission & metrics
├── 02_PRODUCT_PRINCIPLES.md     ← Decision rules
├── 03_DESIGN_SYSTEM.md          ← Visual system
├── 04_CHILD_EXPERIENCE.md       ← Child product
├── 05_PARENT_EXPERIENCE.md      ← Parent product
├── 06_GAME_DESIGN.md            ← Motivation & celebration
├── 07_REWARD_SYSTEM.md          ← Star economy
├── 08_BUILD_SYSTEM.md           ← Content construction
├── 09_WORLD_ENGINE.md           ← Universe / rooms
├── 10_TECH_ARCHITECTURE.md      ← Engineering
├── 11_AI_DEVELOPER_GUIDE.md     ← AI agents
├── 12_QA_SYSTEM.md              ← Quality
├── 13_RELEASE_PROCESS.md        ← Deploy
└── 14_DECISION_LOG.md           ← ADRs
```

---

## Current State vs Target State

Every domain document labels **Current State** (what code does today) and **Target State** (normative for new work).

| Domain | Current State headline | Target State headline |
|--------|------------------------|----------------------|
| Product authority | 3 coach systems + Activation Program | Journey + Gate only |
| Child UX | Tap-complete; 30+ scripts | Drag/build in world; single nav |
| Parent Hem | Schedule cards + star chart | Single Journey coach |
| Build | Library + monolithic schedule.js | Pre-filled; extracted modules |
| QA gate | 19 test files | + paywall, IAP, universe |
| Monetization | IAP native; founder #225 free | Web path TBD (OQ-001) |

Detail: [SYSTEM_ANALYSIS.md](../SYSTEM_ANALYSIS.md) + each POS doc.

---

## Ownership (no duplicate rules)

| Topic | Owner document |
|-------|----------------|
| Supreme rules | 00 |
| Mission / metrics | 01 |
| Conflict resolution | 02 |
| Colors / motion / components | 03 |
| Child worlds / offline | 04 |
| Parent nav / coach | 05 |
| Celebrations / motivation | 06 |
| Stars / redemptions | 07 |
| Library / schedule editing | 08 |
| Room unlocks / pet | 09 |
| Server / mobile / DB | 10 |
| Agent workflow | 11 |
| Tests / CI | 12 |
| Deploy / rollback | 13 |
| ADRs / open questions | 14 |

---

## Quick Links

| Need | Go to |
|------|-------|
| "Can we add X?" | 00 → 02 conflict matrix |
| Coach / Hem work | 05, ADR-001 |
| Child feature | 04, 06, 09 |
| New API route | 10, 11 |
| Release checklist | 13, 12 |
| Why we decided Y | 14 |

---

## Legacy Documents

These remain as **historical reference** — not normative:

- `docs/PRODUCT-CONSTITUTION.md` → superseded by 00
- `docs/FIRST-SUCCESS.md` → aligned with 01; POS wins on conflict
- `docs/retention-migration-plan.md` → incorporated in ADR-001, 009, 010
- `CLAUDE.md`, `AGENTS.md` → technical env; POS wins on product behavior

---

## Versioning

- **1.0** — Initial POS from approved SYSTEM_ANALYSIS.md
- Changes to 00 require CEO + CPO; append ADR to 14

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Reading order supports fast onboarding; mission visible |
| **CPO** | Ownership table prevents duplicate rules |
| **CTO** | Clear split product vs tech docs |
| **Principal Engineer** | Current/Target summary accurate |
| **Senior Game Designer** | Game docs grouped in reading order |
| **UX Director** | Design system early in sequence — correct |
| **Art Director** | 03 in proper place |
| **QA Director** | 12 before 13 — test before ship |
| **Security Engineer** | ADR-008 reduces doc confusion attacks |
| **AI Systems Architect** | README is agent entry point |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/00_PROJECT_CONSTITUTION.md
================================================================================

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


================================================================================
FILE: product-operating-system/01_PRODUCT_VISION.md
================================================================================

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


================================================================================
FILE: product-operating-system/02_PRODUCT_PRINCIPLES.md
================================================================================

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


================================================================================
FILE: product-operating-system/03_DESIGN_SYSTEM.md
================================================================================

# 03 — Design System

