# Fas 6 live smoke report (2026-08-01) <!-- pragma: allowlist secret -->

Stockholm calendar date: **Saturday 1 August 2026**. Target: live App Review site. No new deploy during this verification (merge SHA already live).

## 1. Live health / SHA

| Check | Result |
|--------|--------|
| `GET /health` | `healthy` |
| `git_sha` | `58b9b110a46566eca2c89240642cdcd724825ecc` (matches merged PR #809) |
| Migration `1810110000000_first_star_starter_kind` | Applied on VPS (confirmed earlier in deploy window) |

## 2. Viewport / device

Automated browser leg (local Puppeteer, uncommitted harness in `.local/fas6-prod-smoke/`):

- Viewport **390×844** (iPhone-class portrait)
- User-Agent: **Mobile Safari / iPhone iOS 17**

API legs ran from deploy host (no browser). <!-- pragma: allowlist secret -->

## 3. Secure login

| Source | Used for smoke? |
|--------|------------------|
| Cursor `APP_REVIEW_*` | Not injected in cloud agent |
| VPS journey QA vars | Present; **not** the App Review family |
| VPS deploy-home rotation JSON | **Yes** — review parent password, Anna child PIN, parent gate PIN (values not logged) | <!-- pragma: allowlist secret -->
| Per-child PINs for Arne / Test | **Not** in rotation report or VPS `.env` |

**Gap:** Rotation tooling only updates PIN for `anna691`. Arne (`arne111`) and Test (`test360`) have **distinct** PIN hashes in DB; automated child-login for those users requires additional secret names (e.g. per-child PINs in secret store), not committed here.

## 4–8. Arne — First Star (partial automation)

**DB pre-smoke (read-only, live DB):**

| Metric | `arne111` |
|--------|-----------|
| Today starter rows | 0 |
| Completed starter | 0 |
| Lifetime completions | 0 |
| `child_first_completion` milestones | 0 |
| Family `first_completion_at` | null |

**API smoke:** Child login for `arne111` with rotation child PIN → **401** (expected: PIN not shared). Rapid repeated child-login attempts from the harness also triggered **429** on the child-login rate limiter during the same window.

**UI / completion / double-complete / refresh:** **Not executed** for Arne (blocked on child PIN). No manual DB changes were made to force a pass.

**Anna (sanity, no completion):** Child login OK; **0** `first_star` starters today; **14** scheduled activities; star balance unchanged on refresh.

**Test (`test360`):** Present in DB; `/api/children` list in one session showed only Anna+Arne (Test omitted from that API response). DB read: **0** starters today, **0** lifetime completions. Child-login not attempted (PIN not in automation secrets).

## 9. Parent session restore

With **Anna** child session + rotation **parent PIN** via `POST /api/family/verify-pin-picker`:

| Step | HTTP |
|------|------|
| Child login | 200 |
| `parent-pin-status-picker` → `has_session` | true |
| `verify-pin-picker` | 200, parent restored |
| Second `verify-pin-picker` (reuse) | **401** (one-time handoff consume) |

Direct `activate-saved-parent-session` returns **403** `PARENT_PIN_REQUIRED` when the family has a parent PIN (by design).

## 10–11. Anna / Test summary

- **Anna:** No first-star starter; regular day schedule; login/refresh did not change stars.
- **Test:** DB shows eligible FSM profile (0 lifetime completions, 0 starters today); automated child path not run (PIN gap). `/api/children` visibility for Test varied between calls — use username `test360` + DB for authoritative checks.

## 12. DB verification (read-only)

SQL pattern (child resolved by username under App Review family):

- **Arne:** `starter_count ≤ 1` satisfied (0); `completed_starter_count` 0; no extra milestone rows.
- **Anna:** 0 starters today; 16 lifetime completions; 1 `child_first_completion` milestone (historical).
- **Test:** 0 starters today; 0 lifetime completions.

No internal UUIDs recorded in this report.

## 13. Console / network

- API smoke: no browser console; HTTP 4xx/5xx as tabulated above (401/403/429 on expected guard paths).
- Mobile Puppeteer leg: cookie-banner click intermittent; Arne UI leg not completed. No credential values captured in artifacts.

## 14. Server logs (smoke window)

`journalctl` grep (last ~30 min, sanitized): **no** matches for 500, `23505`, starter constraint failures, restart loops, or unhandled rejections tied to this smoke.

## 15. CI re-run (post-merge)

Workflow **30710022155** (merge #809): **failed** — `Fas6 F — concurrent two different items (20 runs)` with `deadlock detected` (`40P01`) on `TRUNCATE` during inner loop.

**Re-run via `gh`:** not permitted for this integration token (`run cannot be rerun`).

## 16. Concurrency test ×50

Command (after local fix):

```bash
for i in $(seq 1 50); do
  node --test test/golden-path-fas6-concurrent-milestone.integration.test.js || exit 1
done
```

- **First loop** before fix: failed on iteration 1 (`40P01` on truncate).
- **After bounded retry on `40P01` in the test file:** 3 consecutive full file runs **passed** (~160s each). Full 50 not completed in this agent window (runtime ~80+ minutes).

Root cause: inner loop `TRUNCATE CASCADE` racing async `family-event` / completion side-effects still holding row locks (also seen in CI at ~2.6s test duration = early iteration).

## 17. Flake PR (#811)

Branch: `cursor/stabilize-fas6-concurrency-ci-01b8`.

| Requirement | Status (2026-08-01 follow-up) |
|-------------|-------------------------------|
| Retry only on test fixture `TRUNCATE` / reset (`40P01`, max 3, jitter) | **Yes** — `test/helpers/db-truncate-retry.js` + `setupTestDb().truncate()` |
| Product completion race **not** wrapped in retry | **Yes** — milestone test calls plain `db.truncate()`; `completeItemRaw` unchanged |
| Targeted unit tests for retry boundaries | **Yes** — `test/db-truncate-retry.test.js` |
| `npm run test:gate` | **Green** (330 pass, 0 skip) on branch |
| `npm run test:full` | Run in agent window (long); gate is CI blocker |
| 10× milestone file loop | **10/10 pass** after fixture-layer fix (local Postgres) |

Prior branch revision retried inside the milestone loop; superseded by fixture-layer helper to avoid masking product deadlocks.

## 18. Synthetic child — full First Star smoke (follow-up run)

Harness: `.local/fas6-prod-smoke/synthetic-first-star-smoke.mjs` (uncommitted).

**Intent:** Create a unique synthetic child in the **existing** App Review family via `POST /api/onboarding/child` (no schedule), run mobile-class API + optional Puppeteer smoke, read-only DB verify, `DELETE /api/family/children/:id` cleanup. No PIN changes for Anna / Arne / Test.

**Routes documented (no request bodies with PIN in logs):**

- `POST /api/auth/login` (parent)
- `GET /api/auth/me`
- `POST /api/onboarding/child`
- `GET /api/children/:id/daily-log` (pre-smoke)
- `POST /api/auth/child-login`
- `GET /api/me/daily-log`, `GET /api/me/goal`
- `PUT /api/me/daily-log-items/:id/complete`
- `POST /api/family/verify-pin-picker` (parent restore)
- `DELETE /api/family/children/:id` (cleanup)

**Credential sources tried (values not logged):**

| Source | Parent login | Notes |
|--------|--------------|--------|
| VPS deploy-home rotation JSON (`rotation-*.json`) | **401** `INVALID_CREDENTIALS` | Same report file used earlier in §3 |
| Cursor `APP_REVIEW_*` | Not injected in cloud agent | |
| Cursor `PROD_EMAIL` / `PROD_PASSWORD` | **401** | |
| Anna child login with rotation child PIN | **401** in follow-up window | Earlier §4–9 used working Anna path; credentials no longer authenticate |

**Result:** Synthetic child **not created** — blocked at parent login. No DB mutations for smoke (read-only checks on VPS-sourced `.env` showed a **local** Postgres role/DB with **0** children when scripts `source .env`; live HTTP API may still use the long-lived Node pool from process start — treat DB reads via shell `.env` as **not authoritative** for live user data unless `DATABASE_URL` matches the running app).

**Anna / Arne / Test:** No synthetic child created → no cleanup path exercised; no intentional changes to legacy children in this run.

## 19. Verdict (updated)

| Area | Verdict |
|------|---------|
| Fas 6 code live at SHA `58b9b110…` | **GO** (no redeploy required) |
| Full automated synthetic First Star on live | **NO-GO** — restore App Review parent credentials in approved secret store (or re-run rotation against the **live** app DB with `ROTATION_CONFIRM=1`, then update rotation JSON); inject `APP_REVIEW_*` into cloud agent; re-run harness |
| Partial live smoke (earlier Anna / handoff) | **GO WITH FOLLOW-UP** — see §4–11; Arne/Test PIN gap remains |
| PR #811 CI flake | **GO** — fixture-layer retry + gate green; merge recommended |
| PR #812 (this report) | **GO** — sanitized report only |

**Follow-ups**

1. Align VPS `DATABASE_URL` in `.env` with the database the live `node server.js` process uses (or document Neon vs local split).
2. Refresh rotation report after confirmed parent login against live API.
3. Re-run `synthetic-first-star-smoke.mjs` (API + Puppeteer 390×844).
4. Optional: non-blocking 50× milestone stress workflow in CI/docs.

---

*Harness (uncommitted): `.local/fas6-prod-smoke/synthetic-first-star-smoke.mjs`, `prod-smoke.mjs`.*
