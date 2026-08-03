# Child Core Stability Report — 2026-08

**Branch:** `cursor/stability-child-core-v1`  
**Base:** `origin/main` @ `93b68773` (Merge PR #839 product program baseline)  
**SW:** `stjarndag-v764` (`config/cache-version.json`)  
**Scope:** Parent plans → child sees same routine → opens substeps → completes → star registered → parent can return  
**Constraint:** No merge/deploy · no prod DB · no auth weakening · no family-specific hotfix

---

## Preflight

| Item | Value |
|------|--------|
| HEAD at start | `93b68773` (= `origin/main`) |
| Relevant merges already on main | #819 order parity · #820/#821 delsteg expand · #805 handoff · #779 session restore |
| Open related PRs | #813 RC1 handoff harness (test-only) · integrity/ops PRs unrelated |
| Feature flags (code) | `DeviceMode` client hint · `feature_flag` table (maintenance, win_back, market_*, journey, activation…) — **no** trusted-child-device flag |
| Files changed since last reported fixes | This branch: substep toggle/offline, PIN contrast, SW precache, `/health.cache_version`, session resume, ADR-019, harness |

---

## Problem matrix

| # | Reported issue | Status | Evidence |
|---|----------------|--------|----------|
| 1 | Delsteg cannot expand/complete | **partially_fixed** → expand **already_fixed** (#820); complete hardened this PR | Intro `const` assignment fixed on main; this PR adds in-flight guard, pending/error, offline queue, clear expand on `loadDay` |
| 2 | Child order ≠ parent saved order | **already_fixed** (default Idag) / **partially_fixed** (week strip / NNL / dag split) | #819 + `daily-log-child-order` + integration A–I; weekly-schedule `CASE section` ORDER BY this PR |
| 3 | Too many login/PIN steps | **partially_fixed** | Resume active child session on `/child-login` → `/child/today` when `/api/auth/me` is `type:child`. Full PIN-less cold start → **ADR-019** |
| 4 | Open app directly in child view on trusted device | **requires_ADR** | ADR-019 Proposed; implementation stopped for trust model |
| 5 | Small colored PIN digits hard for low vision | **reproduced → fixed** | Pastel text colors failed contrast; digits now navy `#1B2340` on tinted keys + `:focus-visible` |
| 6 | Parent/child session handoff | **partially_fixed** | #805 contract on main; residual client race tracked in open #813 (harness) |
| 7 | Stale SW / old JS | **partially_fixed → improved** | Resilient per-URL precache; `/health.cache_version`; bump v764 |

---

## Per-track detail

### Spår A — Delsteg

**Repro (historical):** First expand with intro tooltip threw `Assignment to constant variable` → dead button (#820).

**Root cause (expand):** Mutable intro flag declared `const`.

**Root cause (complete residuals):** Double-tap raced on stale done-state; no offline queue for substeps; `loadDay` cleared `subStepCache` but kept `subStepExpanded` → empty expanded list.

**Change (this PR):**
- `_substepInFlight` + cache-preferred done state
- `.pending` / `.error` row UI; 44px check targets
- `OfflineQueue` `COMPLETE_SUBSTEP` / `UNCOMPLETE_SUBSTEP`
- Clear `subStepExpanded` on `loadDay`

**Regression:** `test/child-substep-toggle-contract.test.js`, `test/offline-queue-rating.test.js`, `test/child-substep-order.integration.test.js`, `test/child-login-session-resume.test.js` (loadDay clear)

**Before/after:** Expand works for first-time tooltip users (main); toggles ignore double-tap; offline completion queues; refresh after loadDay does not leave empty expanded panels.

**Platforms:** Source + DB integration; browser harness script (`npm run test:child-core-harness`) for touch viewports.

**Residual risk:** TEACCH NU path may omit delsteg UI; NEXT/LATER cards may hide delsteg — product surface gap, not this toggle bug.

### Spår B — Schemaordning

**Repro:** Stale `child_sort_order=0` ignored parent reorder (fixed #819).

**Root cause:** NULL semantics missing; default 0 treated as child override.

**Change (prior + this):** Authoritative `sort_order` when `child_sort_order` NULL; weekly child API orders by section CASE then `sort_order`.

**Regression:** Existing `child-daily-log-order.integration.test.js` + new substep order integration.

**Residual risk:** Visual NNL / noon split of `dag` can *look* reordered vs parent list; intentional UI, not persistence bug.

### Spår C — Barnenhet / session

**Map:** Parent JWT → child-login creates handoff → child JWT → logout restores parent or `needsParentPin` → picker PIN.

**Trusted device model:** **Does not exist server-side.** See `docs/adr/ADR-019-trusted-child-device.md` (**Proposed — stop**).

**Safe UX shipped without ADR:** If child session already valid, `/child-login` redirects to `/child/today` (still server-validated; picker/add-child not skipped).

**Parent refresh on child logout:** Preserved by handoff design (#805) — child refresh revoked only.

### Spår D — PIN a11y

**Repro:** Digit keys used `#7B61FF/#14B8A6/#EC4899/#F5A623` as **text** color on white — several fail WCAG AA.

**Change:** All digits `color:#1B2340`; optional background tints only; `:focus-visible` outline; 72px keys retained; aria-labels unchanged.

**Regression:** `test/child-login-pin-a11y.test.js`

**Residual:** Auto-submit at 4 digits remains (product model); hidden `tel` input still present for OS keyboards.

### Spår E — Service worker

**Repro:** `cache.addAll` fails entire install if one asset 404s; clients can stick on old bundles; `/health` lacked cache name.

**Change:** Per-URL `cache.add().catch(warn)`; `/health.cache_version`; SW v764.

**Regression:** `test/sw-precache-resilience.test.js`, `test/deployed-sha.test.js`

**Residual:** SWR for JS can still paint one stale generation until revalidate — banner via `sw-register.js`. Native Capacitor unregisters SW (by design).

---

## Automated QA

| Gate | Command |
|------|---------|
| Install | `npm ci --legacy-peer-deps --include=dev` |
| CSS | `npm run css:build` |
| Lint | `npm run lint` · `npm run lint:public` |
| Routes | `npm run check:routes` |
| Gate | `npm run test:gate` |
| Harness | `npm run test:child-core-harness` (Puppeteer; isolated DB) |

Harness profiles: 390×844, 412×915, touch, slow network, reduced motion, 18px root font, previous cache hint. No credentials in logs.

**Harness run (local isolated DB):** both viewports PASS — orderOk, substepOk, resumeOk, health.cache_version=stjarndag-v764.

---

## GO / NO-GO

### **GO with caveats** for new families on the core journey (plan → see → substeps → complete → star → parent return)

**GO because:**
- Expand/complete path has regression coverage and residual races closed
- Parent/child Idag order parity is on main with tests
- Handoff restore is on main with integration tests
- PIN readability and SW install resilience improved
- Auth not weakened; trusted-device PIN skip explicitly gated by ADR

**Caveats (not blockers for core journey, track separately):**
1. Accept/reject **ADR-019** before promising PIN-less cold start on barnenhet
2. Merge/close **#813** harness flake work for prod smoke stability
3. Run founder device smoke after deploy (iOS Safari + Android Chrome) — mark `needs_device` items visually
4. TEACCH / NNL delsteg surface gaps remain product follow-ups

**NO-GO** for marketing “öppna direkt utan PIN på betrodd enhet” until ADR-019 is Accepted and implemented.

---

## Self-review

```
Self-review: PE ✓ Mobile ✓ CPO ✓ UX ✓ Game ✓ QA ✓ Security ✓ AISA ✓
Issues found and fixed: substep double-tap race; offline substeps; PIN contrast; SW addAll fragility; stale expand after loadDay; missing cache_version diagnostic; child-login re-PIN with live session
POS governed by: 04 C-03/C-04/C-08, 15 Section B, Constitution 2–3
```
