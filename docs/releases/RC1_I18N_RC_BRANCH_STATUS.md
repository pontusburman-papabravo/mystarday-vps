# RC-1 English — automation & release status (2026-08-01)

**Prod identity (verify before each smoke):** `GET /health` → `git_sha`; `GET /sw.js` → `CACHE_NAME`  
**Handoff client fix:** merged **#806** (`5164db4c`, SW **v750+**).  
**Prod smoke harness:** open **#803** (Draft) — dedicated QA fixture [`rc1-qa-fixture.md`](../rc1-qa-fixture.md).

## RC definitions (consistent)

| Phase | Scope |
|-------|--------|
| **RC-1** | Code, automation, prod-smoke, automated device matrix |
| **RC-2** | Store metadata, market web, rollout flags, ops |

## Automation gates

| Gate | Requirement | Status |
|------|-------------|--------|
| #806 merged + deployed | Handoff `sessionRestored` client completion | **PASS** (on main/prod) |
| QA fixture + `rc1:qa:prepare` | Allowlisted family only; no founder PIN attempts | **READY** (in #803) |
| Handoff-only smoke | 1/1 then 3/3, `RC1_SMOKE_FILTER=handoff` | **BLOCK** — secrets + first prod prepare not run in CI yet |
| Full prod-smoke | 5/5 × 2, `RC1_REQUIRE_HANDOFF=true` | **BLOCK** (depends on handoff) |
| GitHub `rc1-release-gate` workflow | prepare → handoff ladder → smoke ×2 → iOS/Android | **READY** (needs env secrets) |
| `test:gate` | CI green on smoke PR | Required before #803 merge |
| Native Capacitor binaries on farm | Real device permissions (media upload, etc.) | **VISUAL_REVIEW_OPTIONAL** where not scriptable |

## QA account (automation)

**RC-1 prod smoke / device QA:** allowlisted `rc1-qa-parent@…` + child `rc1qachild` — secrets only; see [`rc1-qa-fixture.md`](../rc1-qa-fixture.md).  
**Founder manual QA:** [`founder-qa-test-account.md`](../founder-qa-test-account.md) — **not** RC-1 automation.  
**App Store review** (Anna): store checklists only.

## Overall RC-1 verdict

| Milestone | Status |
|-----------|--------|
| RC-1 AUTOMATED FUNCTIONAL PASS | **BLOCK** — prod smoke not green on QA fixture |
| READY FOR ENGLISH STORE RELEASE | After RC-1 GO + RC-2 |

## Out of scope (unchanged)
