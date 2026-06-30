# RC1 Executive Summary

**Date:** 2026-06-30  
**Release Manager review**  
**Recommendation:** **NOT READY TO MERGE**

---

## 1. Merge order

### Git merge sequence (after blocker fix)

| Order | PR | Title | Conflicts vs prior |
|-------|-----|-------|-------------------|
| 1 | [#401](https://github.com/pontusburman-papabravo/mystarday-vps/pull/401) | Foundation & CI | None vs `main` |
| 2 | [#396](https://github.com/pontusburman-papabravo/mystarday-vps/pull/396) | Platform Engine v1 | `package.json` vs #401 |
| 3 | [#400](https://github.com/pontusburman-papabravo/mystarday-vps/pull/400) | Proof of Product / Platform Runtime | `package.json`, journey files |
| 4 | [#402](https://github.com/pontusburman-papabravo/mystarday-vps/pull/402) | First Week Experience | `context-builder.js`, `journey-context.js`, `dashboard.html`, `sw.js`, registry |

**Why #401 first:** Establishes split `test:gate:unit` / `test:gate:db`, fixes `journey-route-scope` assertion and DB advisory-lock leak. Without it, monolithic gate on #400 hangs (~5+ min, no completion observed).

**Why #402 last:** Highest overlap with #400 on Journey surfaces; depends on registry and milestone index from both branches.

### Migration order (timestamp — not reorderable by git)

```
180895  platform_runtime          (#400)  — child_progression_node + feedback tables + platform_runtime_enabled
180896  child_progression_node    (#396)  — CONFLICT: duplicate table, incompatible schema
180900  journey_first_week        (#402)  — registry seed + family_journey_first_week_v1
```

**Order change required:** Migration timestamps cannot be swapped without a new ADR/migration. **#396 migration 180896 must be reconciled with #400 migration 180895** — not a git merge-order problem.

---

## 2. Deployment order

1. Clear RC1 blockers on integration branch
2. Merge #401 → #396 → #400 → #402 to `main`
3. CI `test:gate` green
4. Auto-deploy to VPS via GitHub Actions
5. `npm run migrate` applies pending migrations (180895, 180896, 180900)
6. Verify `GET /health`
7. SQL: both RC1 flags `enabled = false`
8. Bump SW/cache-version aligned (single version)

**No flag activation at deploy.** First live enable is a separate ops window per `docs/first-success/FIRST-LIVE-ENABLE-CHECKLIST.md`.

---

## 3. Production impact

| Area | Impact at deploy (flags OFF) |
|------|------------------------------|
| User-facing UX | **None** — new paths gated by feature flags |
| Database | 3 new migrations; 2 new tables (`progression_feedback`, `progression_event_queue`); `child_progression_node` created; registry rows seeded (inactive) |
| API | New routes (`/api/me/platform-feedback`) return 503 when runtime OFF |
| Static assets | New JS (`platform-feedback-child.js`); SW cache bump required |
| Performance | Negligible — runtime short-circuits before DB work when OFF |
| CI | Faster gate (~5s unit + ~8s db on #401); unified gate TBD post-merge |

---

## 4. Feature flag status

| Flag | Post-migrate default | Auto-enable? | Emergency off |
|------|---------------------|--------------|---------------|
| `platform_runtime_enabled` | `false` | **No** (`ON CONFLICT DO NOTHING`) | `UPDATE … false` + `PLATFORM_RUNTIME_ENABLED=false` |
| `family_journey_first_week_v1` | `false` | **No** (`ON CONFLICT DO NOTHING`) | `UPDATE … false` |

**Verified in code (#400):**

- `isRuntimeEnabled()` → `false` when flag missing/disabled
- `handleActivityComplete` → `{ skipped: true, reason: 'runtime_disabled' }`
- `enrichCelebrationCopy` → no-op when runtime OFF
- `platform-feedback` routes → 503

**Verified in code (#402):**

- `buildFirstWeekContext` only when `isFlagEnabled(FLAG_KEYS.firstWeekV1)`

---

## 5. Rollback readiness

| Scenario | Procedure | Ready? |
|----------|-----------|--------|
| Runtime misbehaviour | SQL flag OFF (instant) | **Yes** |
| First-week misbehaviour | SQL flag OFF (instant) | **Yes** |
| Schema rollback | `down()` on 180900 → 180896 → 180895 | **Partial** — 180896 `down()` drops `child_progression_node` shared with 180895 |
| Code rollback | Revert merge on `main` + redeploy | **Yes** (standard) |
| Cache rollback | Prior SW version serves until clients refresh | **Yes** |

**Gap:** Dual ownership of `child_progression_node` in migrations 180895 and 180896 makes sequential rollback ambiguous. Reconcile to single migration before RC1.

---

## 6. Known risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `child_progression_node` schema conflict | **Critical** | Remove/replace 180896; align Platform Engine store to 180895 |
| `test:gate` not unified across 4 PRs | **High** | Merge into #401 split gate with full file list |
| #400 gate hang without #401 | **High** | Merge #401 first |
| SW vs `cache-version.json` mismatch (#396 v406, #402 v406 vs SW v409) | **Medium** | Single bump at RC1 integration |
| `ON CONFLICT DO NOTHING` won't reset prod flag if already ON | **Medium** | Pre-deploy SQL verification |
| Journey merge conflicts (#400 + #402) | **Medium** | Manual merge + regression smoke |
| Platform Engine `PgProgressionStore` INSERT incompatible with 180895 | **Critical** | Store + tests must match 180895 before any runtime enable |

---

## 7. Remaining blockers

### BLOCKER-1: `child_progression_node` schema authority

**180895 (#400) creates:**

- PK: `id` UUID
- Columns: `family_id`, `world_slug`, `node_id`, `node_type`, `pack_config_key`, …
- Unique: `(child_id, node_id)`

**180896 (#396) expects:**

- PK: `(child_id, world_slug, node_id)`
- Columns: `child_id`, `world_slug`, `node_id`, `metadata` only
- `PgProgressionStore.unlock` uses `ON CONFLICT (child_id, world_slug, node_id)`

When both merge, **180895 always runs first**. 180896 is a no-op. Platform Engine DB tests and `PgProgressionStore` **will fail** against the 180895 schema.

**Minimal fix (no new product logic):**

1. Delete `migrations/1808960000000_child_progression_node.js` from #396
2. Update `src/platform-engine/progression/store.js` `PgProgressionStore` to match `db/child-progression-node.js` (#400)
3. Update `test/platform-engine/merge-readiness.test.js` and `platform-integration.test.js` schema assertions
4. Document 180895 as sole schema authority (ADR-004 reference update if needed)

### BLOCKER-2: Unified `test:gate` on merged RC1

Branches ship incompatible gate definitions:

| Branch | Gate shape | Test count |
|--------|------------|------------|
| #401 | `test:gate:unit` + `test:gate:db` | Split, ~16+ files |
| #396 | Monolithic | 32 files (platform-engine/*) |
| #400 | Monolithic | 24 files (runtime/e2e) |
| #402 | Monolithic | 20 files (journey-first-week) |

Integration branch must combine #401 infrastructure with all RC1 test files. Not verified green.

### BLOCKER-3: Git merge conflicts (#400 ↔ #402)

Simulated merge shows conflicts in `package.json`, `context-builder.js`, `journey-context.js`, `sw.js`, registry/evaluator files. Unresolved on any integration branch.

---

## 8. Legacy safety analysis (flags OFF)

| Surface | Safe? | Evidence |
|---------|-------|----------|
| Onboarding | **Yes** | No RC1 changes to onboarding routes in scope |
| Parent dashboard | **Yes** | First-week block skipped; runtime enricher skipped |
| Child dashboard | **Yes** | `handleActivityComplete` no-op; feedback 503 |
| Journey | **Yes** | Evaluator unchanged; new registry rows inactive |
| Parent ack | **Yes** | Gated by existing `parent_ack_v1`, not RC1 flags |
| Celebration | **Yes** | No `celebration_copy` when runtime OFF |
| First success | **Yes** | Milestone write unchanged |
| Experience Packs | **Yes** | Pack files loaded only inside gated runtime path |

**Caveat:** Safety holds for **flag OFF** deploy. Enabling `platform_runtime_enabled` without BLOCKER-1 fix risks DB errors on progression unlock.

---

## 9. Observability (first activation)

No new telemetry in RC1. Ops should use existing logs:

| Source | Patterns |
|--------|----------|
| Server | `[platform-runtime]`, `[platform-feedback]`, `[journey-context]`, `[journey-flags]` |
| Client | `[platform-feedback] fetch failed` (console, child dashboard) |
| SQL | `feature_flag` rows; `progression_event_queue` pending count |

**Immediate rollback triggers:**

- `[platform-runtime] activity complete error` spike
- 5xx rate increase on `/api/journey/context` or child completion
- User reports of double celebration / broken Hem

**Reference:** `docs/first-success/FIRST-LIVE-ENABLE-CHECKLIST.md`, `docs/first-success/PLATFORM-RUNTIME-PROD-SAFE-VALIDATION.md`

---

## 10. Executive sign-off

| Role | Verdict | Motivation |
|------|---------|------------|
| **CTO** | **BLOCKED** | Incompatible migrations for same table; technical debt if merged as-is |
| **Release Manager** | **BLOCKED** | Merge conflicts unresolved; no integrated RC1 branch; checklist § A incomplete |
| **QA Director** | **BLOCKED** | `test:gate` not run green on merged artifact; #400 branch gate hung without #401 |
| **Security Lead** | **APPROVED** | Flags default OFF; env kill switch; no new auth surface; child scope server-enforced |
| **Parent Experience Lead** | **CONDITIONAL APPROVE** | Legacy UX preserved when flags OFF; cannot sign full RC1 until merged smoke |

---

## 11. Final recommendation

### **NOT READY TO MERGE**

RC1 delivers valuable infrastructure (#401), Platform Engine skeleton (#396), Platform Runtime (#400), and First Week Journey (#402) — all correctly gated behind OFF-by-default flags. However, **two migrations define the same table differently**, git conflicts between #400 and #402 are unresolved, and no branch has a green unified `test:gate`.

### Minimum path to READY

1. Resolve BLOCKER-1 on #396 (drop 180896, align store/tests to 180895) — **~1 focused PR**
2. Create `cursor/rc1-integration-a43c` merging #401 → #396 → #400 → #402; resolve conflicts; unify gate + SW/cache
3. Green `test:gate` on integration branch
4. Re-run this checklist § B–G
5. Executive re-sign → **READY TO MERGE**

**Estimated scope:** Integration + schema reconciliation only. No new product logic, copy, or telemetry.

---

## Self-review

```
Self-review: PE ✓ Mobile N/A CPO ✓ UX ✓ Game ✓ QA ✗ Security ✓ AISA ✓
Issues found: child_progression_node schema conflict; test:gate fragmentation; merge conflicts
POS governed by: 15 deploy safety, PA-01 Journey authority, G-01 reality before celebration
```
