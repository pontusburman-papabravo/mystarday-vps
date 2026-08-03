# Post-Merge Product Baseline — August 2026 (Prompt 0B)

**Assignment:** Prompt 0B — Post-Merge Product Baseline after merge train #842 → #840 → #841  
**Verified:** 2026-08-03 (UTC)  
**Branch:** `cursor/post-merge-product-baseline-6a89` (from `origin/main`; see preflight note on worktree)  
**Analyzed SHA:** `9530ad9dbba87246828aae1857dfc63c68dba576`  
**Decision:** **PROMPT 1 READY**

---

## 1. Executive summary

Merge train **#842 (English RC harness)**, **#840 (Child Core Stability)**, and **#841 (Growth & Feedback Loop)** are present on `origin/main` at `9530ad9d`. Service worker / cache alignment is **`stjarndag-v766`** across `config/cache-version.json`, `public/sw.js`, `tailwind.build.css`, and live `/health.cache_version`. Fresh `npm run migrate` succeeds. All growth feature flags seed **OFF**; server eligibility returns `flag_off` when disabled; no growth feedback script on child surfaces.

**Mandatory CI gates** (`audit:i18n:strict`, `test:gate` ×2, `test:e2e:i18n`, `lint:public`, `check:css`, `check:routes`, `test:child-core-harness`, RC1 unit bundle, growth unit bundle) **PASS** on this SHA when dependencies are installed with **devDependencies** (see §4).

**Activation architecture** is mappable: Journey Context + communication gate are the intended long-term comms authority; Product Engine (`/api/family/first-success`) and readiness (`/api/family/readiness`) remain parallel Hem inputs today — documented for Prompt 1A without implementing ADR changes.

**Non-blockers:** PR **#813** (draft, open), PR **#843** (draft report, open). External worktree path `<sibling-worktree-dir>` failed (permission denied); verification ran on dedicated branch in `/workspace`.

---

## 2. Preflight

| Item | Value |
|------|--------|
| Working tree | Clean at start; doc-only commit at end |
| Branch | `cursor/post-merge-product-baseline-6a89` (tracks `origin/main`) |
| `HEAD` | `9530ad9dbba87246828aae1857dfc63c68dba576` |
| `origin/main` | Same |
| Divergence | None (`HEAD` = `origin/main`) |
| Node / npm | v20.20.2 / 10.8.2 |
| Install (reproducible) | `npm ci --legacy-peer-deps --include=dev` |

### PR status (re-verified via `gh`)

| PR | State | Notes |
|----|--------|--------|
| #842 | **MERGED** | merge commit `941fb2d5eaf2407e304e9a701f6931cc8d7c9369` |
| #840 | **MERGED** | merge commit `4121464d5dcede1e13396cc9687fa14377a5a982` |
| #841 | **MERGED** | merge commit `9530ad9dbba87246828aae1857dfc63c68dba576` |
| #813 | OPEN (draft) | Not a product blocker per program |
| #843 | OPEN (draft) | Merge-train report; not a start gate |

All three merge commits are **ancestors of `origin/main`** (`git merge-base --is-ancestor`).

### Worktree

```text
git worktree add <sibling-worktree-dir> -b cursor/post-merge-product-baseline origin/main
→ fatal: Permission denied (parent directory not writable on Cloud Agent VM)
```

Equivalent isolation: branch `cursor/post-merge-product-baseline-6a89` at `9530ad9d`.

---

## 3. Main SHA and merge commits

| Merge | SHA | On main |
|-------|-----|---------|
| #842 English RC harness | `941fb2d5` | Yes |
| #840 Child Core Stability | `4121464d` | Yes |
| #841 Growth & Feedback Loop | `9530ad9d` (HEAD) | Yes |

Recent `origin/main` (top): `9530ad9` (#841) → growth reconcile + css v766 → `4121464d` (#840) → `941fb2d5` (#842).

---

## 4. Installation and lockfile

| Attempt | Result | Classification |
|---------|--------|----------------|
| `npm ci` (Cloud VM omits devDependencies by default) | Installs **without devDependencies**; `sharp` missing → `test/room-scene-export.test.js` fails inside `test:gate:unit` | **AGENT ENVIRONMENT** + **REPO DEFECT** (gate script does not fail exit code when a unit file errors — see §10) |
| `npm ci --legacy-peer-deps --include=dev` | 312 packages, `sharp` present, full gate green | **PASS** (documented install) |

No lockfile drift observed after dev install. Playwright/puppeteer available via devDependencies for harnesses.

---

## 5. SW / cache

| Source | Value |
|--------|--------|
| `config/cache-version.json` | `stjarndag-v766` |
| `public/sw.js` `CACHE_NAME` | `stjarndag-v766` |
| `public/css/tailwind.build.css` header | `stjarndag-v766` |
| `GET /health` (local dev) | `"cache_version": "stjarndag-v766"` |

`rg stjarndag-v762|v763|v764|v765` in `public/`, `src/`, `config/`, `package.json`: only **historical comments** in `public/sw.js` and RC test fixtures — not active runtime version.

`npm run check:css`: **PASS** (rebuild + git diff clean).

---

## 6. Migrations

Growth / #841 migrations (ordered, unique IDs):

| ID | Name |
|----|------|
| `1810140000000` | `family_acquisition_attribution` |
| `1810140000001` | `family_growth_feedback` |
| `1810140000002` | `waitlist_funnel_fields` |
| `1810140000003` | `growth_feedback_loop_flags` |

`1810140000003` inserts `growth_feedback_v1`, `growth_referral_cta_v1`, `growth_stuck_cohorts_v1`, `growth_waitlist_funnel_v1` with **`enabled = false`**. `referral_program` remains from earlier migration (`1808610000000_activation_onboarding_flags.js`), default OFF.

Child / #840-related: `1810120000000_child_sort_order_null_semantics` (deterministic order).

Fresh `npm run migrate`: **PASS**. Upgrade path covered by `test:gate:db` (includes migration rollback gate and integration suites).

Conflict markers: `rg '<<<<<<<|>>>>>>>'` on source — **none** (only decorative `===` in docs/node_modules).

---

## 7. Growth dark-state

**Flags (all OFF after migrate):** `growth_feedback_v1`, `growth_referral_cta_v1`, `growth_stuck_cohorts_v1`, `growth_waitlist_funnel_v1`, `referral_program`.

| Check | Result |
|-------|--------|
| `evaluateGrowthFeedbackEligibility` when flag OFF | `{ eligible: false, reason: 'flag_off' }` (`src/lib/growth-feedback-eligibility.js`) |
| Admin stuck cohorts | `growth_stuck_cohorts_v1` gate → 503 when OFF (`src/routes/admin/growth-stuck-cohorts.js`) |
| Referral CTA | `growth_referral_cta_v1` + `referral_program` (`src/lib/referral-eligibility.js`) |
| Client | `growth-feedback.js` silent on API failure / ineligible; **not** loaded on `child-dashboard.html` (hardening test) |
| Dark launch plan | `docs/GROWTH-FEEDBACK-DARK-LAUNCH-PLAN.md` |
| Automatic outreach | Journey communication gate + env kill switches (`WIN_BACK_ENABLED`, `ACTIVATION_PROGRAM_EMAIL_ENABLED`) — no new growth schedulers in #841 |

**Table (design intent — enforced server-side + tests):**

| Flags | Expected |
|-------|----------|
| All OFF | No customer growth UI; no feedback POST success |
| Feedback ON | Feedback only when eligibility rules pass |
| Referral CTA ON, program OFF | No personal referral CTA |
| Referral CTA ON, program ON | CTA only after value gate |
| Stuck ON | Admin preview only |
| Waitlist funnel ON | Consent-based English waitlist flows only |

Unit bundles: `test/growth-feedback-loop.test.js`, `test/growth-feedback-hardening.test.js`, `test/activation-growth-completion.test.js` — **38 tests PASS**.

---

## 8. Child Core sanity

| Area | Evidence |
|------|----------|
| Delsteg in-flight / rollback | #840 code in child dashboard + offline queue tests in gate |
| Offline queue clear on logout | `public/js/auth.js` → `OfflineQueue.clear()` |
| 4xx not queued | Covered in child-core / offline tests (gate) |
| Deterministic order | `1810120000000` + API CASE ordering; harness `orderOk: true` |
| Session resume | `child-login-session-resume.test.js`; harness `resumeOk: false` (non-fatal — see below) |
| PIN contrast / focus-visible | #840 CSS/tests |
| `/health.cache_version` | Verified §5 |
| ADR-019 | **Proposed**, not implemented (`docs/adr/ADR-019-trusted-child-device.md`) |

`npm run test:child-core-harness`: **PASS** (exit 0). Harness records `substepOk: null` (no substeps in minimal fixture schedule) and `resumeOk: false` after `/child-login` navigation — **not** a hard-fail condition in harness (`hardFail` only on `orderOk === false`, health, or errors). Integration tests in `test:gate` cover resume contracts.

---

## 9. English RC harness

| Asset | Present |
|-------|---------|
| `npm run test:rc1:english-smoke` → `scripts/run-e2e-rc1-prod-smoke.js` | Yes |
| Secret validation / BLOCKED exit | `test/unit/rc1-run-e2e-prod-smoke-blocked.test.js`, `RC1_SMOKE_BLOCKED_EXIT_CODE` default **2** |
| Credentials in base URL | Fails exit 1 (tested) |
| SHA / cache mismatch | `test/unit/rc1-english-smoke-env.test.js`, `test/rc1-release-identity.test.js` |
| Runbook | `docs/runbooks/ENGLISH-RC1-RELEASE-GATE.md` |
| Status docs | `docs/ENGLISH-RC1-GATE-READINESS-REPORT.md`, `docs/releases/RC1_*` |

`node --test test/unit/rc1-*.test.js test/rc1-*.test.js`: **83 tests PASS**.

**Not run:** Full prod browser smoke (requires `RC1_SMOKE_*` secrets and pinned release SHA).

---

## 10. Full test matrix

Commands run on `9530ad9d` with test runtime env (`REQUIRE_EMAIL_VERIFICATION=false`, Resend keys unset), **devDependencies installed**.

| Command | Pass / Fail / Skip | Duration (approx.) | Exit | Class |
|---------|-------------------|----------------------|------|-------|
| `npm run audit:i18n:strict` | 0 hits | &lt;1s | 0 | **PASS** |
| `npm run check:css` | — | ~2.6s | 0 | **PASS** |
| `npm run check:routes` | — | &lt;1s | 0 | **PASS** |
| `npm run lint:public` | 0 errors, 172/172 warnings (budget) | ~7.6s | 0 | **PASS** |
| `npm run test:gate` (run 1) | unit 1910 pass; db 358 pass | ~209s + ~228s | 0 | **PASS** |
| `npm run test:gate` (run 2) | 358 db pass (no flake) | ~228s | 0 | **PASS** |
| `npm run test:e2e:i18n` | 23 pass | ~185s | 0 | **PASS** |
| `npm run test:child-core-harness` | harness exit 0 | ~145s | 0 | **PASS** |
| RC1 unit/harness bundle | 83 pass | ~1s | 0 | **PASS** |
| Growth unit bundle | 38 pass | &lt;1s | 0 | **PASS** |

**Note:** With default Cloud `npm ci` (no dev deps), `room-scene-export.test.js` fails (`Cannot find module 'sharp'`) while `npm run test:gate` still reported exit 0 once — treat as **install documentation issue**, not a flake on correct install.

Additional coverage inside `test:gate:db`: auth/offline queue, child order/delsteg, attribution security, feedback dedupe, referral abuse, stuck cohort boundaries, waitlist consent, migration rollback gate, golden-path Fas6 resume.

---

## 11. Runtime browser sanity

| Check | Result |
|-------|--------|
| Local dev server | Development runtime on `:3000`, `/health` healthy |
| sv-SE login | `/login` loads |
| en-GB | `/en.html` loads (marketing/waitlist — existing English surface) |
| Console | CSP report-only warnings on landing; no critical JS errors on load |
| Growth feedback UI on Hem (flags OFF) | Not exercised logged-in; API design returns `flag_off`; script only renders on `eligible` |
| SW on localhost | Typically unregistered in dev; cache version via `/health` |

Full logged-in parent → child → completion journey: **partially** covered by `test:child-core-harness` + `test:e2e:i18n` + gate integration tests (not founder prod QA).

---

## 12. Activation architecture (map for Prompt 1A)

### Questions

1. **Family phase (lifecycle):** `src/lib/journey/derived-state.js` (`getFamilyCommunicationState`) + `db/family-milestones.js` (`getJourneyPhase`) from `family_milestones` rows.
2. **Hem CTA / next step (multiple inputs today):**
   - **Journey coach:** `public/js/journey-coach.js` ← `GET /api/me/journey-context` (`src/lib/journey/context-builder.js` + `evaluator.js`).
   - **Product Engine:** `public/js/engine-client.js` ← `GET /api/family/first-success` (`src/routes/family/first-success.js` → `ProductEngine.evaluate`).
   - **Readiness exceptions:** `public/js/home-readiness.js` ← `GET /api/family/readiness` (`src/routes/family/core.js`).
3. **Competing coaches:** Journey coach card, Engine coach, readiness warning cards, signup journey tips (`help-journey-tip.js`), growth feedback (`growth-feedback.js`, flag-gated).
4. **Feature flags:** Journey: `src/lib/journey/flags.js`. First-success engine: `src/lib/first-success-engine-flag.js`. Growth: `src/lib/activation-flags.js`. P0 analytics: activation program flags in DB.
5. **Growth eligibility source:** `family_activation_state` timestamps + `family_milestones` + `getFamilyCommunicationState` + `feature_flag`.
6. **Authoritative server timestamps:** `family_activation_state` (`child_created_at`, `schema_saved_at`, `child_access_completed_at`, `first_completion_at`, `p0_activated_at`, …); `family_milestones.occurred_at`; parent `onboarding_completed`.
7. **First real activity completion:** `tryAtomicFirstCompletionInTx` in `src/lib/activation-first-completion.js` on daily log completion path.
8. **First star / first success milestone:** Journey milestone `first_success` in `family_milestones` (ingest/backfill in journey migrations); star events on child/parent completion payloads (`first_star_earned` in daily-logs routes).
9. **Duplicate milestones:** `ONCE_MILESTONES` / scoped-once inserts in `db/family-milestones.js` — idempotent milestone writes.
10. **Offline replay:** Client offline queue replays completions; server remains source of truth; 4xx not queued (#840); logout clears queue.

### Prompt 1 direction (verify only — not implemented)

**Technically reasonable:** Journey Context + `communication-gate.js` as canonical “what to say next” for comms; Product Engine as **compatibility adapter** during migration; readiness as **diagnostics / exception list**, not a fourth product brain on Hem.

**Caveat:** Hem still mounts Engine + Journey + readiness concurrently; Prompt 1A must coordinate copy priority in client orchestration or consolidate server-side — no code change in 0B.

---

## 13. Prompt 1 start contract

| Area | Current authority | Prompt 1A may change | Risk |
|------|-------------------|----------------------|------|
| Onboarding wizard | `public/js/onboarding.js`, `src/routes/onboarding.js` | Yes (primary scope) | High — touches activation timestamps |
| Starter schedule | Onboarding + default templates | Yes | Medium |
| Child access CTA | Onboarding handoff, `child_access_completed_at` via child-login only | Yes (UX + copy) | High — must not fake child_access |
| Hem next step | Journey context + engine + readiness | Yes (orchestration) | High — POS one-next-step |
| First completion | `activation-first-completion.js`, daily-logs | Careful — server truth | High |
| First star | Milestones + daily-logs | Careful | High |
| Journey milestones | `db/family-milestones.js`, journey ingest | Coordinate only | High |
| Product Engine adapter | `src/routes/family/first-success.js`, core-engine | Adapter tweaks OK; no new brain | Medium |
| Growth consumers | Flag-gated; separate track | **No** (Prompt 1A) | Low |

**Do not change in parallel with Prompt 1A without explicit ADR/task:**

- RC1 harness (`scripts/run-e2e-rc1-prod-smoke.js`, `test/e2e/rc1-*`, `test/unit/rc1-*`)
- Service worker architecture (`public/sw.js` except version bump via css:build)
- Growth attribution / referral core (`src/lib/referral-eligibility.js`, acquisition migrations)
- Offline queue core (`public/js/offline-queue.js` or equivalent)
- ADR-019 implementation (still Proposed)

---

## 14. Known risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `npm ci` without dev deps breaks unit file but gate exit code ambiguous | Medium | Document `--include=dev`; consider hardening gate exit code separately |
| Parallel Hem coaches (Journey vs Engine vs readiness) | Medium | Prompt 1A scope: single next-step authority |
| Child harness `resumeOk: false` in fixture | Low | Gate integration + `child-login-session-resume.test.js` |
| Open PRs #813 / #843 | Low | Process only |
| English RC runbook examples cite older cache (e.g. v762) | Low | Operators must read live `/health` / `cache-version.json` |
| No staging — growth dark launch depends on flags OFF | Medium | Keep flags OFF; follow `GROWTH-FEEDBACK-DARK-LAUNCH-PLAN.md` |

---

## 15. GO / NO-GO

| Criterion | Met |
|-----------|-----|
| #842 / #840 / #841 on main | Yes |
| SHA `9530ad9d` | Yes |
| SW/cache v766 consistent | Yes |
| Reproducible install (with dev deps) | Yes |
| Migrations OK | Yes |
| Growth flags OFF, dark behavior | Yes |
| Child core stable (tests + harness) | Yes |
| RC harness intact | Yes |
| Mandatory gates green | Yes |
| Activation map documented | Yes |
| Prompt 1 ownership bounded | Yes |

**Decision: PROMPT 1 READY**

---

## Deliverable

This document: `docs/POST-MERGE-PRODUCT-BASELINE-2026-08.md`

## Recommended next step

Start **Prompt 1A — Onboarding & First Success** on branch `cursor/onboarding-first-success-*` from `9530ad9d`, respecting §13 ownership and Journey-first direction in §12.
