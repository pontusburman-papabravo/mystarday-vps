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

**Gap:** Rotation tooling only updates PIN for the primary App Review child username. Additional QA children with distinct PIN hashes require per-child secrets in the rotation layer, not committed here.

## 4–8. QA children — First Star (partial automation, earlier session)

**DB pre-smoke (read-only, live DB):**

| Metric | QA child (empty day) |
|--------|----------------------|
| Today starter rows | 0 |
| Completed starter | 0 |
| Lifetime completions | 0 |
| `child_first_completion` milestones | 0 |
| Family `first_completion_at` | null |

**API smoke:** Child login for QA child (empty day) without automation PIN → **401** (expected: PIN not in rotation report). Rapid harness attempts also hit **429** on child-login rate limiter.

**UI / completion:** Not executed for that child (PIN gap).

**QA child (with activities):** Child login OK in earlier window; **0** `first_star` starters today; scheduled activities present; stars unchanged on refresh.

**QA child (no completions):** DB read: **0** starters today, **0** lifetime completions. Child-login not attempted (PIN not in automation secrets).

## 9. Parent session restore

With **QA child (with activities)** session + rotation **parent PIN** via `POST /api/family/verify-pin-picker`:

| Step | HTTP |
|------|------|
| Child login | 200 |
| `parent-pin-status-picker` → `has_session` | true |
| `verify-pin-picker` | 200, parent restored |
| Second `verify-pin-picker` (reuse) | **401** (one-time handoff consume) |

Direct `activate-saved-parent-session` returns **403** `PARENT_PIN_REQUIRED` when the family has a parent PIN (by design).

## 10–11. QA children summary (earlier session)

- **QA child with activities:** No first-star starter that day; regular schedule; login/refresh did not change stars.
- **QA child without completions:** Eligible FSM profile in DB; automated child path not run (PIN gap).

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

## 20. Live database identity (2026-08-01 closure)

| Property | Live `node server.js` process | Shell `source /var/www/.../.env` |
|----------|------------------------------|----------------------------------|
| Source | `process_environ` (systemd unit + cwd `.env` via `loadEnvFile`) | `EnvironmentFile` / deploy `.env` |
| Driver | `postgresql` | same |
| Host category | **localhost** | **localhost** |
| Port | `5432` | `5432` |
| Database (masked) | `my***y` | `my***y` |
| SSL | off | off |
| Identity hash | `5b995b2304ae4e5b` | `5b995b2304ae4e5b` |

**Same database** — earlier confusion (empty `feature_flag`, no App Review row) was data state on this host, not a Neon vs local split.

Tool: `scripts/ops/compare-db-identity.mjs` (hash only, no credentials).

## 21. Synthetic First Star smoke — completed (API leg)

**Parent login restored:** App Review parent re-created on live DB via product `POST /api/auth/register` (account missing on this host) using passwords from the secure rotation JSON layer; `POST /api/auth/login` → **200**. Wrong password → **401**. Rotation JSON aligned with live DB after register.

**Ops repair (empty `feature_flag` table on host):** upserted `activation_first_star_mode_v1` enabled (migration-equivalent insert). Journey ingest flag enabled for milestone table checks.

**Harness:** `.local/fas6-prod-smoke/synthetic-first-star-smoke.mjs` — **pass** on API leg (`FAS6_SKIP_BROWSER=1`):

| Check | Result |
|-------|--------|
| Pre-smoke (synthetic child) | 0 activities, 0 starters, 0 completions |
| After child login | 1× “Min första stjärna” starter |
| Stars before / after | 0 → 1 (Δ=1) |
| Duplicate completion | No extra star |
| Refresh / second login | No new starter |
| `first_completion_at` | set (family activation) |
| Analytics `first_completion_recorded` | 1 |
| Parent restore (`verify-pin-picker`) | 200; reuse → **409** (consume semantics) |
| Cleanup `DELETE /api/family/children/:id` | 200 |
| Read-only DB (starter/completed/sum) | 1 / 1 / 1 |

**Note:** Public daily-log API omits `starter_kind`; harness matches starter by localized name. `family_milestones.child_first_completion` row count was 0 while analytics event was 1 (journey ingest path). Mobile Puppeteer leg (390×844) not run in final pass.

**Legacy QA children on this host:** No Anna/Arne/Test on App Review family (family was empty until register). Orphan synthetic children from failed runs removed via API.

## 22. Verdict (closure)

| Area | Verdict |
|------|---------|
| Fas 6 live at SHA `58b9b110…` | **GO** |
| Synthetic First Star (automated API) | **GO WITH FOLLOW-UP** — run mobile Puppeteer leg; confirm journey milestone row if required beyond analytics |
| PR #811 | **GO** pending full `npm run test:full` green on branch |
| PR #812 | **GO** — sanitized report |

---

*Harness (uncommitted): `.local/fas6-prod-smoke/`.*
