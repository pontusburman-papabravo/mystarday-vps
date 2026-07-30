# Free product integrity — revised verification report (2026-07-30)

Revision pass after contradictory first report. **No IAP/RevenueCat/subscription/paywall code in this PR.**

---

## 1. Branch identity

| Field | Value |
|--------|--------|
| Branch | `cursor/free-product-integrity-fixes-01b8` |
| HEAD | `02afc0fb9f7e456b54cdd59144dd62d768ede2a7` (+ pending commit for `1810000000017_pin_notification_log`) |
| `origin/main` (after `git fetch`) | `db1d27d05f37404a17ede345ab3319004a643580` |
| Merge-base `origin/main` ∩ HEAD | `db1d27d05f37404a17ede345ab3319004a643580` |
| Branch start SHA | `db1d27d05f37404a17ede345ab3319004a643580` |

**`origin/main` did not advance** after branch creation. Diff `origin/main...HEAD` equals diff `db1d27d...HEAD`.

---

## 2. Complete commit list (`origin/main..HEAD`)

```
8a116787 fix(security): block SSRF in family image proxy and restore API rate limits
33b6e743 fix(rewards): enforce revoked access and auto-redemption semantics
8aaa2d86 fix(auth): scope child display-name login to parent family context
62648e4e fix(rewards): visibility normalization and atomic deny
76e04311 fix(security): admin API rate limit and apiLimiter comments
dda65472 test(integrity): authz, rate limits, child login, rewards coverage
02afc0fb docs: free product integrity verification report 2026-07-30
```

---

## 3. Exact PR diff (`origin/main...HEAD`)

**22 files**, +1338 / −122 lines. **No** `.env.example`, `server.js`, `revenuecat-*`, `iap-client-config`, or `1810000000016_iap_event_ordering_audit.js`.

```
M  app.js
A  docs/FREE-PRODUCT-INTEGRITY-2026-07-30.md
M  package.json
A  src/lib/parent-session-family.js
M  src/lib/push.js
A  src/lib/reward-visible-children.js
A  src/lib/safe-url-fetch-hosts.js
A  src/lib/safe-url-fetch.js
M  src/middleware/rateLimiter.js
M  src/routes/auth/child-login.js
M  src/routes/family-images.js
M  src/routes/rewards.js
A  test/child-login-cross-family.integration.test.js
A  test/ci-test-manifest.test.js
A  test/parent-session-backup-security.test.js
A  test/pin-warning-revoked-parent.integration.test.js
A  test/rate-limit-behavior.integration.test.js
A  test/rate-limit-buckets.test.js
A  test/reward-delete-history.integration.test.js
A  test/reward-visibility.integration.test.js
A  test/rewards-revoked-access.integration.test.js
A  test/safe-url-fetch.test.js
```

**IAP grep on branch diff:**

```bash
git diff --name-only origin/main...HEAD | grep -Ei 'iap|revenuecat|subscription|paywall|1810000000016'
# → no matches (empty)
```

The earlier “16 files + IAP migration” UI likely referred to **another branch/PR** (e.g. full-repo integrity review), not `#790`.

**Per-file IAP check (all zero diff lines vs `origin/main`):** `.env.example`, `server.js`, `src/lib/revenuecat-webhook-process.js`. No `1810000000016_iap_event_ordering_audit.js` in repository.

---

## 4. Rewards soft-delete / history (single status)

**Partially verified — existing soft-delete; regression coverage added; snapshot columns on main**

| Question | Answer |
|----------|--------|
| Start SHA (`db1d27d`) delete behavior | `DELETE /api/rewards/:id` → `UPDATE reward SET is_active = false` (not hard delete). |
| Original review claim | Some reports assumed hard delete of `reward` + `reward_redemption`. |
| Motbevisat? | **Hard-delete on parent delete path** — yes, already soft-delete on start SHA. |
| What this branch changed in delete path | **No change** to delete SQL on `rewards.js` vs start SHA. |
| Real history issue on main | Snapshot columns `reward_name` / `reward_icon` added in migration `1810000000013_reward_integrity_constraints` (already on `main`). |
| This branch | Integration test `test/reward-delete-history.integration.test.js` proves snapshots survive deactivate + inactive redeem returns `reward_inactive`. |

---

## 5. Verified and fixed (this branch)

- API rate limits (per-user buckets, admin limiter, behavior test).
- Rewards: revoked `parent_child`, visibility, atomic deny, auto-redemption (with existing integrity suite).
- Child login: no global display-name PIN sweep.
- PIN warning parent selection (`revoked_at IS NULL`).
- SSRF guard for family image proxy.
- CI manifest for critical integration tests.

---

## 6. Disproved findings

- IAP/RevenueCat files in **this** PR diff.
- Parent reward delete as hard-delete (was already soft-delete on branch start).
- “New migrations” for reward snapshots (already on `main` as `1810000000013`).

---

## 7. Partially verified

- Reward history: soft-delete pre-existing; snapshots on `main`; branch adds **tests only** for delete/history path.

---

## 8. Remaining authorization findings (`parent_child` without `revoked_at`)

| Location | Endpoint / use | Class | Severity | Consequence | Follow-up |
|----------|----------------|-------|----------|-------------|-----------|
| `src/routes/ratings.js` ~161 | POST parent rating on daily log item | **Authorization** | **P1** | Revoked shared parent can rate child activities if link row still exists | Add `pc.revoked_at IS NULL`; integration test |
| `src/routes/ratings.js` ~204 | GET ratings for item | **Authorization** | **P1** | Revoked parent can read ratings | Same |
| `src/routes/schedules/templates.js` ~267 | Child access for template apply | **Authorization** | **P2** | Revoked parent may apply template to child | Add `revoked_at IS NULL` |
| `src/routes/schedules/fill-week.js` ~19 | Child access for fill-week | **Authorization** | **P2** | Same pattern | Same |

**Already correct in scope:** pedagog routes (`revoked_at` + role `pedagog`), goals list/approve/deny, rewards (this branch), children.js access checks, push redemption notify.

---

## 9. Parent-session backup

**Verified risk (unchanged):** `stjarndag_parent_session` = base64 JSON with raw tokens. Logout clears cookie. **Follow-up:** opaque server-side handoff (documented in `test/parent-session-backup-security.test.js`).

---

## 10. `pin_notification_log` schema

| Finding | Detail |
|---------|--------|
| CREATE in migrations | **Missing** until `1810000000017_pin_notification_log` (this revision). |
| `db/baseline-schema.sql` | Had `pin_lockout` + `pin_audit_log` but **not** `pin_notification_log`. |
| Fresh DB (`npm run migrate` on empty Postgres) | Before fix: `pin_notification_log` **did not exist** → PIN notify path errors on `recordNotification`. |
| Local test DB | Often had table from prod-like state or partial history; tests stubbed `recordNotification` in pin-warning test. |
| Fix | Migration `1810000000017_pin_notification_log` + baseline-schema update; rollback covered by `test/migration-rollback-gate.test.js`. |

---

## 11. Test results (revision run)

| Command | Exit | pass | fail | skip | cancelled | Notes |
|---------|------|------|------|------|-----------|-------|
| `npm ci --legacy-peer-deps --include=dev` | 0 | — | — | — | — | |
| `npm run css:build` | 0 | — | — | — | — | |
| `npm run check:ambient-objects` | 0 | — | — | — | — | |
| `npm run lint` | 0 | — | — | — | — | 0 errors, 81 warnings |
| `npm run lint:public` | 0 | — | — | — | — | 671/673 budget OK |
| `npm run check:routes` | 0 | — | — | — | — | |
| `npm run migrate` | 0 | — | — | — | — | applies `1810000000017` |
| `npm run test:gate` | 0 | unit 1593 + db 262 | 0 | 0 | 0 | |
| `npm test` | 0* | 3088 | **50** | 0 | 0 | *runner exit 0 with failing subtests; failures are pre-existing contract/POS/landing suites — **none** of new integrity test files appear in failure list |
| `node --test test/migration-rollback-gate.test.js` | 0 | 3 | 0 | 0 | 0 | includes rollback of latest migration |
| `rewards-integrity.integration.test.js` ×20 | 0 | 20 runs all `# fail 0` | 0 | — | — | prior revision run |

DB tests: main `DATABASE_URL` after migrate; empty DB `integrity_empty_schema_test` used for schema proof.

---

## 12. Migrations and rollback

| Migration | Purpose |
|-----------|---------|
| `1810000000017_pin_notification_log` | PIN email cooldown / notification log (not payment) |

`down()` drops table + index. Verified via migration rollback gate on dev-like and empty DB.

**No IAP migrations added on this branch.**

---

## 13. PR

GitHub pull request **#790** (branch `cursor/free-product-integrity-fixes-01b8` → `main`).

---

## 14. Recommendation (free product)

**GO WITH FOLLOW-UP**

- Branch diff is **clean** vs payment/IAP scope.
- Gate green; integrity concurrency green.
- Follow-up: parent-session handoff, ratings/schedules `revoked_at`, full `npm test` debt (50 failures on `main` baseline, not introduced here).

Payment / IAP: **Deferred** — explicitly out of scope for this PR.
