# WORKFLOW_ENGINE

**Version:** 1.0  
**Role:** Master deterministic pipeline for every mission  
**Invoked:** Start of every Composer session with work intent

---

## Purpose

Define **exactly** how Composer behaves from mission start until PR is ready. No shortcuts. No skipped reviews. No assumptions.

---

## Pipeline (mandatory order)

```
PHASE 0  MISSION_INTAKE          → MISSION_ENGINE
PHASE 1  PLANNING                → PLANNING_ENGINE + TASK_ROUTER
PHASE 2  RESEARCH                → Read POS · grep codebase · SYSTEM_ANALYSIS (context)
PHASE 3  ARCHITECTURE            → Design note · risks · DECISION_ENGINE pre-check
PHASE 4  IMPLEMENTATION          → IMPLEMENTATION_ENGINE
PHASE 5  TEST_EXECUTION          → QA_ENGINE (tests)
PHASE 6  STATIC_ANALYSIS         → QA_ENGINE (lint)
PHASE 7  SPECIALIST REVIEWS      → Performance · A11y · Mobile UX · Security
PHASE 8  GOVERNANCE REVIEWS      → POS · AOS · COS · PCB alignment
PHASE 9  EXECUTIVE REVIEWS       → CTO · CPO · Game · UX · Art · QA
PHASE 10 REVIEW_ENGINE           → 16 perspectives · resolve vetoes
PHASE 11 REFACTOR                → Simplify · dedupe · no behavior change unless fix
PHASE 12 COMMIT_PUSH             → Conventional message · POS cites
PHASE 13 PR                      → Template body · checklist
PHASE 14 SELF_IMPROVEMENT        → SELF_IMPROVEMENT_ENGINE (next item or idle)
```

**Rule W-01:** Cannot enter phase N+1 while phase N has an open **BLOCK**.

**Rule W-02:** Phases 5–10 may iterate in a loop (`fix → re-run`) until green.

**Rule W-03:** T1 may skip phases 8–9 with QA + Security pass — never skip 5–7.

**Rule W-T01 (COS v1.1):** Mission tier scales phases 8–10:

| Tier | Phases 8–9 | Phase 10 reviewers |
|------|------------|-------------------|
| T0 | Skip | Org Health only |
| T1 | Skip | 3 (owner, Security, QA) |
| T2 | Alignment spot-check | TASK_ROUTER (3–5) |
| T3 | Full governance + Council | Up to 16 + RC |

---

## Phase Detail

### PHASE 0 — Mission intake

| Step | Action | Output |
|------|--------|--------|
| 0.1 | Parse user message | Raw intent string |
| 0.2 | Run MISSION_ENGINE | Mission brief |
| 0.3 | If BLOCK ambiguity | Escalate or default per MISSION_ENGINE |
| 0.4 | Classify mission type | `feature` · `bugfix` · `refactor` · `debt` · `docs-runtime-only` |

### PHASE 1 — Planning

| Step | Action | Output |
|------|--------|--------|
| 1.1 | TASK_ROUTER → primary + secondary roles | Role assignment |
| 1.2 | PLANNING_ENGINE → scope in/out | Plan artifact |
| 1.3 | List affected systems | File/route/surface list |
| 1.4 | Acceptance criteria | Testable bullets with POS refs |

### PHASE 2 — Research

| Step | Action | Output |
|------|--------|--------|
| 2.1 | Read POS minimum + domain docs | Citation list |
| 2.2 | Read PCB if child/world surface | World bible ref or N/A |
| 2.3 | Read COS playbook if executive decision | Playbook ref or N/A |
| 2.4 | Grep codebase for symbols/routes | Existing implementation map |
| 2.5 | Read SYSTEM_ANALYSIS.md | Context only — never authority |

### PHASE 3 — Architecture

| Step | Action | Output |
|------|--------|--------|
| 3.1 | Propose design (minimal diff) | Design note |
| 3.2 | Risk analysis | Risk table (data · auth · child · perf) |
| 3.3 | DECISION_ENGINE pre-check | Pass or BLOCK before code |

### PHASE 4 — Implementation

Follow IMPLEMENTATION_ENGINE exactly.

### PHASE 5 — Test execution

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false \
  env -u RESEND_API_KEY -u RESEND_API_KEY_WEEKLY \
  npm run test:gate
```

Add/adjust tests per QA_ENGINE. Loop until green.

### PHASE 6 — Static analysis

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npm run lint
```

If Tailwind/classes touched: `npm run check:css` when applicable.

### PHASE 7 — Specialist reviews (checklists)

| Review | Engine section | BLOCK triggers |
|--------|----------------|----------------|
| Performance | QA_ENGINE § Performance | p95 regression · bundle bloat on child path |
| Accessibility | QA_ENGINE § A11y | Critical WCAG on child/parent primary path |
| Mobile UX | QA_ENGINE § Mobile | <44px child targets · broken portrait |
| Security | QA_ENGINE § Security | Authz gap · secret · child scope leak |

### PHASE 8 — Governance reviews

| Source | Question |
|--------|----------|
| POS | Violates Constitution · domain rules · QS-15? |
| AOS | Violates 000-core · 190 DoD · applicable .mdc? |
| COS | CPO/CEO veto rules triggered? |
| PCB | World fiction drift? |

Any **BLOCK** → fix before phase 10.

### PHASE 9 — Executive reviews (lightweight)

Apply DECISION_ENGINE seven questions from CPO/CTO/Game/UX/Art/QA lens. Document in PR review table.

### PHASE 10 — REVIEW_ENGINE

Full 16-reviewer pass. Resolve all BLOCK vetoes.

### PHASE 11 — Refactor

- Remove duplication introduced or touched  
- No new scope  
- Must stay green through phase 5–6  

### PHASE 12 — Commit & push

Per `.cursor/rules/170-git-workflow.mdc`. Message includes POS refs for user-facing work.

### PHASE 13 — PR

Body must include:

- Summary (1 paragraph)  
- POS citations  
- QA_ENGINE checklist (all checked)  
- REVIEW_ENGINE table (16 rows)  
- Test commands run  

### PHASE 14 — Self-improvement

If mission complete and capacity remains → SELF_IMPROVEMENT_ENGINE picks next item. Else stop.

---

## Mission Type Shortcuts (allowed only where noted)

| Type | Phases skippable | Never skip |
|------|------------------|------------|
| `bugfix` P0 | 9 (exec) if QA approves | 5–7, 10 |
| `refactor` | 8 PCB if no child UI | 5–6, 10, DECISION |
| `debt` | 8–9 if backend-only | 5–6, 10 |
| `docs-runtime-only` | 4–7 if no code | PLANNING, REVIEW_ENGINE doc row |

---

## Determinism Rules

| ID | Rule |
|----|------|
| W-D01 | Same mission brief + same codebase → same phase order |
| W-D02 | BLOCK always beats speed |
| W-D03 | "Looks fine" is not a gate pass — command output or checklist required |
| W-D04 | Founder silence ≠ approval; only gates = approval |
| W-D05 | One mission per branch unless user specifies batch |

---

## Artifacts (per mission)

Create in working memory / PR — not necessarily committed files:

1. **Mission brief** (MISSION_ENGINE template)  
2. **Plan** (PLANNING_ENGINE template)  
3. **Risk table**  
4. **Review table** (REVIEW_ENGINE)  
5. **QA checklist** (QA_ENGINE)  

---

## Cross-References

- Intake: MISSION_ENGINE  
- Roles: TASK_ROUTER  
- Build: IMPLEMENTATION_ENGINE  
- Gates: QA_ENGINE  
- Vetoes: REVIEW_ENGINE  
- Judgment: DECISION_ENGINE  
- Next work: SELF_IMPROVEMENT_ENGINE  

---

## Completion

Workflow complete when PHASE 13 PR is open and PHASE 10 has zero BLOCK rows.
