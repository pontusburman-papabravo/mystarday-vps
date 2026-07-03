# Autonomous AI Development Platform — Runtime

**Version:** 1.0  
**Status:** Controls how Cursor Composer 2.5 develops Stjärndag  
**Type:** Runtime control plane — **not** product governance (frozen v1.0)

---

## What This Is

The **runtime layer** that turns a feature request into a shipped PR **without founder prompts**. Governance defines *what* and *why*; runtime defines *how Composer executes*.

| Layer | Location | Frozen? |
|-------|----------|---------|
| POS | `product-operating-system/` | v1.0 ✓ |
| COS | `.ai/company/` | v1.0 ✓ |
| PCB | `product-content-bible/` | v1.0 ✓ |
| AOS | `.ai/` + `.cursor/rules/` (000–190) | v1.0 ✓ |
| **Runtime** | `.ai/runtime/` (here) | v1.0 — this platform |

**Do not expand frozen layers.** Runtime may only reference them. Fix contradictions via ADR in POS `14` — not silent edits.

---

## Session Bootstrap (every Composer start)

**Autonomous resume (preferred when relay files exist):**

```
1. Read AUTONOMOUS_SESSION.md       ← single-pane session state
2. Read MISSION_QUEUE.md            ← pick highest-ROI unblocked mission
3. Read STRATEGIC_INTENT + HAG      ← strategy + escalation
4. Read WORKFLOW_ENGINE.md          ← master pipeline
5. Execute CAE loop                 ← CONTINUOUS_EXECUTION.md
6. Update relay files before stop   ← RESUME_ENGINE.md
```

Or use prompt: `.ai/prompts/RESUME_AUTONOMOUS_WORKER.md`

**Ad-hoc user intent (no relay state):**

```
1. Read WORKFLOW_ENGINE.md          ← master pipeline
2. Read MISSION_ENGINE.md           ← if user gave intent
3. Load TASK_ROUTER.md              ← assign roles
4. Execute phases via engines below
5. Exit only when QA_ENGINE + REVIEW_ENGINE pass
6. Write relay files if work continues across sessions
```

| Engine | Purpose |
|--------|---------|
| [WORKFLOW_ENGINE.md](./WORKFLOW_ENGINE.md) | End-to-end deterministic pipeline |
| [MISSION_ENGINE.md](./MISSION_ENGINE.md) | Interpret requests · extract goals · escalate |
| [PLANNING_ENGINE.md](./PLANNING_ENGINE.md) | Scope · POS map · acceptance criteria |
| [DECISION_ENGINE.md](./DECISION_ENGINE.md) | Deterministic approve/veto framework |
| [TASK_ROUTER.md](./TASK_ROUTER.md) | Role ownership by task type |
| [IMPLEMENTATION_ENGINE.md](./IMPLEMENTATION_ENGINE.md) | Build sequence · craft bar |
| [QA_ENGINE.md](./QA_ENGINE.md) | Automated gates — nothing ships without pass |
| [REVIEW_ENGINE.md](./REVIEW_ENGINE.md) | 16-perspective self-review · veto resolution |
| [SELF_IMPROVEMENT_ENGINE.md](./SELF_IMPROVEMENT_ENGINE.md) | Idle debt · polish · next improvement |
| [AUTONOMOUS_SESSION.md](./AUTONOMOUS_SESSION.md) | **Relay entry** — current mission · branch · gates |
| [RESUME_ENGINE.md](./RESUME_ENGINE.md) | Relay protocol · session end/start |
| [CONTINUOUS_EXECUTION.md](./CONTINUOUS_EXECUTION.md) | CAE loop across missions/sessions |
| [SESSION_HANDOFF_TEMPLATE.md](./SESSION_HANDOFF_TEMPLATE.md) | Human-readable handoff skeleton |
| [RELAY_HANDOFF_CHECKLIST.md](./RELAY_HANDOFF_CHECKLIST.md) | Pre-stop verification |

---

## Authority on Conflict

```
POS > COS > PCB > AOS > Runtime > code
```

Runtime **never overrides** governance. When a reviewer disagrees, apply [REVIEW_ENGINE.md § Conflict Resolution](./REVIEW_ENGINE.md#conflict-resolution).

---

## Completion Definition

A mission is **complete** when:

1. `QA_ENGINE` — all gates green  
2. `REVIEW_ENGINE` — zero unresolved BLOCK vetoes  
3. `DECISION_ENGINE` — all seven questions pass or N/A documented  
4. Commit pushed · PR opened · self-review artifact in PR body  

---

## Export

Combined copy file: `/AI-RUNTIME-ALL-DOCUMENTS-TEMP.md`

---

## Versioning

| Version | Change |
|---------|--------|
| **1.0** | Initial runtime platform |

Expand runtime only when execution gaps found — not to duplicate governance.
