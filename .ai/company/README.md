# Stjärndag — Company Operating System (COS)

**Version:** 1.0  
**Status:** Executive authority — complements POS and AOS  
**Created:** 2026-06-29

---

## What This Is

**How the company thinks, decides, prioritizes, and approves** — written for AI agents acting as executive leadership and for senior hires who need company judgment without the founder in the room.

| Layer | Location | Answers |
|-------|----------|---------|
| **Product OS** | `product-operating-system/` | Product truth — what we build |
| **AI OS** | `.ai/` + `.cursor/rules/` | Engineering execution |
| **Company OS** | `.ai/company/` (this folder) | **Executive judgment** |
| **Runtime** | Root `AGENTS.md` | VM, CI, deploy |

### Supremacy

1. **POS** — product law (never duplicated here)  
2. **COS** — how executives apply POS to decisions  
3. **AOS** — how engineers ship  
4. Code · SYSTEM_ANALYSIS (context)

> COS **references** POS. If COS and POS conflict, **POS wins** — fix COS.

---

## Playbooks

| # | Document | Role |
|---|----------|------|
| 001 | [CEO_PLAYBOOK.md](./001_CEO_PLAYBOOK.md) | Mission, vision, priority, conflict resolution |
| 002 | [CPO_PLAYBOOK.md](./002_CPO_PLAYBOOK.md) | Product decisions, feature bar |
| 003 | [CTO_PLAYBOOK.md](./003_CTO_PLAYBOOK.md) | Technical strategy, architecture approval |
| 004 | [GAME_DIRECTOR_PLAYBOOK.md](./004_GAME_DIRECTOR_PLAYBOOK.md) | Motivation, world, progression |
| 005 | [CREATIVE_DIRECTOR_PLAYBOOK.md](./005_CREATIVE_DIRECTOR_PLAYBOOK.md) | Visual philosophy, craft |
| 006 | [UX_DIRECTOR_PLAYBOOK.md](./006_UX_DIRECTOR_PLAYBOOK.md) | Flows, clarity, calm |
| 007 | [QA_DIRECTOR_PLAYBOOK.md](./007_QA_DIRECTOR_PLAYBOOK.md) | Quality gate, ship/no-ship |
| 008 | [GROWTH_PLAYBOOK.md](./008_GROWTH_PLAYBOOK.md) | Acquisition, retention ethics |
| 009 | [ANALYTICS_PLAYBOOK.md](./009_ANALYTICS_PLAYBOOK.md) | Measurement without betraying mission |
| 010 | [RELEASE_COMMAND.md](./010_RELEASE_COMMAND.md) | Ship authority, rollback, comms |

---

## When to Read

| Situation | Playbooks |
|-----------|-----------|
| Prioritize roadmap | 001, 002, 008 |
| Approve feature | 002, 006, 004 (if child/world) |
| Architecture change | 001, 003, 010 |
| Visual/motion change | 005, 006 |
| Ship decision | 007, 010 |
| Metrics / experiment | 008, 009 |

Always cross-check: `product-operating-system/15_PRODUCT_QUALITY_STANDARD.md`

---

## Export

Full text: `/AI-COMPANY-ALL-DOCUMENTS-TEMP.md` (repo root)

---

## Versioning

**1.0** — Initial COS alongside AOS v1.0 and POS v2.0
