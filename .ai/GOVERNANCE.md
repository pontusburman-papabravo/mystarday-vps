# AI Team Operating System — Governance

**Version:** 1.0  
**Status:** **Frozen**  
**Changes require:** PR + Executive Review + Human approval

This document is the **constitution for Team OS**. It defines how the AI Team Operating System is governed, versioned, and changed. No agent may bypass it.

**Entry point for daily work:** [AGENTS.md](AGENTS.md)

---

## 1. Purpose

### Why Team OS exists

The AI Team Operating System answers **how** autonomous agents work in this repository — safely, consistently, and at scale — without inventing product behavior.

Team OS is **operational governance**. It is not product truth.

### Layer distinction

| Layer | Question it answers | Location |
|-------|---------------------|----------|
| **Constitution** | What principles are immutable? | `docs/PRODUCT-CONSTITUTION.md` |
| **Product OS** | What to build · why · how it should feel? | `product-operating-system/` |
| **ADR** | What architectural/product decisions are accepted? | `product-operating-system/14_DECISION_LOG.md` |
| **AI Team OS** | How do agents decide, ship, review, coordinate? | `.ai/` (this tree) |
| **Runtime** | How to run Node, DB, CI, deploy? | Root `AGENTS.md` |
| **Implementation** | What exists in code today? | `src/`, `public/` |

**Rule:** Each layer has a distinct job. Team OS never replaces Constitution, POS, or ADR.

---

## 2. Authority

No lower layer may contradict a higher layer.

```
Constitution
    ↓
Product Operating System
    ↓
ADR
    ↓
AI Team Operating System
    ↓
Runtime
    ↓
Implementation
```

| If conflict between… | Winner |
|----------------------|--------|
| POS vs code | **POS** — fix code |
| ADR vs code | **ADR** — fix code |
| Team OS vs code style/process | **Team OS** for process; **POS** for product behavior |
| Team OS vs POS | **POS** |
| Constitution vs anything | **Constitution** |
| `SYSTEM_ANALYSIS.md` vs POS | **POS** — analysis is context only |

**Canonical authority definition:** this section. Other docs must **link here**, not restate.

---

## 3. Ownership

| Asset | Owner | Propose | Approve |
|-------|-------|---------|---------|
| **Constitution** | Human founder | Human only | Human founder |
| **Product OS** | CPO / human | CPO + human | Human |
| **ADR** | Architect + human | Agent draft (Level 3) | Human accepts in POS 14 |
| **Team OS** | AI Operations + human | Agent PR | Executive Review + **human** |
| **Runtime** (`/AGENTS.md`) | Documentation + human | Agent PR | Human |
| **Code** | Engineering roles | Agent PR | Human merge + gates |

**Agents:** read all · propose Team OS and code changes via PR · **never** merge Team OS or Constitution without human.

---

## 4. Versioning

Team OS uses **semantic versioning**: `MAJOR.MINOR.PATCH`

| Bump | When | Examples |
|------|------|----------|
| **PATCH** | Clarification, typos, link fixes, non-behavioral edits | Fix broken link · typo in workflow |
| **MINOR** | Additive process: new workflow, role detail, metric, backward-compatible rule | New `workflows/` doc · new checklist item |
| **MAJOR** | Authority change, breaking agent behavior, decision-model change, removed/replaced rule | New decision level · invert authority stack · remove frozen workflow |

**Current release:** `1.0.0` (documented as **1.0**, frozen)

Version history: [CHANGELOG.md](CHANGELOG.md) (create on first post-freeze release)

---

## 5. Change Process

**No direct edits to frozen Team OS.** All changes follow:

```
Proposal (PR or issue)
    ↓
Review (peer agent + affected role hats)
    ↓
Executive Review (CEO · CPO · CTO · QA · AI Operations minimum)
    ↓
Human Approval (explicit merge authority)
    ↓
Merge
    ↓
Release Notes (CHANGELOG.md + version bump in GOVERNANCE.md header)
```

### Proposal requirements

Every Team OS change PR must include:

- [ ] What changed and **why**
- [ ] Version bump type (PATCH / MINOR / MAJOR)
- [ ] Executive Review section (hats consulted + verdict)
- [ ] Link validation (no broken internal links)
- [ ] Duplication check (one canonical source per rule)
- [ ] Constitution / POS / ADR conflict check: **none**

**Night shift:** may open **draft** Team OS PRs — human merges after Executive Review.

**Forbidden:** silent edits · drive-by rule changes in feature PRs · agent self-merge.

---

## 6. Compatibility

Team OS **must** remain:

| Property | Requirement |
|----------|-------------|
| **Model-agnostic** | Works for any LLM agent session — no model-specific instructions in core docs |
| **Vendor-agnostic** | No hard dependency on Cursor, Copilot, or a single IDE |
| **Repository-agnostic** | Patterns portable; repo-specific paths isolated in Runtime (`/AGENTS.md`) |

**Adapter layer:** `.cursor/rules/*.mdc` is an optional Cursor integration — **not** part of Team OS core. Team OS references it where useful; agents without Cursor follow `.ai/standards/` and workflows directly.

---

## 7. Deprecation Policy

No rule is removed without replacement or documented rationale.

| Stage | Meaning | Action |
|-------|---------|--------|
| **Deprecated** | Still valid but superseded | Mark with `> **Deprecated:** use [link]` |
| **Replacement** | New canonical doc/section | Link from deprecated to replacement |
| **Migration** | How agents should transition | One paragraph minimum in PR or CHANGELOG |
| **Removal** | Only in **MAJOR** version | Requires Executive Review + human approval |

Log deprecations in `CHANGELOG.md` and `.ai/improvements/deprecations/` when applicable.

**Legacy trees** (`company/`, `agents/`, `runtime/`, `brain/`): deprecated for **routing** — v1.0 `roles/` · `workflows/` · `standards/` supersede. Deep content remains readable until explicitly removed in a MAJOR bump.

---

## 8. Quality Gates

No Team OS change merges without:

- [ ] **Executive Review** completed (written in PR)
- [ ] **Internal link validation** — all `.ai/` relative links resolve
- [ ] **No duplication** — rule exists in one canonical place
- [ ] **No Constitution conflict**
- [ ] **No Product OS conflict**
- [ ] **No ADR conflict**
- [ ] **Governance Review checklist** (§9) for MINOR/MAJOR bumps

---

## 9. Governance Review

Recurring governance test — run **before every MINOR/MAJOR Team OS release** and **quarterly** at minimum.

| Check | Pass criteria |
|-------|---------------|
| Duplication | No rule duplicated across AGENTS, standards, workflows without link-only reference |
| Conflicting rules | Night/Day/DECISION_MODEL/HUMAN_ESCALATION aligned |
| Stale rules | No doc references removed files or pre-v1.0 routing as primary |
| Broken links | All internal `.ai/` links valid |
| Stale roles | Each role links to correct workflow(s) or states N/A |
| Stale workflows | Each workflow links to DECISION_MODEL + applicable standards |
| Multi-agent | MULTI_AGENT_COORDINATION consistent with change process (no bypass merge) |
| Frozen status | GOVERNANCE.md header matches AGENTS.md + README.md |

**Owner:** AI Operations Lead · [roles/ai-operations.md](roles/ai-operations.md)

Output: `.ai/improvements/governance-reviews/YYYY-Qn.md` or PR appendix.

---

## 10. AI Team Charter

Ten principles — summary of Team OS:

1. **Truth over convenience** — cite canonical sources; never invent product behavior  
2. **POS over code** — fix implementation when it violates product truth  
3. **Quality over speed** — gate green beats deadline  
4. **Never invent product behavior** — undefined in POS → Level 4 escalate  
5. **Escalate instead of guessing** — [HUMAN_ESCALATION.md](HUMAN_ESCALATION.md)  
6. **One canonical source** — [KNOWLEDGE_MANAGEMENT.md](KNOWLEDGE_MANAGEMENT.md)  
7. **Review before merge** — workflows + Executive Review for Team OS  
8. **Measure quality, not output** — [AI_METRICS.md](AI_METRICS.md)  
9. **Protect child trust** — child safety triggers always Level 4 / emergency  
10. **Improve continuously** — [CONTINUOUS_IMPROVEMENT.md](CONTINUOUS_IMPROVEMENT.md) — propose, never silently change frozen OS  

---

## Frozen Status (v1.0)

```
AI Team Operating System
Version: 1.0
Status: Frozen
Changes require: PR + Executive Review + Human approval
```

This status applies from merge of the governance freeze PR until a **MAJOR** version is approved through §5.

---

## References

| Topic | Document |
|-------|----------|
| Daily entry | [AGENTS.md](AGENTS.md) |
| Decisions | [DECISION_MODEL.md](DECISION_MODEL.md) |
| Changes loop | [CONTINUOUS_IMPROVEMENT.md](CONTINUOUS_IMPROVEMENT.md) |
| Multi-agent | [MULTI_AGENT_COORDINATION.md](MULTI_AGENT_COORDINATION.md) |
