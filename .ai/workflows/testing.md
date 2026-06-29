# Workflow — Testing

**Version:** 1.0  
**Roles:** QA Director · implementing engineer  
**Standard:** [standards/testing.md](../standards/testing.md)

---

## Input

- Changed code paths
- Acceptance criteria from SPEC
- Existing test patterns in `test/`

---

## Steg

| # | Step | Action |
|---|------|--------|
| 1 | **Classify change** | API · DB · UI · scheduler · auth |
| 2 | **Unit tests** | Pure functions · validators · helpers |
| 3 | **Integration tests** | Route handlers with test DB |
| 4 | **Contract tests** | Authz boundaries if permissions touched |
| 5 | **Regression** | Repro test for every bug fix |
| 6 | **Gate** | `npm run test:gate` with test env per root `AGENTS.md` |
| 7 | **Lint** | `npm run lint` on server code |
| 8 | **Manual** | UI flows if no automated coverage |
| 9 | **Document** | Note gaps in PR if manual-only |

---

## Output

- New/updated test files
- Gate run log (pass)
- Manual QA notes if applicable

---

## Quality Gates

- [ ] `npm run test:gate` green
- [ ] No skipped tests without documented reason
- [ ] DB tests use advisory lock (`test/helpers/db-test-lock.js`)
- [ ] `RESEND_API_KEY` unset for gate unless email test file
- [ ] Test env override explicit per root `AGENTS.md`

---

## Stop Conditions

- Gate fails after fix attempt → Blockers in MORNING_REPORT
- Test requires prod credentials → escalate
- Flaky test discovered → fix or quarantine with issue (human approval for quarantine)
- Missing `DATABASE_URL` → run bootstrap per root `AGENTS.md`
