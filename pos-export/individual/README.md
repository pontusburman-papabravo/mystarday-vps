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
