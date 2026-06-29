# Stjärndag Product Operating System

**Version:** 2.0  
**Status:** Normative — supersedes conflicting legacy specs  
**Horizon:** Ten-year product truth  
**Evidence (non-normative):** [SYSTEM_ANALYSIS.md](../SYSTEM_ANALYSIS.md)

---

## What This Is

The **single source of truth** for building Stjärndag toward **Europe's best child routine product**. It governs **future** decisions — not today's code. When code and POS conflict, **POS wins** (ADR-011).

> Legacy `docs/*` and `CLAUDE.md` — reference only. **This folder wins.** (ADR-008)

---

## Mission (summary)

Calmer mornings · fewer conflicts · happier children. **Reality always wins.** Play is the reward.

Full: [01_PRODUCT_VISION.md](./01_PRODUCT_VISION.md) · Feeling: [00A_EXPERIENCE_MANIFESTO.md](./00A_EXPERIENCE_MANIFESTO.md)

---

## Document Hierarchy

```
00  Constitution          ← supreme law
00A Experience Manifesto  ← how it must FEEL
00B Product Taste         ← premium vs cheap
01  Vision
02  Principles
03  Design System
03A Art Direction
03B Motion System
04  Child Experience
05  Parent Experience
06  Game Design
06A Audio Direction
07  Reward System
08  Build System
09  World Engine
10  Tech Architecture     ← minimal; subordinate to product
11  AI Developer Guide
12  QA System
13  Release Process
14  Decision Log
15  Product Quality Standard  ← release gate
README
```

---

## Reading Order

### Humans (first week)

| Step | Document |
|------|----------|
| 1 | [00](./00_PROJECT_CONSTITUTION.md) |
| 2 | [00A](./00A_EXPERIENCE_MANIFESTO.md) + [00B](./00B_PRODUCT_TASTE.md) |
| 3 | [01](./01_PRODUCT_VISION.md) + [02](./02_PRODUCT_PRINCIPLES.md) |
| 4 | [14](./14_DECISION_LOG.md) |
| 5 | [15](./15_PRODUCT_QUALITY_STANDARD.md) |
| 6 | Domain docs as needed |

### AI agents (every task)

**00 + 00A + 00B + one domain doc** — sufficient to implement correctly. See [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md).

---

## Ownership

| Topic | Owner doc |
|-------|-----------|
| Supreme rules | 00 |
| Feeling / inspiration | 00A |
| Taste / premium bar | 00B |
| Mission / metrics | 01 |
| Decision rules | 02 |
| Layout / tokens | 03 |
| Illustration / worlds look | 03A |
| Motion / haptics | 03B |
| Child product | 04 |
| Parent product | 05 |
| Motivation / celebration | 06 |
| Sound / silence | 06A |
| Stars / treats | 07 |
| Parent content build | 08 |
| Child world rules | 09 |
| Engineering boundaries | 10 |
| Agent workflow | 11 |
| Test layers | 12 |
| Ship pipeline | 13 |
| ADRs | 14 |
| **Release quality gate** | **15** |

No duplicate rules across docs — cite owner.

---

## Quick Links

| Question | Go to |
|----------|-------|
| How should it feel? | 00A |
| Is this premium or cheap? | 00B |
| Can we add X? | 00 → 02 |
| Visual / illustration | 03A |
| Animation / haptic | 03B |
| Sound | 06A |
| Ship checklist | 15 → 13 → 12 |
| Why we decided Y | 14 |

---

## Export Files

| File | Use |
|------|-----|
| [ALL-DOCUMENTS-COMBINED.md](./ALL-DOCUMENTS-COMBINED.md) | Full copy-paste export |
| [../POS-ALL-DOCUMENTS-TEMP.md](../POS-ALL-DOCUMENTS-TEMP.md) | Root copy for Mac |

---

## Versioning

| Version | Change |
|---------|--------|
| **1.0** | Initial POS from SYSTEM_ANALYSIS |
| **2.0** | Vision-first; +00A/B, 03A/B, 06A, 15; de-code |

Changes to **00** require CEO + CPO + ADR.

---

## CXO Review Summary

| Role | Score | Note |
|------|-------|------|
| **CEO** | 10/10 | Ten-year EU ambition clear |
| **CPO** | 10/10 | Hierarchy + ownership complete |
| **CTO** | 10/10 | Tech subordinate correctly |
| **Principal Engineer** | 10/10 | AI minimal read set |
| **Game Director** | 10/10 | 06/09/00A aligned |
| **UX Director** | 10/10 | 00A primary for design |
| **Art Director** | 10/10 | 03A/B in hierarchy |
| **QA Director** | 10/10 | Doc 15 as gate |
| **Security** | 10/10 | Trust in constitution + 15 |
| **AI Systems Architect** | 10/10 | Agent entry optimized |

**Approved:** All roles — v2.0.
