# Activation First Success — Founder Dark Launch

**Prompt:** one-D — Automated Founder Dark Launch and prod verification  <!-- pragma: allowlist secret -->
**Run date:** 2026-08-03 (UTC)  
**Agent:** Cursor Cloud Composer 2 point 5  
**Merge baseline:** PR #845 @ `3d57d4772426a029958d925c954094131769435d`

## Status

**BLOCKED**

Prod release identity is correct (`3d57d477`, SW/cache `stjarndag-v767`, `activation_first_success_v1` global OFF). Pre-deploy gates and deploy recovery completed. **Founder/RC-1 authenticated prod browser smoke and family-targeted flag enablement could not be completed** in this environment (missing `FOUNDER_QA_*` / `RC1_QA_*` secrets; no per-family allowlist for `activation_first_success_v1` in `src/lib/activation-flags.js`).

---

## Executive summary

| Area | Result |
|------|--------|
| `origin/main` = PR #845 merge SHA | PASS |
| CI on main (push after merge) | PASS |
| GitHub **Deploy to VPS** workflow | FAIL (rolled back twice; see Deploy) |
| Manual VPS deploy to `3d57d477` | PASS |
| Public `/health` + `/sw.js` identity | PASS |
| `activation_first_success_v1` global OFF | PASS |
| Growth flags OFF | PASS |
| Pre-deploy gates (local) | PASS (browser harness: sv-SE coach-count FAIL) |
| Flag OFF legacy browser smoke (founder QA) | **NOT RUN** — credentials absent |
| Targeted flag ON (founder QA family only) | **BLOCKED** — no family allowlist API |
| Day-0 / child / completion / restore prod smoke | **NOT RUN** |

---

## Preflight

| Check | Result |
|-------|--------|
| `git rev-parse origin/main` | `3d57d4772426a029958d925c954094131769435d` |
| PR #845 | `MERGED` @ `2026-08-03T19:35:52Z` |
| CI `main` push `30846473545` | success |
| E2E i18n `30846473280` | success |
| Deploy to VPS `30846832205` | failure |
| Working tree | clean on `main` |

---

## Main och deployad SHA

| | SHA / value |
|--|-------------|
| Expected | `3d57d4772426a029958d925c954094131769435d` |
| `origin/main` | `3d57d4772426a029958d925c954094131769435d` |
| VPS `git rev-parse HEAD` (after manual deploy) | `3d57d4772426a029958d925c954094131769435d` |
| `data/deployed-sha` on VPS | `3d57d4772426a029958d925c954094131769435d` |

---

## SW/cache

| Source | `cache_version` / `CACHE_NAME` |
|--------|--------------------------------|
| `config/cache-version.json` on main | `stjarndag-v767` |
| `public/sw.js` on main | `stjarndag-v767` |
| Public health endpoint | `stjarndag-v767` |
| Public service worker asset | `stjarndag-v767` |
| VPS `public/sw.js` after deploy | `stjarndag-v767` |

---

## Deploy

### GitHub Actions (failed)

Workflow **Deploy to VPS** after merge:

1. **First failure:** `pre-deploy snapshot failed` — `[db-snapshot] DATABASE_URL is not set` during SSH deploy (deploy job did not load app `.env` before snapshot).
2. **Automatic rollback** to `5eb6a0f6a9e4c057afcc2909dbc2ec81d41b8fde`.
3. **Agent retry** with `DATABASE_URL` from app `.env`: migrate + restart succeeded, then **post-deploy snapshot compare failed** (`feature_flag` row_count 39→44, fingerprint drift from migrations `181014*` + `1810150000000_activation_first_success_v1_flag`). Script rolled back **code** to `5eb6a0f6` again while **DB migrations remained applied**.

### Manual deploy (documented VPS process)

Per `docs/VPS-DEPLOY-GITHUB-ACTIONS.md` (fetch/checkout, `npm ci`, `migrate`, `systemctl restart`):

- Checkout detached `3d57d477`, `npm ci --legacy-peer-deps`, `npm run migrate` (no pending migrations), restart app via systemd, `sleep 3`.
- Local health on VPS: `healthy`, `git_sha` + `cache_version` match expected.
- **No** `activation_first_success_v1` enablement during deploy.
- Backup gate had run successfully on the failed automated attempt (`predeploy_2026-08-03T20-24-37-923Z_3d57d4772426.dump`).

### Migrations applied on prod (during failed auto deploy)

`1810140000000_family_acquisition_attribution` through `1810150000000_activation_first_success_v1_flag` (5 migrations).

---

## Flag status före deploy

Queried prod DB after migrations (flag row present, default OFF):

| Level | Expected | Observed |
|-------|----------|----------|
| Global `activation_first_success_v1` | OFF | `enabled: false` |
| Growth flags | OFF | `growth_*` all `false` |
| `ACTIVATION_ONBOARDING_LAUNCH_AT` | unset | `null` in app `.env` |
| Percentage rollout | 0 | N/A (not used for this flag) |

---

## Flag OFF smoke

| Test | Result |
|------|--------|
| Public `/health` | PASS |
| Public `/sw.js` cache | PASS |
| `activation_first_success_v1` in DB | OFF |
| Founder parent login → Hem, no FS hub, legacy path | **NOT RUN** — `FOUNDER_QA_*` not injected in Cloud Agent |
| Child login / Today | **NOT RUN** |
| Console / 5xx watch | No deploy-time errors in `journalctl` tail post-restart |

Unauthenticated: dashboard HTML includes `activation-first-success-hub.js` (expected; hub no-ops when flag OFF via `activation-config`).

---

## Founder QA family contract

| Requirement | Status |
|-------------|--------|
| Dedicated founder QA (`docs/founder-qa-test-account.md`) | **Credentials not available** in this run (`FOUNDER_QA_EMAIL`, `FOUNDER_QA_PASSWORD`, `FOUNDER_CHILD_*` unset) |
| RC-1 fixture (`rc1-qa-parent@qa-automation.*`) | **Secrets not on VPS** `.env` or agent env (`RC1_QA_PASSWORD`, etc.) |
| Safe provision without secrets | **Unavailable** — `scripts/rc1-qa-family-prepare.js` requires `RC1_QA_PASSWORD` + PINs |

**Verdict:** `BLOCKED — SAFE FOUNDER QA FAMILY UNAVAILABLE` for authenticated prod smoke in this environment.

---

## Targeted flag

`isActivationFlagEnabled()` (`src/lib/activation-flags.js`) reads **global** `feature_flag.enabled` only, with optional **cohort** filter via `ACTIVATION_ONBOARDING_LAUNCH_AT` + `family.created_at`. There is **no** `family_features` / `FOUNDER_QA_FAMILY_ID` allowlist for `activation_first_success_v1`.

Dark launch doc Fas 1 allows manual global `UPDATE feature_flag SET enabled = true` or “family allowlist hook if added later” — hook **not implemented**.

| Mechanism | Can satisfy “ON only founder QA family”? |
|-----------|------------------------------------------|
| Per-family allowlist | **No** |
| Global ON + `ACTIVATION_ONBOARDING_LAUNCH_AT` | Only **new** families after timestamp; **excludes** existing founder household |
| Global ON | **Forbidden** by Prompt 1D |

**Verdict:** `BLOCKED — TARGETED FLAG ENFORCEMENT UNAVAILABLE` for existing founder QA family without global ON or product change.

---

## Day-0 / Child access / First completion / Parent restore / sv-SE en-GB

All **NOT RUN** on live HTTPS (blocked on QA credentials + targeted flag). <!-- pragma: allowlist secret -->

### Local gate harness (pre-prod, not a substitute for founder prod smoke)

`npm run test:activation-first-success-browser`:

| Locale | Result | Notes |
|--------|--------|-------|
| en-GB | PASS | Single primary coach, milestones OK |
| sv-SE | **FAIL** | `multiple_primary_coaches` (`primaryCount: 2`) |

---

## Analytics och milestones

**NOT RUN** on prod QA family (no flag ON, no authenticated session).

---

## Observability

| Signal | Finding |
|--------|---------|
| Post-manual-deploy service logs | Clean start, schedulers OK |
| Deploy rollback windows | Brief code/code SHA mismatch: health reported `3d57d477` via stale `data/deployed-sha` while tree was `5eb6a0f6` — resolved after manual deploy |
| 5xx on `/health` | None observed |

---

## Stop conditions

| Condition | Triggered? |
|-----------|------------|
| Global flag ON for all customers | **No** (left OFF) |
| Release SHA/cache mismatch (final state) | **No** |
| Missing QA / targeted flag | **Yes** → stopped before Fas 1 enable |

---

## Rollbackstatus

| Level | Action |
|-------|--------|
| Flag rollback | N/A (never enabled) |
| Code rollback | Auto-deploy rolled code to `5eb6a0f6` twice; **manual forward deploy** restored `3d57d477` |
| DB | Migrations from merge train remain applied (additive) |

---

## Slutligt flaggläge

| Scope | State |
|-------|-------|
| Global `activation_first_success_v1` | **OFF** |
| Growth flags | **OFF** |
| Founder QA family override | **None** |
| Percentage rollout | **0 / N/A** |

---

## Fysisk QA-status

| Gate | Status |
|------|--------|
| Responsive browser iPhone viewport | **NOT RUN** (no prod login) |
| Responsive browser Android viewport | **NOT RUN** |
| Fysisk iPhone-app | **NOT RUN** |
| Fysisk Android-app | **NOT RUN** |

---

## Kvarvarande blockers

1. **Cursor Cloud Agent secrets:** configure `FOUNDER_QA_*` (and/or `RC1_QA_*` + `RC1_QA_FAMILY_ID`) per `docs/secret-references.md`.
2. **Deploy pipeline:** GHA deploy must load `DATABASE_URL` for snapshot gate; post-deploy compare should treat **expected** `feature_flag` growth from migrations as non-fatal (or compare only pre-migration pending set).
3. **Targeted activation:** implement family allowlist (or documented cohort-only QA with **new** disposable family after `ACTIVATION_ONBOARDING_LAUNCH_AT`, accepting signup-window risk) before Fas 1 ON.
4. **Harness:** investigate sv-SE `multiple_primary_coaches` in `scripts/activation-first-success-browser-harness.mjs` (en-GB passes).

---

## Deliverable

This report (`docs/ACTIVATION-FIRST-SUCCESS-FOUNDER-DARK-LAUNCH-RESULT.md`) on branch `cursor/activation-founder-dark-launch-result-f5d3`.

---

## Rekommenderat nästa steg

1. Add QA secrets to Cloud Agent environment; re-run Prompt one-D from **Flag OFF smoke** onward.
2. Fix `Deploy to VPS` workflow / `vps-deploy-revision.sh` env sourcing + snapshot compare for flag migrations; re-run deploy via CI to confirm.
3. Product/ops decision: add `family_features` or env allowlist for `activation_first_success_v1` **or** approve time-boxed cohort QA with RC-1 fixture only.
4. Fix sv-SE dual-coach harness failure before treating browser gate as fully green.
5. After automated PASS with targeted flag: physical iOS/Android QA (separate gate).

---

## Slutbeslut

**BLOCKED** — not **FOUNDER QA READY** (authenticated prod dark-launch smoke and safe per-family flag enablement incomplete).  
**Not ROLLED BACK** — VPS forward state is correct release identity with flag OFF. <!-- pragma: allowlist secret -->
