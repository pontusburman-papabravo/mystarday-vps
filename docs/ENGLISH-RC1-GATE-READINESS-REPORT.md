# English RC1 Gate Readiness Report (5A closeout)

**Date:** 2026-08-03  
**Branch:** `cursor/english-launch-rc-audit`  
**Base:** `origin/main` @ `93b68773` (full SHA in git)
**PR:** #842 (draft, MERGEABLE) // pragma: allowlist secret
**Prior audit HEAD (verified):** `8ab1fbccbba39aeb74c4cd7ed1a23016780ff186` (pre-closeout harness port)  
**Operator runbook:** [`docs/runbooks/ENGLISH-RC1-RELEASE-GATE.md`](runbooks/ENGLISH-RC1-RELEASE-GATE.md)

---

## 1. Executive summary

English i18n automation on `main` remains green locally (`audit:i18n:strict`, `test:gate`, `test:e2e:i18n`). PR #842 ports RC-1 harness deltas from draft #813 without duplicating obsolete gate strings. **Prod browser smoke is still BLOCKED** in this agent environment (no `RC1_QA_*` / deploy URL secrets). Closeout hardens **BLOCKED preflight** (exit code **2**, not 0) and documents the full operator gate.

| Decision | Result |
|----------|--------|
| **A — PR #842 harness merge** | **MERGE READY** |
| **B — RC1 prod execution** | **BLOCKED** (secrets + locked deploy SHA for smoke not provisioned here) |
| **C — English store launch** | **NO-GO** |

---

## 2. Preflight

| Item | Value |
|------|-------|
| Branch | `cursor/english-launch-rc-audit` |
| Worktree | `/workspace` (single worktree) |
| `origin/main` | `93b68773` |
| Divergence at branch tip (pre-closeout) | 15 files, +2113 / −131 vs `main` |
| PR #842 | OPEN · Draft · **MERGEABLE** · CI: `test` / `e2e-i18n` failed on earlier runs (re-run after closeout push) |
| PR #813 | OPEN · Draft · **CONFLICTING** with `main` |
| Node / npm | v20.20.2 / 10.8.2 |
| Install | `npm install --include=dev --legacy-peer-deps` (`npm ci` fails: lockfile `sharp` drift vs `package.json`) |
| SW on `main` / branch (no product SW change in #842) | `stjarndag-v762` |

---

## 3. PR #842 status

**Scope:** HARNESS + TEST + NPM SCRIPT + DOCUMENTATION only — no intentional product/UI changes.

**Merge readiness:**

- No secrets or QA credentials in diff  
- BLOCKED preflight exits **2** when base URL / contract missing (verified by unit spawn test)  
- URL userinfo rejected with exit **1**  
- #813 harness files selectively ported; no duplicate parallel copies on `main`  
- `test:gate` green after closeout (see §12)  
- Operator runbook added  

---

## 4. PR #813 supersede matrix

| File in #813 | Status in #842 / `main` | Bedömning |
|--------------|-------------------------|-----------|
| `test/e2e/helpers/rc1-locale-settings-harness.js` | In #842 | **PORTED** |
| `test/unit/rc1-locale-settings-harness.test.js` | In #842 | **PORTED** |
| `test/unit/rc1-handoff-navigation-race.test.js` | In #842 | **PORTED** |
| `test/e2e/helpers/rc1-handoff-cdp-body.js` | In #842 (main had older copy) | **PORTED** |
| `test/e2e/helpers/rc1-handoff-network-capture.js` | In #842 | **PORTED** |
| `test/e2e/helpers/rc1-handoff-picker-contract.js` | In #842 | **PORTED** |
| `test/e2e/helpers/rc1-prod-smoke-handoff.js` | In #842 | **PORTED** |
| `test/e2e/helpers/rc1-prod-smoke-helpers.js` | In #842 | **PORTED** |
| `docs/test-rc1-prod-smoke.md` | In #842 | **PORTED** |
| `package.json` full gate string from #813 | **Not copied** | **OBSOLETE** — selective unit entries + `test:rc1:english-smoke` only |

**Answers:**

1. **All relevant #813 functionality portad** — yes, for handoff race + locale Settings harness paths.  
2. **Kvar endast i #813** — obsolete monolithic `package.json` gate edit; conflicting branch tip not rebased.  
3. **Dubbla testvägar** — no duplicate runners; single canonical `npm run test:e2e:rc1-prod-smoke` / `test:rc1:english-smoke`.  
4. **#813 kan stängas efter merge #842** — yes, do not merge #813.  
5. **Rekommenderad kommentar på #813** — see below.

```text
Superseded by #842. Relevant RC1 handoff and locale harness changes were
selectively ported and rebased onto current main. This PR should not be merged.
```

---

## 5. Diff review (#842 + closeout)

| File | Class | Action | Notes |
|------|-------|--------|-------|
| `scripts/lib/rc1-english-smoke-env.js` | HARNESS | **KEEP** | Secret contract + URL validation |
| `scripts/run-e2e-rc1-prod-smoke.js` | HARNESS | **KEEP** | BLOCKED exit 2, URL guard |
| `test/e2e/helpers/rc1-*` | TEST/HARNESS | **KEEP** | Ported helpers |
| `test/unit/rc1-*` | TEST | **KEEP** | Unit coverage |
| `test/unit/rc1-run-e2e-prod-smoke-blocked.test.js` | TEST | **KEEP** (closeout) | Spawn blocked preflight |
| `package.json` | NPM SCRIPT | **KEEP** | Gate entries only |
| `docs/ENGLISH-LAUNCH-RC-AUDIT-2026-08.md` | DOCUMENTATION | **KEEP** | Audit history |
| `docs/runbooks/ENGLISH-RC1-RELEASE-GATE.md` | DOCUMENTATION | **KEEP** (closeout) | Operator runbook |
| `docs/releases/RC1_I18N_RC_BRANCH_STATUS.md` | DOCUMENTATION | **ADJUST** | Status append |
| `docs/test-rc1-prod-smoke.md` | DOCUMENTATION | **KEEP** | Matches harness |
| `public/sw.js` | — | **ALREADY ON MAIN** | Not in #842 diff |

**UNEXPECTED:** none.

---

## 6. Secret contract

| Variable | Obligatorisk | Typ | Användning | Får loggas |
|----------|-------------:|-----|------------|------------|
| `RC1_SMOKE_BASE_URL` | Ja (smoke) | URL | Deploy target | Ja (host only) |
| `E2E_BASE_URL` | Alt. base | URL | Fallback base | Ja |
| `RC1_QA_EMAIL` | Ja | Secret | Parent login | **Nej** |
| `RC1_QA_PASSWORD` | Ja | Secret | Parent login | **Nej** |
| `RC1_QA_FAMILY_ID` | Ja (fixture) | ID | Family guard | Ja (UUID) |
| `RC1_CHILD_USERNAME` | Ja | ID | Child login | Ja |
| `RC1_CHILD_PIN` | Ja | Secret | Child login | **Nej** |
| `RC1_PARENT_PIN` | Ja (handoff) | Secret | Handoff | **Nej** |
| `RC1_EXPECTED_SHA` | Ja | ID | `/health` | Ja |
| `RC1_EXPECTED_CACHE` | Ja | ID | `/sw.js` | Ja |
| `RC1_QA_DATABASE_URL` | Prepare only | Secret | DB prepare | **Nej** |
| `RC1_PIN_FINGERPRINT_KEY` | Prepare/runner | Secret | PIN fingerprint | **Nej** |

**Verified:**

- Validation before Puppeteer (runner exits before spawning e2e file)  
- Missing secrets → `BLOCKED` message, exit **2**  
- Credentials in URL → exit **1**, no value logged  
- `formatRc1EnglishSmokeBlockedReason` lists names only  
- Unit tests cover all-missing, single missing, whitespace, invalid URL, credential URL, redirect host  

---

## 7. QA data contract

Dedicated allowlisted family — [`docs/rc1-qa-fixture.md`](rc1-qa-fixture.md).

| Requirement | Enforced by |
|-------------|-------------|
| No customer/founder/review accounts | `isAllowedRc1QaParentEmail`, prepare email domain guard |
| en-GB + `english_app` + `english_child_experience` | `rc1-qa-prepare-core` |
| Parent + child + PINs | Prepare transaction |
| Minimal schedule + activity + today log | Reset manifest + reseed |
| Known `family_id` | Prepare JSON + smoke `assertRc1QaFamilyId` |
| Reset without deleting family row | `wipeQaFamilyData` manifest |

**`npm run rc1:qa:prepare`:** idempotent apply; PIN verified in transaction before COMMIT; does not target prod customer DB when email allowlist + domain guard pass.

**Operator workflow:** PREPARE → VERIFY CLEAN STATE → RUN → CAPTURE EVIDENCE → RESET → VERIFY RESET (detailed in runbook).

---

## 8. Release-SHA contract

| Check | Env / source | Before browser |
|-------|----------------|----------------|
| Expected SHA | `RC1_EXPECTED_SHA` | `fetchReleaseIdentity` / `assertExactHealthSha` |
| Actual SHA | `GET /health` → `git_sha` | Test 1 in suite |
| Expected cache | `RC1_EXPECTED_CACHE` | `assertExactCacheName` on `/sw.js` text |
| Actual cache | `CACHE_NAME` in `/sw.js` | Same |
| Host canonical | `assertCanonicalHost` | Handoff path |
| Redirect host | `assertSmokeUrlSameHost` (unit) | Pure validation |

Abort smoke if SHA/cache missing or mismatch — implemented in e2e test 1 and runner required env keys.

**Approve release only:** SHA on deploy under test equals locked `RC1_EXPECTED_SHA` and cache equals deployed `public/sw.js` (currently `stjarndag-v762` on `main` until a later deploy bumps it).

---

## 9. Handoff-debug 3/3

| Step | Covered by |
|------|------------|
| 3 independent runs | `RC1_SMOKE_FILTER=handoff` + `RC1_HANDOFF_DEBUG_RUNS=3` |
| 2 tests per run | release identity + handoff |
| Evidence artifacts | `artifacts/rc1-prod-smoke/` |
| No credential storage | Harness redaction policy |

**Not executed in this session** — BLOCKED (secrets). Historical BLOCKED results **not** upgraded to PASS.

---

## 10. Full smoke 5/5 × 2

Authoritative definition: [`docs/test-rc1-prod-smoke.md`](test-rc1-prod-smoke.md) (five tests listed in runbook §E).

| Scenario | Mandatory evidence |
|----------|-------------------|
| Parent auth | Parent dashboard after login |
| Locale | en-GB via Settings + reload |
| Child login | Child dashboard English |
| Completion / child journey | Child i18n + session assertions in suite |
| Parent handoff | Parent session restored |
| Reports gating | 403 `COMPONENT_MISSING` (5th test) |

Two full suites: `RC1_SMOKE_RUNS=2`. Fail then pass on retry = **FLAKY**, not stable PASS.

---

## 11. Redaction and security

- Prepare errors redact password/connection strings (`sanitizePrepareError`)  
- Blocked reason strings exclude secret values (unit assertion)  
- Smoke artifacts path documented; no cookies in saved summaries  
- CI masking not sole protection — runner avoids printing secrets  

---

## 12. Test results (closeout VM, 2026-08-03)

| Command | Result | Exit | Counts | Duration (approx.) |
|---------|--------|------|--------|-------------------|
| `npm run audit:i18n:strict` | PASS | 0 | 0 hits | ~0.2s |
| `npm run test:gate:unit` | PASS | 0 | 1829 pass / 0 fail / 4 skip | ~72s |
| `npm run test:gate` | PASS | 0 | 357 db pass (unit+db gate) | ~195s total |
| `npm run test:e2e:i18n` | PASS | 0 | 23/23 | ~178s |
| RC1 unit bundle (env, blocked runner, identity, handoff, locale) | PASS | 0 | 45 pass | ~0.14s |
| `npm run test:rc1:english-smoke` (no secrets, unset `E2E_BASE_URL`) | **BLOCKED** | **2** | preflight only | &lt;1s |

**Note:** If `E2E_BASE_URL` is injected by the environment, smoke may proceed to missing QA secret errors (exit 1) — operators should unset unrelated base URLs for blocked check.

---

## 13. Conflict risks

| File | #842 | Other PR | Risk | Recommendation |
|------|:----:|:--------:|------|----------------|
| `package.json` | gate scripts | #840, #841 | Medium | Merge #842 first (test-only); rebase growth/stability on main |
| `public/sw.js` | none | #840 | Low for #842 | Expect SW bump on stability merge — set `RC1_EXPECTED_CACHE` to post-merge value |
| `package-lock.json` | none | #840, #841 | Low | Independent |
| RC helpers | #842 only | #813 obsolete | Low | Close #813 |
| `child-dashboard*` | none | #840 | None for harness | Run smoke after stability if child path changes |
| Auth/handoff product | on main (#806) | — | Re-verify on deploy SHA | Smoke proves per release |

No SW bump in #842 closeout (no client asset change).

---

## 14. Merge readiness (#842)

**MERGE READY** — harness + docs + tests; no product commits; BLOCKED semantics safe; runbook complete.

---

## 15. Remaining blockers (RC / store)

1. RC1 secrets not in operator/CI environment for prod smoke  
2. No browser PASS for handoff 3/3 or 5/5×2 on **final** deploy SHA  
3. Physical iPhone + Android QA not run  
4. English legal pages need content/legal review  
5. Native EN screenshots missing/stale  
6. Android committed tree incomplete for local native build proof  

---

## 16. Exact next operator steps

1. Merge #842; close #813 with supersede comment.  
2. Provision secrets per [`docs/runbooks/ENGLISH-RC1-RELEASE-GATE.md`](runbooks/ENGLISH-RC1-RELEASE-GATE.md).  
3. Deploy release candidate; lock `RC1_EXPECTED_SHA` + `RC1_EXPECTED_CACHE` from live `/health` and `/sw.js`.  
4. `RC1_PREPARE_MODE=apply npm run rc1:qa:prepare` on QA DB.  
5. Handoff-debug 3/3 then full 5/5×2.  
6. Physical device matrix → legal → screenshots → store (RC-2).

---

### Recommended #813 GitHub comment (do not post unless asked)

```text
Superseded by #842. Relevant RC1 handoff and locale harness changes were
selectively ported and rebased onto current main. This PR should not be merged.
```
