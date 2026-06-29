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

**Version:** 1.0  
**Authority:** Visual execution of [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md)

---

## Purpose

Define the visual and interaction language for Stjärndag: tokens, typography, components, motion, and accessibility — so every surface feels **handcrafted**, warm, and polished (Nintendo / Pixar / Apple bar).

## Scope

Parent magic UI, child worlds, shared components, marketing pages served from `public/`. Admin panel follows a **separate ops aesthetic** — functional, not magic — documented briefly here.

## Definitions

| Term | Definition |
|------|------------|
| **Magic UI** | Parent design system (`parent-magic-*`, `dashboard-magic.css`) |
| **Child worlds** | Barnmeny v2 three-world shell |
| **Token** | Named color, spacing, radius, shadow value |
| **Delight budget** | Max ~2s celebration before returning user to next action |

---

## Design North Star

> Everything should feel **handcrafted** — never generic SaaS, never enterprise dashboard, never Material-default.

**Quality bar:** Nintendo responsiveness · Pixar emotional warmth · Apple spacing and polish.

---

## Color Tokens (Current State — verified in CSS)

| Token | Hex / class | Usage |
|-------|-------------|--------|
| **Gold** | `#F5A623` · `bg-gold`, `text-gold` | Primary CTA, stars, warmth |
| **Navy** | `#1B2340` · `bg-navy`, `text-navy` | Text, headers, dark surfaces |
| **Lavender** | Tailwind custom · `border-lavender`, `bg-lavender` | Soft borders, inactive states |
| **Gold light** | `bg-gold-light` | Highlights, coach cards |
| **White / cream** | Card backgrounds in magic view | Content surfaces |

**Splash / native:** Capacitor SplashScreen `#F5A623` — `capacitor.config.ts`.

### Target State

- Centralize tokens in `public/css/tokens.css` (new file) — imported by Tailwind build
- Document dark mode (`parent-theme-light` vs default dark magic) as first-class
- Child world palette per room theme (castle, treehouse, space) — extend without breaking parent tokens

---

## Typography

| Context | Current State | Target State |
|---------|---------------|--------------|
| **Parent** | System stack via Tailwind; semibold headings | Defined scale: display / title / body / caption |
| **Child** | Larger touch targets; emoji as icon language | Minimum 16px body; 44px touch targets |
| **Language** | Swedish primary | i18n-ready; no hardcoded strings in CSS |

**Rules:**
- Headlines: warm, short, Swedish sentence case
- Never all-caps except legal microcopy
- No monospace except code/admin

---

## Spacing & Layout

| Rule | Value / pattern |
|------|-----------------|
| Card radius | `rounded-2xl` (parent magic standard) |
| Card padding | `p-4` minimum |
| Section gap | `mb-4` between actionable cards |
| Safe area | `platform-native.css` — env(safe-area-inset-*) |
| Max content width | Readable on phone; tablet uses side margins |

**Anti-pattern:** Dense table layouts on parent home — forbidden by [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) P-04.

---

## Components

### Parent (Current State)

| Component | Location | Notes |
|-----------|----------|-------|
| Magic shell | `parent-magic-shell.js`, `parent-magic-common.css` | Page class `parent-magic-view` |
| Native tab bar | `native-tab-bar.js`, `nav-config.js` | 6 primary tabs |
| Coach card | `engine-coach.js`, `journey-coach.js` | Target: single `#coachMount` |
| Hub grid | `planning-hub.js`, `rewards-hub.js` | Link grids — acceptable |
| Activity card | `dashboard.js`, `schedule-core.js` | Section cards fm/em/kväll |

### Child (Current State)

| Component | Location |
|-----------|----------|
| World nav | `child-worlds-nav.js` |
| Activity row | `child-today*.js` |
| Skattkammaren room | `child-skatt-house.js` |
| Milestone overlay | `child-dashboard-celebrations.js` |

### Target State components (to design/build)

| Component | Purpose |
|-----------|---------|
| `CoachCard` | Single unified coach — Journey-fed |
| `RoutineActivityTile` | Child tap target — visual-first |
| `WorldRoomFrame` | Consistent room chrome for universe |
| `ApprovalChip` | Parent one-tap approve/deny |

---

## Motion

| Type | Current State | Target State |
|------|---------------|--------------|
| **Celebration** | Confetti, dopamine burst — `child-dashboard-celebrations.js` | Centralized; delight budget enforced |
| **Transitions** | CSS `transition-colors`; soft nav DOM swap | Shared motion tokens (duration, easing) |
| **Haptics** | `platform.js` — native + vibrate fallback | Haptic on child completion only |
| **Reduced motion** | Partial | Respect `prefers-reduced-motion` everywhere |

**Rules:**
- Motion confirms accomplishment — never blocks next routine step
- No infinite animations on home screens
- Parent UI: subtle; child UI: more expressive

---

## Iconography

| Context | Standard |
|---------|----------|
| Parent nav | Emoji icons in `nav-config.js` — Current State |
| Child | Emoji + illustrated activity images |
| Target | Custom SVG set for nav — emoji fallback for accessibility |

---

## Accessibility (baseline)

| Requirement | Current State | Target State |
|-------------|---------------|--------------|
| Touch targets | ≥44px on child controls | Audit all child flows |
| Contrast | Gold on white/navy — verify WCAG AA | Automated contrast check in CI |
| Screen reader | Coach cards have `role="region"` | Full audit — SYSTEM_ANALYSIS gap |
| PIN entry | Numeric keyboard | Labelled inputs |
| Reduced motion | Incomplete | Required for celebrations |

---

## Admin UI

**Current State:** Separate SPA, dense tables acceptable for operators.  
**Rule:** Admin aesthetic does **not** leak into parent or child surfaces.

---

## Rules

**DS-01** Use magic palette tokens — no ad-hoc hex in new CSS.  
**DS-02** `rounded-2xl` for parent cards unless child world theming overrides.  
**DS-03** Primary CTA: `bg-gold` + white text.  
**DS-04** No generic shadcn/Material/card-dashboard patterns.  
**DS-05** Tailwind via **`tailwind.build.css`** only — no CDN (Current State enforced in CI).  
**DS-06** New pages inject `platform-theme.js` via `platform-html` middleware.  
**DS-07** Celebrations ≤ delight budget — [06_GAME_DESIGN.md](./06_GAME_DESIGN.md).

---

## Examples

### ✅ On-system

Journey coach card: indigo/gold border, one CTA, `rounded-2xl`, Swedish copy.

### ❌ Off-system

Gray Bootstrap table on Hem with sortable columns.

---

## Anti-patterns

- Tailwind CDN in HTML
- `public/v2/` mockups copied to live parent/child surfaces without design review
- Duplicate confetti implementations
- Hidden legacy sidebars still styled in DOM

---

## Acceptance Criteria

UI change is design-system compliant when:

- [ ] Uses token colors (gold/navy/lavender)
- [ ] Passes touch target check on mobile
- [ ] No enterprise dashboard patterns on parent/child
- [ ] Motion has end state within delight budget
- [ ] `npm run check:css` passes if Tailwind classes changed

---

## Implementation Guidance

**Files:**
- `public/css/parent-magic-common.css` — parent dark magic overrides
- `public/css/dashboard-magic.css` — dashboard-specific
- `public/css/platform-native.css` — Capacitor adjustments
- `scripts/css-build.mjs` — Tailwind pipeline

**Process:** Edit Tailwind sources → `npm run css:build` → commit `tailwind.build.css` + bump `public/sw.js` cache version per existing CI gate.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) | Design principles |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Child layout |
| [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) | Parent layout |
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Motion/celebration |
| [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md) | CSS gate in CI |

---

## AI Instructions

1. Never add Tailwind CDN links.
2. Match existing class patterns (`rounded-2xl`, `bg-gold`, `text-navy`).
3. Do not introduce new color hex without adding to token table and Decision Log.
4. Read `large-files.mdc` before editing large HTML/CSS.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Quality bar (Nintendo/Pixar/Apple) is aspirational but actionable via rules |
| **CPO** | Anti-dashboard rules reinforced |
| **CTO** | Tailwind build pipeline documented — matches CI |
| **Principal Engineer** | Token centralization marked Target — reduces drift |
| **Senior Game Designer** | Delight budget linked — good |
| **UX Director** | Component inventory maps to real files |
| **Art Director** | Gold/navy palette codified; room themes flagged for expansion |
| **QA Director** | Acceptance criteria + a11y gap acknowledged |
| **Security Engineer** | N/A visual |
| **AI Systems Architect** | DS-01–07 machine-citable |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/04_CHILD_EXPERIENCE.md
================================================================================

# 04 — Child Experience

**Version:** 1.0  
**Authority:** Child-facing product behavior; subordinate to [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md)

---

## Purpose

Define how children interact with Stjärndag: worlds, flows, interactions, offline behavior, and quality bar — so children **love** the app while **real life** improves.

## Scope

Child JWT experience: login, `child-dashboard.html` shell, three worlds, offline, celebrations. Excludes parent configuration (see [08_BUILD_SYSTEM.md](./08_BUILD_SYSTEM.md)).

## Definitions

| Term | Definition |
|------|------------|
| **Barnmeny v2** | Three-world child navigation (`child-worlds.js`, `V2_ENABLED=true`) |
| **Today** | Schedule + activity completion world |
| **Min värld** | Skattkammaren / universe — reward exploration |
| **Mina personer** | Family hall — caregivers, siblings |
| **PIN gate** | Parent exit via `child-system-menu.js` + `parental-gate.js` |

---

## Child Experience North Star

Children should think:
- "I want to **build**."
- "I want to **visit my pet**."
- "I wonder **what changed**."

Never: "I need **more points**."

---

## Current State (verified)

### Shell & routing

| Item | Implementation |
|------|----------------|
| **Single HTML shell** | `public/child-dashboard.html` + 30+ JS modules |
| **Routes** | `/child/today`, `/child/world`, `/child/family` (+ legacy redirects) |
| **Auth** | `POST /api/auth/child-login`; child JWT 8h |
| **View config** | Per-child `child_view_config.view_mode` (classic vs magic) |
| **Header controls** | 🔄 Byt barn · ⚙️ Förälder (PIN) · 🚪 Logga ut |

### Today world

| Feature | File(s) |
|---------|---------|
| Day tabs | `child-today*.js` |
| NOW / NEXT / LATER | Schedule presentation |
| Complete activity | Tap → API → stars |
| Photo/visual cards | `child-dashboard-photo-cards.js`, `activity-visual.js` |
| Offline read | `offline-store.js` |
| Offline write queue | `offline-queue.js` |
| Rating modal | Optional post-completion |

### Min värld (universe)

| Feature | File(s) |
|---------|---------|
| Universe API | `child-universe-client.js` → `/api/me/universe` |
| Rooms | `child-skatt-house.js` (10 rooms) |
| Avatar, pet, museum | `child-avatar.js`, `child-pet.js`, etc. |
| Layer routing | `child-layer-router.js` (hash aliases) |

### Celebrations

| Feature | File(s) |
|---------|---------|
| Milestones 25/50/75% | `child-dashboard-celebrations.js` |
| Confetti | Celebrations module + **duplicate** in `child-dashboard.js` (debt) |

### Offline (PWA)

SW precaches child-critical assets; API network-only. Native app **unregisters SW** — requires network.

---

## Target State

| Area | Target |
|------|--------|
| **Interaction** | Drag/assemble in world; tap-complete on Today (acceptable) |
| **Navigation** | v2 bottom nav only — legacy tabs removed from HTML |
| **Celebrations** | Single module; delight budget ≤2s |
| **Copy** | Stars mentioned less than routine success |
| **Build fantasy** | Room customization feels like building — furniture/decor slots |
| **Discovery** | Post-completion "something changed in your world" — not push notification |
| **Offline native** | Read-only cache or honest offline message — no silent failures |
| **Accessibility** | Full WCAG audit on child flows |
| **Screen time** | No engagement loops; session ends naturally after routine |

---

## World Structure

```
┌─────────────────────────────────────────┐
│           child-dashboard.html           │
├─────────────────────────────────────────┤
│  Header: Byt barn | Förälder | Logga ut │
├─────────────────────────────────────────┤
│                                          │
│   [ Active world content ]               │
│                                          │
├─────────────────────────────────────────┤
│  Bottom nav: Idag | Min värld | Familj   │
└─────────────────────────────────────────┘
```

| World | Primary action | Secondary |
|-------|----------------|-----------|
| **Idag** | Complete next activity | See progress |
| **Min värld** | Explore / customize | Redeem rewards — [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) |
| **Familj** | See people | Emotional connection |

---

## Interaction Rules

**C-01** No forms (text inputs) except PIN login page.  
**C-02** No schedules editing in child UI.  
**C-03** One primary action visible on Today — the next activity.  
**C-04** Celebrations never block parent-approved redemptions flow.  
**C-05** Pet/room visits require no payment or secondary currency.  
**C-06** Sibling comparison forbidden — no leaderboards.  
**C-07** Exit to parent requires PIN when parent PIN set.  
**C-08** Child API deny-by-default on server — never bypass in client only.

---

## Login Flow

| Step | Current State |
|------|---------------|
| Parent logged in | Child picker from session |
| No parent session | Manual name + PIN on `child-login.html` |
| Lockout | Exponential backoff; parent notified at 3 fails |

Target: unchanged mechanics; improved illustration and error copy (reduce fear).

---

## Examples

### ✅ Good child moment

Child taps "Äta frukost" → checkmark + small star burst → "Nästa: Borsta tänder" highlighted.

### ❌ Bad child moment

Modal: "Du har 3 stjärnor kvar till nästa nivå!" before showing routine.

---

## Anti-patterns

- Dashboard of stats on child home
- Generic card grid without illustration
- Forcing child through Skattkammaren before routine
- Loot-box random rewards
- Duplicate navigation (legacy tabs + bottom nav)

---

## Acceptance Criteria

Child feature complete when:

- [ ] Tested on iOS WebView + Android WebView + mobile Safari
- [ ] Works offline for Today read + completion queue (PWA)
- [ ] No C-01–C-08 violations
- [ ] Celebrations respect delight budget
- [ ] `child-access-integration.test.js` patterns still pass for API scope

---

## Implementation Guidance

**Key files:** `public/child-dashboard.html`, `public/js/child-shell.js`, `public/js/child-worlds.js`, `src/middleware/child-parent-api-block.js`.

**Do not** add new global `window.*` handlers without documenting in [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md).

**Universe invalidation:** `ChildUniverse.invalidate()` on task complete via `child-event-bus.js` — preserve this pattern.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Celebration rules |
| [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) | Redemption in world |
| [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) | Unlock logic |
| [03_DESIGN_SYSTEM.md](./03_DESIGN_SYSTEM.md) | Visual standards |
| [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md) | Child JWT, offline |

---

## AI Instructions

1. Never add child-facing configuration screens.
2. Prefer extending `child-*.js` modules over growing `child-dashboard.js`.
3. Test child API paths against allowlist in `child-parent-api-block.js`.
4. Label PRs `child-surface` for QA routing — [12_QA_SYSTEM.md](./12_QA_SYSTEM.md).

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Child love + real life linked via Today-first structure |
| **CPO** | Three worlds map to routine / reward / belonging |
| **CTO** | Current file map accurate; consolidation debt acknowledged |
| **Principal Engineer** | Offline + deny-by-default called out |
| **Senior Game Designer** | Target drag/build in world — realistic phased |
| **UX Director** | C-03 one-primary-action is strong rule |
| **Art Director** | Photo cards and rooms need visual QA checklist |
| **QA Director** | Acceptance includes integration test reference |
| **Security Engineer** | PIN gate + API block correct |
| **AI Systems Architect** | Module map prevents child-dashboard.js bloat |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/05_PARENT_EXPERIENCE.md
================================================================================

# 05 — Parent Experience

**Version:** 1.0  
**Authority:** Parent-facing product behavior

---

## Purpose

Define how parents experience Stjärndag: navigation, Hem, coaching, planning, approvals — so parents feel **less conflict**, **more trust**, and **guided** — never like they run enterprise software.

## Scope

Parent JWT (`type:'parent'`) magic UI, onboarding, pedagog dual-role surfaces. Admin is out of scope.

## Definitions

| Term | Definition |
|------|------------|
| **Magic shell** | `parent-magic-view` page wrapper + tab bar |
| **Hem** | `/dashboard` — primary home |
| **Coach** | Next-step card — Target: Journey-only |
| **Soft nav** | `parent-magic-router.js` partial page swap |
| **Configuration debt** | Every setting screen |

---

## Parent Experience North Star

Parents should feel:
- "I **argue less**."
- "My child **reminds me**."
- "This app **actually helps**."

Never: "My child wants **more screen time**."

---

## Current State (verified)

### Navigation (`nav-config.js`)

| Tab | Href | Cluster |
|-----|------|---------|
| Hem | `/dashboard` | dashboard, daily-log |
| Planering | `/planning` | schedule, library, calendar, activities |
| Belöningar | `/rewards` | rewards, skattkammaren-parent |
| För dig | `/for-dig` | growth content |
| Familj | `/family` | members, child settings |
| Inställningar | `/settings` | account, notifications |

Native: `native-tab-bar.js`. Web: sidebar hidden via `parent-magic-legacy-hide`.

### Hem (`dashboard.html`)

| Element | Current State |
|---------|---------------|
| Schedule cards | Child tabs + section cards (fm/em/kväll) |
| Coach surfaces | **Up to 3:** readiness, engine, journey — conflict detection in `engine-client.js` |
| Real-time | `dashboard-sse.js` |
| Star history chart | `dashboard-star-history.js` — **product debt** (statistics on home) |
| CTAs | Co-parent invite, share app — `dashboard-cta.js` |
| Soft nav | **Excluded** — full reload for dashboard |

### Onboarding (`onboarding.html`)

6 steps: child → view → template → PIN → handoff → done.  
Starter plan AI: `onboarding-starter-plan.js`.  
**Gap:** global library empty in dev without harvest.

### Planning

Hub → schedule editor (`schedule.js` ~2594 lines), library ([08_BUILD_SYSTEM.md](./08_BUILD_SYSTEM.md)).

### Approvals

Give stars, pause activities, redemption approve/deny — `dashboard-approvals.js`, `dashboard-card-actions.js`.

---

## Target State

| Area | Target |
|------|--------|
| **Hem coach** | Single `#coachMount` fed by `GET /api/me/journey-context` only |
| **Legacy removal** | `#homeReadinessMount`, `#engineCoachMount` retired |
| **Home content** | Today-oriented actions — not analytics |
| **Statistics** | Weekly story (`dashboard-weekly-story.js`) — no star chart on Hem |
| **Onboarding** | Pre-filled schedule; ≤3 decisions before First Success path |
| **Soft nav** | Expand only if bundle size reduced — not required for v1 Target |
| **Pedagog role** | Hidden until `pedagog` component; never default home |

---

## Coach Authority (critical)

### Current State — fragmented

| System | API | Client |
|--------|-----|--------|
| Readiness | `/api/family/readiness` | `home-readiness.js` |
| Product Engine | `/api/family/first-success` | `engine-coach.js` |
| Journey | `/api/me/journey-context` | `journey-coach.js` |

### Target State — unified

```
Journey Context → single coach card → one CTA → deep link
```

**Rule PA-01:** No new coach surfaces.  
**Rule PA-02:** All "what's next" copy from Journey registry — not hardcoded in HTML.

Per [14_DECISION_LOG.md](./14_DECISION_LOG.md) ADR-001.

---

## Parent UI Rules

**PA-03** No dashboards on Hem — actionable cards only.  
**PA-04** No generic stat cards without recommended action.  
**PA-05** Every empty state replaced with Journey experience or prefill.  
**PA-06** Approvals are exception UI — not home default.  
**PA-07** PIN gate protects child→parent transition (`parental-gate.js`).  
**PA-08** Magic UI only — no classic parent toggle (`app-view-mode.js`).  
**PA-09** Swedish copy; calm tone — never punitive toward child.  
**PA-10** Push/email must pass Journey Gate — [14_DECISION_LOG.md](./14_DECISION_LOG.md).

---

## Key Flows

### Morning (Target narrative)

1. Coach: "Morgonrutin väntar — öppna [barn]s vy"
2. Parent hands device OR child opens own login
3. Child completes — parent gets optional approval notification
4. Coach confirms: "Bra start idag"

### Reward approval

1. Child redeems in Skattkammaren
2. Parent sees pending in Belöningar or notification
3. One-tap approve — [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md)

### Add child

`onboarding.html` or `child-new.html` — must leave family feeling **more complete** (Rule 5).

---

## Examples

### ✅ On-spec Hem

One coach card: "Visa Elias kvällsschema" + button → `/child/today`.

### ❌ Off-spec Hem

Three cards from three systems + 7-day star line chart.

---

## Anti-patterns

- Enterprise analytics (DAU, funnel) on parent home
- Settings link as primary CTA on Hem
- Onboarding that ends on empty dashboard
- Comparing children on star totals

---

## Acceptance Criteria

Parent change complete when:

- [ ] Hem shows ≤1 coach authority (Target) or conflict guard active (Current maintenance)
- [ ] PA-03–PA-10 satisfied
- [ ] Tested: new parent can reach First Success path without docs
- [ ] Journey phase transition if applicable — `journey-context.test.js` green

---

## Implementation Guidance

Files: `public/dashboard.html`, `public/js/dashboard*.js`, `public/js/journey-coach.js`, `src/routes/journey-context.js`.

**Flag rollout:** journey ops runbook in `docs/` — enable journey flags in waves; do not partial-enable coach without removing legacy mounts.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md) | Rules 1–5 |
| [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) | P-04, P-08 |
| [08_BUILD_SYSTEM.md](./08_BUILD_SYSTEM.md) | Library/planning |
| [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) | Approvals |
| [01_PRODUCT_VISION.md](./01_PRODUCT_VISION.md) | First Success |

---

## AI Instructions

1. Do not add `#homeReadinessMount` or `#engineCoachMount` consumers.
2. Extend `journey-coach.js` for new coach UX.
3. Parent-facing stats require explicit CPO exception in Decision Log.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Coach consolidation is highest-impact parent fix — correctly prioritized |
| **CPO** | Star chart flagged as debt — aligns with anti-statistics principle |
| **CTO** | Current triple-system documented honestly |
| **Principal Engineer** | PA-02 registry-driven copy prevents scatter |
| **Senior Game Designer** | Parent as helper not player — clear |
| **UX Director** | Flow narratives usable for usability tests |
| **Art Director** | Magic shell referenced — consistent with 03 |
| **QA Director** | First Success path in acceptance criteria |
| **Security Engineer** | PIN gate referenced |
| **AI Systems Architect** | Explicit ban on new coach mounts |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/06_GAME_DESIGN.md
================================================================================

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


================================================================================
FILE: product-operating-system/07_REWARD_SYSTEM.md
================================================================================

# 07 — Reward System

**Version:** 1.0  
**Authority:** Star economy, rewards, Skattkammaren redemption — Reality Wins

---

## Purpose

Define how stars and rewards connect **real-world accomplishments** to **meaningful treats** — without becoming a points economy.

## Scope

Stars, balances, rewards CRUD, redemptions, parent approval, child Skattkammaren. Universe room unlocks cross-reference [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md).

## Definitions

| Term | Definition |
|------|------------|
| **Star** | Proxy for completed effort — not currency for its own sake |
| **Skattkammaren** | In-app treasury where rewards live (child world) |
| **Redemption** | Child spends stars for family-defined reward |
| **Lifetime stars** | Cumulative earned — drives universe unlocks |
| **Balance** | Earned minus approved redemptions |

---

## North Star

> Stars prove the loop works. **The treat in real life** is the reward. Skattkammaren is the **bridge**, not the destination.

Parents define rewards as **real family treats** (movie night, extra story, small toy) — not virtual items only.

---

## Current State (verified)

### Data model

| Table | Role |
|-------|------|
| `daily_log_item` | Completion + `star_value` |
| `reward` | Family-scoped reward definitions |
| `reward_redemption` | Spend + approval state |
| `default_reward` | Global library (admin) |

### API (`src/routes/rewards.js`)

| Endpoint | Actor |
|----------|-------|
| `/api/rewards` CRUD | Parent |
| `/api/me/rewards` | Child list |
| `/api/me/rewards/:id/redeem` | Child spend |
| Approve/deny | Parent |

**Race protection:** `SELECT FOR UPDATE` on redemption — mirrored in tests.

### Balance

`getStarBalance()` = earned − approved/auto redemptions.

### Surfaces (naming collision — see PA docs)

| Surface | Path | Audience |
|---------|------|----------|
| Child Skattkammaren | child world + `child-dashboard-rewards.js` | Child |
| Parent overview | `skattkammaren-parent.html` | Parent |
| Marketing SEO | `skattkammaren.html` | Public |
| Library tab | `library.js` | Parent CRUD |

### Offline

`offline-queue.js` can queue redemptions — sync on reconnect.

---

## Target State

| Area | Target |
|------|--------|
| **Copy** | De-emphasize star counts in child UI |
| **Rewards** | Onboarding seeds 3–5 meaningful default rewards |
| **Approval** | Optional per reward — default auto-approve for low-star items |
| **Analytics** | Track redemption → real-world follow-through (parent survey later) |
| **Tests** | HTTP integration tests in CI gate |
| **Naming** | Analytics events disambiguate `skattkammaren_child` vs `skattkammaren_marketing` |
| **Inflation guard** | Admin alert if family sets all activities to max stars |

---

## Economy Rules

**R-01** Stars awarded only on verified completion (`daily_log_item.completed`).  
**R-02** Stars cannot be purchased with money.  
**R-03** Redemption deducts balance atomically.  
**R-04** Parent can deny redemption — child sees calm explanation.  
**R-05** No trading/gifting stars between children (unless explicit future feature + Decision Log).  
**R-06** Lifetime stars monotonic — never decrease (universe uses separate counter).  
**R-07** Reward cost in stars must feel achievable within ~1 week of normal use for defaults.  
**R-08** Virtual-only rewards allowed but must pair with copy linking to real celebration.

---

## Default Star Values (Current State)

Per-activity `star_value` on template — family editable. Registration seeds ~56 activities with default values from `default_activity_template` or hardcoded fallback.

**Target:** Journey phase `SETTING_UP` suggests balanced defaults — not zero, not inflationary.

---

## Redemption Flow

```
Child completes activities → balance increases
Child opens Skattkammaren → selects reward → redeem request
If approval required → parent notification → approve/deny
Child sees confirmation → REAL WORLD treat happens offline
```

**Critical:** App must never imply the digital redemption replaces the real treat.

---

## Examples

### ✅ Good reward

"Filmkväll på fredag" — 20 stars — parent approves — family actually watches film.

### ❌ Bad reward

"Infinite gems pack" — no real-world anchor.

---

## Anti-patterns

- Star leaderboard between siblings
- Daily star multiplier for logins
- Rewards that only change avatar with no routine link
- Negative stars / punishment deductions

---

## Acceptance Criteria

Reward change complete when:

- [ ] R-01–R-08 preserved
- [ ] Redemption race test updated if logic touched
- [ ] Child + parent surfaces tested
- [ ] Analytics event names disambiguated

---

## Implementation Guidance

Files: `src/routes/rewards.js`, `public/js/child-dashboard-rewards.js`, `public/js/skattkammaren-parent-page.js`, `db/child-universe.js` (lifetime stats).

Promote `rewards.test.js` to HTTP integration — Target milestone.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [06_GAME_DESIGN.md](./06_GAME_DESIGN.md) | Motivation |
| [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) | Lifetime stars |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Child UI |
| [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) | Approval |
| [08_BUILD_SYSTEM.md](./08_BUILD_SYSTEM.md) | Reward CRUD in library |

---

## AI Instructions

Never add star purchase IAP. Any new currency requires Decision Log + CEO approval.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Real-world treat emphasis protects mission |
| **CPO** | Three Skattkammaren surfaces flagged for analytics |
| **CTO** | Race protection documented |
| **Principal Engineer** | CI test gap noted |
| **Senior Game Designer** | R-08 achievability guideline good |
| **UX Director** | Deny flow needs calm copy — implied |
| **Art Director** | N/A |
| **QA Director** | Race test referenced |
| **Security Engineer** | Child redeem scoped to JWT |
| **AI Systems Architect** | R-rules citable |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/08_BUILD_SYSTEM.md
================================================================================

# 08 — Build System

**Version:** 1.0  
**Authority:** How parents **create and maintain** routine content (activities, schedules, rewards, images)

---

## Purpose

Define the **Build System** — the product capability for parents to construct family routines. There is **no feature named "Build Mode"** in the codebase; this document names and governs the **Bibliotek (Library)** and related planning tools.

> SYSTEM_ANALYSIS §9: closest equivalent is Library + schedule editor.

## Scope

Parent-side content creation: `library.html`, `schedule.html`, `activities.html`, image tools, standard library import. Not child customization (see [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md)).

## Definitions

| Term | Definition |
|------|------------|
| **Bibliotek** | `/library` — magic + classic tabs for family content |
| **Standard library** | Admin-global templates copied to families |
| **Build action** | Create/edit activity, schedule item, reward, image |
| **Configuration debt** | Each field we ask parents to fill |

---

## North Star

Parents should **build once**, then the product **leads** — build system supports setup, Journey supports daily execution ([05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md)).

Target: **minimize build time** to First Success — pre-fill aggressively.

---

## Current State (verified)

### Entry points

| Path | Module |
|------|--------|
| `/planning` | `planning-hub.js` → links |
| `/library` | `library.html`, `library.js`, `library-magic-hub.js` |
| `/schedule` | `schedule.js` (~2594 lines) |
| `/activities` | Activity management |
| `/library#magic-bilder` | `library-images.js`, crop |

### Library tabs (classic)

Schedule categories · Activities · Rewards · Standard library import

### Magic library shell

`library-magic-hub.js`, `library-magic-schedules.js`, `library-magic-mine.js`

### APIs

| API | Role |
|-----|------|
| `/api/activities` | Family activity templates |
| `/api/standard-library` | Copy from global |
| `/api/schedules/*` | Weekly/special schedules |
| `/api/upload` | Images → R2 or local |

### Onboarding build

`onboarding.js` step 3 — template picker (requires global library in prod).

**Dev gap:** empty `default_schedule` / `default_activity_template` without harvest.

---

## Target State

| Area | Target |
|------|--------|
| **First Success path** | ≤3 build decisions in onboarding; smart defaults |
| **Library UX** | Magic hub only — classic tabs retired |
| **Schedule editor** | Further extract from `schedule.js`; share all logic with dashboard via `schedule-core.js` |
| **Images** | Visual-first activities default — bildschema positioning |
| **AI assist** | Starter plan suggests activities — bounded, parent approves |
| **Build vs run** | Clear mode switch: Planering = build; Hem = run |
| **Content packs** | Importable packs (future) via feature flag + `global-library-import.js` pattern |

---

## Build System Rules

**B-01** Every new field must justify configuration debt (P-06).  
**B-02** Standard library import always offered before blank create.  
**B-03** Drag-and-drop schedule editing allowed for parents — not child.  
**B-04** Image upload supports crop — `library-image-crop.js` pattern.  
**B-05** Destructive deletes require confirm — schedule items support "bara denna dag" exclusion.  
**B-06** Pedagog cannot use build system on family content unless role permits — authz.  
**B-07** Build changes should not silently break child's today view — SSE or refresh hint.  
**B-08** No build actions on Hem — redirect to Planering.

---

## Current vs Target: Parent "build" verbs

| Verb | Current State | Target State |
|------|---------------|--------------|
| Drag/drop schedule | Yes — schedule editor | Keep — parent-only |
| Paint/customize activity image | Partial — upload + crop | Illustration templates |
| Assemble routine | Template picker onboarding | AI starter + one-tap accept |
| Discover content | Standard library browse | Journey-suggested templates |

Child **build** verbs (world decor) — [09_WORLD_ENGINE.md](./09_WORLD_ENGINE.md) — not this document.

---

## Examples

### ✅ Good build flow

Onboarding: "Vi har satt upp en morgonrutin åt er" → parent adjusts one activity → done.

### ❌ Bad build flow

Empty library → "Skapa aktivitet" with 12 required fields.

---

## Anti-patterns

- Blank slate after registration
- Duplicate schedule logic diverging between dashboard and schedule page
- Building on Hem dashboard
- Requiring global library harvest for local dev tests without seed script

---

## Acceptance Criteria

Build feature complete when:

- [ ] B-01–B-08 satisfied
- [ ] Onboarding path tested with seeded library
- [ ] Schedule changes reflect on child Today within one refresh cycle
- [ ] `schedule-core.js` shared where applicable

---

## Implementation Guidance

Extract schedule logic per REFACTOR Fas 8 pattern — new modules in `public/js/schedule-*.js`.

Harvest/import for dev: `npm run harvest:library` + `import:library` (prod creds) — document in [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md).

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [05_PARENT_EXPERIENCE.md](./05_PARENT_EXPERIENCE.md) | Planering hub |
| [07_REWARD_SYSTEM.md](./07_REWARD_SYSTEM.md) | Rewards tab |
| [04_CHILD_EXPERIENCE.md](./04_CHILD_EXPERIENCE.md) | Consumer of build output |
| [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md) | Upload, APIs |

---

## AI Instructions

Do not create `build-mode.js` — extend library/schedule modules. Minimize new required form fields.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Naming "Build System" clarifies mission language vs code |
| **CPO** | Pre-fill target aligns with First Success |
| **CTO** | schedule.js size acknowledged — phased extract |
| **Principal Engineer** | schedule-core sharing explicit |
| **Senior Game Designer** | Parent build vs child build separated — correct |
| **UX Director** | B-08 keeps Hem clean |
| **Art Director** | Image/crop path is visual build — good |
| **QA Director** | Dev library gap noted |
| **Security Engineer** | Upload authz via parent JWT |
| **AI Systems Architect** | Prevents spurious build-mode feature |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/09_WORLD_ENGINE.md
================================================================================

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


================================================================================
FILE: product-operating-system/10_TECH_ARCHITECTURE.md
================================================================================

# 10 — Tech Architecture

**Version:** 1.0  
**Authority:** Technical boundaries and extensibility — implements [02_PRODUCT_PRINCIPLES.md](./02_PRODUCT_PRINCIPLES.md) engineering principles

---

## Purpose

Document the **approved architecture** for Stjärndag: what exists, what may be extended, and what requires ADR before change. Supports iPhone, Android, Web, offline, future AI/worlds/multiplayer **without rewrites**.

## Scope

Server, database, client, mobile, deploy, integrations. Not visual design (03) or QA process (12).

## Definitions

| Term | Definition |
|------|------------|
| **Remote WebView** | Capacitor loads live site URL — not bundled SPA |
| **Query layer** | `db/*.js` modules (partial adoption) |
| **Product authority** | Journey Context + Gate — Target State |
| **Facts layer** | DB → collector → engine/journey |

---

## Architecture Overview

```
Clients (PWA / Capacitor iOS/Android / Admin)
        │
        ▼
Express (app.js) ─ middleware chain ─ registerRoutes()
        │
        ├── src/routes/ (77 modules)
        ├── src/lib/ (134 modules, schedulers)
        ├── src/core-engine/ (Product Engine — transitional)
        ├── src/lib/journey/ (Family Journey — Target authority)
        └── db/*.js → src/lib/db.js (pg pool)
        │
        ▼
PostgreSQL (66 migrations)
        │
External (optional): Resend, R2/local uploads, RevenueCat, VAPID, APNs, FCM
```

---

## Current State (verified)

### Runtime

| Item | Value |
|------|-------|
| Node | 20 (`.nvmrc`) |
| Entry | `server.js` → `createApp()` in `app.js` |
| Schedulers | 14 started in `server.js` |
| Static | `public/` + `/uploads` |
| Health | `GET /health` — static JSON |

### Middleware order (security-critical)

1. Resend webhook (raw body)
2. JSON, cookies, request ID
3. `restoreParentSession` → `optionalAuth` → `globalLimiter`
4. Platform HTML inject, security headers
5. Maintenance (IAP exempt)
6. `/api`: CSRF → impersonation block → child API block → apiLimiter
7. Routes → static → 404

### Auth

| Layer | File |
|-------|------|
| JWT | `src/middleware/auth.js` |
| Authz | `src/middleware/authz.js` |
| Child block | `child-parent-api-block.js` |
| CSRF | `csrf.js` |
| Subscription components | `require-component.js` |

### Mobile

Capacitor 7 — `capacitor.config.ts` remote URL; iOS in repo; Android generated via `cap:sync:android`. `platform.js` unregisters SW on native.

### Deploy

GitHub Actions → VPS SSH → `npm ci` → migrate → systemd restart. See `AGENTS.md`, `.github/workflows/deploy.yml`.

### Product intelligence (transitional)

| System | Status |
|--------|--------|
| Family Journey | Implemented Fas 1–5; flags mostly OFF |
| Product Engine | `/api/family/first-success`; shadow mode |
| Readiness | Legacy |
| Activation Program | Active enrollments |

---

## Target State

| Area | Target |
|------|--------|
| **Product authority** | Journey + Gate only — [14_DECISION_LOG.md](./14_DECISION_LOG.md) ADR-001 |
| **Schedulers** | All retention comms through Gate |
| **Query layer** | Routes use `db/*` — no inline SQL in routes |
| **Rate limits** | Redis-backed for multi-instance |
| **Job runner** | Central queue vs 14 setTimeout loops |
| **OpenAPI** | Generated route inventory |
| **CSP** | Enforced not report-only |
| **Bundling** | Optional esbuild for JS — phased |
| **Multi-instance** | Advisory locks → shared job ownership |

---

## Extension Points (build without rewrite)

| Future need | Extension mechanism |
|-------------|---------------------|
| **Content packs** | `global-library-import.js`, feature flags, migrations |
| **New worlds/rooms** | `universe-engine` arrays + client room module |
| **New Journey phases** | `phases.js`, registry JSON, migration for milestones |
| **New billing component** | `config/component-feature-map.js`, `requireComponent()` |
| **AI coaching** | Facts collector + presentation adapter — never in UI |
| **Multiplayer/family sync** | SSE today; family-scoped IDs ready |
| **i18n** | `src/lib/i18n.js` — expand locales |
| **Native features** | `platform.js` facade + Capacitor plugins |

---

## Layer Rules

**T-01** Business logic in server — not in HTML inline scripts.  
**T-02** Product decisions in Journey/Engine — UI is dumb channel.  
**T-03** Child cannot hit parent APIs — server enforced.  
**T-04** Parameterized SQL only.  
**T-05** New routes mount in `src/routes/index.js` with order comment if sensitive.  
**T-06** Migrations idempotent; timestamp prefix in `migrations/`.  
**T-07** SW cache version bump on static asset changes — CI gate.  
**T-08** Secrets never committed — env vars only.  
**T-09** Third-party keys optional — graceful degradation.  
**T-10** Large files: extract modules — see `.cursor/rules/large-files.mdc`.

---

## Key Directories

| Path | Owns |
|------|------|
| `src/routes/` | HTTP handlers |
| `src/middleware/` | Cross-cutting HTTP |
| `src/lib/` | Services, schedulers, journey |
| `src/core-engine/` | Product Engine (transitional) |
| `db/` | SQL query modules |
| `public/js/` | Client IIFE modules |
| `migrations/` | Schema deltas |
| `test/` | Node test runner |

---

## Anti-patterns

- New global subscription middleware in `app.js`
- Duplicate authz (`childAccess.js` pattern)
- Business logic in `public/admin` without API
- Cron-less scheduler duplication without advisory lock
- Tailwind CDN

---

## Acceptance Criteria

Architecture change approved when:

- [ ] Decision Log entry if structural
- [ ] T-01–T-10 preserved
- [ ] `test:gate` green
- [ ] Route inventory updated if routes added (`npm run dump:routes`)
- [ ] No new product authority without sunset plan

---

## Implementation Guidance

Read `SYSTEM_ANALYSIS.md` before structural work. Prefer Target State patterns.

Node 20 in all shells: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md) | Agent workflow |
| [12_QA_SYSTEM.md](./12_QA_SYSTEM.md) | test:gate |
| [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md) | Deploy |
| [14_DECISION_LOG.md](./14_DECISION_LOG.md) | ADRs |

---

## AI Instructions

1. Read middleware order before new `/api` routes.
2. Do not reintroduce Stripe or global paywall.
3. Mount-order sensitive: `/api/me` child routers before catch-alls.
4. Use `db/*` for new queries.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Extension table shows acquisition-ready platform story |
| **CPO** | Journey target authority clear |
| **CTO** | Accurate Current State from SYSTEM_ANALYSIS |
| **Principal Engineer** | T-rules and mount order protect regressions |
| **Senior Game Designer** | Universe extension path clear |
| **UX Director** | N/A |
| **Art Director** | N/A |
| **QA Director** | test:gate referenced |
| **Security Engineer** | Middleware chain documented |
| **AI Systems Architect** | Directory map + T-rules essential for agents |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/11_AI_DEVELOPER_GUIDE.md
================================================================================

# 11 — AI Developer Guide

**Version:** 1.0  
**Authority:** Rules for autonomous AI agents working on Stjärndag

---

## Purpose

Enable AI developers to ship **correct, on-brand** changes without founder access — by pointing to POS, codebase facts, and forbidden patterns.

## Scope

All AI-assisted coding in this repository. Humans follow the same rules.

## Definitions

| Term | Definition |
|------|------------|
| **POS** | `/product-operating-system/` |
| **Current State** | What code + flags do today |
| **Target State** | What new work must move toward |
| **Maintenance mode** | Explicit user request to patch legacy only |

---

## Read Order (before every task)

1. [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md)
2. Task-relevant domain doc (04–09)
3. [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md)
4. [14_DECISION_LOG.md](./14_DECISION_LOG.md)
5. [../SYSTEM_ANALYSIS.md](../SYSTEM_ANALYSIS.md) for Current State facts
6. `AGENTS.md` for environment commands

**If legacy `docs/*` contradicts POS → POS wins.**

---

## Decision Protocol

```
Request → Constitution check → Principle check → Current vs Target
    → If Target-aligned: implement
    → If legacy-only: refuse OR maintenance mode with explicit label
    → If unclear: ask user OR log Open Question in PR — do not guess
```

---

## Current State vs Target State (agent defaults)

| Topic | Default for new work |
|-------|---------------------|
| Home coach | Journey (`journey-coach.js`) only |
| Retention email/push | Journey Gate |
| Paywall | `requireComponent()` per route |
| Child UI | Extend `child-*.js` modules |
| Parent schedule | Share `schedule-core.js` |
| Product docs | Update POS if normative change |

Unless user says **maintenance only**, implement **Target State**.

---

## Environment (Cloud / local)

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# DATABASE_URL, JWT_SECRET injected on Cloud
NODE_ENV=development REQUIRE_EMAIL_VERIFICATION=false npm run dev
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:gate
npm install --include=dev --legacy-peer-deps
```

Never run full `npm test` on prod VPS with live email keys.

---

## File Size Rules

Per `.cursor/rules/large-files.mdc`:

- **Never** full-read: `schedule.js`, `dashboard.js`, `child-dashboard.js`, large HTML
- **Grep first**, chunk-read max 200 lines, max one large file per turn
- **New features** → new small files (`dashboard-cta.js` pattern)

---

## Forbidden Actions (without explicit approval)

| Action | Why |
|--------|-----|
| New coach mount on Hem | PA-01 |
| Global subscription middleware | Removed — ADR |
| Child-facing forms/settings | C-01 |
| Star purchase IAP | R-02 |
| Tailwind CDN | DS-05 |
| Copy stale `docs/*` into code without verification | AI risk |
| Full read of 2500+ line files | Rule violation |
| `npm test` on live VPS | AGENTS.md |
| Commit secrets / live deploy URLs | Security |

---

## Required Actions

| Action | When |
|--------|------|
| Cite constitution/principle IDs in PR | User-facing changes |
| Run `test:gate` | Server/journey/auth changes |
| Run `npm run check:css` | Tailwind class changes |
| Bump `public/sw.js` CACHE_NAME | Static asset changes |
| Update Decision Log | Architectural/product decisions |
| Label Current vs Target in PR body | Ambiguous migrations |

---

## Code Patterns

### API route

```javascript
// src/routes/example.js
router.post('/', requireParent, validate(Schema), asyncHandler(async (req, res) => {
  // use db/*.js or authz helpers — not raw ownership SQL
}));
```

### Client module

```javascript
// public/js/example-feature.js — IIFE
(function () {
  'use strict';
  // expose only necessary window.* handlers
})();
```

### Feature flag

Check `db/features.js` / `feature_flag` table — document default in PR.

---

## Testing Map

| Change type | Minimum test |
|-------------|--------------|
| Journey | `npm run test:gate` (journey-* included) |
| Auth | `auth-integration.test.js` |
| Paywall | `paywall-model-contract.test.js` (promote to gate when touched) |
| Engine | `test:engine` |
| Static routes | `app-links-routes.test.js` |

---

## Open Questions Protocol

If POS does not answer:

1. State **Open Question** in PR
2. Do not invent product behavior
3. Prefer smallest technical change
4. Ask user or log in [14_DECISION_LOG.md](./14_DECISION_LOG.md) §Open

---

## Cross References

| Document | Relationship |
|----------|--------------|
| All POS docs | Authority |
| [12_QA_SYSTEM.md](./12_QA_SYSTEM.md) | Verification |
| [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md) | Ship |
| [14_DECISION_LOG.md](./14_DECISION_LOG.md) | ADRs |

---

## AI Instructions (meta)

This document is self-applicable: follow read order, decision protocol, forbidden/required lists on every task.

When completing work: output which POS sections governed the change.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Reduces founder dependency — goal met |
| **CPO** | Target default prevents legacy perpetuation |
| **CTO** | Env + test commands accurate per AGENTS.md |
| **Principal Engineer** | Large file rules referenced |
| **Senior Game Designer** | Forbidden IAP stars correct |
| **UX Director** | N/A |
| **Art Director** | N/A |
| **QA Director** | Testing map linked |
| **Security Engineer** | Secrets + prod test ban |
| **AI Systems Architect** | Self-contained agent playbook |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/12_QA_SYSTEM.md
================================================================================

# 12 — QA System

**Version:** 1.0  
**Authority:** Quality verification standards for all releases

---

## Purpose

Define how Stjärndag is tested before release — automated gates, manual protocols, and role responsibilities — so **European-scale trust** is earned.

## Scope

Pre-release verification for web, iOS, Android, backend. Admin smoke included. Not penetration testing (separate engagement).

## Definitions

| Term | Definition |
|------|------------|
| **CI gate** | `npm run test:gate` — 19 curated test files |
| **Full suite** | `npm test` — ~181 files |
| **Mobile gate** | `npm run qa:mobile-gate` — Puppeteer protocol |
| **Constitution test** | Manual check of five rules |

---

## Quality North Star

> No release ships without **gate green** + **constitution spot-check** on affected flows.

Target: expand gate to cover paywall, IAP, universe engine.

---

## Current State (verified)

### Automated CI (`.github/workflows/ci.yml`)

| Step | Command |
|------|---------|
| Install | `npm ci --legacy-peer-deps` |
| CSS | `npm run check:css` |
| Lint server | `npm run lint` |
| Lint client | `npm run lint:public` (warning budget 735 — often exceeded ~2900) |
| Migrate | `npm run migrate` |
| Gate | `npm run test:gate` |
| Migration rollback | `migration-rollback-gate.test.js` |

### test:gate files (19)

`setup-test-db`, `auth-integration`, `child-access-integration`, `maintenance-order`, `app-links-routes`, `engine-golden`, `engine-shadow-logic`, `first-success-api`, `engine-coach-authority`, `journey-context`, `journey-route-scope`, `journey-fas2`–`fas5`, `journey-golden-path`, `journey-daily-analysis`

### Not in gate (gaps)

| Area | Test file |
|------|-----------|
| Paywall | `paywall-model-contract.test.js` |
| Journey Gate | `journey-communication-gate.test.js` |
| Activation program | ~15 files |
| Rewards HTTP | partial mocks only |
| IAP webhook | **none** |
| Universe engine | **none** |
| E2E browser | scripts only |

### Manual protocols

| Doc | Use |
|-----|-----|
| `docs/QA-mobil-release-gate-runbook.md` | Mobile release |
| `docs/QA-mobil-fullstandig-protokoll.md` | Full mobile QA |
| `npm run qa:mobile-gate` | Automated mobile smoke |

### DB tests

PostgreSQL advisory lock — `test/helpers/db-test-lock.js`

---

## Target State

| Area | Target |
|------|--------|
| **Gate expansion** | + paywall, communication-gate, universe-engine unit tests |
| **IAP webhook** | Integration test with mock RevenueCat |
| **lint:public** | Reduce warnings OR raise budget with plan |
| **Constitution checklist** | Required in PR template for user-facing |
| **Child a11y** | WCAG audit checklist |
| **Visual regression** | Optional Playwright screenshots for magic UI |
| **Staging** | Pre-prod environment for flag rollout |

---

## QA Rules

**Q-01** `test:gate` must pass before merge to main.  
**Q-02** User-facing PR requires manual flow note in PR body.  
**Q-03** Child-surface changes require child-login + completion smoke.  
**Q-04** Parent coach changes require Hem screenshot or recording.  
**Q-05** Mobile release requires `qa:mobile-gate` or runbook sign-off.  
**Q-06** Security-sensitive changes require auth integration tests.  
**Q-07** Migrations require rollback gate test.  
**Q-08** No `@example.com` emails with live Resend in tests without unset keys.  
**Q-09** Apple Sign In changes require `verify-ios-apple-sign-in-patch.mjs`.  
**Q-10** Flag rollout requires journey rollout script status check.

---

## Constitution Test (manual — every release touching UX)

| Rule | Test |
|------|------|
| 1 Leads | New parent sees one next step on Hem |
| 2 No surprise | No unexplained modals |
| 3 Next step | No empty Hem |
| 4 Uncertainty | Copy confirms progress after onboarding action |
| 5 Complete | Post-register has schedule/activities visible |

---

## Test Layers

```
Layer 4: Manual constitution + mobile runbook
Layer 3: qa:mobile-gate / smoke scripts
Layer 2: npm test (full) — pre-release optional
Layer 1: test:gate — CI required
Layer 0: lint + css check
```

---

## Release QA Checklist (summary)

- [ ] CI green on PR
- [ ] `test:gate` locally if server changed
- [ ] SW version bumped if static changed
- [ ] Constitution spot-check (if UX)
- [ ] Mobile gate (if native-affecting)
- [ ] Journey flag rollout doc updated (if flags)
- [ ] Health check after deploy — `GET /health`

Full process: [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md)

---

## Anti-patterns

- Merge with failing gate "to fix later"
- Run full test suite on prod DB
- Skip mobile QA for Capacitor/plugin changes
- Rely on login metrics test for retention features

---

## Acceptance Criteria

QA system update complete when documented in this file and Decision Log if gate composition changes.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md) | Deploy gate |
| [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md) | Agent testing |
| [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md) | Manual tests |
| [../SYSTEM_ANALYSIS.md](../SYSTEM_ANALYSIS.md) §23 | Gap analysis |

---

## AI Instructions

Always run `test:gate` after server changes. Report gaps if touching paywall/IAP/universe without tests — propose test in same PR.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Trust requires gate expansion — Target honest |
| **CPO** | Constitution manual test bridges product/QA |
| **CTO** | CI steps match repo |
| **Principal Engineer** | Gap list drives roadmap |
| **Senior Game Designer** | N/A |
| **UX Director** | Screenshot requirement for coach |
| **Art Director** | Visual regression optional |
| **QA Director** | Layer model actionable |
| **Security Engineer** | Q-06 auth tests |
| **AI Systems Architect** | Agent must run gate |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/13_RELEASE_PROCESS.md
================================================================================

# 13 — Release Process

**Version:** 1.0  
**Authority:** How software reaches families safely

---

## Purpose

Define the release pipeline from merge to live users (web + native), including rollback, flags, and post-deploy verification.

## Scope

Web/VPS deploy via GitHub Actions, native iOS/Android release coordination, cache/service worker, database migrations.

## Definitions

| Term | Definition |
|------|------------|
| **main** | Release branch (live deploy) |
| **Deploy workflow** | `.github/workflows/deploy.yml` |
| **CI workflow** | `.github/workflows/ci.yml` |
| **SW** | Service worker `public/sw.js` CACHE_NAME |
| **Rollout** | Feature flag wave — `journey-rollout-advance.js` |

---

## Release North Star

> Families never see broken routines because we skipped CI or migration verification.

---

## Current State (verified)

### Pipeline

```
PR → CI (lint, css check, migrate, test:gate, migration rollback)
Merge to main → CI success triggers deploy workflow
Deploy SSH → git reset --hard → npm ci → migrate → systemd restart
Health: sleep 3 → curl /health (retries)
```

**Note:** Deploy triggers on **CI success**, not raw push alone.

### Build

`npm run build` = migrate + Tailwind CSS build (`scripts/css-build.mjs`)

### Native (iOS)

- Capacitor remote WebView — **web deploy IS app deploy** for UI
- Native binary required for: plugins, App Store review, push entitlements
- iOS patches: Apple Sign-In main thread — Podfile post_install
- Commands: `npm run cap:sync:ios`, Xcode archive, TestFlight

### Native (Android)

- `android/` generated — not in repo
- `npm run cap:sync:android`, `npm run android:aab`

### Cache busting

Commit `tailwind.build.css` + bump `public/sw.js` CACHE_NAME — CI enforces via `check:css`

### Ops reference

`AGENTS.md`, `.cursor/rules/*-deploy.mdc`, `docs/VPS-DEPLOY-GITHUB-ACTIONS.md`

---

## Target State

| Area | Target |
|------|--------|
| **Staging env** | Flag QA before prod waves |
| **Automated health** | Post-deploy smoke in workflow |
| **Gate expansion** | Matches [12_QA_SYSTEM.md](./12_QA_SYSTEM.md) |
| **Release notes** | Auto from PR labels + pillar tags |
| **Native cadence** | Decoupled binary releases documented |
| **Rollback** | One-command git revert + migrate down policy |

---

## Release Rules

**REL-01** No direct push to main without CI.  
**REL-02** Migrations must be backward-compatible for one deploy (rollback gate).  
**REL-03** SW version bump on any static JS/CSS change.  
**REL-04** Journey flag changes follow journey ops runbook in `docs/`.  
**REL-05** Native plugin changes require mobile QA gate.  
**REL-06** Email-heavy releases unset email API keys in test runs (see AGENTS.md).  
**REL-07** Post-deploy: health check + journalctl spot check.  
**REL-08** Version in `/health` should match release tag — Target (currently static).  
**REL-09** Constitution spot-check for UX releases — [12_QA_SYSTEM.md](./12_QA_SYSTEM.md).

---

## Release Types

| Type | Path |
|------|------|
| **Web hotfix** | PR → CI → auto deploy |
| **Schema change** | Migration + rollback test + deploy |
| **Flag rollout** | Admin/CLI rollout + monitor |
| **Native build** | Web deploy + binary submit when plugins change |
| **POS doc only** | No deploy required |

---

## Rollback

1. Revert commit on main (or reset to known good SHA)
2. Deploy pipeline runs automatically
3. If migration irreversible — restore DB backup (manual ops)
4. Disable feature flag if flag-related incident

---

## Pre-merge Checklist

- [ ] CI green
- [ ] test:gate locally for server changes
- [ ] check:css if Tailwind touched
- [ ] Migration reviewed for locking/downtime
- [ ] SW bumped if static changed
- [ ] Decision Log if architectural
- [ ] PR cites POS sections

---

## Post-deploy Checklist

- [ ] `GET /health` returns healthy
- [ ] Login smoke (parent + child)
- [ ] Journey flag state as intended
- [ ] Error rate in logs normal (5 min)
- [ ] Native: TestFlight smoke if binary changed

---

## Anti-patterns

- Deploy without migrate
- Bump only SW without rebuilding CSS when classes changed
- Enable journey flags without removing legacy coach mounts
- Manual VPS edit without commit to main

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [12_QA_SYSTEM.md](./12_QA_SYSTEM.md) | Test gates |
| [10_TECH_ARCHITECTURE.md](./10_TECH_ARCHITECTURE.md) | Stack |
| [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md) | Agent deploy rules |
| [14_DECISION_LOG.md](./14_DECISION_LOG.md) | Deploy ADRs |

---

## AI Instructions

Never SSH to prod for deploy if GitHub Actions available. After VPS restart: sleep 3, curl health per AGENTS.md.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Rollback clarity reduces incident fear |
| **CPO** | Flag rollout tied to ops doc |
| **CTO** | Pipeline matches workflows |
| **Principal Engineer** | REL-02 rollback gate referenced |
| **Senior Game Designer** | N/A |
| **UX Director** | Constitution check on UX release |
| **Art Director** | CSS/SW coupling documented |
| **QA Director** | Checklists complete |
| **Security Engineer** | No manual uncommitted prod edits |
| **AI Systems Architect** | Clear REL rules for agents |

**Approved:** All roles — v1.0.


================================================================================
FILE: product-operating-system/14_DECISION_LOG.md
================================================================================

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
