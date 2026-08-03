# English Launch 5A — RC Audit (2026-08-03)

**Track:** English Launch 5A (RC-audit, automation, i18n verification, native/store inventory, legal readiness)  
**Branch:** `cursor/english-launch-rc-audit`  
**Candidate base SHA:** `93b68773ced19e61573539f0801e1cce2d3533b3` (`origin/main`, includes merged #839)  
**Auditor environment:** Cursor Cloud Agent worktree · Node 20.20.2 · npm 10.8.2  
**Install command that works:** `npm ci --legacy-peer-deps` (with `--include=dev` when the environment omits devDependencies)

---

## 1. Executive summary

English i18n program remains **implementation-complete** on current `main` (SW `stjarndag-v762`). Automated local gates for i18n strict audit are green. RC-1 **prod browser smoke remains BLOCKED** in this environment because RC1 QA secrets (`RC1_QA_*`, `RC1_SMOKE_BASE_URL`, expected SHA/cache) are not injected. Physical iPhone/Android QA and legal review of English pages are still open.

**Decision A (5A audit & automation):** **CONDITIONAL GO** — audit matrix complete; harness from #813 selectively ported and unit-tested; smoke command aliased and secret-validation covered; remaining work is secrets + prod browser evidence + device/legal/store assets.  
**Decision B (English store launch):** **NO-GO** — mandatory prod smoke, physical device QA, English legal content review, and store screenshot readiness are not verified.

---

## 2. Preflight

| Item | Value |
|------|-------|
| Branch | `cursor/english-launch-rc-audit` |
| Worktree | `/home/ubuntu/worktrees/english-launch-rc-audit` |
| HEAD (pre-commit base) | `93b68773` |
| `origin/main` | `93b68773` (no divergence at branch create) |
| Baseline analysis SHA | `5eb6a0f6` (ancestor; superseded by #839 merge) |
| #839 | **MERGED** 2026-08-03 → `93b68773` |
| Node / npm | v20.20.2 / 10.8.2 |
| Install | `npm ci --legacy-peer-deps` (+ ensure `sharp` present for `room-scene-export`) |
| Working tree at start | clean on `main`; audit work isolated in worktree |
| Relevant open PRs | **#813** (draft RC1 harness), #831 ops, #825 integrity, #789 account deletion, others |
| Recently merged | #839, #838, #837, #836, #835, #834–#832, #830 |

---

## 3. Current SHA and branch

- **English RC candidate SHA for this audit:** `93b68773ced19e61573539f0801e1cce2d3533b3`
- **SW / cache:** `stjarndag-v762` (`public/sw.js` + `config/cache-version.json`)
- **Do not treat** older status docs citing SW v750/v753 or SHA `5eb6a0f6` as current without re-verification against `/health` + `/sw.js` on the deploy under test.

---

## 4. PR #813 assessment

**PR:** #813 (draft; head `cursor/rc1-handoff-navigation-race-a8bb` @ `047c4af9`)  
**State:** OPEN · **Draft:** yes  
**Scope:** test-harness only (handoff navigation race + locale Settings waits + 429 retries)  
**CI note:** mixed historical checks (one failed run showed DB/env noise; e2e-i18n success recorded on a later run). Not used as PASS evidence for prod smoke.

| File | Verdict | Notes |
|------|---------|-------|
| `test/e2e/helpers/rc1-locale-settings-harness.js` | **KEEP** | Not on main; ported |
| `test/unit/rc1-locale-settings-harness.test.js` | **KEEP** | Ported; 12 unit cases green |
| `test/unit/rc1-handoff-navigation-race.test.js` | **KEEP** | Ported |
| `test/e2e/helpers/rc1-handoff-cdp-body.js` | **REBASE→KEEP** | Main had no later edits on path; took #813 tip |
| `test/e2e/helpers/rc1-handoff-network-capture.js` | **REBASE→KEEP** | Same |
| `test/e2e/helpers/rc1-handoff-picker-contract.js` | **REBASE→KEEP** | Same |
| `test/e2e/helpers/rc1-prod-smoke-handoff.js` | **REBASE→KEEP** | Same |
| `test/e2e/helpers/rc1-prod-smoke-helpers.js` | **REBASE→KEEP** | Locale Settings harness wiring |
| `docs/test-rc1-prod-smoke.md` | **REBASE→KEEP** | Docs aligned to harness |
| `package.json` (full gate string from #813) | **REWRITE** | Did **not** blind-copy; selectively added new unit files + `test:rc1:english-smoke` alias on current main gate list |

**Recommendation:** Close or supersede #813 after this branch lands the harness delta — avoid dual-maintaining draft #813 vs 5A branch. Do **not** merge #813 as-is onto an older tip without the selective port done here.

---

## 5. Canonical RC sources

| Role | Document | Freshness |
|------|----------|-----------|
| **Canonical English RC process** | `docs/release-candidate-en-launch.md` | Program “COMPLETE” 2026-07-28; RC-1 checkboxes still open |
| **Canonical RC-1 automation status** | `docs/releases/RC1_I18N_RC_BRANCH_STATUS.md` | Updated by this audit (2026-08-03) |
| **Program baseline** | `docs/PRODUCT-PROGRAM-EXECUTION-PLAN-2026-08.md` | Merged via #839 |
| **i18n plan** | `docs/i18n-english-plan.md` | Partially stale (“in progress” vs RC “complete”) — RC docs win for launch gates |
| **Prod smoke runbook** | `docs/test-rc1-prod-smoke.md` | Active |
| **QA fixture** | `docs/rc1-qa-fixture.md` | Active — allowlisted `rc1-qa-parent@…` only |
| **Historical / not English-launch SoT** | `docs/releases/RC1_EXECUTIVE_SUMMARY.md` (2026-06-30 platform-runtime merge) | Keep for history; **not** English store gate |

---

## 6. Automatic test results

| Command | Result | Counts | Duration | First relevant issue | Class |
|---------|--------|--------|----------|----------------------|-------|
| `npm run audit:i18n:strict` | **PASS** | 0 hits | ~0.14s | — | — |
| `npm run test:gate` (pre-fix, missing `sharp`) | FAIL | 1756 pass / 1 fail / 4 skipped | ~72s | `room-scene-export` MODULE_NOT_FOUND `sharp` | **Environment** (devDep not installed) |
| `npm run test:gate` (after `npm ci --legacy-peer-deps`) | see final matrix | — | — | — | — |
| RC1 unit suite (ported harness) | **PASS** | 28 pass | ~0.09s | — | — |
| `test/unit/rc1-english-smoke-env.test.js` | **PASS** | 5 pass | ~0.06s | — | — |
| `npm run test:rc1:english-smoke` (no secrets) | **BLOCKED** (exit 0 skip) | — | — | Missing `RC1_SMOKE_BASE_URL` | **Missing secret** |
| `RC1_SMOKE_BASE_URL=… npm run test:rc1:english-smoke` | **BLOCKED** (exit 1) | — | — | Missing `RC1_QA_FAMILY_ID` (then other QA secrets) | **Missing secret** |
| `npm run test:e2e:i18n` | see final matrix | Expected ≥23 pass, 0 skip | — | — | — |

**Secrets present in this agent env (names only):** `FOUNDER_QA_*` MISSING · `RC1_QA_*` MISSING · `RC1_BASE_URL` / `RC1_SMOKE_BASE_URL` MISSING. Prod browser evidence therefore cannot be claimed.

---

## 7. i18n results

| Check | Result | Evidence |
|-------|--------|----------|
| Strict hardcoded-Swedish audit | **PASS** | `audit:i18n:strict` → 0 hits |
| Locale packs sv-SE / en-GB | Present | `src/locales/`, `config/i18n/*` |
| Critical journey unit/i18n tests in gate | Covered by gate list | child/parent/auth/email/push/print |
| Residual Swedish API error strings | Present outside audit surface | e.g. `src/routes/goals.js`, `rewards.js`, `feedback.js`, `pedagog-invite.js` — **not** failing strict audit; track as release bugs if en-GB parents hit those paths |
| English legal HTML | **CONTENT REVIEW NEEDED** | `public/en-privacy.html` / `en-terms.html` still predominantly Swedish body copy with “My Starday” chrome |

Known RC risk checkboxes (R1–R3 in `release-candidate-en-launch.md`) remain **unchecked** pending browser/device smoke on current SHA.

---

## 8. Locale persistence

Documented / implemented priority (client `I18n.init` + server `src/lib/locale.js` + ADR-017):

```text
explicit init argument / family.preferred_locale (post-auth canonical)
→ sessionStorage `sd_preferred_locale`
→ localStorage `sd_preferred_locale`
→ Auth user / GET /api/auth/me preferred_locale
→ navigator languages
→ default sv-SE
```

Server family resolution: **`family.preferred_locale` only** after registration (never auto-changed).  
Child pack: en-GB → `child_en` only if `features.english_child_experience` enabled for family; else `child_se`.

**Automated coverage ported/verified:** locale Settings harness classifications (API vs UI sync, reload persistence, restore).  
**Not verified here:** full browser lifecycle across child login → parent restore → SW upgrade with QA fixture (requires secrets).

---

## 9. Auth / handoff results

| Area | Result | Notes |
|------|--------|-------|
| Handoff client `sessionRestored` (#806) | Historical **PASS** on main | Still must be re-proven on deploy SHA via smoke |
| Navigation-race harness (#813 port) | Unit **PASS** | Body-capture race recovery matrix |
| Prod handoff ladder 1/1 then 3/3 | **BLOCKED** | Secrets missing |
| Full 5/5 × 2 smoke | **BLOCKED** | Secrets missing |

Do **not** declare RC-1 automated functional PASS without browser end-state evidence.

---

## 10. Service worker / cache

| Item | Value |
|------|-------|
| Current CACHE_NAME | `stjarndag-v762` |
| Native SW policy | Unregister on native WebView (`test/native-sw-reload.test.js`) |
| Upgrade test in this audit | Contract/unit coverage present; **full previous→new SW browser upgrade + handoff not run** against prod |
| Risk | Stale HTML/JS after deploy if clients hold old SW — smoke identity asserts expected cache string |

---

## 11. Native iOS / Android

| Item | Status | Notes |
|------|--------|-------|
| iOS `Info.plist` localizations | **VERIFIED** (config) | `CFBundleLocalizations` includes `sv`, `en-GB`; development region `sv` |
| iOS version/build | **VERIFIED** (project) | Marketing `1.3`, `CURRENT_PROJECT_VERSION` 29 (from `project.pbxproj`) |
| Capacitor remote WebView | **VERIFIED** (config) | Live remote WebView URL; SW unregistered on native |
| Android Gradle project in repo | **NEEDS PHYSICAL BUILD** / incomplete tree | No committed `AndroidManifest.xml` / `android/app` in this checkout; `android.md` + `scripts/android` + Play docs exist |
| Android applicationId | **NEEDS STORE ACCESS** to confirm live listing | See Play checklist / `ANDROID_PACKAGE_NAME` docs (not restated here) |
| Physical iPhone QA | **BLOCKED** / **NEEDS MANUAL QA** | Not run |
| Physical Android QA | **BLOCKED** / **NEEDS MANUAL QA** | Not run |

---

## 12. Store metadata

| Listing | Status | Notes |
|---------|--------|-------|
| App Store SV | **READY** (copy in repo) | `docs/app-store-connect-metadata.md` — Swedish product display name |
| App Store EN | **READY** (copy in repo) | `docs/app-store-connect-metadata-en-GB.md` — English product display name; Sweden-only beta framing |
| Play SV | **READY** (copy in repo) | `docs/google-play-metadata.md` |
| Play EN | **READY** (copy in repo) | `docs/google-play-metadata-en-GB.md` — English product display name |
| Live console sync | **NEEDS STORE ACCESS** | Repo copy ≠ proof of uploaded listing |

---

## 13. Screenshot inventory

| Asset | Status |
|-------|--------|
| Size guidance | Documented (`docs/app-store-screenshots/README.md`) — 1242×2688 / 1284×2778 |
| Native capture runbook | Present (`NATIVE-CAPTURE.md`) |
| Committed EN/SV final screenshot sets | **MISSING** / **NEEDS DESIGN** in repo (no image set inventoried under `docs/app-store-screenshots/` beyond docs) |
| Playwright web captures | Explicitly **not** App Store-ready (PWA chrome) |
| Match to current UI (nav, SW v762) | **STALE** until native recapture on candidate build |

---

## 14. Legal readiness

| Item | Status |
|------|--------|
| `/privacy`, `/terms` (SV) | **TECHNICALLY VERIFIED** routes/pages exist; updated “juni 2026” |
| `/en/privacy`, `/en/terms` | **CONTENT REVIEW NEEDED** + **LEGAL REVIEW REQUIRED** — English chrome, Swedish body; ADR-017 marks English legal for separate review |
| Support/contact links | **TECHNICALLY VERIFIED** linked from footers |
| Account deletion / export | Out of 5A ownership (#789 track) — note as dependency |
| Consent / Meta / IAP copy | Docs exist (`docs/meta-app-events*.md`, IAP docs); legal sign-off **not** claimed |
| `LEGAL_REVIEW_REQUIRED` markers | **Kept** — not removed |

---

## 15. Changed files (this track)

See git commit(s) on `cursor/english-launch-rc-audit`. Primary:

- Ported RC1 harness helpers + unit tests from #813
- `scripts/lib/rc1-english-smoke-env.js` + unit tests
- `scripts/run-e2e-rc1-prod-smoke.js` blocked-reason logging
- `package.json` — gate unit entries + `test:rc1:english-smoke`
- `docs/ENGLISH-LAUNCH-RC-AUDIT-2026-08.md` (this file)
- `docs/releases/RC1_I18N_RC_BRANCH_STATUS.md` (append/update)
- `docs/test-rc1-prod-smoke.md` (from #813)

---

## 16. New or changed tests

- `test/unit/rc1-handoff-navigation-race.test.js`
- `test/unit/rc1-locale-settings-harness.test.js`
- `test/unit/rc1-english-smoke-env.test.js`
- Updated e2e helpers used by `test:e2e:rc1-prod-smoke` / `test:rc1:english-smoke`

---

## 17. Remaining blockers

1. **RC1 QA secrets** not available in agent → prod smoke BLOCKED  
2. **Prod handoff ladder** not green with browser end-state proof  
3. **Physical iPhone + Android QA** incomplete  
4. **English legal content** still Swedish-dominant → LEGAL REVIEW REQUIRED  
5. **Native release screenshots** missing/stale for EN  
6. **Android full project tree** not verifiable from this checkout alone  
7. Residual Swedish API errors on non-audit paths (goals/rewards/feedback/pedagog) — track as release bugs if in EN launch surface

---

## 18. Manual QA steps (next)

1. Inject RC1 secrets into `rc1-release-gate` / local secure env (never commit).  
2. `npm run rc1:qa:prepare:dry-run` then prepare against allowlisted fixture DB.  
3. `RC1_SMOKE_FILTER=handoff RC1_HANDOFF_DEBUG_RUNS=3 npm run test:rc1:english-smoke` → 3/3.  
4. Full gate: require handoff + `RC1_SMOKE_RUNS=2` via `npm run test:rc1:english-smoke` → 5/5 twice.  
5. Physical matrix: iPhone SE/13/15 Pro + Pixel/Samsung mid-range, en-GB family with `english_app` + `english_child_experience`.  
6. Recapture native screenshots; upload EN/SV store listings.  
7. Legal review of `en-privacy` / `en-terms` before removing `LEGAL_REVIEW_REQUIRED`.

---

## 19. GO / NO-GO

| Decision | Result |
|----------|--------|
| **A — 5A audit & automation** | **CONDITIONAL GO** |
| **B — English store launch** | **NO-GO** |

---

## 20. Exact recommended next steps

1. Land this PR (harness + docs only) — **do not** merge #813 in parallel without rebase check.  
2. Provision RC1 secrets in GitHub Environment `rc1-release-gate`.  
3. Run handoff ladder + full smoke against deploy whose `/health.git_sha` and `/sw.js` CACHE_NAME match `RC1_EXPECTED_*`.  
4. Only then open RC-2 store metadata upload + physical sign-off.  
5. File small release bugs for R1–R3 and any en-GB Swedish leaks found in smoke — not new i18n epics.

---

### Self-review

```
Self-review: PE ✓ Mobile N/A (inventory) CPO ✓ UX N/A QA ✓ Security ✓ (no secrets logged) AISA ✓
Issues found and fixed: selective #813 port; smoke env validation; stale RC status rewrite avoided (history kept)
POS governed by: release-candidate-en-launch.md, ADR-017, Quality Standard 15 (gates)
```
