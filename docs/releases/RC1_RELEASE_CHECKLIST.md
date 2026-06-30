# RC1 Release Checklist

**Release Candidate:** RC1 (Foundation, Platform, PoP, First Week)  
**PRs:** GitHub #401, #396, #400, #402  
**Decision:** **BLOCKED** — see §Decision. Use this checklist on the **integration branch** before merging to `main`.

---

## Pre-merge

### Integration branch (required)

- [ ] Create `rc1/integration` from `main`
- [ ] Merge PRs in order below; resolve conflicts (do not merge PR-by-PR to `main` without this step)
- [ ] Resolve `child_progression_node` migration conflict (#396 `180896` vs #400 `180895`) — **one schema only**
- [ ] Merge `package.json` `test:gate` = union of all four PR test files + #401 split (`test:gate:unit` + `test:gate:db`)
- [ ] Set `public/sw.js` **and** `config/cache-version.json` to same `CACHE_NAME` (use `stjarndag-v410` or higher after integration)
- [ ] Run `npm run migrate` on clean DB — all migrations apply without error
- [ ] Run `npm run test:gate` per root `AGENTS.md` (test env, email keys unset) — green
- [ ] `node --test test/migration-rollback-gate.test.js` — green

### Per-PR gates (verify on integration branch)

| PR | Gate |
|----|------|
| #401 | `.npmrc` has `legacy-peer-deps=true`; CI `npm ci` succeeds |
| #396 | `node --test test/platform-engine/*.test.js` — 43 pass |
| #400 | `platform_runtime_enabled` migration seeds `enabled = false` |
| #402 | `family_journey_first_week_v1` migration seeds `enabled = false` |

### Feature flags — must be OFF before deploy

```sql
SELECT key, enabled FROM feature_flag
WHERE key IN ('platform_runtime_enabled', 'family_journey_first_week_v1');
-- Expected: both false
```

- [ ] `platform_runtime_enabled` = **false** (not auto-enabled by migration)
- [ ] `family_journey_first_week_v1` = **false**
- [ ] Runtime kill-switch env var set to `false` on server `.env` (env overrides DB per #400)

---

## Merge order

| Step | PR | Why |
|------|-----|-----|
| 1 | **#401** Foundation & CI | No product surface; fixes gate/CI for all following merges. Supersedes #398/#399. |
| 2 | **#396** Platform Engine | Library skeleton (`src/platform-engine/`). **Must reconcile migration `180896` with #400 before step 3** — see §Blockers. |
| 3 | **#400** Proof of Product | Runtime integration, Experience Pack, Journey hooks. Depends on stable CI (#401). |
| 4 | **#402** First Week | Extends Journey evaluator/UI; conflicts with #400 in `context-builder.js` (trivial). Must land after #400. |

**Do not merge #400 before #396 migration is resolved.**  
**Alternative:** Hold #396 migration; merge #396 code-only + #400 + #402 (PgStore in #396 unused until unified).

---

## Post-merge (to `main`)

- [ ] GitHub Actions green on `main`
- [ ] Deploy via normal merge-to-main pipeline
- [ ] `npm run migrate` on server (or confirm deploy hook ran)
- [ ] Re-run flag SQL above on server — both **false**

---

## Live verification (flags OFF)

Expect **no user-visible change** when both flags are OFF.

| Check | Command / action | Expected |
|-------|------------------|----------|
| Health | `GET /health` | `healthy` |
| Legacy parent Hem | Log in as existing family | Dashboard loads; no first-week banner; no platform feedback |
| Legacy onboarding | New registration (staging) | Onboarding wizard unchanged |
| Legacy child | Child login + complete activity | Stars work; universe unchanged |
| Journey API | `GET /api/me/journey-context` | 200 or 503 per existing journey flags — not broken by deploy |
| Activation banner | Enrolled family on Hem | Legacy 7-day banner still works if enrolled |

---

## Feature flag verification (staging only — optional)

Only after integration tests pass. **Never enable both flags globally without runbook.**

| Flag | Enable on | Smoke | Disable after |
|------|-----------|-------|---------------|
| `platform_runtime_enabled` | Staging test account per FIRST-LIVE-ENABLE-CHECKLIST | Activity complete → progression feedback | ≤15 min; SQL OFF |
| `family_journey_first_week_v1` | Staging family post-`first_success` | Day 1 banner; day 7 reflection; activation banner hidden | SQL OFF |

Prerequisites for first week: `family_journey_evaluator_enabled`, `family_journey_context_api`, `family_journey_ingest_enabled`.

---

## Rollback

| Level | Action | Effect |
|-------|--------|--------|
| Instant | `UPDATE feature_flag SET enabled = false WHERE key IN ('platform_runtime_enabled', 'family_journey_first_week_v1')` | New behavior off; legacy paths resume |
| Runtime kill | Set runtime kill-switch env var to `false` in `.env`; restart app service | #400 runtime hard-off |
| Deploy | Revert merge commit on `main`; redeploy | Full code rollback |
| DB | Do **not** roll back migrations on live without ADR — flags OFF is sufficient | Milestones/tables remain inert |

---

## Smoke tests (human, ~15 min, flags OFF)

1. Parent login → Hem loads, no errors in console  
2. Child login → complete one activity → parent sees ack/celebration (existing journey)  
3. Schedule edit → save → reload OK  
4. Admin login → families list loads  
5. `GET /health` on live host → healthy  

---

## Decision

### BLOCKED

RC1 is **not merge-ready** as four independent PRs to `main`.

**Blockers**

1. **Migration conflict:** `180895` (#400) and `180896` (#396) define incompatible `child_progression_node` schemas (different PK/constraints). Cannot apply both on one database without reconciliation.
2. **Git conflicts:** `package.json` conflicts across #401+#396+#400+#402; `context-builder.js` conflicts #400+#402.
3. **No integration branch** with combined `test:gate` green yet.
4. **Minor:** #402 bumps `sw.js` to v409 but leaves `cache-version.json` at v406 — fix on integration (breaks `check:css` if uncorrected).

**Path to READY**

1. Open integration branch; merge in order §Merge order.  
2. Unify `child_progression_node` to #400 schema (authoritative for runtime); drop or rewrite #396 migration `180896`.  
3. Green `test:gate` + migration rollback gate.  
4. Deploy with both flags OFF; run §Live verification.  
5. Change decision to **READY**.

**Safe to merge now (isolated):** **#401 only** — no RC1 product dependency.

**Hold until integration:** **#396, #400, #402** — merge together or in order after blocker #1 resolved.

---

## Executive review (RC1)

| Role | Verdict | Blockers | Non-blocking follow-ups |
|------|---------|----------|-------------------------|
| **CEO** | Concern | RC1 not shippable as four parallel merges | Integration branch + single green gate before any product flag ON |
| **CTO** | Concern | `child_progression_node` dual migration | Pick #400 schema; defer #396 PgStore until unified |
| **Release Manager** | **BLOCKED** | No integration branch; merge conflicts; migration clash | #401 may merge alone; RC1 docs in `docs/releases/` |
| **QA Director** | Concern | Combined `test:gate` not run on integration | Full constitution test when flags enabled on staging |
| **Security Lead** | Approve | — | Verify platform-feedback API returns 503 when runtime OFF post-merge |
| **Parent Experience Lead** | Approve (conditional) | — | Confirm activation/first-week mutual exclusion on integration smoke |

**Recommendation:** Merge **#401** now. Block **#396+#400+#402** until integration PR resolves migration + conflicts. Target **READY** after one green integration deploy with flags OFF.

---

*Owner: Release Manager · POS: 13 REL, 15 Q-05 · Updated: 2026-06-30*
