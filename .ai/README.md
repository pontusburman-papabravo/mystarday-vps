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
| **AI OS** | `.ai/` + `.cursor/rules/` | *How agents decide, ship, review, and iterate* |
| **Runtime env** | Root `AGENTS.md` | Node, Postgres, test commands, deploy ops |
| **Current codebase** | `SYSTEM_ANALYSIS.md` | Historical snapshot — **not** product authority |

### Supremacy order

1. **Product Operating System** — absolute product truth  
2. **AI Operating System** — agent behavior and engineering workflow  
3. **Codebase as it exists today** — fix when it violates POS  
4. **`SYSTEM_ANALYSIS.md`** — context only  

> When POS and code conflict → **POS is correct.** Rewrite code, not docs (unless ADR-worthy contradiction in POS itself).

---

## Start Here (new Composer session)

Read in order — **before any code change**:

| Step | Document |
|------|----------|
| 1 | `product-operating-system/00_PROJECT_CONSTITUTION.md` |
| 2 | `product-operating-system/00A_EXPERIENCE_MANIFESTO.md` |
| 3 | `product-operating-system/00B_PRODUCT_TASTE.md` |
| 4 | `.ai/AGENTS.md` — your role(s) and orchestration |
| 5 | One POS domain doc for the task (04–09, 03A/B, 06A) |
| 6 | Relevant `.cursor/rules/*.mdc` (auto-loaded by Cursor) |

**Shipping:** also read `product-operating-system/15_PRODUCT_QUALITY_STANDARD.md`.

---

## Directory Map

```
.ai/
├── README.md          ← You are here
└── AGENTS.md          ← AI organization, roles, escalation

.cursor/rules/
├── 000-core.mdc       ← POS supremacy, workflow, philosophy
├── 010-product.mdc    ← Product constraints (→ POS)
├── 020-design.mdc     ← Design & craft (→ POS 03/03A/03B/00B)
├── 030-child-experience.mdc
├── 040-parent-experience.mdc
├── 050-game-design.mdc
├── 060-mobile-first.mdc
├── 070-frontend.mdc
├── 080-backend.mdc
├── 090-database.mdc
├── 100-api.mdc
├── 110-performance.mdc
├── 120-security.mdc
├── 130-testing.mdc
├── 140-code-review.mdc
├── 150-release.mdc
├── 160-documentation.mdc
├── 170-git-workflow.mdc
├── 180-self-review.mdc
└── 190-definition-of-done.mdc

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
| POS vs AOS | **POS** (AOS serves POS) |

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

Changes to `000-core.mdc` or `.ai/AGENTS.md` orchestration → note in PR + optional ADR in POS `14_DECISION_LOG.md`.

---

## CXO Sign-off

AOS v1.0 reviewed as complete entry point for autonomous agents — POS remains product authority; AOS adds engineering governance without duplication.
