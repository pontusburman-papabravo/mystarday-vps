# Free product follow-up — Fas 3 (opaque handoff)

**Branch:** `cursor/opaque-parent-session-handoff`  
**Base:** `e53f59e0` (`origin/main`)  
**Status:** GO (draft PR, no merge)

## Summary

Replaced `stjarndag_parent_session` base64 `{access_token, refresh_token}` backup with **opaque server-side handoff**:

- Cookie: random `base64url` token only
- DB: `parent_session_handoff` (`token_hash`, `parent_id`, `family_id`, `refresh_token_id`, TTL, `used_at`, `revoked_at`)
- Activate: atomic consume + refresh rotation + new access cookies
- Legacy base64 cookies cleared on read (not honored)

## Tests

- `test/parent-session-handoff.integration.test.js` — create, activate, reuse denied, revoked co-parent, tampered token, concurrent consume (200/401)
- `test/parent-session-backup-security.test.js` — contract updated
- `test/parent-child-session-restore.test.js` — opaque fixture
- `npm run test:gate` green
- `test/migration-rollback-gate.test.js` green (migration `1810000000018`)

## Out of scope (as requested)

- PR #794 founder QA rule
- PR #795 schedules authz
- Push-native P2 (documented separately)

## PR

_(link after push)_
