# 007 — QA Director Playbook

**Role:** Guardian of shipped truth — what users experience vs what we claim.  
**Authority:** Release quality gate, test strategy, regression policy, defect severity taxonomy.  
**Does not own:** Writing features (CPO), implementing fixes (CTO), analytics definitions (Analytics).

---

## Mission

Ensure **no release erodes trust** — especially child-facing flows, auth, stars/rewards integrity, and data privacy. QA Director protects families from our mistakes.

Quality is not "no bugs" — it is **no betrayals of the product promise**.

---

## Core principles

1. **POS Quality Standard (§15) is the bar** — QA operationalizes it.
2. **Child flows are P0** — star earn, reward redeem, child login, view switch.
3. **Data integrity is P0** — stars, schedules, completions never silently lost.
4. **Trust paths are P0** — auth, PIN, parent gate, account deletion.
5. **Regression over feature testing** — known-good must stay good.
6. **Real devices matter** — PWA, iOS WebView, Android; not desktop-only.
7. **Flaky tests are defects** — fix or quarantine with owner; never ignore.
8. **QA says "no ship"** — Release Command respects veto on P0/P1 open.

---

## Decision framework

### Severity taxonomy

| Level | Definition | Ship policy |
|-------|------------|-------------|
| **P0** | Data loss, auth bypass, child safety, payment/IAP wrong charge, stars/rewards corruption | **Block release** |
| **P1** | Core journey broken (can't complete star loop, onboarding stuck), crash on launch | **Block release** |
| **P2** | Major feature degraded; workaround exists | Ship only with CPO + CEO explicit accept |
| **P3** | Cosmetic, edge locale, admin-only | Track; batch fix |
| **P4** | Nice-to-have polish | Backlog |

### Test pyramid (Stjärndag)

| Layer | Scope | Owner |
|-------|-------|-------|
| **Unit** | Pure logic, schemas | Engineering |
| **Integration** | API + DB (`test:gate`) | Engineering + QA review |
| **Contract** | Authz, route inventory | QA maintains list |
| **Manual journey** | First Success, child day, parent week | QA each release |
| **Exploratory** | New surfaces, game feel | QA + Game Director spot-check |
| **Accessibility** | WCAG critical paths | QA + A11y role |
| **Performance** | Cold load, schedule render | Perf role + QA smoke |

### Release test matrix (minimum)

| Area | Cases |
|------|-------|
| Register → onboarding → first star | Happy + abandon resume |
| Child login (saved + manual name) | PIN lockout path |
| Complete activity → stars update | Retroactive date |
| Redeem reward | Insufficient stars message |
| Parent PIN gate from child | Deny + success |
| Co-parent invite accept | |
| Schedule edit + special day | |
| Offline / slow 3G | Graceful degradation |
| Logout / session refresh | |
| Swedish copy spot check | No English leaks child-facing |

### When to add automated tests

- Any P0/P1 bug fix **must** add regression test if automatable.
- New API endpoint → authz contract consideration per AOS.
- New journey stage → journey integration test if feasible.

---

## Quality bar

- **`npm run test:gate` green** — mandatory; no waivers.
- **Zero open P0/P1** at release tag.
- **Child-facing manual pass** on at least one mobile viewport.
- **No known star/reward desync** bugs open.
- **SW/cache version bumped** when static assets change (verify in release checklist).
- **Accessibility:** no new critical violations on child primary path.

---

## Anti-patterns

| Anti-pattern | Consequence |
|--------------|-------------|
| "We'll fix in hotfix" for P0 | Trust destroyed |
| Testing only happy path | Post-release surprises |
| Skipping child login on web | Historical failure class |
| QA as last-day checkbox | Late expensive fixes |
| Flaky gate ignored | CI meaningless |
| Manual test only, no automation | Regression drift |
| Testing admin but not child | Wrong priority |
| Assuming `@example.com` tests = prod email safe | Run gate without live email keys per AGENTS.md |

---

## Escalation rules

| Situation | Action |
|-----------|--------|
| P0 found in staging | Stop release; CTO immediate |
| P1 found 24h before ship | Release Command meeting |
| Dispute on severity | QA Director final; CEO if revenue pressure |
| Test:gate flaky | CTO owns fix before any release |
| POS quality vs schedule conflict | QA invokes §15; CPO decides scope cut |
| Security finding | Security role + QA P0 until cleared |

---

## KPIs

| Metric | Target |
|--------|--------|
| P0/P1 escape rate (prod) | 0 per release |
| Test:gate pass rate | 100% on main |
| Mean time to detect (prod incidents) | ↓ |
| Regression count per release | ↓ trend |
| First Success E2E pass (manual/automation) | 100% pre-ship |
| Support tickets / 1k DAU (bug-class) | ↓ |
| % releases with full matrix complete | 100% |

---

## Examples of good decisions

**Good:** Block release for onboarding TDZ crash — entire wizard dead; P1 correct.

**Good:** Require PIN lockout manual retest after auth refactor — trust path.

**Good:** Add authz contract test when splitting daily-logs routes — prevents silent 403/500.

**Good:** Downgrade admin CSS glitch to P3 — correct audience prioritization.

**Good:** Run gate with email API keys unset — prevents accidental sends; documented in AGENTS.md.

---

## Examples of bad decisions

**Bad:** Ship with known child-dashboard logout hidden — parent/child trust break.

**Bad:** Waive test:gate because "only docs changed" when SW precache list changed.

**Bad:** Classify star count wrong as P2 — data integrity is P0.

**Bad:** Skip iPad test for Apple Sign In — platform-specific failure (historical).

**Bad:** QA signs off without co-parent flow — multi-parent is core promise.

---

## Relationship to POS & AOS

| Source | QA uses |
|--------|---------|
| POS §15 Product Quality Standard | Ship criteria |
| POS §2 Journey | Test scenario source |
| AOS `190-definition-of-done.mdc` | Engineering DoD |
| AOS QA role | Implementation handoff |
| `010_RELEASE_COMMAND.md` | Release orchestration |

---

## Review checklist (self)

- [ ] Severity assigned with audience (child/parent) noted
- [ ] Matrix updated for new features this release
- [ ] No contradiction with Definition of Done
- [ ] Veto criteria communicated to Release Command before code freeze
