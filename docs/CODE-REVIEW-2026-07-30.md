# Full repository integrity review — 2026-07-30

**Reviewed SHA:** `6a784ddf15a231a8f16ab36ae08e663833338f8b` (same as `origin/main` at review start)  
**Branch:** `cursor/full-repo-integrity-review-01b8`  
**Method:** Mandatory pattern searches, targeted file review, integration + concurrency tests on real PostgreSQL.

## Executive summary

Ten P0/P1 areas from the mission were verified on baseline `main` and addressed on the review branch: SSRF in family image proxy, authenticated API rate limits, RevenueCat webhook validation/ordering/identity, IAP client key exposure, rewards revoked access, reward visibility semantics, auto-redemption for `requires_approval=false`, service worker install resilience, scheduler registry documentation, and CI test manifest checks.

## Findings (selected)

| ID | Sev | Location | Status | Notes |
|----|-----|----------|--------|-------|
| REV-001 | P0 | `src/routes/family-images.js` GET `/source` | **Fixed** | Raw `fetch()` without SSRF controls; replaced with `src/lib/safe-url-fetch.js`. |
| REV-002 | P1 | `src/middleware/rateLimiter.js` `apiLimiter` | **Fixed** | Authenticated traffic was skipped entirely; per-user bucket restored. |
| REV-003 | P0 | `src/lib/revenuecat-webhook-process.js` | **Fixed** | Product/app/entitlement/sandbox validation, monotonic `event_timestamp_ms`, `FOR UPDATE`. |
| REV-004 | P1 | `findFamilyForAppUserIds` | **Fixed** | Non-UUID `rc_customer_id` lookup; UUID only gates `family.id`. |
| REV-005 | P1 | `src/routes/iap.js` GET `/config` | **Fixed** | Platform public SDK keys; startup rejects `sk_`/`rcsk_` as client keys. |
| REV-006 | P1 | `src/routes/rewards.js` `parent_child` | **Fixed** | `revoked_at IS NULL` on list/redemption/approve/deny/reorder; push notify scoped. |
| REV-007 | P1 | `src/routes/rewards.js` POST create reward | **Fixed** | `[]` no longer coerced to `null` (hidden vs all children). |
| REV-008 | P1 | Child redeem flow | **Fixed** | `requires_approval=false` → status `auto`, stars deducted once, no pending notify. |
| REV-009 | P2 | `public/sw.js` install | **Fixed** | Per-asset precache; auth entry HTML network-only; CACHE_NAME v740. |
| REV-010 | P2 | Scheduler lists vs `server.js` | **Documented** | `src/lib/scheduler-registry.js` mirrors startup list. |
| REV-011 | P2 | `src/lib/push.js` `getFamilyParents` | **Partial** | Reward push uses child link; other triggers still family-wide (documented). |
| REV-012 | P3 | `public/sw.js` changelog comments | **Open** | Hundreds of manual version lines remain; single source is `config/cache-version.json` for CACHE_NAME. |
| REV-013 | P2 | CSP enforce / `unsafe-inline` | **Needs manual QA** | Not flipped to enforce in this branch (regression risk). |
| REV-014 | P2 | `src/lib/content-translator.js` `fetch` | **Manual verify** | Out of family-images scope; URL policy should align with safe-url-fetch if expanded. |
| REV-015 | P3 | `midnight-scheduler` / `weekly-summary` advisory locks | **Open** | Not in PR-D migrated list; multi-instance risk remains for those jobs. |

### REV-001 — SSRF (verified)

- **Behavior:** Parent with archived URL could trigger server fetch to arbitrary URL after allowlist check on stored URL only.
- **Repro:** POST image URL pointing to `http://127.0.0.1/…` then GET `/api/family/images/source?url=…`.
- **Tests:** `test/safe-url-fetch.test.js` (unit); family-images authz tests retained.

### REV-002 — Rate limits (verified)

- **Behavior:** `apiLimiter.skip` included `req.user.id` → no per-user throttling for authenticated API.
- **Tests:** `test/rate-limit-buckets.test.js` (static contract).

### REV-003–005 — RevenueCat (verified on baseline)

- **Behavior:** Status derived from event type only; SANDBOX events could mutate prod families; no stale event protection.
- **Tests:** `test/iap-webhook.test.js` (updated payloads), `test/iap-webhook-ordering.integration.test.js`.

### REV-006–008 — Rewards (verified)

- **Tests:** `test/rewards-revoked-access.integration.test.js`, existing `test/rewards-integrity.integration.test.js`.

## Motbevisade / redan på main

- Baseline SHA matched `origin/main`; no additional commits on `main` after `6a784ddf` during review.
- PR #781, #783, #786 context: repeatable redemption and integrity work present; this branch completes revoked access and auto-redemption gaps.

## Migrations

| Migration | Purpose | Rollback |
|-----------|---------|----------|
| `1810000000016_iap_event_ordering_audit` | `family.iap_last_*`, `iap_webhook_log.event_timestamp_ms`, `environment` | Drops columns in `down` |

## Manual follow-up

- CSP enforce rollout with browser QA on parent + child surfaces.
- Pin GitHub Actions to immutable SHAs (CI hardening — partial manifest only in this branch).
- Sandbox IAP: set `REVENUECAT_SANDBOX_FAMILY_IDS` for dedicated test families before store QA.
- Midnight / weekly-summary scheduler advisory locks if horizontal scaling is planned.

## Recommendation

**NO-GO** for paid rollout until RevenueCat allowlists and webhook authentication are configured, and a sandbox test family is registered. **GO** for merging this hardening branch after CI green and ops checklist.
