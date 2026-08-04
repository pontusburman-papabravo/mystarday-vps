# npm test — admin suite drift (main, not #870)

<!-- pragma: allowlist secret -->

**Status:** open · **Owner:** admin v2 / platform  
**Discovered:** 2026-08-04 during #870 full `npm test` on rebased `main`

## Summary

Full `npm test` can report **2 failures** that are unrelated to Global English (#870). CI gate (`npm run test:gate`) does **not** include these files and remains green.

| Test | Symptom | Likely cause |
|------|---------|----------------|
| `test/admin-nav-fas1.test.js` | `every sidebar href is canonical` — expected **27** hash links, HTML has **29** | Admin nav added routes without updating Fas 1 count/assertions |
| `test/admin-start-summary.test.js` | `GET /api/admin/start-summary` — `messages.unreadCount` **0 !== 2** | Mock `injectMockDb` handlers no longer match `start-summary` / `contact-messages` query shapes |

## Reproduce

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false node --test \
  test/admin-nav-fas1.test.js test/admin-start-summary.test.js
```

## Fix scope (separate PR)

- Update `admin-nav-fas1` expected link count and/or canonical href list to match `admin-nav.js`.
- Extend `admin-start-summary` mock to return counts for current `getMessageCounts` / inbox SQL.

## Explicitly out of scope

- PR #870 (Global English availability) — do not bundle these fixes there.
