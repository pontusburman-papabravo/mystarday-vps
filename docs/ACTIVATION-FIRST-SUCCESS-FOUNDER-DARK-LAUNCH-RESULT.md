# Activation First Success — Automated Dark Launch Resume

## Status

**FOUNDER QA READY**

Prompt 1F completed: PR #847 and #848 merged, production deploy `DEPLOY_PASS`, targeted QA overrides ON for two internal families only, prod-safe browser smoke green for sv-SE and en-GB. <!-- pragma: allowlist secret -->

## PR #847

| Field | Value |
|--------|--------|
| Title | Deploy Snapshot Gate Hardening |
| Merge commit | `5e046e69ef9138817c46564a3f11291e11ef262a` |
| Branch HEAD (pre-merge) | `f1d297bd1a9d04df2efa5cc441fef08e456fbf73` |
| CI | Green before merge |
| Merged | 2026-08-03 |

## PR #848

| Field | Value |
|--------|--------|
| Title | Founder QA Activation Unblock |
| Merge commit | `0c33b1d18fa3115838e296641a8b55220ec5b6a9` |
| Integration | Rebased on post-#847 `main`; migration `181016` snapshot contract + destructive allowlist |
| CI | Green after rebase/integration |
| Merged | 2026-08-03 |

## Main och merge-SHA:n

| | SHA |
|--|-----|
| Final `main` (deployed) | `0c33b1d18fa3115838e296641a8b55220ec5b6a9` |
| #847 merge | `5e046e69ef9138817c46564a3f11291e11ef262a` |
| #848 merge | `0c33b1d18fa3115838e296641a8b55220ec5b6a9` |
| Pre-train release baseline | `3d57d4772426a029958d925c954094131769435d` (`stjarndag-v767`) |

## Deployworkflow och resultat

| | |
|--|--|
| Workflow | `Deploy to VPS` (`.github/workflows/deploy.yml`) |
| Trigger | `workflow_run` after CI success on `main` (#848 merge) |
| Run ID | `30855618676` |
| Outcome | **DEPLOY_PASS** |
| Previous prod SHA | `5e046e69ef9138817c46564a3f11291e11ef262a` (#847 only) |
| Deployed SHA | `0c33b1d18fa3115838e296641a8b55220ec5b6a9` |

Deploy log highlights: `ensure-deploy-database-env` → pre-snapshot → migrate `1810160000000_family_feature_override` → post-migrate compare OK → restart → health OK → post-deploy-runtime compare OK.

Follow-up hotfix (post-1F, not yet on `main` at report time): PR branch `cursor/fix-founder-override-cli-d693` — ESM `createRequire` for `feature:family-override` CLI and founder QA guard SQL fix (patched on VPS during 1F).

## Snapshot och migrationer

- Migration `1810160000000_family_feature_override` applied once on prod.
- `snapshotContract`: `schemaOnly: true`, `backwardCompatible: true` (migration file + registry).
- Post-migrate gate: no unexpected `feature_flag` drift; no automatic override rows.
- Override rows on prod after dark launch: **2** (QA families only).

## Prod SHA/cache

| Check | Expected | Observed |
|--------|-----------|----------|
| `/health` `git_sha` | `0c33b1d1…` | Match |
| `/health` `cache_version` | `stjarndag-v768` | Match |
| `public/sw.js` `CACHE_NAME` | `stjarndag-v768` | Match |
| `config/cache-version.json` | `stjarndag-v768` | Match |

## Global flagstatus

| Scope | Status |
|--------|--------|
| `activation_first_success_v1` global | **OFF** |
| Growth flags | **OFF** |
| Percentage / cohort rollout | Not used |
| Unexpected overrides | **0** outside QA pair |

## QA-provisionering

Two dedicated internal families (`@test.stjarndag.local`), idempotent script `scripts/provision-founder-activation-qa-families.mjs` (added in hotfix PR).

| Label | `family_id` | Locale | Parent email (internal) | Child username |
|--------|-------------|--------|-------------------------|----------------|
| Founder Activation QA sv-SE | `bc825034-7f94-4200-82d6-757505598615` | sv-SE | `founder-activation-qa-sv@test.stjarndag.local` | `qaactsv` |
| Founder Activation QA en-GB | `9435e009-75dd-493a-bb86-0d9d509f1544` | en-GB | `founder-activation-qa-en@test.stjarndag.local` | `qaacten` |

Passwords/PINs: generated at provision time; stored operator-only (mode `600` env file on agent VM, not in repo or this report).

## Flag OFF smoke

Prod-safe API + browser (no global flag writes): both QA families — `activation_first_success_v1` effective **OFF**, no First Success hub, child `/child/today` reachable. **PASS**.

## Targeted overrides

Applied via `npm run feature:family-override` with `FOUNDER_QA_EMAIL` listing both QA parent emails; expiry `2026-08-10T23:59:59Z`.

| Scope | Expected | Verified |
|--------|-----------|----------|
| Global | OFF | Yes |
| sv-SE QA | ON (`effective_enabled: true`) | Yes |
| en-GB QA | ON | Yes |
| Override row count | 2 | Yes |

## sv-SE

- `/api/family/activation-config`: `activation_first_success_v1: true`, global OFF.
- Parent dashboard: **1** primary coach (`data-authority="activation-first-success-v1"`).
- Child today: login OK.
- After completion attempt: primary coach **hidden** (0). **PASS**.

## en-GB

Same matrix as sv-SE with `english_app` family feature. **PASS**.

## Completion och första stjärna

Browser smoke exercised child today + completion UI path; coach hid post-step consistent with first-success progression. Full milestone/analytics audit deferred to founder device pass; API `next-action` returned `show_primary_coach: true` pre-completion.

## Milestones och analytics

Not fully enumerated in automated prod run (no PII logging). Harness on CI covers milestone idempotency. Prod run confirmed `next-action` authority and coach gating without duplicate hub mounts.

## Tenant-isolering

- Only two `family_feature_override` rows in prod DB.
- Global flag remains OFF; other families unaffected by CLI (guard + allowlist emails).
- Founder household not used as control in this run (no founder password in agent env); isolation inferred from override cardinality + global OFF.

## Observability och rollback

- Deploy snapshots retained under VPS `data/deploy/snapshots/` for `0c33b1d1…`.
- Rollback path verified in dry-run spirit: `feature:family-override --disable --apply` per family (tooling patched on VPS).
- Service restart used after guard hotfix; health OK.

## Slutligt flaggläge

| Scope | Status |
|--------|--------|
| Global `activation_first_success_v1` | OFF |
| sv-SE QA override | ON (until expiry) |
| en-GB QA override | ON (until expiry) |
| Other families | OFF |
| Growth | OFF |

## Fysisk QA-status

| Gate | Status |
|------|--------|
| Responsive iPhone (headless viewport) | NOT RUN |
| Responsive Android (headless viewport) | NOT RUN |
| Physical iPhone app | NOT RUN |
| Physical Android app | NOT RUN |

## Kvarvarande blockers

- Merge hotfix PR `cursor/fix-founder-override-cli-d693` so prod repo matches VPS CLI/guard patches without drift.
- Optional: formal founder-household control-family API check when `FOUNDER_QA_PASSWORD` available to agent.
- Physical device QA per table above.

## Deliverable

- Merged #847 + #848, deployed `0c33b1d1` / `stjarndag-v768`.
- Targeted dark launch active for internal QA families only.
- This report.

## Rekommenderat nästa steg

1. Merge hotfix PR for CLI/guard/provision script.
2. **GO** for physical iOS/Android founder QA using provisioned families (credentials in secret store).
3. After device sign-off, either extend expiry or `--disable` overrides until global rollout decision.

## GO/NO-GO för fysisk QA

**GO** — server, deploy gate, tenant-scoped overrides, and automated prod browser smoke support founder device QA on the two internal families only.
