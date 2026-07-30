# Free product integrity — revised verification report (2026-07-30)

Revision pass after contradictory first report. **No IAP/RevenueCat/subscription/paywall code in this PR.**

---

## 1. Branch identity

| Field | Value |
|--------|--------|
| Branch | `cursor/free-product-integrity-fixes-01b8` |
| HEAD | `f722d585` (+ merge-review commits on branch) |
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
f722d585 fix(db): add pin_notification_log migration and revise integrity report
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

**GO** — PR introduces **zero new** `npm test` failure names vs `db1d27d`; ratings P1 fixed; `test:gate` green. Follow-up (P2+): schedules `revoked_at`, parent-session handoff, clear 50-test `npm test` debt on `main`.

Payment / IAP: **Deferred** — not in PR diff.

---

## 15. Final merge review (PR #790)

### 15.1 Full `npm test` comparison

Worktrees at `db1d27d` and PR HEAD; fresh Postgres DBs; command:

`NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY node --test test/*.test.js`

| | main | PR |
|--|------|-----|
| pass | 3071 | 3090 |
| fail | 50 | 50 |
| exit | 1 | 1 |

41 unique failing names on each side — **same set** (39 suite names + 2 landing test files). Apparent “only main” / “only PR” diff = **path prefix only** (worktree vs workspace). **0 regressions.**

### 15.2 `npm test` exit code

`scripts/run-full-npm-test.js` exits non-zero when TAP `# fail` or `# cancelled` &gt; 0. `test/npm-test-runner-exit.test.js` validates TAP parsing.

### 15.3 Ratings P1 — fixed

`src/routes/ratings.js` + `test/ratings-revoked-parent.integration.test.js` (5× green).

### 15.4 Schedules P2 follow-up (not changed)

- `POST /api/schedule-templates/:templateId/apply` — `templates.js` child access without `revoked_at`.
- `POST /api/children/:childId/schedules/fill-week` — `fill-week.js` same.

Revoked parent can still mutate child schedule until follow-up adds `pc.revoked_at IS NULL`.

### 15.5 Gate + concurrency

- `npm run test:gate`: green (1594 unit + 263 db).
- `rewards-integrity.integration.test.js`: 20× pass.

