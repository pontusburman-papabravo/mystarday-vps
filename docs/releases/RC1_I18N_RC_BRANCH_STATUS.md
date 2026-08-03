# RC-1 English — automation & release status

## Update — 2026-08-03 (English Launch 5A audit)

**Full audit report:** [`docs/ENGLISH-LAUNCH-RC-AUDIT-2026-08.md`](../ENGLISH-LAUNCH-RC-AUDIT-2026-08.md)

| Item | Verified value |
|------|----------------|
| Candidate SHA (`origin/main`) | `93b68773ced19e61573539f0801e1cce2d3533b3` (#839 merged) |
| SW / CACHE_NAME (repo tip) | `stjarndag-v762` |
| Branch carrying harness+docs | `cursor/english-launch-rc-audit` |
| PR #813 | Still OPEN draft (`cursor/rc1-handoff-navigation-race-a8bb` @ `047c4af9`); useful harness **selectively ported** into 5A branch — recommend supersede #813 after 5A lands |
| `audit:i18n:strict` | **PASS** (0 hits) on candidate tip |
| `test:rc1:english-smoke` | Alias added → same runner as `test:e2e:rc1-prod-smoke` |
| Prod smoke browser evidence | **BLOCK** — `RC1_QA_*` / `RC1_SMOKE_BASE_URL` / expected SHA+cache **missing** in audit environment |
| Physical iPhone / Android QA | **NOT RUN** |
| English legal pages | **LEGAL REVIEW REQUIRED** (`en-privacy` / `en-terms` still SV-dominant body) |
| Store metadata copy (repo) | Present SV+EN (localized product names) — console upload **NEEDS STORE ACCESS** |
| Screenshots | **MISSING/STALE** for native EN set |

### Automation gates (2026-08-03)

| Gate | Status |
|------|--------|
| #806 handoff client on main | **PASS** (code on main; re-prove on deploy via smoke) |
| QA fixture docs + `rc1:qa:prepare` | **READY** (script present; prepare not executed against prod) |
| Handoff-only smoke 3/3 | **BLOCK** — secrets |
| Full prod-smoke 5/5 × 2 | **BLOCK** — secrets |
| Harness unit tests (nav race + locale Settings + env validation) | **PASS** (local) |
| `test:gate` / `test:e2e:i18n` | See audit report final matrix |
| Native device matrix | **BLOCK** / **NEEDS MANUAL QA** |

### Verdict (2026-08-03)

| Milestone | Status |
|-----------|--------|
| RC-1 AUTOMATED FUNCTIONAL PASS | **BLOCK** — no verified prod browser end-state on QA fixture |
| 5A audit & automation track | **CONDITIONAL GO** (decision underlay complete; smoke still blocked) |
| READY FOR ENGLISH STORE RELEASE | **NO-GO** |

---

## Historical snapshot — 2026-08-01

**Prod identity (verify before each smoke):** `GET /health` → `git_sha`; `GET /sw.js` → `CACHE_NAME`  
**Handoff client fix:** merged **#806** (`5164db4c`, SW **v750+**).  
**Prod smoke harness:** open **#803** (Draft) — dedicated QA fixture [`rc1-qa-fixture.md`](../rc1-qa-fixture.md).  
*(Note 2026-08-03: harness work continued in #813; fixture docs remain canonical.)*

## RC definitions (consistent)

| Phase | Scope |
|-------|--------|
| **RC-1** | Code, automation, prod-smoke, automated device matrix |
| **RC-2** | Store metadata, market web, rollout flags, ops |

## Automation gates (as of 2026-08-01 — superseded where 2026-08-03 differs)

| Gate | Requirement | Status (2026-08-01) |
|------|-------------|---------------------|
| #806 merged + deployed | Handoff `sessionRestored` client completion | **PASS** (on main/prod) |
| QA fixture + `rc1:qa:prepare` | Allowlisted family only; no founder PIN attempts | **READY** (in #803) |
| Handoff-only smoke | 1/1 then 3/3, `RC1_SMOKE_FILTER=handoff` | **BLOCK** — secrets + first prod prepare not run in CI yet |
| Full prod-smoke | 5/5 × 2, handoff required | **BLOCK** (depends on handoff) |
| GitHub `rc1-release-gate` workflow | prepare → handoff ladder → smoke ×2 → iOS/Android | **READY** (needs env secrets) |
| `test:gate` | CI green on smoke PR | Required before #803 merge |
| Native Capacitor binaries on farm | Real device permissions (media upload, etc.) | **VISUAL_REVIEW_OPTIONAL** where not scriptable |

## QA account (automation)

**RC-1 prod smoke / device QA:** allowlisted `rc1-qa-parent@…` + child `rc1qachild` — secrets only; see [`rc1-qa-fixture.md`](../rc1-qa-fixture.md).  
**Founder manual QA:** [`founder-qa-test-account.md`](../founder-qa-test-account.md) — **not** RC-1 automation.  
**App Store review** (Anna): store checklists only.

## Overall RC-1 verdict (2026-08-01)

| Milestone | Status |
|-----------|--------|
| RC-1 AUTOMATED FUNCTIONAL PASS | **BLOCK** — prod smoke not green on QA fixture |
| READY FOR ENGLISH STORE RELEASE | After RC-1 GO + RC-2 |

## Out of scope (unchanged)
