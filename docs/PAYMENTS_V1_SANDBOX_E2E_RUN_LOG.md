# PAYMENTS V1 — Sandbox E2E Run Log

**Status: iOS PASS (2026-08-28). Android still NOT YET RUN.** A real StoreKit sandbox
purchase was completed end to end on a physical iPhone via TestFlight and verified
against the live backend (webhook, reconcile, canonical entitlement, idempotency,
negative control). See the iOS section below for full evidence. Do not mark the
Android row PASS until it has been run the same way — `docs/PAYMENTS_V1_STATUS.md`
and any payments readiness report must keep Android sandbox E2E as **pending**.

**How to run the iOS test:** see
[`docs/runbooks/IOS-PAYMENTS-SANDBOX-E2E-RUNBOOK.md`](runbooks/IOS-PAYMENTS-SANDBOX-E2E-RUNBOOK.md)
for the step-by-step physical-device procedure (before/on-device/backend/after). This file is
only the evidence log — fill it in after following that runbook.

**PR:** #1050 (merged to `main` — backend/webhook/entitlement code is shipped).
**Rule:** Do not enable `app_settings.payment_enabled` / remove `BILLING_UI_DISABLED`
in the live app until iOS + Android are both PASS below.

**Setup rule:** Use a **new post-cutoff test family per platform** (separate Family ID for iOS and Android). Default `payment_start_at`: `2026-10-01T00:00:00+02:00` — family `created_at` must be **after** that cutoff and must **not** be grandfathered before purchase.

Canonical contract: `config/iap-product-contract.js` · entitlement `basic` · offering `default` · `$rc_annual` → `STORE_PRODUCT_YEARLY (see config/iap-product-contract.js)` · 14-day trial · 590 kr/år.

---

## iOS

### Test identity

| Field | Value |
|-------|-------|
| Date/time | 2026-08-28, ~16:38 (Europe/Stockholm) |
| Tester | Founder, physical iPhone (iOS 18.7), TestFlight build |
| Family ID | dedicated QA family `App Store Sandbox QA` — **deleted after test**, not recorded here |
| `family.created_at` | 2026-08-28 (created same day, well after `payment_start_at`) |
| `payment_start_at` | 2026-10-01T00:00:00+02:00 (default) |
| Confirm post-cutoff | N/A — family used `country_code = IE`, which is outside the SE-only grandfather cutoff entirely (see below) |
| Confirm not grandfathered before purchase | **PASS** — 0 rows in `family_entitlements` verified before purchase (grandfathering is SE-only; `country_code=IE` is never eligible) |
| RevenueCat App User ID | family UUID (default `app_user_id`, no custom `rc_customer_id` set) |
| Platform | iOS |
| App/build version | 1.4.3, TestFlight build sourced from `ios-v1.4.3` (commit `223fc3c5`, contains the IAP capability + RevenueCat Podfile fix) |

**Note on `country_code`:** the only market open for registration at test time was `SE` (`market_se_open=true`; all others including `IE` closed). SE registration auto-grandfathers pre-cutoff, which would make the family unusable for this test (webhooks are skipped for grandfathered families). `market_ie_open` was toggled `true` → family created via the normal `/api/auth/register` flow with `country_code=IE` → toggled back to `false` within the same request/response cycle (founder-authorized, time-boxed exception; verified no other IE family was created during the window). See chat history for the full authorization and verification sequence.

### Store / RevenueCat configuration

| Check | Result |
|-------|--------|
| Monthly SKU present | PASS |
| Yearly SKU present | PASS |
| Yearly SKU | `STORE_PRODUCT_YEARLY` (see `config/iap-product-contract.js`) |
| Trial | 14 days configured; **not exercised this run** — sandbox purchase used the standard (non-trial) purchase path |
| RevenueCat entitlement | `basic` — confirmed via live `/health` (`entitlement_configured: true`) and `/api/subscription/status` |
| Offering | `default` |
| Package | `$rc_annual` |
| Apple In-App Purchase Key configured | PASS (`ios_public_sdk_configured: true` in `/health`; public key only, verified never a secret-shaped value) |
| RevenueCat server secret configured on backend (`REVENUECAT_SECRET_API_KEY`) | PASS (presence confirmed on the live server without reading the value) |
| Webhook authentication configured | PASS (`webhook_auth_configured: true`) |
| Pricing displayed in-app matched App Store Connect | **FAIL initially** — yearly showed the same price as monthly ($4.99) in the app's own paywall UI; corrected in ASC mid-test. Unrelated to the pipeline itself — purchase/entitlement flow is independent of displayed price. |

### Purchase

| Field | Value |
|-------|-------|
| Paywall opened | PASS |
| Yearly selected | PASS |
| Store shows 14-day trial | Not applicable this run (see above) |
| Sandbox purchase completed | PASS (via TestFlight's built-in sandbox — real Apple ID, no real charge per Apple's own guarantee) |
| Apple transaction/reference | RevenueCat event id `260A19FF-564D-4DBF-8F24-B014BC1C3B3A` |
| RevenueCat event type | `INITIAL_PURCHASE` |
| Webhook received at | 2026-08-28 16:38:04 (Europe/Stockholm) |
| Webhook processing result | `subscription_status → active` (server log), family correctly identified, not skipped |

### Canonical entitlement (after webhook)

| Check | Result |
|-------|--------|
| `source = apple` | PASS |
| `status = active` (sandbox-accelerated; no separate `trial` phase seen this run) | PASS |
| `plan = yearly` | PASS |
| `expires_at` correct | PASS — sandbox-accelerated to ~24h from grant (`2026-08-29`), expected sandbox behavior for a 1-year subscription |
| `premium.active = true` | PASS (`/api/subscription/status`) |
| `limited_account = false` | PASS |

### Reconcile

| Field | Value |
|-------|-------|
| `POST /api/iap/sync` HTTP result | PASS — fired automatically by the client after purchase |
| Reconcile timestamp | 2026-08-28 16:38:05 (1 second after the webhook) |
| RevenueCat verification | PASS |
| Resolver result | `premium.active=true, source=apple, status=active, plan=yearly` via live `/api/subscription/status` |
| `premium.source` | `apple` |
| `premium.status` | `active` |
| `premium.plan` | `yearly` |
| `premium.expires_at` | `2026-08-29T14:37:57.000Z` |

### Mirrors / audit

| Check | Result |
|-------|--------|
| `family.subscription_status` matches resolver | Not independently re-verified via direct SQL after purchase (family was deleted before a dedicated check) — `/api/subscription/status`, which is downstream of the same resolver, was fully consistent |
| `family_subscriptions` matches resolver | Same caveat as above |
| `payment_audit_log` event present | **PASS** — exactly one row, `event_type=rc_initial_purchase`, `source=apple`, `store=APP_STORE`, `plan=yearly`, `status=active` (verified after family deletion; `family_id` correctly `NULL`-ed via `ON DELETE SET NULL`, row itself retained) |
| Audit event/reference | `payment_audit_log.id = 9be6aa0b-51d5-4fa7-b6df-0238bc2579b5` |

### Idempotency

The webhook (`INITIAL_PURCHASE`) and the client's own `/api/iap/sync` both fired independently within ~1 second of each other — an organic real-world idempotency test, not a manual replay.

| Field | Value |
|-------|-------|
| Parallel active store rows before retry | 0 |
| `family_entitlements` rows created by the two independent triggers | 2 (one per trigger) |
| Exactly one active store entitlement after both fired | **PASS** — the first (webhook-created) row was auto-revoked (`revoked_at` set ~0.7s later) when the second (client-sync) upsert ran; exactly one row remained active |
| Premium state unchanged correctly | PASS |
| No incorrect duplicate business/audit effect | PASS — exactly one `payment_audit_log` row |

### SQL evidence

Captured while the family still existed (UUID redacted here; not written anywhere else):

```
 source | status | expires_at             | plan   | product_id                    | revoked_at                    | granted_at
--------+--------+------------------------+--------+--------------------------------+-------------------------------+-------------------------------
 apple  | active | 2026-08-29 16:37:57+02 | yearly | <bundle-id>.subscription.yearly.v2 | 2026-08-28 16:38:05.103+02 | 2026-08-28 16:38:04.380+02
 apple  | active | 2026-08-29 16:37:57+02 | yearly | <bundle-id>.subscription.yearly.v2 |                            | 2026-08-28 16:38:05.106+02
```

Exactly one row (the second) had `revoked_at IS NULL` — one active entitlement, as required.

### iOS verdict

**PASS**

Real StoreKit sandbox purchase → webhook → reconcile → canonical entitlement → `/api/subscription/status` unlock, all verified against the live backend. Negative control (a normal, non-allowlisted family) confirmed still blocked before and after. Sandbox access and the test family were fully cleaned up afterward (see below).

**Bugs found and fixed during this run** (all merged and deployed live the same day):
- Paywall showed a raw i18n key instead of the trial-terms sentence (missing `Terms` infix in the constructed translation key).
- A limited (non-Premium) parent could set their own app-lock PIN but not verify it — asymmetric allowlist gap left a brand-new limited account with no way back to parent mode short of a full logout/login.
- The Prenumeration settings card rendered "Hantera abonnemang" twice for every active native subscription (never exercised before — no real family had completed a native purchase prior to this test).
- Restore Purchases gave no feedback when it silently succeeded; switched to the app's branded toast component instead of bare `alert()`.

**Product/config follow-up (not a code fix, tracked separately):** the yearly subscription's App Store Connect pricing was initially misconfigured to match the monthly price; corrected in ASC mid-test.

---

## Android

### Test identity

| Field | Value |
|-------|-------|
| Date/time | |
| Tester | |
| Family ID | |
| `family.created_at` | |
| `payment_start_at` | |
| Confirm post-cutoff | PASS / FAIL |
| Confirm not grandfathered before purchase | PASS / FAIL |
| RevenueCat App User ID | |
| Platform | Android |
| App/build version | |

### Store / RevenueCat configuration

| Check | Result |
|-------|--------|
| Monthly product/base plan present | PASS / FAIL |
| Yearly product/base plan present | PASS / FAIL |
| Yearly SKU | `STORE_PRODUCT_YEARLY (see config/iap-product-contract.js)` |
| Trial offer | 14 days |
| RevenueCat entitlement | `basic` |
| Offering | `default` |
| Package | `$rc_annual` |
| Google service account accepted by RevenueCat | PASS / FAIL |
| RevenueCat server secret configured on backend (`REVENUECAT_SECRET_API_KEY`) | PASS / FAIL |
| Webhook authentication configured | PASS / FAIL |

### Purchase

| Field | Value |
|-------|-------|
| Paywall opened | PASS / FAIL |
| Yearly selected | PASS / FAIL |
| Play shows 14-day trial | PASS / FAIL |
| Sandbox/test purchase completed | PASS / FAIL |
| Google transaction/reference | |
| RevenueCat event ID | |
| RevenueCat event type | |
| Webhook received at | |
| Webhook processing result | |

### Canonical entitlement (after webhook)

| Check | Result |
|-------|--------|
| `source = google` | PASS / FAIL |
| `status = trial` | PASS / FAIL |
| `plan = yearly` | PASS / FAIL |
| `expires_at` correct | PASS / FAIL |
| `premium.active = true` | PASS / FAIL |
| `limited_account = false` | PASS / FAIL |

### Reconcile

| Field | Value |
|-------|-------|
| `POST /api/iap/sync` HTTP result | |
| Reconcile timestamp | |
| RevenueCat verification | PASS / FAIL |
| Resolver result | |
| `premium.source` | |
| `premium.status` | |
| `premium.plan` | |
| `premium.expires_at` | |

### Mirrors / audit

| Check | Result |
|-------|--------|
| `family.subscription_status` matches resolver | PASS / FAIL |
| `family_subscriptions` matches resolver | PASS / FAIL |
| `payment_audit_log` event present | PASS / FAIL |
| Audit event/reference | |

### Idempotency

| Field | Value |
|-------|-------|
| Parallel active store rows before retry | |
| Parallel active store rows after retry | |
| Exactly one active store entitlement | PASS / FAIL |
| Premium state unchanged correctly | PASS / FAIL |
| No incorrect duplicate business/audit effect | PASS / FAIL |

### SQL evidence

```sql
SELECT source, status, expires_at, metadata->>'plan' AS plan, revoked_at
FROM family_entitlements
WHERE family_id = '<family-uuid>'
  AND entitlement_key = 'basic'
ORDER BY granted_at;
```

**Result:**

```
<paste result>
```

### Android verdict

**PASS / FAIL**

**Blocker if FAIL:**

---

## Final PAYMENTS V1 E2E gate

| Gate | Result |
|------|--------|
| iOS sandbox E2E | **PASS** (2026-08-28) |
| Android sandbox E2E | FAIL / NOT YET RUN |
| Canonical resolver verified | PASS (iOS) |
| Webhook verified | PASS (iOS) |
| Trusted reconcile verified | PASS (iOS) |
| Limited-account → Premium transition verified | PASS (iOS) |
| Mirrors verified | Partial (iOS) — `payment_audit_log` PASS; `family.subscription_status`/`family_subscriptions` not independently re-checked post-purchase (family deleted before a dedicated recheck; the resolver-backed `/api/subscription/status` API was fully consistent) |
| Audit verified | PASS (iOS) |
| Idempotency verified | PASS (iOS) — verified organically (webhook + client sync both fired independently) |

### Decision to enable billing

**NO-GO** — Android sandbox E2E has not been run yet. Do not flip
`app_settings.payment_enabled = true` or remove `BILLING_UI_DISABLED` in the live
app until Android is also PASS in this file.

iOS is fully verified and ready to resubmit for App Store review on the subscription
side (App Store Connect / RevenueCat / product config still require the external
checks in `docs/PAYMENTS_STORE_COMPLIANCE.md`).

Gift checkout is outside this gate and remains disabled.
