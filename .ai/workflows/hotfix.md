# Workflow — Hotfix

**Version:** 1.0  
**Roles:** CTO · QA Director · Release Manager · Security  
**When:** P1 live issue — broken routine, auth loop, data incorrect (not P0 safety)

---

## Input

- Live symptom · Sentry/log evidence
- Affected users estimate
- Repro steps

---

## Steg

| # | Step | Action |
|---|------|--------|
| 1 | **Triage** | Confirm P1 · not P0 (P0 → emergency.md) |
| 2 | **Branch** | `hotfix/` from `main` |
| 3 | **Minimal fix** | Smallest diff that fixes root cause |
| 4 | **Test** | Regression test mandatory |
| 5 | **Gate** | `test:gate` green |
| 6 | **Review** | Abbreviated but Security if auth touched |
| 7 | **PR** | Mark hotfix · link incident |
| 8 | **Human merge** | Agent opens PR only |
| 9 | **Deploy** | Human deploys · health check |
| 10 | **Follow-up** | Root cause note · prevent recurrence issue |

---

## Output

- Hotfix PR with regression test
- Deploy verification
- Postmortem stub if data affected

---

## Quality Gates

- [ ] Regression test for bug
- [ ] Gate green
- [ ] No scope creep
- [ ] SW bump if static files changed

---

## Stop Conditions

- Fix requires schema migration → extra care · backup plan · human approval
- Fix requires product behavior change → CPO + human
- P0 upgrade → switch to emergency workflow
- Night shift: may implement hotfix PR · human merges and deploys

**Rule W-03** (`.ai/runtime/WORKFLOW_ENGINE.md`): Hotfix may skip governance reviews 8–9 with QA+CTO waiver in PR — never skip tests or security on auth.
