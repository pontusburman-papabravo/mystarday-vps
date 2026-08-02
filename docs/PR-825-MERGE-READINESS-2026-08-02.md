# PR #825 — Merge readiness review (2026-08-02)

**Reviewer:** independent pass on rebased candidate  
**Rebased branch:** `cursor/pr825-rebase-on-main-03c7`  
**Rebased HEAD:** `d2d5267f` (4 commits; docs commit `927cb0db` **auto-skipped** on rebase — already on `main` as `7f0ede0d`)  
**Base:** `origin/main` @ `7f0ede0d` (+ `#823` child order)  
**PR #825 (draft):** still points at pre-rebase `12fa19d8` until retargeted  
**Not merged / not deployed**

## 1. Rebase outcome

```text
git rebase origin/main
warning: skipped previously applied commit 927cb0db
Successfully rebased (4/4)
```

- No duplicate review docs on branch.
- No historical migrations modified (only **new** `1810000000016`).
- Diff vs `origin/main`: 19 files, +933 / −80 (excludes docs already on main).

## 2. Diff hygiene

| Check | Result |
|-------|--------|
| Historical migrations touched | None |
| Credentials in diff | None (`.env.example` placeholders only) |
| `server.js` startup | `validateRevenueCatClientKeysAtStartup()` wired |
| New modules mounted | IAP routes unchanged mount; webhook process imported by existing handler |
| Test-only in production | `assert-disposable-database.mjs` is script-only |

Finding IDs in `docs/CODE-REVIEW-2026-08-02.md` (on main): INT-001–INT-011 unique.

## 3. RevenueCat `/api/iap/config` — incident class

| Question | Answer |
|----------|--------|
| Pre-PR env var returned | `REVENUECAT_API_KEY` |
| Could hold secret key? | Yes — repo/docs treat as server RevenueCat key; no `sk_` filter |
| Docs assumed public SDK? | Partial — `.env.example` also documents `REVENUECAT_SECRET_API_KEY` separately |
| `sk_` could reach clients? | If operators stored secret in `REVENUECAT_API_KEY` |

**Classification:** `SECRET_KEY_EXPOSURE_POSSIBLE`  
**Action:** Mandatory rotation/revocation **if** that variable ever held `sk_`/`rcsk_` (pre-deploy). New code blocks returning secret prefixes; does not rotate keys.

**New implementation:** platform public keys; `getLegacyPublicApiKey()` nulls secrets; app does not crash if keys missing (`apiKey: null`); iOS/Android via `?platform=`; startup logs error (not key) when misconfigured.

## 4. Webhook scope gaps

| Scenario | Code path | HTTP 200 + skip | Notes |
|----------|-----------|-----------------|-------|
| Wrong product | `invalid_product_id` | Yes | Log idempotent |
| Wrong entitlement | `invalid_entitlement` | Yes | |
| SANDBOX on live family | `sandbox_on_live_family` | Yes | |
| NON_RENEWING unmapped | `non_renewing_not_subscription` | Yes | |
| TRANSFER | `transfer_not_implemented` | Yes | No state mutation |
| Unknown type | `unhandled_event_type` | Yes | |
| **Wrong app** | `invalid_app_id` | Only if `REVENUECAT_ALLOWED_APP_IDS` set | **Fail-open when env empty** (`isAllowedAppId` → true) |

**Finding MR-RC-01 (P1):** empty `REVENUECAT_ALLOWED_APP_IDS` accepts all apps — not fail-closed.

Dedicated behavioral tests for full scope matrix: **partial** (`iap-webhook.test.js` lifecycle/orphan; not exhaustive per event type).

## 5. Event ordering / concurrency

**Implemented:** `FOR UPDATE`, `iap_last_event_timestamp_ms`, stale skip (`<` only), destructive-without-timestamp guard, duplicate `revenuecat_event_id`.

**Gaps (MR-RC-02 P1):**

- No documented tie-breaker for **equal** `event_timestamp_ms` (later event can overwrite; order = commit race).
- Integration tests cover **2** of 11 requested scenarios (renewal vs older expiration; non-UUID `rc_customer_id`).
- No concurrent webhook integration test (two clients, barrier).

## 6. Migration `1810000000016`

| Check | OK |
|-------|-----|
| Number unique on main | Yes (gap between 15 and 17) |
| Expand-only nullable columns | Yes |
| Heavy index / table lock | No new indexes |
| Disposable + post-restore schema | Migrated in review DB |
| Idempotent `IF NOT EXISTS` | Yes |

**Rollback doc:** `down` drops ordering columns — destructive for audit fields; prefer forward code rollback.

## 7. SSRF (`safe-url-fetch`)

**Present:** http/https only, DNS pre-check, pinned connect IP, `remoteAddress` check, redirect cap, size cap, magic bytes, no auth headers, TLS SNI + Host.

**Gaps (MR-SSRF-01 P1):** behavioral tests minimal (loopback, file:); no automated redirect-to-private, multi-A/AAAA, gzip bomb, or local test server suite.

Policy allowlist (R2/APP_URL) skips strict DNS path by design.

## 8. Rate limiting

`optionalAuth` → `globalLimiter` → `/api` + `apiLimiter`; `parent:`/`child:`/`admin:` keys; SSE/webhook exemptions in limiter.  
`test/rate-limit-behavior.integration.test.js` in gate.

## 9. Scheduler registry

Contract test: `server.js` ↔ `SCHEDULER_REGISTRY` names.  
**Still a duplicated manual list** (MR-SCH-01 P2) — not generated from `server.js`.

## 10. Test results (rebased candidate, disposable PostgreSQL)

| Command | Exit | Duration | Pass | Fail | Skip | Log |
|---------|------|----------|------|------|------|-----|
| `npm run test:gate` | 0 | ~179s | 342 | 0 | 0 | `/tmp/pr825-test-gate.log` |
| `safe-url-fetch` + `iap-client-config` ×5 | 0 | — | 9×5 | 0 | 0 | — |
| `iap-webhook*.test.js` | 0 | ~62s | 22 | 0 | 0 | — |
| `migration-rollback-gate` | 0 | ~1.3s | 3 | 0 | 0 | — |
| GitHub CI on old PR head | 1 | — | 341 | 1 | 0 | Fas6 concurrent milestone flake |

**Governance skips (`npm test`):** 4 skips in `release-os.test.js` when POS/COS paths missing in clone — still valid after rebase; do not weaken.

Full `npm test` not re-run end-to-end in this pass (prior integrity run: 3331 pass / 0 fail / 4 skip).

## 11. Decisions

| Area | Verdict |
|------|---------|
| 1. Merge readiness | **GO WITH FOLLOW-UP** |
| 2. SSRF | **GO WITH FOLLOW-UP** |
| 3. RC client config | **GO** (with rotation if `sk_` ever in `REVENUECAT_API_KEY`) |
| 4. RC webhook scope | **GO WITH FOLLOW-UP** (app allowlist fail-open) |
| 5. RC ordering/concurrency | **GO WITH FOLLOW-UP** (tests + same-ts tie-break) |
| 6. Migration | **GO** |
| 7. Rate limiting | **GO** |
| 8. Scheduler registry | **GO WITH FOLLOW-UP** (P2 duplicate list) |
| 9. Credential rotation | **GO WITH FOLLOW-UP** (conditional mandatory) |
| 10. Paid/IAP rollout | **GO WITH FOLLOW-UP** |

**PR stays draft.** Retarget to `cursor/pr825-rebase-on-main-03c7` before merge.

See `docs/PR-825-PRE-DEPLOY-CHECKLIST.md`.
