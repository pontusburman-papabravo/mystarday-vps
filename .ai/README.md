# AI Team Operating System

**Version:** 1.0  
**Status:** **Frozen**  
**Changes require:** PR + Executive Review + Human approval  
**Governance:** [GOVERNANCE.md](GOVERNANCE.md)

> **Start here:** [AGENTS.md](AGENTS.md) · **Constitution for Team OS:** [GOVERNANCE.md](GOVERNANCE.md)

---

## What This Is

The **AI Team Operating System** governs **how** autonomous agents work in this repository. It does **not** replace **Product OS** — it implements it.

| System | Location |
|--------|----------|
| Constitution | `docs/PRODUCT-CONSTITUTION.md` |
| Product OS | `product-operating-system/` |
| ADR | `product-operating-system/14_DECISION_LOG.md` |
| **Team OS** | `.ai/` (this tree) |
| **Team OS governance** | [GOVERNANCE.md](GOVERNANCE.md) |
| Runtime env | Root `AGENTS.md` |

**Authority:** [GOVERNANCE.md §2](GOVERNANCE.md#2-authority)

---

## Core Systems (v1.0 frozen)

| System | Document |
|--------|----------|
| Governance | [GOVERNANCE.md](GOVERNANCE.md) |
| Entry | [AGENTS.md](AGENTS.md) |
| Night / day | [NIGHT_SHIFT.md](NIGHT_SHIFT.md) · [DAY_SHIFT.md](DAY_SHIFT.md) |
| Decisions | [DECISION_MODEL.md](DECISION_MODEL.md) · [HUMAN_ESCALATION.md](HUMAN_ESCALATION.md) |
| Reporting | [MORNING_REPORT.md](MORNING_REPORT.md) |
| Knowledge | [KNOWLEDGE_MANAGEMENT.md](KNOWLEDGE_MANAGEMENT.md) |
| Multi-agent | [MULTI_AGENT_COORDINATION.md](MULTI_AGENT_COORDINATION.md) |
| Metrics | [AI_METRICS.md](AI_METRICS.md) |
| Improvement | [CONTINUOUS_IMPROVEMENT.md](CONTINUOUS_IMPROVEMENT.md) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |

Structure map: [AGENTS.md#directory-map](AGENTS.md#directory-map)

---

## Philosophy

| Conflict | Winner |
|----------|--------|
| Quality vs speed | Quality |
| POS vs implementation | POS |
| Agent guess vs undefined POS | Escalate |

Full charter: [GOVERNANCE.md §10](GOVERNANCE.md#10-ai-team-charter)

---

## Legacy

`company/`, `agents/`, `runtime/`, `brain/` — deep reference only. **Routing:** v1.0 `roles/` · `workflows/` · `standards/`.

**Changes:** [GOVERNANCE.md §5](GOVERNANCE.md#5-change-process) only.
