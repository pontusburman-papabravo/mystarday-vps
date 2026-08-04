# Activation First Success — Founder dark launch result (Prompt 1G update)

**Date:** 2026-08-04  
**Prod URL:** `https://mystarday.se` <!-- pragma: allowlist secret -->  
**Status:** FOUNDER QA READY (release identity reconciled; responsive prod QA green; physical device blocked)

## Main and #849

| Item | Value |
|------|--------|
| `origin/main` | `5048d9e902266f758f59030e050fa48b46f1f3f4` |
| PR #849 merge commit | `5048d9e902266f758f59030e050fa48b46f1f3f4` (merge of `bb0ccd9d`) |
| #849 ancestor of main | Yes |
| Main CI after #849 | Green (`30856949469`) |
| Expected cache (main) | `stjarndag-v768` (`config/cache-version.json`) |

Merged PRs in scope: #847, #848, #849.

## Prod-worktree and release identity

### Before reconciliation

| Check | Git/VPS | Public runtime |
|-------|---------|----------------|
| git SHA | `0c33b1d18fa3115838e296641a8b55220ec5b6a9` (detached) | `0c33b1d1` |
| health SHA | — | `0c33b1d1` |
| cache version | — | `stjarndag-v768` |
| SW `CACHE_NAME` | — | `stjarndag-v768` |
| working tree | **Dirty** — manual patches on `scripts/feature-family-override.mjs`, `src/lib/founder-qa-family-guard.js`; untracked `scripts/provision-founder-activation-qa-families.mjs` blocking checkout | — |

**Release identity drift:** Yes. Deploy workflow `30857319214` failed on checkout because of VPS local changes (manual #849 hotfix).

### After reconciliation

| Check | Git/VPS | Public runtime |
|-------|---------|----------------|
| git SHA | `5048d9e902266f758f59030e050fa48b46f1f3f4` | `5048d9e902266f758f59030e050fa48b46f1f3f4` |
| health SHA | match | match |
| cache version | `stjarndag-v768` | `stjarndag-v768` |
| SW `CACHE_NAME` | `stjarndag-v768` | `stjarndag-v768` |
| working tree | **Clean for tracked deploy files**; untracked operator scripts/backups remain (non-blocking) | — |

Manual VPS patches were **discarded** (not committed). Production normalized via `scripts/vps-deploy-revision.sh` with `DEPLOY_SHA=5048d9e9`.

## Deploy

| Item | Detail |
|------|--------|
| Pre-deploy gates (cloud agent) | `audit:i18n:strict`, `test:gate`, `test:e2e:i18n`, `test:activation-first-success-browser`, `test:child-core-harness`, `check:css`, `check:routes` — all green |
| GHA deploy after #849 | Failed `30857319214` (dirty worktree) |
| Deploy executed | SSH fallback — `vps-deploy-revision.sh` on VPS |
| Outcome | `DEPLOY_PASS` — snapshots OK, migrations applied flag set, health OK, post-deploy compare OK |
| Rollback | Not required |

## Prod SHA / cache

- `/health.status` = `healthy`
- `/health.git_sha` = `5048d9e902266f758f59030e050fa48b46f1f3f4`
- `/health.cache_version` = `stjarndag-v768`
- `/sw.js` `CACHE_NAME` = `stjarndag-v768`

#849 is operator-script hardening only; **no SW bump** required beyond v768.

## Flag status and expiry

| Scope | Expected | Verified |
|-------|----------|----------|
| Global `activation_first_success_v1` | OFF | OFF |
| Percentage rollout | 0 | N/A (no column on prod; global OFF) |
| sv-SE QA family `bc825034-7f94-4200-82d6-757505598615` | ON | ON (`effective_enabled: true`) |
| en-GB QA family `9435e009-75dd-493a-bb86-0d9d509f1544` | ON | ON |
| Other families | OFF | Only 2 overrides in `family_feature_override` |
| Growth flags | OFF | No `growth_%` flags enabled |
| Expiry | 2026-08-10T23:59:59Z | Confirmed on both QA overrides |

QA manifest on VPS: `/tmp/founder-activation-qa-manifest.json` mode `600` (no secrets in file).

## Responsive prod QA (founder QA families)

Automated Puppeteer against production (parent login → Hem coach → child login → completion → parent session), per locale with scenario reset between runs.

| Viewport | sv-SE | en-GB |
|----------|-------|-------|
| iPhone 390×844 | PASS | PASS |
| Android 412×915 | PASS | PASS |

Checks observed: single primary First Success coach, `child_access` → completion → `next_action` advances (`already_first_success` / coach hidden), parent `/api/auth/me` OK, no `Missing key`.

Harness script added: `scripts/activation-founder-prod-responsive-qa.mjs` (operator env credentials only).

## Physical device

See [`ACTIVATION-FIRST-SUCCESS-PHYSICAL-QA-RESULT.md`](ACTIVATION-FIRST-SUCCESS-PHYSICAL-QA-RESULT.md).

## Slutbeslut (Prompt 1G)

**RESPONSIVE QA PASS — PHYSICAL DEVICE BLOCKED**

## GO / NO-GO — limited customer pilot

**NO-GO** until physical iPhone and Android QA on real devices (or approved physical device farm). Global flag remains OFF.
