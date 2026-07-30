# Free product integrity — verification report (2026-07-30)

Branch: `cursor/free-product-integrity-fixes-01b8`  
Start `origin/main`: `db1d27d05f37404a17ede345ab3319004a643580` (includes review doc `8118f4bb` lineage)  
Scope: gratisprodukt only — no IAP/subscriptions/paywall changes.

## Verdict

**GO WITH FOLLOW-UP** — P0/P1 items in this scope are fixed with integration/concurrency evidence; parent-session backup cookie remains a documented follow-up (opaque server-side handoff).

---

## 1. Verified findings (fixed + tested)

| # | Area | Evidence |
|---|------|----------|
| 1 | Authenticated API rate limits | `apiLimiter` uses `user:{id}` / `ip:` keys; no skip for authenticated users. `test/rate-limit-buckets.test.js`, `test/rate-limit-behavior.integration.test.js`. Admin: `adminApiLimiter` 300/min per admin on `/api/admin`. |
| 2 | Revoked parents in rewards | `revoked_at IS NULL` on parent_child in list/redemptions/reorder/approve/deny/notify. `test/rewards-revoked-access.integration.test.js`. |
| 3 | `visible_to_children` | `src/lib/reward-visible-children.js` — null / `[]` / UUID list; foreign IDs filtered to family children. `test/reward-visibility.integration.test.js`. |
| 4 | `requires_approval` | Auto-redemption atomic in transaction (existing + integrity tests). `test/rewards-integrity.integration.test.js` (20 consecutive passes). |
| 5 | Deny atomic | Single `UPDATE … FROM parent_child` with `status = 'pending'` and `revoked_at IS NULL`. Concurrency in rewards-integrity suite. |
| 6 | Reward delete / history | Soft delete `is_active = false`; snapshots on `reward_redemption`. `test/reward-delete-history.integration.test.js`. |
| 7 | Cross-family child login | No global `LOWER(name)` PIN sweep; name fallback only with verified parent family from cookies. `test/child-login-cross-family.integration.test.js`. |
| 8 | PIN warnings | Parent query requires `pc.revoked_at IS NULL`; prefers primary. `test/pin-warning-revoked-parent.integration.test.js`. |
| 10 | SSRF (family images) | `src/lib/safe-url-fetch.js` + proxy route. `test/safe-url-fetch.test.js`. |
| 11 | CI gate | New critical tests in `test:gate:unit` / `test:gate:db`; `test/ci-test-manifest.test.js`. |

---

## 2. Disproved / already correct

| Item | Result |
|------|--------|
| Hard `DELETE` reward on parent “ta bort” | Already soft-deactivate; no new migration required for snapshots. |
| `rewards-integrity.integration.test.js` missing from CI | Already listed in `test:gate:db` before this branch. |

---

## 3. Parent-session backup (item 9)

**Verified risk (not rewritten in this PR):**

- Cookie `stjarndag_parent_session` holds **base64 JSON** with raw `access_token` / `refresh_token` (not signed).
- Restored in `src/middleware/auth.js` and child-login save path.
- Logout paths clear cookie (`src/routes/auth/login.js`).
- Manipulated cookie could restore tokens until JWT/refresh expiry/revocation.

`test/parent-session-backup-security.test.js` documents this. **Follow-up:** opaque hashed handoff id server-side, short TTL, bind parent+family, clear on logout/reset/delete/revoke-all.

---

## 4. SSRF assessment

**Mitigated** for family image proxy via central fetch helper (protocol allowlist, IP/DNS checks, redirect hops, timeout, size limit, image magic bytes). User-supplied arbitrary URLs on other routes should still be reviewed if new upload-URL features are added.

---

## 5. Tenant isolation

- Child login: integration test two families, same display name + PIN — anonymous name login fails; unique usernames succeed.
- Rewards: family_id on reward/child; parent_child revocation enforced on mutations.

---

## 6. Concurrency

- `test/rewards-integrity.integration.test.js`: **20 runs, 0 failures** (`NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false`, `RESEND_API_KEY` unset).

---

## 7. Repo sweep (same root patterns)

Prioritize verified P1 only; not fixed in this branch unless listed above:

| Pattern | Notes |
|---------|--------|
| `parent_child` without `revoked_at` | Remaining joins in pedagog routes, goals, ratings, schedules — need case-by-case authz review (out of scope here). |
| `DELETE FROM reward` | Account deletion / admin family wipe only (expected). |
| `pin_notification_log` | Schema drift — table used in prod; missing on fresh migrate (documented in systemdokumentation). PIN tests stub notification insert where needed. |
| `fetch(` server-side | Family-images path guarded; other `fetch` usages should stay audited. |

---

## 8. Tests run (this branch)

| Command | Result |
|---------|--------|
| `NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate` | pass (unit 1593, db 262) |
| `NODE_ENV=test node --test test/migration-rollback-gate.test.js` | pass 3 |
| Rewards integrity 20× | pass 20 / fail 0 |

Full `npm test` not required for this deliverable; gate is green.

---

## 9. Migrations

No new migrations on this branch (reward snapshots and soft-delete already in schema).

---

## 10. Changed files (summary)

- `src/middleware/rateLimiter.js`, `app.js`
- `src/routes/rewards.js`, `src/lib/reward-visible-children.js`
- `src/routes/auth/child-login.js`, `src/lib/parent-session-family.js`
- `src/routes/family-images.js`, `src/lib/safe-url-fetch.js` (prior commit on branch)
- `package.json`, tests listed in §1
- This document

---

## 11. Remaining risks

- Parent-session backup cookie (follow-up).
- `pin_notification_log` / `pin_audit_log` migration gap on fresh DB.
- Pedagog/goals/ratings `parent_child` queries without explicit revoke filter.
- Approve path still uses lock + conditional update (deny is fully atomic SQL).

---

## 12. Commits on branch

See `git log` on `cursor/free-product-integrity-fixes-01b8` after push.

POS: security child scope, P-02, R-02, 15 Section B (no surprise auth, tenant isolation).
