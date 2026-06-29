# PLANNING_ENGINE

**Version:** 1.0  
**Role:** Scope · dependencies · acceptance criteria · POS traceability  
**Invoked:** WORKFLOW_ENGINE Phase 1

---

## Purpose

Turn Mission Brief into an **executable plan** every role can follow without reinterpretation.

---

## Plan Template (required output)

```markdown
## Execution Plan
- **Mission ID:** [from brief]
- **Primary role(s):** [TASK_ROUTER]
- **Blast radius:** low | medium | high

### In scope
1. …

### Out of scope
1. …

### Affected systems
| System | Files/routes | Change type |
|--------|--------------|-------------|

### POS traceability
| Acceptance criterion | POS ref | Verify by |
|----------------------|---------|-----------|

### Dependencies
- [ ] DB migration? …
- [ ] SW bump? …
- [ ] New analytics event? …

### Test plan
| Test | Command / manual |
|------|------------------|

### Risks (preview)
| Risk | Severity | Mitigation |
|------|----------|------------|

### Sequence
1. …
```

---

## Planning Protocol

### Step 1 — Scope bounding

Apply **minimum shippable slice**:

- One primary user outcome per mission  
- Defer "nice" to SELF_IMPROVEMENT backlog  
- If CPO six-month test fails → cut scope or stop  

### Step 2 — System identification

Use deterministic search order:

1. `docs/route-inventory-pre-split.md` or `npm run dump:routes`  
2. Grep feature keywords in `src/` and `public/js/`  
3. Check `public/*.html` for page ownership  
4. Note `public/sw.js` if static assets change  

Record **change type:** add | modify | delete | extract

### Step 3 — Acceptance criteria

Each criterion must be:

- **Testable** — pass/fail observable  
- **POS-linked** — section or rule ID  
- **Owned** — which QA check verifies it  

Minimum counts:

| Mission type | Min criteria |
|--------------|--------------|
| feature | 3 |
| bugfix | 1 (regression + fix) |
| refactor | 2 (parity + tests green) |
| debt | 2 |

### Step 4 — Dependency checklist

| Dependency | Trigger |
|------------|---------|
| Migration | Schema change |
| SW / cache version | Any `public/` JS/CSS/HTML precache |
| Feature flag | Risky rollout |
| Email template | New parent email |
| Analytics allowlist | New client event |
| PCB art | New child world asset |
| i18n | New user-visible string batch |

### Step 5 — Sequence design

Default implementation order:

```
shared lib / schema → API → server logic → client data layer → UI → motion → copy → tests
```

Child-facing: wireframe mentally at 375px **before** desktop.

### Step 6 — Plan approval (self)

Plan approved when:

- [ ] DECISION_ENGINE pre-check passes on stated scope  
- [ ] No unresolved TASK_ROUTER role gaps  
- [ ] Test plan covers every acceptance criterion  
- [ ] Out of scope explicitly includes adjacent temptations  

---

## CPO Feature Gate (embedded)

For `feature` missions, plan must answer COS 002:

| # | Question | Plan section |
|---|----------|--------------|
| 1 | Why does this exist? | In scope #1 |
| 2 | Reduce parent stress? | POS traceability |
| 3 | Increase child independence? | POS traceability |
| 4 | Delight children? | PCB / POS 04 |
| 5 | Delight parents? | POS 05 |
| 6 | Six months test? | Out of scope or justify |

Any **no** without ADR → BLOCK plan.

---

## Anti-Patterns

- Plans without file paths  
- "Update UI" without surface name  
- Missing test plan  
- Scope creep hidden in "also fix"  
- Parallel systems (new route tree duplicating old)  

---

## Completion

Planning complete when Execution Plan exists and WORKFLOW Phase 2 research list is derivable from Affected systems table.
