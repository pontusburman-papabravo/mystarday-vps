# Global English availability — release checklist

<!-- pragma: allowlist secret -->

**Flag:** `feature_flag.english_app_global_enabled` (default **OFF** after migrate)  
**ADR:** `docs/adr/ADR-021-global-english-availability.md`

No flag activation, merge, or deploy in the implementation PR alone — follow this after merge.

## Pre-merge (CI)

- [ ] `npm run test:gate` green (use test env per `AGENTS.md`)
- [ ] `npm run test:e2e:i18n` green
- [ ] `npm run audit:i18n:strict` green

## Deploy with flag OFF

1. Merge code with global flag **OFF** (migration seeds `enabled = false`).
2. Deploy release build.
3. Verify **sv-SE** parent + child golden path (no locale regressions).
4. Verify **en-GB** QA family (`english_app` + optional `english_child_experience` per RC fixture).

## Staged enable (if available)

5. Enable `english_app_global_enabled` in **QA / staging** only.
6. Browser + mobile smoke: sv-SE family can open settings and select English; locale persists after refresh/login.
7. Confirm `english_language_offer = false` still hides offer but English remains selectable.

## Global enable

8. `UPDATE feature_flag SET enabled = true WHERE key = 'english_app_global_enabled';` (or admin tooling when available).
9. Monitor: locale API errors, auth, child login, support/feedback `language` type.

## Emergency rollback

10. `UPDATE feature_flag SET enabled = false WHERE key = 'english_app_global_enabled';` — no redeploy required.
11. Families already on **en-GB** keep UI (grandfather); new en-GB selections require per-family `english_app` again.

## Out of scope

- Activation (#862)
- `english_child_experience` cohort rollout (see `docs/i18n-beta-rollout-plan.md`)
