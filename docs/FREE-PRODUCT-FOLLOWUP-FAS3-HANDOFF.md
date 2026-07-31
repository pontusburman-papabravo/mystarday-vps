# Free product follow-up — Fas 3 (opaque handoff)

**Branch:** `cursor/opaque-parent-session-handoff`  
**PR:** #796  
**Status:** **Villkorat GO** efter rebase på `main` (inkl. efter merge av #795) + gröna gates.

## Handoff TTL (7 dagar)

`HANDOFF_TTL_MS` caps cookie/`expires_at` at **7 days**, further limited by the parent **refresh token** expiry (typically 30d cap on cookie maxAge, but handoff row expires at `min(refresh_expires, now+7d)`).

**Why not shorter:** Barn kan lämna barnläge och återvända till barnväljaren samma vecka utan att föräldern ska logga in igen — samma förväntning som den tidigare base64-backup som följde refresh-livslängden. Token är opaque, hashad, family-bunden, atomiskt konsumerad vid activate och återkallad vid logout, credential-ändring och kontoradering.

**Follow-up (non-blocking):** Kortare grund-TTL med säker rotation vid barnaktivitet; dedikerad rate limit på `parent-pin-status-picker`; strukturerad loggning av upprepade misslyckade picker/activate (utan token i logg).

## Summary

Replaced `stjarndag_parent_session` base64 `{access_token, refresh_token}` backup with **opaque server-side handoff**:

- Cookie: random `base64url` token only (32 bytes)
- DB: `parent_session_handoff` — **SHA-256 hash only**, `refresh_token_id`, parent/family binding, TTL cap 7d (min of refresh expiry)
- Activate: `consumeHandoffAndActivateSession` — atomic `UPDATE … used_at` + refresh rotation
- Legacy base64 cookies cleared on read (not honored)

## Pre-merge verification matrix (#796)

| Requirement | Evidence |
|-------------|----------|
| Opaque cookie has no access/refresh JWT | `createHandoffFromParentCookies` uses `randomBytes`; integration asserts no `eyJ` / `access_token` in cookie |
| Only hash in DB | `INSERT` uses `token_hash = hashOpaque(opaque)` |
| Short TTL | `HANDOFF_TTL_MS` 7d, capped by refresh `expires_at` |
| Tampered token denied | Integration: random base64url → activate 401 |
| Expired token denied | Integration: past `expires_at` → activate 401; parent-gated picker 403 (no bypass) |
| Revoked co-parent cannot restore | Integration: `parent_child.revoked_at` → activate 401 |
| Bound to parent + family | Row stores `parent_id`, `family_id`; `parentHasActiveFamilyAccess` on validate/consume |
| Concurrent activate: one wins | Integration: parallel POST → `[200, 401]` |
| Atomic one-time consume + rotation | `consumeHandoffAndActivateSession` conditional `UPDATE … RETURNING` then delete old refresh + new tokens |
| `revokeAll` / password reset / change-password | Integration: real endpoints → activate 401 |
| Forgot-password alone does not revoke | Integration: forgot → picker still OK until `reset-password` |
| Parent logout revokes handoff | Integration: parent `POST /logout` after child login → handoff row gone, activate 401 |
| Account delete removes handoff | Integration: `DELETE /delete-account` → activate 401, row removed |
| Migration + rollback | `1810000000018_parent_session_handoff.js`; `test/migration-rollback-gate.test.js` |
| Picker rate limit / no sensitive leak | `parent-pin-status-picker` in bootstrap exempt list (global IP limit still applies); JSON only `has_session` + `has_pin` (contract test) |
| Non-consuming picker ≠ session oracle for cookies | Picker proves handoff validity only to holder of cookie; does not issue parent JWT; **activate** is consume/rotate gate |

## Waitlist cleanup on delete-account

Fixed erroneous `waitlist.family_id` (column does not exist). Deletion uses parameterized `family_id` subquery with **`LOWER(TRIM(p.email)) = LOWER(TRIM(w.email))`**. Zero matching waitlist rows is a no-op (does not fail the transaction).

## Merge order (founder)

1. Merge **#795** (schedules revoked-parent authz) — **ännu öppen** på `main` vid senaste check.
2. Rebase **#796** på nya `main` (pre-rebase mot `bef78aa7` redan gjord lokalt; **rebase igen efter #795**).
3. Verifiera migration `1810000000018` — ingen kollision med befintliga `1810000000015`/`1810000000017` på main.
4. Gates: `npm run test:gate`, `migration-rollback-gate`, `parent-session-handoff.integration.test.js`, child-login-relaterade tester.
5. Granska diff efter rebase → **GO för merge #796** (waitlist-fix ingår).

### Post-rebase på `bef78aa7` (före #795 merge)

| Gate | Result |
|------|--------|
| `npm run test:gate` | 270 pass |
| `migration-rollback-gate` | 3 pass |
| handoff + child-login integration | 15 pass |

## After #795 + #796

Next phase: fix **50 existing `npm test` failures** from a **new branch** off then-current `main` — do not mix push-native or onboarding in the same PR.

## Out of scope

- PR #794 founder QA rule
- Push-native P2
