# 12 — QA System

**Version:** 1.0  
**Authority:** Quality verification standards for all releases

---

## Purpose

Define how Stjärndag is tested before release — automated gates, manual protocols, and role responsibilities — so **European-scale trust** is earned.

## Scope

Pre-release verification for web, iOS, Android, backend. Admin smoke included. Not penetration testing (separate engagement).

## Definitions

| Term | Definition |
|------|------------|
| **CI gate** | `npm run test:gate` — 19 curated test files |
| **Full suite** | `npm test` — ~181 files |
| **Mobile gate** | `npm run qa:mobile-gate` — Puppeteer protocol |
| **Constitution test** | Manual check of five rules |

---

## Quality North Star

> No release ships without **gate green** + **constitution spot-check** on affected flows.

Target: expand gate to cover paywall, IAP, universe engine.

---

## Current State (verified)

### Automated CI (`.github/workflows/ci.yml`)

| Step | Command |
|------|---------|
| Install | `npm ci --legacy-peer-deps` |
| CSS | `npm run check:css` |
| Lint server | `npm run lint` |
| Lint client | `npm run lint:public` (warning budget 735 — often exceeded ~2900) |
| Migrate | `npm run migrate` |
| Gate | `npm run test:gate` |
| Migration rollback | `migration-rollback-gate.test.js` |

### test:gate files (19)

`setup-test-db`, `auth-integration`, `child-access-integration`, `maintenance-order`, `app-links-routes`, `engine-golden`, `engine-shadow-logic`, `first-success-api`, `engine-coach-authority`, `journey-context`, `journey-route-scope`, `journey-fas2`–`fas5`, `journey-golden-path`, `journey-daily-analysis`

### Not in gate (gaps)

| Area | Test file |
|------|-----------|
| Paywall | `paywall-model-contract.test.js` |
| Journey Gate | `journey-communication-gate.test.js` |
| Activation program | ~15 files |
| Rewards HTTP | partial mocks only |
| IAP webhook | **none** |
| Universe engine | **none** |
| E2E browser | scripts only |

### Manual protocols

| Doc | Use |
|-----|-----|
| `docs/QA-mobil-release-gate-runbook.md` | Mobile release |
| `docs/QA-mobil-fullstandig-protokoll.md` | Full mobile QA |
| `npm run qa:mobile-gate` | Automated mobile smoke |

### DB tests

PostgreSQL advisory lock — `test/helpers/db-test-lock.js`

---

## Target State

| Area | Target |
|------|--------|
| **Gate expansion** | + paywall, communication-gate, universe-engine unit tests |
| **IAP webhook** | Integration test with mock RevenueCat |
| **lint:public** | Reduce warnings OR raise budget with plan |
| **Constitution checklist** | Required in PR template for user-facing |
| **Child a11y** | WCAG audit checklist |
| **Visual regression** | Optional Playwright screenshots for magic UI |
| **Staging** | Pre-prod environment for flag rollout |

---

## QA Rules

**Q-01** `test:gate` must pass before merge to main.  
**Q-02** User-facing PR requires manual flow note in PR body.  
**Q-03** Child-surface changes require child-login + completion smoke.  
**Q-04** Parent coach changes require Hem screenshot or recording.  
**Q-05** Mobile release requires `qa:mobile-gate` or runbook sign-off.  
**Q-06** Security-sensitive changes require auth integration tests.  
**Q-07** Migrations require rollback gate test.  
**Q-08** No `@example.com` emails with live Resend in tests without unset keys.  
**Q-09** Apple Sign In changes require `verify-ios-apple-sign-in-patch.mjs`.  
**Q-10** Flag rollout requires journey rollout script status check.

---

## Constitution Test (manual — every release touching UX)

| Rule | Test |
|------|------|
| 1 Leads | New parent sees one next step on Hem |
| 2 No surprise | No unexplained modals |
| 3 Next step | No empty Hem |
| 4 Uncertainty | Copy confirms progress after onboarding action |
| 5 Complete | Post-register has schedule/activities visible |

---

## Test Layers

```
Layer 4: Manual constitution + mobile runbook
Layer 3: qa:mobile-gate / smoke scripts
Layer 2: npm test (full) — pre-release optional
Layer 1: test:gate — CI required
Layer 0: lint + css check
```

---

## Release QA Checklist (summary)

- [ ] CI green on PR
- [ ] `test:gate` locally if server changed
- [ ] SW version bumped if static changed
- [ ] Constitution spot-check (if UX)
- [ ] Mobile gate (if native-affecting)
- [ ] Journey flag rollout doc updated (if flags)
- [ ] Health check after deploy — `GET /health`

Full process: [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md)

---

## Anti-patterns

- Merge with failing gate "to fix later"
- Run full test suite on prod DB
- Skip mobile QA for Capacitor/plugin changes
- Rely on login metrics test for retention features

---

## Acceptance Criteria

QA system update complete when documented in this file and Decision Log if gate composition changes.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [13_RELEASE_PROCESS.md](./13_RELEASE_PROCESS.md) | Deploy gate |
| [11_AI_DEVELOPER_GUIDE.md](./11_AI_DEVELOPER_GUIDE.md) | Agent testing |
| [00_PROJECT_CONSTITUTION.md](./00_PROJECT_CONSTITUTION.md) | Manual tests |
| [../SYSTEM_ANALYSIS.md](../SYSTEM_ANALYSIS.md) §23 | Gap analysis |

---

## AI Instructions

Always run `test:gate` after server changes. Report gaps if touching paywall/IAP/universe without tests — propose test in same PR.

---

## CXO Review Summary

| Role | Assessment |
|------|------------|
| **CEO** | Trust requires gate expansion — Target honest |
| **CPO** | Constitution manual test bridges product/QA |
| **CTO** | CI steps match repo |
| **Principal Engineer** | Gap list drives roadmap |
| **Senior Game Designer** | N/A |
| **UX Director** | Screenshot requirement for coach |
| **Art Director** | Visual regression optional |
| **QA Director** | Layer model actionable |
| **Security Engineer** | Q-06 auth tests |
| **AI Systems Architect** | Agent must run gate |

**Approved:** All roles — v1.0.
