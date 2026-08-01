# RC-1 English — automation & release status (2026-08-01)

**Prod identity (verify before each smoke):** `GET /health` → `git_sha`; `GET /sw.js` → `CACHE_NAME`  
**Handoff client fix:** merged **#806** (`5164db4c`, SW **v750+**; prod may be ahead e.g. **v753** on `caa5753d`).  
**Prod smoke harness:** open **#803** (`cursor/rc1-prod-smoke-stabilize-b0f7`).

## RC definitions (consistent)

| Phase | Scope |
|-------|--------|
| **RC-1** | Code, automation, prod-smoke, **physical** functional QA (iPhone + Android) |
| **RC-2** | Store metadata, market web, rollout flags, ops |

## Automation gates

| Gate | Requirement | Status |
|------|-------------|--------|
| #806 merged + deployed | Handoff `sessionRestored` client completion | **PASS** (on main/prod) |
| Handoff-only smoke | 3/3, `RC1_SMOKE_FILTER=handoff` | **BLOCK** — `verify-pin-picker` 401: update `RC1_PARENT_PIN` + `RC1_CHILD_USERNAME=astrid921` in secrets |
| Full prod-smoke | 5/5 × 2, `RC1_REQUIRE_HANDOFF=true` | Run per deploy SHA |
| GitHub `rc1-prod-smoke` workflow | 5/5 × 2 with secrets | Pending per release |
| `test:gate` + `test:e2e:i18n` | CI green on smoke PR | Required before #803 merge |
| Physical R4-E + Journeys A–D | Real devices + evidence | **NOT RUN** (agent cannot sign off) |

## QA account (agents)

**Founder prod smoke:** `pontus@burman.cc` + Astrid — [`docs/founder-qa-test-account.md`](../founder-qa-test-account.md).  
**App Store review family** (Anna): store/release checklists only — not agent automation.

## Overall RC-1 verdict

| Milestone | Status |
|-----------|--------|
| READY FOR DEVICE QA | **BLOCK** — prod handoff smoke not 3/3 (parent PIN secret + child username) |
| RC-1 DEVICE PASS | After documented iPhone + Android matrix |
| RC-1 GO | After R4-E, Journeys, R1–R3, push/email/PDF on devices |
| READY FOR ENGLISH STORE RELEASE | RC-1 GO + RC-2 store/ops |

## Out of scope (unchanged)

Swedish admin, growth/referral, För dig Sprint 2–5, new paywalls, broad polish without repro.
