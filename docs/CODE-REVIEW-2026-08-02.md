# Full repository integrity review — 2026-08-02

**Reviewed SHA:** `e47bfc77697085dda49696277ee166026f732c17` (same as `origin/main` and verified production `e47bfc77` at audit start).

**Branch:** `cursor/full-repo-integrity-review-03c7`  
**Worktree:** isolated clone under `/tmp` (local agent only; not part of repo)

## Preflight

| Check | Result |
|-------|--------|
| `6a784ddf` ancestor of `origin/main` | Yes |
| `e47bfc77` vs `origin/main` | Identical (`e47bfc77`) |
| Node / npm | v20.20.2 / 10.8.2 |

## Summary table (verified findings on baseline `e47bfc77`)

| ID | Severity | Status (baseline) | Reproduktion | Föreslagen fix | Migration | Test |
| -- | -------- | ----------------- | ------------ | -------------- | --------- | ---- |
| INT-001 | P0 | VERIFIED | `GET /api/iap/config` returns `REVENUECAT_API_KEY` | Public platform SDK keys only; reject `sk_`/`rcsk_` | No | `test/iap-client-config.test.js` |
| INT-002 | P0 | VERIFIED | Webhook applies status from event type only; no product/app/sandbox ordering | Port `config/revenuecat-iap.js` + hardened `revenuecat-webhook-process.js` | `1810000000016` | `test/iap-webhook-ordering.integration.test.js` |
| INT-003 | P0 | VERIFIED | `safe-url-fetch` used `fetch()` after DNS check (rebinding window) | Pinned `http`/`https` connect + `remoteAddress` check | No | `test/safe-url-fetch.test.js` |
| INT-004 | P1 | VERIFIED | `findFamilyForAppUserIds` skipped non-UUID `rc_customer_id` | Lookup all candidates against `rc_customer_id` | No | ordering integration test |
| INT-005 | P1 | FIX_ALREADY_PRESENT | Per-user API rate limit after #787 SSRF commit | `apiLimiter` per principal | No | `test/rate-limit-behavior.integration.test.js` |
| INT-006 | P1 | VERIFIED | Rate limit keys used `user:` not `parent:`/`child:` | Namespaced keys | No | `test/rate-limit-buckets.test.js` |
| INT-007 | P1 | FIX_ALREADY_PRESENT | Rewards `parent_child` without `revoked_at` | `revoked_at IS NULL` in rewards routes | No | `test/rewards-revoked-access.integration.test.js` |
| INT-008 | P2 | REQUIRES_MANUAL_VERIFICATION | CSP still report-only | Enforce after QA | No | Manual |
| INT-009 | P2 | SUSPECTED | `content-translator.js` raw `fetch` to MyMemory | Align with safe-url-fetch or disable remote | No | Manual |
| INT-010 | P2 | VERIFIED (doc) | No single scheduler registry vs `server.js` | `src/lib/scheduler-registry.js` + contract test | No | `test/scheduler-registry-contract.test.js` |
| INT-011 | P3 | HISTORICAL_ONLY | `public/sw.js` version changelog comments | Trim over time; `config/cache-version.json` is source | No | SW tests in gate |

## INT-001 — RevenueCat secret exposed to clients

- **File:** `src/routes/iap.js` (baseline lines 10–15)
- **Behavior:** Authenticated parents received `process.env.REVENUECAT_API_KEY` in JSON.
- **Consequence:** Server secret usable outside RevenueCat dashboard controls.
- **Fix:** `iap-client-config.js`, platform public keys, startup validation.

## INT-002 — Webhook scope and ordering

- **Files:** `src/lib/revenuecat-webhook-process.js`, `config/revenuecat-iap.js`
- **Behavior:** No monotonic `event_timestamp_ms`; `NON_RENEWING_PURCHASE` always active; SANDBOX could mutate live families.
- **Fix:** Merged from integrity branch `ab4763c0` (not previously on `main`).

## INT-003 — SSRF DNS rebinding

- **File:** `src/lib/safe-url-fetch.js`
- **Behavior:** Pre-fetch DNS validation did not bind connection IP.
- **Fix:** `pinnedHttpGet` with resolved public IP + socket `remoteAddress` guard.

## Historical REV-001–REV-015

See `docs/RESTORE-REGRESSION-MATRIX-2026-08-02.md`.

## Phase B implementation status

Implemented on `cursor/full-repo-integrity-review-03c7` after this audit snapshot (see PR).
