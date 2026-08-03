# Child Core Stability — PR #840 Merge Readiness Review

**Reviewer:** Independent Composer 2.5 session (hardening / merge-readiness)  
**Date:** 2026-08-03  
**Branch:** `cursor/stability-child-core-v1`  
**Draft PR:** #840 (repository default remote)  
**Base at review:** `origin/main` @ `93b68773`

---

## 1. Executive summary

PR #840 delivers targeted **child core journey stability**: delsteg completion hardening (in-flight, pending/error, offline queue), deterministic section ordering in schedule APIs, PIN keypad contrast, resilient SW precache, `/health.cache_version`, server-validated child session resume on `/child-login`, and ADR-019 stop-line for PIN-less trusted device.

**Independent re-verification:** full diff reviewed, negative/race paths mapped, gates re-run, browser harness re-run (390×844 + 412×915), one **security hardening fix** added during review (clear `OfflineQueue` on logout).

**Merge decision:** **CONDITIONAL MERGE** — code is merge-safe for the core journey; conditions are documented process/QA items (ADR-019, RC handoff harness #842, founder device smoke), not blockers found in this review.

---

## 2. Preflight

| Item | Value |
|------|--------|
| Working tree (post-review) | Clean after commits |
| Branch | `cursor/stability-child-core-v1` |
| HEAD (pre-review) | `e622fb0b` |
| `origin/main` | `93b68773` |
| Commits on branch | 6 (+ review commits) |
| Divergence | +1173 / −30 lines vs main (27 files) |
| PR state | DRAFT, checks **pass** (CI test job) |
| Mergeability | No conflict with `main` at review time |
| Node / npm | v20.20.2 / 10.8.2 |

### Parallel PRs & SW versions

| Ref | `cacheName` |
|-----|-------------|
| `origin/main` | `stjarndag-v762` |
| PR #840 (after review) | **`stjarndag-v765`** |
| PR #841 (`cursor/growth-feedback-loop-v1`) | `stjarndag-v763` |
| PR #842 (`cursor/english-launch-rc-audit`) | `stjarndag-v762` |

**Conflict rule for #841:** Keep functional growth assets; on rebase **retain highest SW from main** (`v765` or later). Do not bump SW again without a concrete static asset change.

---

## 3. Diff review (file classification)

| File | Tags | Verdict |
|------|------|---------|
| `.gitignore` | TEST | KEEP — harness artifact |
| `app.js` | HEALTH API | KEEP |
| `config/cache-version.json` | SERVICE WORKER | KEEP |
| `docs/CHILD-CORE-STABILITY-REPORT-2026-08.md` | DOCUMENTATION | KEEP |
| `docs/adr/ADR-019-trusted-child-device.md` | DOCUMENTATION | KEEP |
| `package.json` | TEST | KEEP |
| `public/child-dashboard.html` | CHILD UI | KEEP |
| `public/css/child-login-magic.css` | PIN ACCESSIBILITY | KEEP |
| `public/css/tailwind.build.css` | SERVICE WORKER | KEEP |
| `public/js/child-dashboard-load-day.js` | DELSTEG / COMPLETION | KEEP |
| `public/js/child-dashboard-substeps.js` | DELSTEG / COMPLETION / OFFLINE | KEEP |
| `public/js/child-login.js` | SESSION | KEEP |
| `public/js/child-support-layer.js` | DELSTEG | KEEP |
| `public/js/offline-queue.js` | OFFLINE | KEEP |
| `public/sw.js` | SERVICE WORKER | KEEP |
| `scripts/child-core-journey-harness.mjs` | TEST | KEEP |
| `src/routes/daily-logs/child-self.js` | ORDERING | KEEP |
| `src/routes/schedules/items.js` | ORDERING | KEEP |
| `test/*` (new/updated) | TEST | KEEP |
| `public/js/auth.js` (review) | SESSION / OFFLINE | KEEP — logout clears queue |

**Not present (verified):** English RC harness (#842), growth loop (#841), ADR-019 implementation, activation model changes, secrets/QA credentials, broad dashboard refactor.

---

## 4. Delsteg state machine

| State | Mechanism |
|-------|-----------|
| idle | Row default |
| expanded | `subStepExpanded`, container `.expanded` |
| in-flight | `_substepInFlight` Set; early return on duplicate tap |
| pending/offline | `.pending` class; offline → `OfflineQueue` |
| completed | Cache + DOM check; server PUT |
| error | `.error` flash 2s + rollback |
| retry | User tap after rollback clears error |

**Transition coverage (review):**

| # | Scenario | Result |
|---|----------|--------|
| 1–3 | Single/double/rapid tap | In-flight guard |
| 4–5 | Multi substep / multi-step activity | Per `itemId:subStepId` key |
| 6–8 | Offline before/during/lost response | Queue if not hard 4xx |
| 9–10 | 4xx / 5xx | 4xx → rollback, no queue; 5xx/network → queue |
| 11 | Timeout | Fetch timeout → treated as network |
| 12–14 | Reload / day change / loadDay | `loadDay` clears cache **and** `subStepExpanded` |
| 15–16 | Queue replay / duplicate | LWW per entity; flush accepts **409** |

**Residual:** TEACCH/NNL surfaces may not expose delsteg — product gap, not toggle bug.

---

## 5. Offline queue

| Check | Status |
|-------|--------|
| Storage | IndexedDB `stjarndag-offline` / `pendingActions` |
| Idempotency | `entityId` LWW (`substep:itemId:subStepId`) |
| Family/child scope | Browser profile; **logout now clears queue** (review fix) |
| Day scope | Server binds `daily_log_item` to date — stale item → 4xx, not queued |
| 4xx on flush | Left in queue (no mark synced except 409) |
| Auth expiry | `flush` stops when `!Auth.isLoggedIn()` |
| Unbounded growth | No max-age in client — pre-existing; mitigated by LWW + prune synced |
| Duplicate replay | 409 treated as success |

**Tests added:** 4xx skip contract, 409 idempotent flush, LWW delete, logout clears queue.

---

## 6. Schemaordning

- Weekly/child APIs: `CASE wsi.section` (morgon→dag→kväll→natt) then `sort_order`, `id`.
- Sub-steps: `ORDER BY s.sort_order, s.id`.
- Integration: `test/child-substep-order.integration.test.js`.
- Contract: `test/schedule-section-order-contract.test.js`.
- Harness: API + DOM order check on `/child/today`.

**Residual:** NNL/noon visual split may differ from parent list — intentional UI (#819 notes).

---

## 7. Session resume

`/child-login` → `resumeActiveChildSessionIfPresent`:

- Requires **`GET /api/auth/me` OK** and `me.type === 'child'`.
- Skipped for `forcePicker` and `resumeAddChild`.
- No client PIN storage/replay.

**Not delivered:** PIN-less cold start (ADR-019 Proposed).

---

## 8. PIN accessibility

- Digits: **`#1B2340`** on white / ~14–18% tint backgrounds — **WCAG AA+** for body text on those surfaces.
- Keys: 72px; `:focus-visible` outline present.
- Harness: 18px root font, reduced motion, touch viewports.

**Residual:** 4-digit auto-submit unchanged (product); manual audit at 200% zoom on physical device still recommended (`needs_device`).

---

## 9. ADR-019

- **Status:** Proposed — implementation **stopped**.
- Doc: `docs/adr/ADR-019-trusted-child-device.md`.
- Repo search: no copy claiming trusted-device/no-PIN is shipped.
- Stability report explicitly **NO-GO** for marketing PIN-less barnenhet.

---

## 10. Service worker / cache

- `CACHE_NAME` = `config/cache-version.json` = `/health.cache_version` (single source).
- Precache: per-URL `cache.add().catch` — optional 404 does not block install.
- Review bump: **v765** (logout + `auth.js` static change).
- `/health` not SW-cached (network route).

---

## 11. Browser harness

`npm run test:child-core-harness` — **PASS** (re-run 2026-08-03):

- iPhone 390×844: orderOk, substepOk, resumeOk, `cache_version=stjarndag-v765`
- Android 412×915: same

Uses state-based waits (`waitForFunction`, `waitForSelector`), slow network, touch, real DOM tap.

---

## 12. Handoff regression

PR #840 does not own RC English harness (#842). Existing gate tests (`rc1-handoff-*`, `onboarding-handoff-resume`, handoff integration on main) unchanged by this diff. No new handoff regression attributed to #840.

---

## 13. Performance sanity

- No extra `loadDay` loops from expand cleanup.
- Single PUT per substep tap (in-flight guard).
- Offline listeners: existing global `online` / `visibility` — not multiplied by PR.
- No health polling added.

---

## 14. Test results (this review)

| Command | Result | Notes |
|---------|--------|-------|
| `npm run test:gate:unit` | **PASS** 1819 pass / 4 skip / 0 fail (1823 tests) | +review tests |
| `npm run test:gate` (db) | **PASS** 358/358 (prior full run) | Re-run after final commit recommended in CI |
| `npm run lint:public` | **PASS** 172/172 budget |
| `npm run check:routes` | **PASS** |
| `npm run css:build` | **PASS** v765 |
| `npm run test:child-core-harness` | **PASS** both viewports |

---

## 15. Conflicts vs #841 / #842

| PR | Overlap | Instruction |
|----|---------|-------------|
| #841 | May touch `sw.js`, `cache-version.json`, marketing JS | Rebase on post-#840 main; **keep SW ≥ v765**; do not downgrade |
| #842 | Harness/docs only | Merge order: **#842 test/docs first** (team recommendation), then #840, then rebase #841 |

---

## 16. Changed files (review delta)

- `public/js/auth.js` — clear offline queue on logout
- `public/sw.js`, `config/cache-version.json`, `public/css/tailwind.build.css` — v765
- `test/auth-offline-queue-logout.test.js`, extended substep/offline contracts
- `package.json` — gate wiring
- This document + stability report appendix

---

## 17. Remaining caveats

1. ADR-019 must be accepted before PIN-less barnenhet product promise.
2. Founder device smoke (iOS Safari + Android Chrome) post-deploy.
3. Offline queue has no explicit max-age/TTL (pre-existing; logout clear reduces cross-session risk).
4. RC handoff prod smoke remains #842 / #813 track.
5. TEACCH/NNL delsteg visibility — product follow-up.

---

## 18. Merge decision

### **CONDITIONAL MERGE**

Safe to merge for **core child journey stability** when:

- [ ] CI `test:gate` green on final HEAD (including v765)
- [ ] Team accepts ADR-019 remains Proposed
- [ ] #841 rebased with SW conflict rule above

Not **HOLD**: no double-star path found, session resume requires server child JWT, ordering deterministic, PIN contrast fixed, SW install resilient.

---

## 19. Recommended merge order

1. **#842** — English Launch RC audit + harness (if ready)
2. **#840** — child core stability (this PR)
3. Rebase **#841** on new `main`; resolve SW to **≥ v765**
4. Full `test:gate` on #841 before merge

---

## 20. Deliverables

- Branch pushed with review commits
- `docs/CHILD-CORE-PR840-MERGE-REVIEW.md` (this file)
- Updated `docs/CHILD-CORE-STABILITY-REPORT-2026-08.md` (review appendix)
- Draft PR #840 updated
