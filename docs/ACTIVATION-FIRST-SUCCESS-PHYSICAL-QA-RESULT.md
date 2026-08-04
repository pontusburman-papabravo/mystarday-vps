# Activation First Success — Physical QA Gate

## Status

**RESPONSIVE QA PASS — PHYSICAL DEVICE BLOCKED**

Release identity on production is reconciled to `origin/main` (`5048d9e902266f758f59030e050fa48b46f1f3f4`). Responsive browser QA against founder activation QA families passed on iPhone and Android viewports. No physical iPhone, physical Android, or physical device farm was available in the cloud agent environment.

## Main och #849

| Item | SHA / note |
|------|------------|
| `origin/main` | `5048d9e902266f758f59030e050fa48b46f1f3f4` |
| PR #849 merge | `5048d9e902266f758f59030e050fa48b46f1f3f4` |
| Prior prod deploy | `0c33b1d18fa3115838e296641a8b55220ec5b6a9` (#848) |
| #849 ⊂ main | Yes |

## Prod-worktree och releaseidentitet

**Före:** VPS tracked diff on #849 files; `git checkout` blocked; health SHA stuck on `0c33b1d1` while main advanced.

**Efter:** `DEPLOY_PASS` to `5048d9e9`; tracked tree matches deploy revision; health/SW/cache aligned.

**Drift eliminated:** manual VPS patches reverted by deploy (not committed on VPS).

## Deploy

| Field | Value |
|-------|--------|
| Method | SSH fallback (`vps-deploy-revision.sh`) after GHA failure |
| Failed GHA run | `30857319214` (dirty worktree) |
| Successful deploy | SSH session 2026-08-04 — `DEPLOY_SUMMARY outcome=DEPLOY_PASS` |
| Migrations | No pending at deploy; snapshot gates OK |

## Prod SHA/cache

| Signal | Value |
|--------|--------|
| `git_sha` | `5048d9e902266f758f59030e050fa48b46f1f3f4` |
| `cache_version` | `stjarndag-v768` |
| SW `CACHE_NAME` | `stjarndag-v768` |

## Flagstatus och expiry

| Scope | Status |
|-------|--------|
| Global `activation_first_success_v1` | OFF |
| Percentage | 0 (global OFF) |
| QA sv-SE / en-GB | ON via `family_feature_override` |
| Expiry | `2026-08-10T23:59:59.000Z` |
| Growth | OFF |

Overrides left **ON** for continued physical QA (responsive green, tenant isolation OK, no stop conditions).

## Responsive iPhone

**PASS** — 390×844, sv-SE and en-GB: one coach, child completion, parent restore, coach advances after first completion.

## Responsive Android

**PASS** — 412×915, sv-SE and en-GB (per-locale scenario reset before each run).

## Device access

| Platform | Classification |
|----------|----------------|
| Physical iPhone | **NO DEVICE ACCESS** — no `xcodebuild` / connected iOS hardware |
| Physical Android | **NO DEVICE ACCESS** — no `adb` devices |
| iOS Simulator | Not used (not physical QA) |
| Android Emulator | Not available |
| BrowserStack / Sauce / Firebase Test Lab / AWS Device Farm | Not configured in repo secrets/workflows (docs mention only) |
| Appium / Maestro / Detox | Not configured for prod physical gate |

## Fysisk iPhone

**PHYSICAL IPHONE BLOCKED — NO DEVICE ACCESS**

## Fysisk Android

**PHYSICAL ANDROID BLOCKED — NO DEVICE ACCESS**

## Native releaseidentitet

Not exercised (no native app session). Capacitor remote WebView would load prod web assets at `stjarndag-v768` / SHA `5048d9e9`. Store binary unchanged in this gate.

## Tenant-isolering

- Only two rows in `family_feature_override` for `activation_first_success_v1` (QA UUIDs above).
- Global flag OFF; `feature:family-override --verify` shows `global_enabled: false`, `effective_enabled: true` for QA families only.
- QA accounts use `@test.stjarndag.local` (manifest); not founder production household.

## Observability och rollback

- Deploy snapshots under `data/deploy/snapshots/` on VPS for `5048d9e9`.
- Rollback not triggered.
- Stop conditions: none triggered (no override disable).

## Slutligt flaggläge

| Scope | State |
|-------|--------|
| Global | OFF |
| Percentage | 0 |
| QA families | ON until 2026-08-10T23:59:59Z |
| Others | OFF |

## Kvarvarande blockers

1. Physical iPhone QA on real hardware or physical device farm.
2. Physical Android QA on real hardware or physical device farm.
3. Optional: re-run GHA deploy workflow once to record green `workflow_run` (prod already correct).

## Deliverables

- This document
- Updated [`ACTIVATION-FIRST-SUCCESS-FOUNDER-DARK-LAUNCH-RESULT.md`](ACTIVATION-FIRST-SUCCESS-FOUNDER-DARK-LAUNCH-RESULT.md)
- Ops: `scripts/activation-founder-prod-responsive-qa.mjs`, `scripts/ops/reset-founder-activation-qa-scenario.mjs`

## Rekommenderat nästa steg

1. Run physical QA on founder devices or provisioned device farm using QA manifest + operator credentials.
2. Re-trigger **Deploy to VPS** `workflow_dispatch` with `deploy_sha=5048d9e902266f758f59030e050fa48b46f1f3f4` to confirm pipeline green (worktree now clean).
3. After physical PASS + founder sign-off: consider limited pilot per dark launch plan (still global OFF until product decision).

## GO/NO-GO — begränsad kundpilot

**NO-GO** (physical device gate not met).
