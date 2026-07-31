# Parent session handoff (child ↔ parent)

Opaque cookie `stjarndag_parent_session` + DB row `parent_session_handoff` preserve the parent refresh path when a parent logs in as a child.

## State machine (summary)

1. **Parent logged in** — parent `access_token` + `refresh_token` (path `/api/auth`).
2. **Child login from parent** — `createHandoffFromParentCookies` stores parent `refresh_token_id`, sets handoff cookie; child tokens replace session cookies.
3. **Child active** — access JWT `type: child`; handoff row unused; parent refresh row still exists (referenced by handoff).
4. **Child logout**
   - **Valid handoff, no PIN** — validate handoff → revoke **child** refresh only → `consumeHandoffAndActivateSession` → `{ sessionRestored: true }`.
   - **Valid handoff, PIN** — validate → revoke child refresh → `{ needsParentPin: true }` → client uses **Model B**: `POST /api/family/verify-pin-picker` (consumes handoff + parent cookies).
   - **Handoff cookie but invalid** — fail closed `409` `{ code: PARENT_HANDOFF_INVALID, requiresParentLogin: true }` (not plain `Utloggad`).
   - **No handoff** — `{ loggedOut: true, handoffAvailable: false }`.

## Revocation order (child logout)

1. Decode access JWT → must be `child`.
2. `evaluateHandoffForRequest` **before** any destructive refresh revoke.
3. `revokeRefreshTokenForSession` — deletes refresh row **only** if `user_type` + `child_id` + `family_id` match (stale parent refresh in the jar cannot revoke parent handoff).
4. Clear child session cookies on response.
5. Consume handoff or return PIN contract.

Parent logout still uses `revokeRefreshToken` (revokes parent refresh + handoffs).

## Child-login preconditions

| Case | Parent cookies | Handoff |
|------|----------------|---------|
| Standalone child login | absent | not required |
| Parent → child | both present | **must** create DB row + cookie or `409 PARENT_HANDOFF_CREATE_FAILED` |

## Stable server codes (client-safe)

| Code | HTTP | Meaning |
|------|------|---------|
| `sessionRestored` | 200 | Parent session active in Set-Cookie |
| `needsParentPin` | 200 | Handoff reserved; use verify-pin-picker |
| `loggedOut` + `handoffAvailable: false` | 200 | Normal child exit |
| `PARENT_HANDOFF_INVALID` | 409 | Handoff cookie present but not restorable |
| `PARENT_HANDOFF_CREATE_FAILED` | 409 | Parent→child without handoff |
| `HANDOFF_CONSUME_FAILED` | 500 | Internal consume error |

Internal log codes: `HANDOFF_*` in `src/lib/parent-session-handoff.js` (`HANDOFF_CODES`).

## PIN architecture

**Model B (chosen):** After `needsParentPin`, client calls `/api/family/verify-pin-picker`, which verifies PIN, consumes handoff, and sets parent cookies. No `/restore-parent-session` on this path.

## Why plain `200 Utloggad` is wrong with handoff cookie

If the client sends `stjarndag_parent_session` but the server cannot validate it, treating the response as a normal child logout strands the family (cookie implies parent return path). The server returns `409 PARENT_HANDOFF_INVALID` so the client routes to parent login.

## Single-use and races

Handoff consumption uses `UPDATE … WHERE used_at IS NULL` (one winner). Concurrent logout/login tests live in `test/parent-session-handoff.integration.test.js`.
