# Workflow — Security Review

**Version:** 1.0  
**Roles:** Security · Architect · QA Director  
**Mandatory when:** Auth · child data · uploads · external input · new dependencies

---

## Input

- PR diff touching security surface
- Threat model (who attacks, what asset)
- POS 04 · 10 · `.cursor/rules/120-security.mdc`

---

## Steg

| # | Step | Action |
|---|------|--------|
| 1 | **Surface map** | Routes · middleware order · JWT scope |
| 2 | **Authz** | `requireParent` · child scope · pedagog rules |
| 3 | **Input** | Zod validation · SQL parameterization |
| 4 | **Output** | No PII leak in errors · logs sanitized |
| 5 | **Session** | CSRF · refresh · cookie flags |
| 6 | **Child path** | PIN lockout · no parent API access |
| 7 | **Secrets** | Env only · grep diff for keys |
| 8 | **Dependencies** | New package audit |
| 9 | **Tests** | Auth integration tests added |
| 10 | **Verdict** | Security APPROVE / BLOCK |

---

## Output

- Threat note in PR for sensitive changes
- Auth tests
- BLOCK list if findings

---

## Quality Gates

- [ ] Child cannot access parent endpoints (Q-06)
- [ ] No client-only authorization
- [ ] No secrets in repo
- [ ] Middleware order preserved (`app.js` patterns)
- [ ] Rate limits appropriate on auth endpoints

---

## Stop Conditions

- New data collection → Human Level 4
- Auth model change → Level 3 ADR before merge
- P0 vulnerability found → fix before PR or emergency workflow
- Security vs feature conflict → security wins · escalate CPO if product blocked
