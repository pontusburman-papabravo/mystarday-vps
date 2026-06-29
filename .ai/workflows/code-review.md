# Workflow — Code Review

**Version:** 1.0  
**Roles:** All reviewer roles · self-review mandatory  
**Rule:** `.cursor/rules/140-code-review.mdc`

---

## Input

- Complete PR diff
- PR description with POS cites
- Test evidence
- Decision log (Level 2+ items)

---

## Steg

| # | Step | Action |
|---|------|--------|
| 1 | **Correctness** | Logic matches spec and POS |
| 2 | **Scope** | No unrelated changes · no drive-by refactors |
| 3 | **Security** | Authz on new routes · no secrets · child scope |
| 4 | **Product** | Constitution tests · CPO lens |
| 5 | **UX** | Parent Experience · child one-action |
| 6 | **Game** | Game Director rules if rewards/celebrations |
| 7 | **A11y** | Labels · contrast · motion |
| 8 | **Performance** | Hot path impact |
| 9 | **Architecture** | Simpler than before · no duplicates |
| 10 | **Tests** | Coverage for new behavior · regression for bugs |
| 11 | **Docs** | Updated if behavior changed |
| 12 | **Verdict** | APPROVE · REQUEST CHANGES · BLOCK |

---

## Output

- Review comments with file:line references
- BLOCK/APPROVE per role when multi-hat review
- Required fixes list before merge

---

## Quality Gates

- [ ] All BLOCK issues resolved
- [ ] Self-review checklist (180) complete
- [ ] No P0/P1 findings open
- [ ] Human merge only (agents do not merge)

---

## Stop Conditions

- Constitution violation → BLOCK until fixed or reverted
- Security P0 → BLOCK
- Missing tests for behavior change → REQUEST CHANGES
- ADR required but missing → BLOCK merge
- Two reviewers disagree on product → escalate CPO
