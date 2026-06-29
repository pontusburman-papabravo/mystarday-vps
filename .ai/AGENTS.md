# AI Team Operating System

**Version:** 1.0 (final)  
**Status:** Normative for all AI agents in this repository  
**Audience:** Any AI agent — model-agnostic, session-agnostic, multi-agent safe

---

## Purpose

This document is the **single entry point** for how AI agents operate in this repository. Open it first. It answers:

- How the company works
- How development works
- How decisions are made
- When agents act autonomously
- When agents must stop
- How agents report

This is **operational governance** — not product documentation. Product truth lives elsewhere.

---

## Authority Stack

Higher layers win. Never invert this order.

| Priority | Source | Location | Governs |
|----------|--------|----------|---------|
| 1 | **Constitution** | `docs/PRODUCT-CONSTITUTION.md` · `product-operating-system/00_PROJECT_CONSTITUTION.md` | Immutable product rules |
| 2 | **Product OS (POS)** | `product-operating-system/` | What to build · why · how it should feel |
| 3 | **ADR** | `product-operating-system/14_DECISION_LOG.md` | Accepted architectural & product decisions |
| 4 | **AI Team OS** | `.ai/` (this tree) | How agents work · shifts · workflows |
| 5 | **Runtime env** | Root `/AGENTS.md` | Node, Postgres, CI, deploy ops |
| 6 | **Codebase** | `src/`, `public/` | Implementation — fix when it violates POS |

> When POS and code conflict → **POS is correct.** Rewrite code, not product docs (unless ADR-worthy contradiction).

---

## How the Company Works

The product team is organized as a **virtual executive team** embodied by AI agents in sequence. One session may wear multiple hats, but must pass through the right roles before marking work done.

```
User intent / Mission
        ↓
   SPEC (scope + POS mapping)
        ↓
   IMPLEMENT (domain engineer)
        ↓
   TEST → VERIFY
        ↓
   RED TEAM REVIEW
        ↓
   BUG HUNT → FIX
        ↓
   REGRESSION TEST
        ↓
   PR
        ↓
   MORNING REPORT (night shift)
```

**Executive roles** (strategy): [roles/ceo.md](roles/ceo.md) · [roles/cpo.md](roles/cpo.md) · [roles/cto.md](roles/cto.md)  
**Domain roles** (execution): [roles/](roles/) directory  
**AI Operations:** [roles/ai-operations.md](roles/ai-operations.md)  
**Deep playbooks** (legacy, still valid): `.ai/company/` · `.ai/agents/` · `.ai/brain/`

---

## Shifts

| Shift | Doc | When |
|-------|-----|------|
| **Day** | [DAY_SHIFT.md](DAY_SHIFT.md) | Human available — broader autonomy with escalation on Level 3–4 |
| **Night** | [NIGHT_SHIFT.md](NIGHT_SHIFT.md) | No human — restricted autonomy, PR only, no merge |

Agents must detect shift from context (explicit user instruction, or absence of human response on escalations).

---

## Decision Model

All agent decisions classify into four levels. See [DECISION_MODEL.md](DECISION_MODEL.md).

| Level | Autonomy | Documentation |
|-------|----------|---------------|
| **1** | Agent decides alone | None required |
| **2** | Agent decides | Note in PR |
| **3** | Agent proposes | ADR required before merge |
| **4** | Human required | Stop — do not implement |

---

## Human Escalation

Agents **stop and wait** when any trigger in [HUMAN_ESCALATION.md](HUMAN_ESCALATION.md) fires. No guessing. No "reasonable defaults" on Level 4 topics.

---

## Core Systems

| System | Document | Purpose |
|--------|----------|---------|
| Knowledge | [KNOWLEDGE_MANAGEMENT.md](KNOWLEDGE_MANAGEMENT.md) | Canonical vs working knowledge — never invent product truth |
| Multi-agent | [MULTI_AGENT_COORDINATION.md](MULTI_AGENT_COORDINATION.md) | Branch locks, handoffs, parallel rules |
| Metrics | [AI_METRICS.md](AI_METRICS.md) | Quality trend measurement |
| Improvement | [CONTINUOUS_IMPROVEMENT.md](CONTINUOUS_IMPROVEMENT.md) | Weekly loop — propose Team OS changes, never edit POS |

**AI Operations Lead:** [roles/ai-operations.md](roles/ai-operations.md)

---

## Workflows

Every task type has a mandatory workflow. Do not skip phases.

| Workflow | File | Use when |
|----------|------|----------|
| Implementation | [workflows/implementation.md](workflows/implementation.md) | New features, ADR execution |
| Code review | [workflows/code-review.md](workflows/code-review.md) | Before PR |
| Testing | [workflows/testing.md](workflows/testing.md) | All code changes |
| Bug hunt | [workflows/bug-hunt.md](workflows/bug-hunt.md) | Proactive + post-implementation |
| Refactoring | [workflows/refactoring.md](workflows/refactoring.md) | Internal structure changes |
| Performance | [workflows/performance.md](workflows/performance.md) | Hot paths, regressions |
| Security review | [workflows/security-review.md](workflows/security-review.md) | Auth, data, child safety |
| Release | [workflows/release.md](workflows/release.md) | Ship to live |
| Hotfix | [workflows/hotfix.md](workflows/hotfix.md) | P1 live issues |
| Emergency | [workflows/emergency.md](workflows/emergency.md) | P0 — child safety, data loss |

Detail pipeline: `.ai/runtime/WORKFLOW_ENGINE.md` (frozen reference — this tree supersedes for agent routing).

---

## Standards

Agents enforce standards; they do not redefine them.

| Standard | File | Authority |
|----------|------|-----------|
| Architecture | [standards/architecture.md](standards/architecture.md) | POS 10 · ADR |
| Coding | [standards/coding.md](standards/coding.md) | `.cursor/rules/` · POS |
| Testing | [standards/testing.md](standards/testing.md) | POS 12 · 15 |
| Documentation | [standards/documentation.md](standards/documentation.md) | POS 16 · `.cursor/rules/160` |
| Product | [standards/product.md](standards/product.md) | Constitution · POS 00–09 |

---

## Reporting

Night-shift agents produce a [MORNING_REPORT.md](MORNING_REPORT.md) at end of session. Multiple concurrent agents: one report per agent per PR; optional daily rollup in `.ai/reports/` — see [MULTI_AGENT_COORDINATION.md](MULTI_AGENT_COORDINATION.md).

---

## Session Bootstrap (mandatory)

```
1. Read this file (.ai/AGENTS.md)
2. Read KNOWLEDGE_MANAGEMENT.md — classify sources before acting
3. Read docs/PRODUCT-CONSTITUTION.md (or POS 00)
4. Read product-operating-system/00A + 00B
5. Identify shift: DAY_SHIFT.md or NIGHT_SHIFT.md
6. If other agents active: MULTI_AGENT_COORDINATION.md
7. Read task-domain POS doc (04–09, 03A/B, 06A as relevant)
8. Read assigned role: .ai/roles/<role>.md
9. Follow workflow: .ai/workflows/<type>.md
10. Enforce standards: .ai/standards/
11. Root AGENTS.md for runtime (Node, DB, test commands)
12. .cursor/rules/000-core.mdc → 180-self-review → 190-definition-of-done
```

---

## Global Rules (all agents, all shifts)

**Product & process:** POS beats code · quality beats speed · no product invention (Level 4) · no merge to `main` without human · no Constitution/vision/monetization/security-policy change without human · no architecture change without ADR (Level 3).

**Engineering bar:** See [standards/coding.md](standards/coding.md) and `.cursor/rules/000-core.mdc` (no TODO/hacks/dead code/magic numbers; simpler than replaced; mobile-first).

---

## Directory Map

```
.ai/
├── AGENTS.md                    ← You are here (Team OS v1.0 final)
├── KNOWLEDGE_MANAGEMENT.md      ← Truth classes · validation
├── MULTI_AGENT_COORDINATION.md  ← Parallel agents · locks · handoffs
├── AI_METRICS.md                ← Quality metrics
├── CONTINUOUS_IMPROVEMENT.md    ← Weekly improvement loop
├── NIGHT_SHIFT.md · DAY_SHIFT.md · MORNING_REPORT.md
├── DECISION_MODEL.md · HUMAN_ESCALATION.md
├── roles/ · workflows/ · standards/
├── improvements/                ← Lessons · retros · metrics files
├── reports/                     ← Multi-agent daily rollups
├── company/ · agents/ · runtime/ · brain/ · product/
```

---

## Versioning

| Version | Change |
|---------|--------|
| **1.0** | AI Team Operating System — shifts, decisions, roles, workflows, standards |
| **1.0 final** | Knowledge · multi-agent · metrics · continuous improvement · dedup pass |

Changes to orchestration in this file → note in PR. Structural changes to decision authority → ADR in `14_DECISION_LOG.md`.
