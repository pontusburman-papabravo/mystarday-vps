# Parent session handoff (child ↔ parent)

Opaque cookie `stjarndag_parent_session` + DB row `parent_session_handoff` preserve the parent refresh path when a parent logs in as a child.

## Route mount order (`src/routes/family/index.js`)

```
invites-public (no auth)
→ session-public
    GET  /parent-pin-status-picker   (handoff only)
    POST /verify-pin-picker          (handoff + PIN, CSRF-exempt)
    POST /activate-saved-parent-session (child JWT + handoff)
→ requireParent
→ pin.js, core, …                    (authenticated parent routes)
```

**Why picker PIN is before `requireParent`:** After child logout with `needsParentPin`, `clearAllSessionCookies` removes `access_token` / `refresh_token` / CSRF. Only the HttpOnly handoff cookie remains. `requireParent` would 401 before `attachHandoffPickerContext` runs.

**CSRF:** `POST /verify-pin-picker` is listed in `csrf.js` exclusions (no session cookie to double-submit yet). Rate limit: `parentPinLimiter` + handoff-bound parent/family from DB, not request body.

## Credentials after child logout (PIN path)

| Cookie / token | After `needsParentPin` logout |
|----------------|-----------------------------|
| `access_token` | cleared |
| `refresh_token` | cleared (child row revoked when identity matches) |
| `csrf_token` | cleared |
| `stjarndag_parent_session` | **kept** until PIN consume or invalidation |

## State machine (summary)

1. **Parent logged in** — parent `access_token` + `refresh_token` (path `/api/auth`).
2. **Child login from parent** — handoff row + cookie; child tokens replace session cookies. Handoff must succeed or `409 PARENT_HANDOFF_CREATE_FAILED` (no child refresh row).
3. **Child logout**
   - Valid handoff, no PIN — verified child JWT → revoke child refresh only → transactional consume → `{ sessionRestored: true }`.
   - Valid handoff, PIN — verified child JWT → revoke child refresh → `{ needsParentPin: true }` → `verify-pin-picker` consumes handoff.
   - Handoff cookie but invalid session/handoff — fail closed (`401` / `409` with stable `code`).
   - No handoff — `{ loggedOut: true, handoffAvailable: false }`.

## JWT verification (logout)

Child handoff logout uses `verifyToken()` (current + previous secret), not `jwt.decode()`. Forged, expired, or wrong-family child JWT cannot consume handoff.

## Transaction boundary (`consumeHandoffAndActivateSession`)

DB work runs in a single transaction (`BEGIN` … `COMMIT`):

1. `SELECT handoff … FOR UPDATE`
2. Validate unused / unrevoked / unexpired + family access
3. `SELECT parent refresh … FOR UPDATE`
4. Insert **new** parent refresh row
5. `UPDATE handoff SET used_at`
6. `DELETE` old parent refresh row
7. `COMMIT`

Response cookies are set **only after** commit. On failure: `ROLLBACK` — `used_at` unchanged, old parent refresh retained.

Concurrent consume: second locker gets `PARENT_HANDOFF_USED` / conflict.

## Revocation order (child logout)

1. Verify access JWT → `type: child`
2. `evaluateHandoffForRequest` before destructive steps
3. `revokeRefreshTokenForSession` (child identity only)
4. Clear child session cookies on response
5. Consume or PIN contract

## Stable client codes

| Code | When |
|------|------|
| `sessionRestored` | No-PIN logout success |
| `needsParentPin` | PIN required after logout |
| `PARENT_PIN_INVALID` | Wrong picker PIN |
| `PARENT_PIN_REQUIRED` | PIN not configured |
| `PARENT_HANDOFF_INVALID` | Bad/missing handoff |
| `PARENT_HANDOFF_USED` | Replay |
| `PARENT_HANDOFF_EXPIRED` | TTL |
| `PARENT_HANDOFF_CONSUME_FAILED` | Internal consume/transaction error |
| `CHILD_SESSION_INVALID` | Handoff present but child JWT invalid |
| `PARENT_HANDOFF_CREATE_FAILED` | Parent→child without handoff |
| `SERVER_ERROR` | Generic 500 |

## PIN architecture (Model B)

After `needsParentPin`, client calls `/api/family/verify-pin-picker` (public mount). Success returns `ok: true`, parent session cookies, and CSRF — no `/restore-parent-session`.

## Why plain `200 Utloggad` is wrong with handoff cookie

If the client sends `stjarndag_parent_session` but restore cannot be validated, a normal child logout misleads the UI. Use explicit `409`/`401` codes and parent-login recovery.

## Tests

- `test/parent-session-handoff.integration.test.js` — no-PIN HTTP, refresh confusion
- `test/parent-child-handoff-pin.integration.test.js` — full-stack PIN path, rollback, child-login orphan guard
- `test/parent-child-handoff-logout-jwt.integration.test.js` — forged/expired JWT
- `test/parent-child-handoff-logout-client.test.js` — client contract
