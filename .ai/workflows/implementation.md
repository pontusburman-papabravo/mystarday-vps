# Workflow — Implementation

**Version:** 1.0  
**Roles:** Architect · domain engineers · QA Director  
**Autonomy loop:** SPEC → IMPLEMENT → TEST → VERIFY → RED TEAM → BUG HUNT → FIX → REGRESSION → PR

---

## Input

- User mission or issue with acceptance criteria
- POS domain docs identified
- Decision level classified ([DECISION_MODEL.md](../DECISION_MODEL.md))
- Shift rules ([DAY_SHIFT.md](../DAY_SHIFT.md) / [NIGHT_SHIFT.md](../NIGHT_SHIFT.md))

---

## Steg

| # | Phase | Action |
|---|-------|--------|
| 1 | **SPEC** | Scope in/out · POS cites · affected files/routes · acceptance criteria |
| 2 | **Design** | Design note if Level 2+ · ADR if Level 3 |
| 3 | **IMPLEMENT** | Minimal diff · conventions from [standards/coding.md](../standards/coding.md) |
| 4 | **TEST** | Unit + integration per [workflows/testing.md](testing.md) |
| 5 | **VERIFY** | Lint · gate · manual smoke if UI |
| 6 | **RED TEAM** | Adversarial review — auth bypass, edge cases, child paths |
| 7 | **BUG HUNT** | [workflows/bug-hunt.md](bug-hunt.md) on touched code |
| 8 | **FIX** | Address findings · no scope creep |
| 9 | **REGRESSION** | Re-run full gate |
| 10 | **PR** | Description + MORNING_REPORT sections if night |
| 11 | **Self-review** | `.cursor/rules/180-self-review.mdc` all relevant roles |

---

## Output

- Feature branch with commits
- PR (draft OK night shift)
- Test evidence
- POS citations in description
- ADR link if Level 3

---

## Quality Gates

- [ ] `npm run test:gate` green
- [ ] `npm run lint` clean (0 errors)
- [ ] No Level 4 work without human sign-off
- [ ] SW bumped if `public/` static assets changed
- [ ] Definition of Done (190) satisfied

---

## Stop Conditions

- Level 3 without accepted ADR
- Level 4 trigger ([HUMAN_ESCALATION.md](../HUMAN_ESCALATION.md))
- Gate failure unfixable in session → MORNING_REPORT Blockers
- POS undefined behavior → escalate, do not guess
- Night shift: forbidden category touched
