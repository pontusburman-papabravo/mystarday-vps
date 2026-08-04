# Activation First Success — Founder dark launch result

**Date:** 2026-08-04  
**Prod URL:** `https://mystarday.se` <!-- pragma: allowlist secret -->  
**Status (Prompt 1H):** FOUNDER DARK LAUNCH FAS 1 — responsive + **physical iPhone PASS**; physical Android blocked

## Main and #849

| Item | Value |
|------|--------|
| `origin/main` (Activation baseline) | `5048d9e902266f758f59030e050fa48b46f1f3f4` |
| PR #849 merge | Same SHA (operator override CLI) |
| Expected cache at baseline | `stjarndag-v768` |
| Current prod (post PIN contrast #852–#855) | `8fea1f5543664ce75db8e8e23c014aea70bd97fd` / `stjarndag-v769` |

Merged PRs in scope for dark launch: #847, #848, #849. Physical gate docs: #850 (1G/1H).

## Prod-worktree and release identity

Release drift before 1G was reconciled to `5048d9e9` + `stjarndag-v768` via `vps-deploy-revision.sh`. VPS dirty-tree patches were discarded (not committed).

## Deploy (1G)

| Item | Detail |
|------|--------|
| GHA deploy after #849 | Failed once (dirty VPS worktree) |
| Recovery | SSH `DEPLOY_PASS` to `5048d9e9` |
| Post-1H | No further Activation deploy; #852–#855 child-login CSS/SW only |

## Prod SHA / cache (baseline)

- `/health.git_sha` = `5048d9e902266f758f59030e050fa48b46f1f3f4`
- `/health.cache_version` = `stjarndag-v768`
- SW `CACHE_NAME` = `stjarndag-v768`

## Flag status and expiry

| Scope | Expected | Verified |
|-------|----------|----------|
| Global `activation_first_success_v1` | OFF | OFF |
| Percentage rollout | 0 | 0 (global OFF) |
| sv-SE QA `bc825034-7f94-4200-82d6-757505598615` | ON | ON |
| en-GB QA `9435e009-75dd-493a-bb86-0d9d509f1544` | ON | ON |
| Other families | OFF | Two override rows only |
| Growth flags | OFF | OFF |
| Expiry | `2026-08-10T23:59:59.000Z` | Documented on overrides |

## Responsive prod QA

| Viewport | sv-SE | en-GB |
|----------|-------|-------|
| iPhone 390×844 | **PASS** | **PASS** |
| Android 412×915 | **PASS** | **PASS** |

Harness: `scripts/activation-founder-prod-responsive-qa.mjs` (operator credentials only).

## Physical device (1H)

| Platform | Status |
|----------|--------|
| Physical iPhone | **PASS** — see [`ACTIVATION-FIRST-SUCCESS-PHYSICAL-QA-RESULT.md`](ACTIVATION-FIRST-SUCCESS-PHYSICAL-QA-RESULT.md) |
| Physical Android | **BLOCKED — NO DEVICE ACCESS** |

## Slutbeslut

| Gate | Result |
|------|--------|
| Responsive QA | **PASS** |
| Physical iPhone | **PASS** |
| Physical Android | **BLOCKED** |

**`PHYSICAL IPHONE PASS — ANDROID PHYSICAL QA BLOCKED`**

## GO / NO-GO — customer pilot

| Audience | Decision |
|----------|----------|
| Founder / QA on iPhone | **GO** |
| Platform-neutral customer pilot | **NO-GO** until physical Android PASS |

Global `activation_first_success_v1` remains **OFF**.
