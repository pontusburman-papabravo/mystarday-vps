# RC1 Release Checklist

**Release Candidate:** RC1 · **PRs:** #401, #396, #400, #402 · **Base:** `d692088`  
**Decision:** **BLOCKED** — integration required before merge to `main`.

---

## Consistency matrix (verified 2026-06-30)

| Area | #401 | #396 | #400 | #402 | RC1 integration |
|------|------|------|------|------|-----------------|
| **Merge order** | 1st | 2nd | 3rd | 4th | See §Merge order |
| **Migrations** | — | `180896` | `180895` | `180900` | **BLOCKER:** `180895`/`180896` clash on `child_progression_node` |
| **Migration apply order** | — | — | — | — | `180895` → `180896` → `180900` (timestamps) |
| **package.json** | `test:gate:unit` + `test:gate:db` | flat `test:gate` + 11 platform-engine tests | flat + 5 runtime/e2e tests | flat + `journey-first-week.test.js` | Union all; use #401 split |
| **`.npmrc`** | `legacy-peer-deps=true` | — | — | — | Take #401 |
| **sw.js** | v407 | v407 | v409 | v409 | **Sync** to one value (e.g. `stjarndag-v410`) |
| **cache-version.json** | v406 | v406 | v409 ✓ | v406 ✗ | **#402 mismatch** — must match sw.js |
| **`platform_runtime_enabled`** | — | — | seeds `false`, `ON CONFLICT DO NOTHING` | — | Post-migrate: **false** |
| **`family_journey_first_week_v1`** | — | — | — | seeds `false`, `ON CONFLICT DO NOTHING` | Post-migrate: **false** |
| **Journey registry** | — | — | `2026-06-28-v1` | `2026-06-30-first-week-v1` + `fw_*` keys | #402 supersedes version; no key collision |
| **Experience Pack** | — | — | `config/experience-packs/child_se/` | — | Inert when runtime OFF |
| **Platform Engine** | — | `src/platform-engine/` skeleton | — | — | Unused until runtime ON |
| **Platform Runtime** | — | — | `src/lib/platform-runtime/` | — | `handleActivityComplete` → `{ skipped, reason: 'runtime_disabled' }` when OFF |
| **Journey (first week)** | — | — | — | evaluator + UI behind `first_week_v1` | No `first_week` block when OFF |
| **Git conflicts** | — | vs #400 on `package.json` | vs #401, #396, #402 | vs #400 on `context-builder`, `journey-context-client`, `sw.js`, `package.json` | Integration branch required |

---

## Pre-merge (integration branch)

- [ ] Branch `rc1/integration` from `main`
- [ ] Merge in order §Merge order; resolve all conflicts
- [ ] **Unify `child_progression_node`:** keep #400 schema (`180895`); drop or no-op #396 `180896` CREATE TABLE
- [ ] Merge `package.json` `test:gate` = #401 split + all unique test files from #396/#400/#402
- [ ] Align `public/sw.js` **and** `config/cache-version.json` to same `CACHE_NAME`
- [ ] `npm run migrate` on clean DB — no errors
- [ ] `NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:gate` — green (email keys unset)
- [ ] `node --test test/migration-rollback-gate.test.js` — green

---

## Merge order

| Step | PR | Rationale |
|------|-----|-----------|
| 1 | **#401** Foundation & CI | `.npmrc`, split `test:gate`, route-inventory CI. Safe alone. |
| 2 | **#396** Platform Engine | Library only. **Resolve `180896` vs #400 before step 3.** |
| 3 | **#400** Proof of Product | Runtime, Experience Pack, Journey hooks. Needs CI from #401. |
| 4 | **#402** First Week | Extends Journey; lands after #400 (`context-builder` overlap). |

---

## Feature flags — must be OFF after all migrations

```sql
SELECT key, enabled FROM feature_flag
WHERE key IN ('platform_runtime_enabled', 'family_journey_first_week_v1');
-- Expected: both false (or rows absent → code defaults disabled)
```

| Flag | Migration | Default | Re-migrate safety |
|------|-----------|---------|-------------------|
| `platform_runtime_enabled` | `180895` (#400) | `false` | `ON CONFLICT DO NOTHING` — never auto-enables |
| `family_journey_first_week_v1` | `180900` (#402) | `false` | `ON CONFLICT DO NOTHING` — never auto-enables |

Also set the platform runtime env kill-switch to off on server (overrides DB).

---

## Legacy flows — flags OFF (expected unchanged)

| Flow | Verification | Expected |
|------|--------------|----------|
| **Legacy Journey** | `GET /api/me/journey-context` | Existing evaluator/coach/celebration paths; no `first_week` block |
| **Legacy onboarding** | New registration | Wizard unchanged; no first-week banner |
| **Legacy child** | Child login + complete activity | Stars/celebration work; no platform feedback |
| **Legacy parent** | Hem dashboard | No first-week banner; activation banner if enrolled |
| **Platform Runtime** | Activity complete | `skipped: true, reason: 'runtime_disabled'`; API 503 |
| **Activation overlap** | Enrolled + first week OFF | Activation banner visible (no suppression) |

Covered by tests: `platform-runtime-flag.test.js` (#400), `journey-first-week.test.js` flag-OFF cases (#402).

---

## Post-merge & live smoke (~15 min, flags OFF)

- [ ] GitHub Actions green on `main`
- [ ] Deploy; confirm `npm run migrate` on server
- [ ] Re-run flag SQL — both **false**
- [ ] `GET /health` → healthy
- [ ] Parent login → Hem loads, no console errors
- [ ] Child login → complete activity → parent ack/celebration
- [ ] Schedule edit → save → reload OK
- [ ] Admin → families list loads

---

## Rollback

| Level | Action |
|-------|--------|
| Instant | `UPDATE feature_flag SET enabled = false WHERE key IN ('platform_runtime_enabled', 'family_journey_first_week_v1')` |
| Runtime kill | Set platform runtime env override to off in server `.env`; restart app service |
| Code | Revert merge on `main`; redeploy |
| DB | Do **not** roll back migrations on live — flags OFF is sufficient |

---

## Decision

### BLOCKED

RC1 cannot ship as four independent merges to `main`.

**Blockers**

1. **`child_progression_node` schema clash** — #400 (`UUID` PK, `family_id`, `UNIQUE(child_id,node_id)`) vs #396 (`PK(child_id,world_slug,node_id)`). `CREATE TABLE IF NOT EXISTS` → first migration wins; other code breaks.
2. **Git conflicts** — `package.json` (all four); `context-builder.js`, `journey-context-client.js`, `sw.js` (#400+#402).
3. **No integration branch** with combined green `test:gate`.
4. **SW/cache mismatch** on #402 — `sw.js` v409, `cache-version.json` v406.

**Path to READY:** integration branch → resolve blockers → green gate → deploy flags OFF → §Live smoke → **READY**.

**Merge now:** **#401 only** (no RC1 product dependency).  
**Hold:** **#396, #400, #402** until integration PR lands.

---

## Executive review

| Role | Verdict | Blockers | Follow-ups |
|------|---------|----------|------------|
| **CTO** | **Concern** | Dual `child_progression_node` migration — pick #400 schema; #396 PgStore deferred until unified | Single authoritative progression table before any runtime enable |
| **Release Manager** | **BLOCKED** | No integration branch; migration clash; merge conflicts; SW/cache drift on #402 | Ship #401 alone; RC1 ships as one integration PR |
| **QA Director** | **Concern** | Combined `test:gate` never run on integrated tree | Constitution test when flags enabled on staging only |
| **Security Lead** | **Approve** | — | Post-merge: confirm `platform-feedback` returns 503 when runtime OFF; child scope unchanged |

**Recommendation:** Merge **#401** now. Block **#396+#400+#402** until integration resolves migration + conflicts. Target **READY** after one green integration deploy with both flags OFF.

---

*Owner: Release Manager · POS: 13 REL, 15 Q-05 · 2026-06-30*
