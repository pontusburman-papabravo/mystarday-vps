# Workflow — Bug Hunt

**Version:** 1.0  
**Roles:** QA Director · Security · domain engineer  
**When:** After implementation · proactive night shift · before release

---

## Input

- Changed files list
- Related routes and user flows
- Known bug patterns (`docs/TEKNISKA-KANDA-BUGGAR.md`)
- Recent regressions in same area

---

## Steg

| # | Step | Action |
|---|------|--------|
| 1 | **Map surface** | API routes · UI pages · child vs parent paths |
| 2 | **Boundary tests** | Empty input · max length · null · wrong role |
| 3 | **Authz matrix** | Child cannot access parent · pedagog scope · PIN |
| 4 | **Concurrency** | Double submit · race on star give · idempotency |
| 5 | **Timezone/date** | Family TZ · schedule day boundaries · retroactive log |
| 6 | **Mobile** | Portrait · safe area · offline honesty |
| 7 | **Regression grep** | Similar bugs in codebase history |
| 8 | **Document** | File findings · severity P0–P3 |
| 9 | **Repro test** | Add failing test for each fixable finding |
| 10 | **Fix or file** | Fix in session or issue + MORNING_REPORT |

---

## Output

- Bug list with severity
- Repro tests (or steps)
- Fixes committed or Blockers documented

---

## Quality Gates

- [ ] P0/P1 found → fixed or escalated before PR
- [ ] Each fix has regression test
- [ ] Findings listed in MORNING_REPORT "Buggar funna/fixed"

---

## Stop Conditions

- P0 child safety → [emergency.md](emergency.md)
- Bug implies architecture flaw → Level 3 ADR
- Bug implies product behavior undefined → Level 4 escalate
- Cannot reproduce → document environment + steps, do not close as "won't fix" without human
