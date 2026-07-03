# Company Operating System (COS) v1.4

**Type:** AI Development Organization operating system  
**Not:** Product documentation (that is POS)  
**Updated:** 2026-07-03

---

## What COS is

COS describes **how the AI organization works**: structure, decision rights, mission tiers, review depth, escalation, and human approval gate.

POS describes **what we build**. COS describes **how we build it**.

---

## Organization structure

```
Orchestrator (session lead)
├── Mission Control      — intake, tier, routing, handoff
├── Product Alignment    — POS compliance (CPO lens), no invention
├── Delivery Cells       — Engineering · Creative · Platform · Research
├── Assurance Cell       — QA + Security + tier-scaled review
├── Executive Council    — CEO · CPO · CTO (convened T3 only)
└── Org Health           — AI Systems Architect
```

Detail: [ORGANIZATION.md](./ORGANIZATION.md)

---

## Authority on conflict

```
POS (product law)
  → Product Alignment Office interprets
  → Delivery Cells implement
  → Assurance Cell verifies
  → Executive Council (T3 / deadlock)
  → Human (live deploy only)
```

COS playbooks 001–010 are **Executive Council judgment protocols** — not daily reading for every hotfix.

---

## Mission tiers

| Tier | Examples | Review depth |
|------|----------|--------------|
| T0 | Research, org audit | Org Health |
| T1 | Hotfix, test fix | Owner + Security + QA |
| T2 | Feature, refactor | TASK_ROUTER (3–5 reviewers) |
| T3 | Architecture, world, auth, IAP | Full Assurance + Council → RC |

Runtime: `.ai/runtime/MISSION_ENGINE.md` (tier field) · `.ai/runtime/REVIEW_ENGINE.md` (tier matrix)

---

## Human approval gate

**Policy:** [HUMAN_APPROVAL_GATE.md](./HUMAN_APPROVAL_GATE.md) · **Intent:** [STRATEGIC_INTENT.md](./STRATEGIC_INTENT.md) · **KPI:** [REPOSITORY_VALUE_SCORE.md](./REPOSITORY_VALUE_SCORE.md)

| Tier | PR | Pause |
|------|-----|-------|
| **ARC** | No | Never |
| **IRC** | Draft | Never |
| **HRC** | When ready | Escalate only |

**Mandate check:** Continue unless HRC trigger. **Blocked-ROI:** never idle — pick highest-value unblocked mission.

---

## Playbooks (Council protocols)

| # | Role |
|---|------|
| 001–003 | CEO, CPO, CTO |
| 004–006 | Game, Creative, UX Directors |
| 007–010 | QA, Growth, Analytics, Release |

---

## Versioning

| Version | Change |
|---------|--------|
| 1.0 | Executive playbooks |
| 1.1 | Org OS — cells, tiers, council convening model |
| 1.2 | HAG — IRC vs HRC, no pause for checkpoints, mandate-check escalation |
| 1.3 | ARC tier, blocked-ROI protocol, Repository Value Score KPI |
| 1.4 | Strategic Intent, AMQ, Nightly Review (Kill Ideas, CTO Review), Current Strategy |
