# Stjärndag — AI Operating System (AOS)

**Version:** 1.0  
**Status:** Normative for all AI agents in this repository  
**Created:** 2026-06-29

---

## What This Is

The **AI Operating System** governs **how** autonomous agents work on Stjärndag. It does **not** replace the **Product Operating System** (POS) — it **implements** it in engineering practice.

| System | Location | Answers |
|--------|----------|---------|
| **Product OS** | `product-operating-system/` | *What* to build · *Why* · *How it should feel* |
| **Company OS** | `.ai/company/` | *How executives decide, prioritize, approve* |
| **AI OS** | `.ai/` + `.cursor/rules/` | *How agents decide, ship, review, and iterate* |
| **Runtime env** | Root `AGENTS.md` | Node, Postgres, test commands, deploy ops |
| **Current codebase** | `SYSTEM_ANALYSIS.md` | Historical snapshot — **not** product authority |

### Supremacy order

1. **Product Operating System** — absolute product truth  
2. **Company Operating System** — executive judgment (complements POS; never duplicates)  
3. **AI Operating System** — agent behavior and engineering workflow  
4. **Codebase as it exists today** — fix when it violates POS  
5. **`SYSTEM_ANALYSIS.md`** — context only  

> When POS and code conflict → **POS is correct.** Rewrite code, not docs (unless ADR-worthy contradiction in POS itself).

---

## Start Here (new Composer session)

**Autonomous execution:** read `.ai/brain/PROJECT_BRAIN.md` then `.ai/runtime/WORKFLOW_ENGINE.md`.

Governance read order — **before any code change**:

| Step | Document |
|------|----------|
| 1 | `.ai/brain/PROJECT_BRAIN.md` |
| 2 | `.ai/runtime/WORKFLOW_ENGINE.md` + `MISSION_ENGINE.md` |
| 3 | `.ai/agents/README.md` — embody routed agents |
| 2 | `product-operating-system/00_PROJECT_CONSTITUTION.md` |
| 3 | `product-operating-system/00A_EXPERIENCE_MANIFESTO.md` |
| 4 | `product-operating-system/00B_PRODUCT_TASTE.md` |
| 5 | `.ai/AGENTS.md` — role(s) and orchestration |
| 6 | Relevant `.ai/company/` playbook when making executive decisions |
| 7 | One POS domain doc for the task (04–09, 03A/B, 06A) |
| 8 | `product-content-bible/` if child world surface |
| 9 | Relevant `.cursor/rules/*.mdc` (000–200 auto-loaded) |

**Shipping:** `product-operating-system/15_PRODUCT_QUALITY_STANDARD.md` · `.ai/company/010_RELEASE_COMMAND.md` · `.ai/runtime/QA_ENGINE.md` · `.ai/runtime/REVIEW_ENGINE.md`.

---

## Directory Map

```
.ai/
├── README.md          ← You are here
├── AGENTS.md          ← Engineering role specs (AOS v1.0)
├── brain/             ← Company mind — read PROJECT_BRAIN first
├── agents/            ← Persistent agent team (WHO Composer is)
├── runtime/           ← Execution platform (HOW — frozen v1.0)
└── company/           ← Executive playbooks (frozen v1.0)

.cursor/rules/
├── 000-core.mdc       ← POS supremacy, workflow, philosophy
├── …                  ← 010–190 AOS rules
├── 200-runtime-platform.mdc
└── 201-agent-organization.mdc

product-operating-system/   ← Product truth (do not duplicate here)
AGENTS.md                   ← Runtime / Cloud VM (not AI org)
```

Legacy rules (`large-files.mdc`, VPS deploy rule in `.cursor/rules/`, `roadmap-tasks.mdc`) remain valid where not superseded by AOS.

---

## Mandatory Workflow

Every task follows:

```
Understand → Research → Read POS → Identify systems → Design → Risk analysis
→ Implement → Unit tests → Integration tests → Visual QA → Performance
→ Accessibility → Security → Self-review → Refactor → Commit → Continue
```

Detail: `.cursor/rules/000-core.mdc`, `180-self-review.mdc`, `190-definition-of-done.mdc`.

---

## Philosophy

| Conflict | Winner |
|----------|--------|
| Quality vs speed | **Quality** |
| Architecture vs shortcut | **Architecture** |
| POS vs implementation | **POS** |
| POS vs COS vs AOS | **POS** (COS and AOS serve POS) |
| Growth vs quality vs speed | **Quality** default; CEO resolves per `.ai/company/001_CEO_PLAYBOOK.md` |

Goal is **not** code volume. Goal: a product children love and parents trust — Europe's best routine app for children.

---

## Autonomy

Agents may implement **small improvements** without asking when:

- Change aligns with POS + AOS
- Tests pass and DoD met
- No user-data risk, no business decision, no missing secrets/assets

**Stop and escalate** when: business decision · missing API keys/assets · user-data risk · POS contradiction needing ADR.

---

## Versioning

| Version | Change |
|---------|--------|
| **1.0** | Initial AOS alongside POS v2.0 |
| **1.1** | Company OS (`.ai/company/`) — executive playbooks complement AOS |
| **1.2** | Runtime platform (`.ai/runtime/`) — autonomous Composer execution (frozen) |
| **1.3** | Agent organization (`.ai/agents/`, `.ai/brain/`) — WHO Composer is |

Changes to `000-core.mdc` or `.ai/AGENTS.md` orchestration → note in PR + optional ADR in POS `14_DECISION_LOG.md`.

---

## CXO Sign-off

AOS v1.0 + COS v1.0 reviewed as complete entry point for autonomous agents — POS remains product authority; COS adds executive judgment; AOS adds engineering governance without duplication.

**Full COS export:** `/AI-COMPANY-ALL-DOCUMENTS-TEMP.md`
