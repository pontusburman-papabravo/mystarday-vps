# RC1 Release Checklist

**Release:** RC1 (Foundation + Platform Engine + Proof of Product + First Week)  
**PRs:** [#401](https://github.com/pontusburman-papabravo/mystarday-vps/pull/401) · [#396](https://github.com/pontusburman-papabravo/mystarday-vps/pull/396) · [#400](https://github.com/pontusburman-papabravo/mystarday-vps/pull/400) · [#402](https://github.com/pontusburman-papabravo/mystarday-vps/pull/402)  
**Status:** **NOT READY** — see [RC1_EXECUTIVE_SUMMARY.md](./RC1_EXECUTIVE_SUMMARY.md) § Remaining blockers

---

## A. Pre-merge gates

### A1. Merge order (git)

| Step | PR | Branch | Rationale |
|------|-----|--------|-----------|
| 1 | #401 | `cursor/foundation-test-ci-dx-a43c` | CI/test infra; no product migrations; fixes gate hangs |
| 2 | #396 | `cursor/platform-engine-v1-5889` | Platform Engine skeleton; **requires schema reconciliation before merge** |
| 3 | #400 | `cursor/first-success-journey-683a` | Platform Runtime tables + flag; depends on unified `child_progression_node` |
| 4 | #402 | `cursor/first-week-experience-53a1` | Journey first-week; conflicts with #400 journey files — merge last |

**Migration timestamp order (fixed, independent of git merge order):**

```
1808950000000_platform_runtime.js      (#400)
1808960000000_child_progression_node.js (#396)  ← BLOCKER: schema conflict with 180895
1809000000000_journey_first_week.js    (#402)
```

### A2. Schema reconciliation (BLOCKER)

- [ ] **Resolve `child_progression_node` authority** — 180895 (#400) and 180896 (#396) define incompatible schemas
- [ ] **Remove or replace migration 180896** — if 180895 runs first, 180896 `CREATE IF NOT EXISTS` is a no-op but code/tests expect 180896 PK `(child_id, world_slug, node_id)`
- [ ] **Align `PgProgressionStore`** (#396) with 180895 columns: `family_id`, `node_type`, `pack_config_key`, `UNIQUE (child_id, node_id)`
- [ ] **Update `merge-readiness.test.js`** schema assertions (currently expects 180896 PK)

### A3. Merge conflict resolution

- [ ] `package.json` — unify `test:gate:unit` + `test:gate:db` (#401) with all RC1 test files (#396 platform-engine/*, #400 experience-pack/platform-runtime/*, #402 journey-first-week)
- [ ] `public/sw.js` + `config/cache-version.json` — single bumped version (both must match)
- [ ] `src/lib/journey/context-builder.js` — #400 runtime enricher + #402 first-week block
- [ ] `src/routes/journey-context.js` — runtime response fields (#400) + first-week (#402)
- [ ] `config/journey-experience-registry.json` — registry seeds from #400 and #402
- [ ] `public/dashboard.html` — script includes from both PRs

### A4. Tests

- [ ] `NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate` green on **merged RC1 branch**
- [ ] `npm run migrate` on fresh DB applies 180895 → 180896 → 180900 without error
- [ ] `test/migration-rollback-gate.test.js` passes (latest migration `down()` exists)
- [ ] Platform Engine tests pass against **180895** schema (not 180896-only assumptions)
- [ ] Platform Runtime tests pass (`platform-runtime-flag`, `platform-runtime-integration`, `first-success-journey-e2e`)
- [ ] First-week tests pass (`journey-first-week.test.js`) with flag OFF by default

---

## B. Feature flag safety (post-merge, pre-deploy)

Both flags **must** be OFF after migrate. No automatic UX activation.

```sql
SELECT key, enabled FROM feature_flag
WHERE key IN ('platform_runtime_enabled', 'family_journey_first_week_v1');
-- Expected: both enabled = false
```

| Flag | Migration | Default | Kill switch |
|------|-----------|---------|-------------|
| `platform_runtime_enabled` | 180895 (#400) | `false` (`ON CONFLICT DO NOTHING`) | `PLATFORM_RUNTIME_ENABLED=false` env wins |
| `family_journey_first_week_v1` | 180900 (#402) | `false` (`ON CONFLICT DO NOTHING`) | No env override — SQL only |

- [ ] Migration seeds verified on fresh DB
- [ ] `ON CONFLICT DO NOTHING` documented — **will not reset** an existing `enabled = true` row
- [ ] Pre-deploy SQL confirms both flags `false` (or explicit `UPDATE … false` if prod row already ON)

---

## C. Legacy path verification (both flags OFF)

No new user experience when flags are OFF. Manual or automated smoke:

| Surface | Expected when OFF | Verified |
|---------|-------------------|----------|
| Onboarding | Unchanged wizard flow | ☐ |
| Parent dashboard (Hem) | Existing Journey coach; no first-week experiences | ☐ |
| Child dashboard | Standard completion + celebration; no platform whisper | ☐ |
| Journey evaluator | Existing phase/milestone logic | ☐ |
| Parent acknowledgement | Existing ack flow (flag-gated by `parent_ack_v1`, not RC1 flags) | ☐ |
| Celebration | Standard `celebrate_first_success`; no `celebration_copy` enricher (#400 skips when runtime OFF) | ☐ |
| First success milestone | Unchanged milestone write | ☐ |
| Experience Packs | Pack resolution inert at runtime (`handleActivityComplete` → `{ skipped: true, reason: 'runtime_disabled' }`) | ☐ |
| `/api/me/platform-feedback` | 503 when runtime OFF | ☐ |

---

## D. Deployment readiness

### D1. Deploy sequence

1. Merge RC1 PRs to `main` (after blockers cleared)
2. GitHub Actions deploy → VPS (`systemctl restart` app service)
3. `npm run migrate` runs automatically or via deploy script
4. `sleep 3` → `curl -s http://127.0.0.1:3000/health` → `healthy`
5. Post-deploy SQL flag check (§ B)
6. Post-deploy `test:gate` not on prod VPS — CI only

### D2. Migrations

| Migration | `down()` | Rollback notes |
|-----------|----------|----------------|
| 180895 | Drops `progression_event_queue`, `progression_feedback`, `child_progression_node`; deletes `platform_runtime_enabled` | Safe if no runtime data relied upon |
| 180896 | `DROP TABLE child_progression_node` | **Unsafe after 180895** — drops table shared with runtime; prefer reconciling to single migration |
| 180900 | Removes `family_journey_first_week_v1`, registry rows, restores milestone index | Safe; no user data loss |

- [ ] Rollback runbook: flag OFF first (instant), migration rollback only if schema rollback required
- [ ] Latest migration exposes `down()` (G3c gate)

### D3. Cache / Service Worker

- [ ] `public/sw.js` `CACHE_NAME` matches `config/cache-version.json` `cacheName`
- [ ] Version bumped once at RC1 merge (recommend `stjarndag-v410` or next monotonic)
- [ ] SW precache list includes any new static assets (`platform-feedback-child.js`, etc.)
- [ ] No stale precache of removed scripts

### D4. Registries & Journey

- [ ] `journey_experience_registry` seeds from 180900 present but inactive until `family_journey_first_week_v1` ON
- [ ] `idx_family_milestones_once` includes `week_reflection_completed` (180900)
- [ ] Experience Pack config files present; runtime inert when flag OFF

---

## E. Observability (first activation — not part of RC1 deploy)

RC1 deploy keeps flags OFF. When ops later enables runtime (see `docs/first-success/FIRST-LIVE-ENABLE-CHECKLIST.md`):

### Logs to watch

```bash
sudo journalctl -u mystarday -S "30 min ago" --no-pager | rg 'platform-runtime|platform-feedback|journey-context|journey-flags'
```

| Log pattern | Action |
|-------------|--------|
| `[platform-runtime] activity complete error` | **Immediate rollback** — flag OFF + investigate |
| `[platform-runtime] flag DB error` | Runtime stays OFF (safe); fix DB connectivity |
| `[platform-feedback] child GET error` | Rollback runtime flag |
| `[journey-flags] DB error` | Journey degrades gracefully; investigate |
| `[platform-feedback] fetch failed` (client) | Expected when flag OFF or 503 |

### User-visible symptoms requiring rollback

- Double celebration / duplicate whisper toast
- Child dashboard error loop on completion
- Parent Hem blank or missing coach
- 5xx on `/api/journey/context` for all families

### Immediate rollback (no redeploy)

```sql
UPDATE feature_flag SET enabled = false WHERE key = 'platform_runtime_enabled';
UPDATE feature_flag SET enabled = false WHERE key = 'family_journey_first_week_v1';
```

Plus env `PLATFORM_RUNTIME_ENABLED=false` if set.

---

## F. Executive sign-off

| Role | Status | Notes |
|------|--------|-------|
| CTO | **BLOCKED** | `child_progression_node` schema conflict |
| Release Manager | **BLOCKED** | Merge conflicts + unified gate not verified |
| QA Director | **BLOCKED** | No green `test:gate` on merged RC1 |
| Security Lead | **APPROVED** | Flags default OFF; env kill switch; child scope unchanged |
| Parent Experience Lead | **CONDITIONAL** | Legacy paths gated; pending merged smoke |

---

## G. Sign-off (complete when all boxes checked)

- [ ] All § A blockers resolved
- [ ] § B flags confirmed OFF in target environment
- [ ] § C legacy smoke passed
- [ ] § D deploy checklist passed
- [ ] `test:gate` green on merged branch
- [ ] Executive summary recommendation: **READY TO MERGE**

**Release manager:** _______________ **Date:** _______________
