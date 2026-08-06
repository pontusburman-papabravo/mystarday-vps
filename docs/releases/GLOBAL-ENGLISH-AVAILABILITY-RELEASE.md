# Global English availability — release checklist

<!-- pragma: allowlist secret -->

**Flag:** `feature_flag.english_app_global_enabled` (default **OFF** after migrate)  
**ADR:** `docs/adr/ADR-021-global-english-availability.md`

No flag activation, merge, or deploy in the implementation PR alone — follow this after merge.

## Merge order (do not skip)

Merge **#870** only after backup/deploy safety is live — merging to `main` may auto-deploy.

| Step | PR | Gate before merge |
|------|-----|-------------------|
| 1 | **#827** backup/deploy-gate | Full suite green; VPS config; real backup + restore rehearsal |
| 2 | **#826** security/IAP | Rebase on new `main`; full suite green; deploy via backup gate; migrations verified |
| 3 | **#870** Global English (this) | Rebase if `main` moved; CI green; deploy with flag **OFF** |
| 4 | **#862** Activation | Rebase; separate treatment after #870 |

**#870 alone:** code-ready for merge, but **do not merge** until #827 and #826 are merged and verified.

## Pre-merge (CI)

- [ ] `npm run test:gate` green (use test env per `AGENTS.md`)
- [ ] `npm run test:e2e:i18n` green
- [ ] `npm run audit:i18n:strict` green

## Deploy with flag OFF

1. Merge code with global flag **OFF** (migration seeds `enabled = false` on **first insert only**).
2. Deploy release build; ensure app process restarted (VPS systemd app unit — `/health` may omit `english_global_flag_*` until restart).
3. Verify `/health` — **do not trust `status: healthy` alone** for flag readiness:

| Field | Expected after deploy |
|-------|------------------------|
| `git_sha` | Matches merged `main` / deploy SHA from deploy identity check |
| `english_global_flag_read_ok` | **`true`** (decisive; `false` ⇒ fail-closed OFF + check DB/logs) |
| `english_global_flag_row_present` | **`true`** (row exists after migrate) |
| `english_global_flag_enabled` | **`false`** |

**Migration note:** `1810170000000_english_app_global_enabled_flag.js` uses `ON CONFLICT DO NOTHING`. It sets `enabled = false` when the row is **created**, but does **not** reset an existing row that was already `true`. After deploy, always confirm `english_global_flag_enabled` in `/health` (or DB), not only that migrate ran.

## What global ON means (#870 scope)

| Milestone | Gate |
|-----------|------|
| **Parent English beta** (`english_app_global_enabled`) | Founder prod smoke below + ops enable — **not** full product English |
| **Full English release** (child UX, device QA, legal, store) | **NO-GO** until RC-1/RC-2 per [`RC1_I18N_RC_BRANCH_STATUS.md`](RC1_I18N_RC_BRANCH_STATUS.md) |

`english_app_global_enabled` does **not** turn on child English. Child UI remains behind **`english_child_experience`** per family (`docs/i18n-beta-rollout-plan.md`).

## Founder prod smoke (mandatory before global ON)

After live deploy, run founder smoke with the global flag still **OFF** (founder QA credentials in approved secret store; not App Store review account).

| Scenario | `english_child_experience` | Expected |
|----------|---------------------------|----------|
| Grandfather / beta **en-GB** family | **ON** (required for child en-GB smoke) | Parent logout → login: **en-GB**; child login + `/api/auth/me`: **en-GB**; parent restore after handoff: **en-GB** |
| Same family separation check | **OFF** (optional explicit case) | Parent may be **en-GB** if grandfathered; **child UI stays Swedish** — verifies parent vs child gates |
| **sv-SE** control family (no English beta) | any | Swedish, no regression; cannot newly select en-GB while global OFF |
| **New** family (no `english_app` beta) while global OFF | — | Cannot newly select **en-GB** in settings/login |

| Ops | Expected |
|-----|----------|
| `/health` | `english_global_flag_read_ok: true`, `enabled: false`, `row_present: true` |
| Logs / locale APIs | No new errors |

Integration coverage for grandfather logout/re-login/child (with `english_child_experience` ON) is in `test/english-app-global-availability.test.js`; this prod pass is the human gate before flipping the global flag.

**Record smoke results:** [`FOUNDER-SMOKE-2026-08-04.md`](FOUNDER-SMOKE-2026-08-04.md) (körspecifikt; håll huvudrunbooken generell).

**Do not** set global English ON until this smoke passes.

## Global enable (only after founder prod smoke above)

**Parent English beta only** — not evidence of full English store release.

Use the approved feature-flag / ops path (admin tooling or runbook), not ad-hoc SQL unless that is your established procedure:

```sql
UPDATE feature_flag
SET enabled = true
WHERE key = 'english_app_global_enabled';
```

**Canonical ops (VPS, after deploy includes `scripts/ops/english-app-global-flag.cjs`):**

```bash
ENGLISH_GLOBAL_FLAG_CONFIRM=1 npm run ops:english-global-flag:on
```

Rollback:

```bash
ENGLISH_GLOBAL_FLAG_CONFIRM=1 npm run ops:english-global-flag:off
```

Post-enable founder smoke: set `FOUNDER_SMOKE_EXPECT_GLOBAL_ENABLED=1` so `/health` contract expects `english_global_flag_enabled=true` (pre-enable runs leave this unset).

## Staged enable (optional)

5. Enable `english_app_global_enabled` in **QA / staging** only.
6. Browser + mobile smoke: sv-SE family can open settings and select English; locale persists after refresh/login.
7. Confirm `english_language_offer = false` still hides offer but English remains selectable.

9. Monitor after enable: locale API errors, auth, child login, support/feedback `language` type. Kill switch remains `enabled = false` without redeploy.

## Emergency rollback

10. `UPDATE feature_flag SET enabled = false WHERE key = 'english_app_global_enabled';` — no redeploy required.
11. Families already on **en-GB** keep UI (grandfather); new en-GB selections require per-family `english_app` again.

## Out of scope

- Activation (#862) — separate flag; not required for basic parent English gate
- `english_child_experience` cohort rollout (see `docs/i18n-beta-rollout-plan.md`) — physical device smoke before child cohort ON
- Full English store release (legal, screenshots, RC-2) — see RC-1 status doc
