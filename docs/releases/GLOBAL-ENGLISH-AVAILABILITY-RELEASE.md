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

1. Merge code with global flag **OFF** (migration seeds `enabled = false`).
2. Deploy release build.
3. Confirm `/health` shows `english_global_flag_read_ok: true` and `english_global_flag_enabled: false`.

## Founder prod smoke (mandatory before global ON)

After live deploy, run founder smoke with the global flag still **OFF** (founder QA credentials in approved secret store; not App Store review account).

| Check | Expected |
|-------|----------|
| Existing **en-GB** family (grandfather / prior beta) | After parent logout → login (new session), UI stays **en-GB** |
| Same family — **child login** | Child session uses **en-GB** (`/api/auth/me` or child UI) |
| Same family — **parent restore** (e.g. after child handoff) | Parent session **en-GB** |
| **sv-SE** control family (no English beta) | Unchanged — still Swedish, no locale regression |
| **New** family (no `english_app` beta) while global OFF | Cannot newly select **en-GB** in settings/login (unless already grandfathered / beta) |
| Ops | `/health` (`english_global_flag_*`), logs, locale APIs — no new errors |

Integration coverage for grandfather logout/re-login/child is in `test/english-app-global-availability.test.js`; this prod pass is the human gate before flipping the flag.

**Do not** set global English ON until this smoke passes.

## Global enable (only after founder prod smoke above)

Use the approved feature-flag / ops path (admin tooling or runbook), not ad-hoc SQL unless that is your established procedure:

```sql
UPDATE feature_flag
SET enabled = true
WHERE key = 'english_app_global_enabled';
```

## Staged enable (optional)

5. Enable `english_app_global_enabled` in **QA / staging** only.
6. Browser + mobile smoke: sv-SE family can open settings and select English; locale persists after refresh/login.
7. Confirm `english_language_offer = false` still hides offer but English remains selectable.

9. Monitor after enable: locale API errors, auth, child login, support/feedback `language` type. Kill switch remains `enabled = false` without redeploy.

## Emergency rollback

10. `UPDATE feature_flag SET enabled = false WHERE key = 'english_app_global_enabled';` — no redeploy required.
11. Families already on **en-GB** keep UI (grandfather); new en-GB selections require per-family `english_app` again.

## Out of scope

- Activation (#862)
- `english_child_experience` cohort rollout (see `docs/i18n-beta-rollout-plan.md`)
