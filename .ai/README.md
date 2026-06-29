# AI Team Operating System

**Version:** 1.0  
**Status:** Normative for all AI agents in this repository  
**Created:** 2026-06-29

---

## What This Is

The **AI Team Operating System** governs **how** autonomous agents work in this repository. It does **not** replace the **Product Operating System** (POS) — it **implements** it in engineering practice.

| System | Location | Answers |
|--------|----------|---------|
| **Constitution** | `docs/PRODUCT-CONSTITUTION.md` | Immutable product rules |
| **Product OS** | `product-operating-system/` | *What* to build · *Why* · *How it should feel* |
| **ADR** | `product-operating-system/14_DECISION_LOG.md` | Accepted architectural decisions |
| **AI Team OS** | `.ai/` (this tree) | *How agents decide, ship, review, report* |
| **Runtime env** | Root `AGENTS.md` | Node, Postgres, test commands, deploy ops |

### Supremacy order

1. **Constitution** + **Product OS** — absolute product truth  
2. **ADR** — accepted decisions  
3. **AI Team OS** — agent behavior and engineering workflow  
4. **Codebase** — fix when it violates POS  
5. **`SYSTEM_ANALYSIS.md`** — context only  

> When POS and code conflict → **POS is correct.** Rewrite code, not docs (unless ADR-worthy contradiction in POS itself).

---

## Start Here

**Open [AGENTS.md](AGENTS.md) first.** It links everything else.

### Session bootstrap

```
1. .ai/AGENTS.md
2. docs/PRODUCT-CONSTITUTION.md
3. DAY_SHIFT.md or NIGHT_SHIFT.md
4. Task role → .ai/roles/<role>.md
5. Task workflow → .ai/workflows/<type>.md
6. Standards → .ai/standards/
7. Root AGENTS.md for runtime
```

### Autonomy loop (all work)

```
SPEC → IMPLEMENT → TEST → VERIFY → RED TEAM REVIEW
→ BUG HUNT → FIX → REGRESSION TEST → PR → MORNING REPORT
```

---

## Directory Map (v1.0)

```
.ai/
├── README.md              ← You are here
├── AGENTS.md              ← Single entry point (Team OS v1.0)
├── NIGHT_SHIFT.md         ← Night autonomy rules
├── DAY_SHIFT.md           ← Day + human collaboration
├── MORNING_REPORT.md      ← Handoff format
├── DECISION_MODEL.md      ← Levels 1–4
├── HUMAN_ESCALATION.md    ← Stop triggers
├── roles/                 ← Executive + domain roles
├── workflows/             ← Implementation → emergency
├── standards/             ← Pointers to POS/ADR (no duplication)
├── company/               ← Executive playbooks (deep detail)
├── agents/                ← Agent personas (deep detail)
├── runtime/               ← Execution engines (deep detail)
├── brain/                 ← Company mind
└── product/               ← Product Content Bible

product-operating-system/    ← Product truth
docs/PRODUCT-CONSTITUTION.md
AGENTS.md                    ← Runtime / Cloud VM (not AI org)
```

---

## Shifts & Decisions

| Topic | Document |
|-------|----------|
| Night work (no human) | [NIGHT_SHIFT.md](NIGHT_SHIFT.md) |
| Day work (human available) | [DAY_SHIFT.md](DAY_SHIFT.md) |
| Decision levels 1–4 | [DECISION_MODEL.md](DECISION_MODEL.md) |
| When to stop | [HUMAN_ESCALATION.md](HUMAN_ESCALATION.md) |
| Morning handoff | [MORNING_REPORT.md](MORNING_REPORT.md) |

---

## Philosophy

| Conflict | Winner |
|----------|--------|
| Quality vs speed | **Quality** |
| Architecture vs shortcut | **Architecture** |
| POS vs implementation | **POS** |
| Agent guess vs undefined POS | **Escalate** |

Goal: product children love and parents trust — not code volume.

---

## Versioning

| Version | Change |
|---------|--------|
| **1.0** | AI Team Operating System — shifts, roles, workflows, standards |

Changes to `.ai/AGENTS.md` orchestration → note in PR. Decision authority changes → ADR in POS 14.

Legacy trees (`company/`, `agents/`, `runtime/`, `brain/`) remain valid deep references; **routing** uses this v1.0 structure.
