# AI Team Operating System

**Version:** 1.0 (final)  
**Status:** Normative for all AI agents in this repository  
**Audience:** Any AI agent — model-agnostic, session-agnostic, multi-agent safe

> **Start here:** [AGENTS.md](AGENTS.md) is the single entry point. This file is a brief index.

---

## What This Is

The **AI Team Operating System** governs **how** autonomous agents work in this repository. It does **not** replace **Product OS** — it implements it.

| System | Location |
|--------|----------|
| Constitution | `docs/PRODUCT-CONSTITUTION.md` |
| Product OS | `product-operating-system/` |
| ADR | `product-operating-system/14_DECISION_LOG.md` |
| **Team OS** | `.ai/` (this tree) |
| Runtime env | Root `AGENTS.md` |

**Supremacy:** Constitution → POS → ADR → Team OS → Code. Details: [AGENTS.md](AGENTS.md#authority-stack).

---

## Core Systems (v1.0)

| System | Document |
|--------|----------|
| Entry & orchestration | [AGENTS.md](AGENTS.md) |
| Night / day shifts | [NIGHT_SHIFT.md](NIGHT_SHIFT.md) · [DAY_SHIFT.md](DAY_SHIFT.md) |
| Decisions & escalation | [DECISION_MODEL.md](DECISION_MODEL.md) · [HUMAN_ESCALATION.md](HUMAN_ESCALATION.md) |
| Reporting | [MORNING_REPORT.md](MORNING_REPORT.md) |
| **Knowledge** | [KNOWLEDGE_MANAGEMENT.md](KNOWLEDGE_MANAGEMENT.md) |
| **Multi-agent** | [MULTI_AGENT_COORDINATION.md](MULTI_AGENT_COORDINATION.md) |
| **Metrics** | [AI_METRICS.md](AI_METRICS.md) |
| **Improvement** | [CONTINUOUS_IMPROVEMENT.md](CONTINUOUS_IMPROVEMENT.md) |

---

## Structure

```
.ai/
├── AGENTS.md                    ← Entry point
├── KNOWLEDGE_MANAGEMENT.md      ← Truth classes & validation
├── MULTI_AGENT_COORDINATION.md  ← Parallel agents
├── AI_METRICS.md                ← Quality measurement
├── CONTINUOUS_IMPROVEMENT.md    ← Weekly improvement loop
├── NIGHT_SHIFT.md · DAY_SHIFT.md · MORNING_REPORT.md
├── DECISION_MODEL.md · HUMAN_ESCALATION.md
├── roles/ · workflows/ · standards/
├── improvements/                ← Lessons, retros, metrics (proposals)
├── reports/                     ← Multi-agent daily rollups
├── company/ · agents/ · runtime/ · brain/ · product/  ← deep refs
```

Full map: [AGENTS.md#directory-map](AGENTS.md#directory-map).

---

## Philosophy

| Conflict | Winner |
|----------|--------|
| Quality vs speed | Quality |
| Architecture vs shortcut | Architecture |
| POS vs implementation | POS |
| Agent guess vs undefined POS | Escalate |

---

## Legacy

`company/`, `agents/`, `runtime/`, `brain/` remain valid deep references. **Routing** uses v1.0 structure above.

Changes to decision authority → ADR in POS 14. Team OS changes → PR with human merge.
