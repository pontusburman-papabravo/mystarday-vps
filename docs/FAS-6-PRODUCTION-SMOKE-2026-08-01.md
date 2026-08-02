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
| Database (masked) | `***` (deploy `.env`) | same |
| SSL | off | off |
| Identity hash | `5b995b2304ae4e5b` | `5b995b2304ae4e5b` |

**Same database identity** for app process and `.env` on this host — but **not** evidence that this is the historical prod-tier dataset (see §23).

Tool: `scripts/ops/compare-db-identity.mjs` (hash only, no credentials).

## 23. Live data provenance (2026-08-02) — **P0** <!-- pragma: allowlist secret -->

Read-only SQL on live VPS PostgreSQL (`localhost:5432`, identity hash `5b995b2304ae4e5b`, DB size ~15 MB):

| Metric | Count |
|--------|------:|
| Families | 4 |
| Parents | 4 |
| Children | 2 (after smoke orphans cleaned) |
| Weekly schedules | 5 |
| Daily logs | 3 |
| `_migrations` | 132 |
| `feature_flag` rows | 2 (ops-upserted keys only at time of first audit) |

| Signup window (family `created_at`) | Value |
|-------------------------------------|--------|
| Oldest | 2026-08-01 (evening UTC) |
| Newest | 2026-08-01 (evening UTC) |

Latest migration names (sample): `1810110000000_first_star_starter_kind`, `1810100000000_handoff_refresh_fk_set_null`, `1810000000018_parent_session_handoff`.

**Backup / restore:** No application Postgres backup artifacts found under deploy home or `/var/backups` in read-only inspection (only system package backups). **No verified restore timestamp** on this host.

**Conclusion:** Live code at SHA `58b9b110…` serves the public App Review hostname, but the attached database looks like a **fresh local Postgres** seeded from registrations/smoke on **2026-08-01**, not the long-lived Neon-scale dataset referenced in older ops docs (~200+ families). Treat as **P0 data provenance** until backup/restore or provider cutover is documented. **No restore performed in this task.** <!-- pragma: allowlist secret -->

## 24. Feature-flag seed root cause (2026-08-02)

| Question | Finding |
|----------|---------|
| Which migration seeds flags? | Many migrations `INSERT INTO feature_flag … ON CONFLICT DO NOTHING` (e.g. `1809170000000_activation_first_star_mode_flag`, `1808920000000_family_journey` for `family_journey_ingest_enabled` default **off**) |
| Registered in `_migrations`? | **Yes** — 132 applied |
| Why empty table on VPS? | Migrations **do not re-run** when name exists in `_migrations` (`migrate.js`). A **truncate/wipe of `feature_flag` without clearing `_migrations`** leaves zero rows and skips seed `up()` |
| Deploy script skips seed? | **No** — `npm run migrate` runs migration `up()` only for **new** names |
| Flags deleted? | Possible data loss / fresh DB; not a missing migration registration |
| Ops upsert vs migration? | Manual upserts repaired smoke but are **not** the long-term fix |

**Fresh database:** First-time migrate on empty `_migrations` runs all `up()` and inserts default flag rows. **Repair gap:** already-migrated DB with empty `feature_flag` needs a documented ops repair migration or one-shot re-seed — **no new fix PR** in this closure (normal fresh deploy path is sound). **No further manual upserts** in this task after audit.

## 25. Journey milestone semantics (2026-08-02)

After synthetic completion on live host:

| Source | State |
|--------|--------|
| `family_activation_state.first_completion_at` | **Set** |
| Analytics `first_completion_recorded` | **1** |
| `family_milestones.child_first_completion` | **0** when `family_journey_ingest_enabled` was off at completion time |

**Canonical for Fas 6 First Star:** activation state + analytics (`tryAtomicFirstCompletionInTx` / `emitFirstCompletionRecorded` in `src/lib/activation-first-completion.js`). **`family_milestones` row is optional** — created only when `family_journey_ingest_enabled` is on via `ingestMilestoneAsync` (`src/lib/journey/ingest.js`). Smoke harness **does not** require `milestone_count > 0` for pass.

## 26. Synthetic First Star — Puppeteer leg (2026-08-02)

Harness: `.local/fas6-prod-smoke/synthetic-first-star-smoke.mjs` with `FAS6_SKIP_BROWSER=0`, viewport **390×844**, Mobile Safari UA, rotation creds from deploy rotation JSON (not logged).

**Run `fas6-ui-final-1785649204` — `pass: true`, `uiPass: true`**

| Timing | ms |
|--------|---:|
| Child login → usable Idag (`/child/today`, one starter visible) | 6631 |
| Tap → first visual response | 1 |
| Tap → completed UI state | 771 |

| UI check | Result |
|----------|--------|
| One “Min första stjärna” | Yes |
| Star balance 0 → 1 | Yes |
| Double tap / refresh / re-login | No extra star / starter |
| Parent handoff | `verify-pin-picker` 200; reuse 409 |
| Uncaught page errors | 0 |
| HTTP 5xx on golden-path APIs | 0 |
| Harness API calls (post-UI) | 13 (no duplicate complete on golden path; UI completed first) |

**DB read-only snapshot (pre-delete):** starter 1 / completed 1 / star sum 1; analytics 1; `first_completion_at` set; milestone row 0 (ingest gating as above).

## 27. PR status (2026-08-02)

| PR | Branch | CI | Recommendation |
|----|--------|-----|----------------|
| #811 | `cursor/stabilize-fas6-concurrency-ci-01b8` | **SUCCESS** (mergeable) | **GO** — merge to fix CI `40P01` flake; test-only fixture retry |
| #812 | `cursor/fas6-prod-smoke-report-01b8` | **SUCCESS** (mergeable) | **GO** — sanitized report including this closure |

`main` at `58b9b110` (merge #809). Post-#811 merge, re-run CI on `main` expected green.

## 28. Verdict (Fas 6 closure 2026-08-02)

| Area | Verdict |
|------|---------|
| Live app SHA + golden path (API + Puppeteer) | **GO** |
| Live **data** provenance on VPS DB | **NO-GO (P0)** — stub dataset; backup/restore not verified |
| Feature-flag repair on migrated-empty table | **GO WITH FOLLOW-UP** — document ops repair; fresh migrate OK |
| Journey milestone acceptance | **Clarified** — activation + analytics canonical |
| PR #811 | **GO** merge |
| PR #812 | **GO** merge |
| **Fas 6 “helt klar”** | **GO WITH FOLLOW-UP** — blocked on data provenance + ops flag repair doc; product smoke green | <!-- pragma: allowlist secret -->

---

*Harness (uncommitted): `.local/fas6-prod-smoke/`.*
