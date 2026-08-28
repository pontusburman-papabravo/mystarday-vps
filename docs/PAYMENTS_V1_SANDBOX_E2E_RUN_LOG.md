# PAYMENTS V1 — Sandbox E2E Run Log

**Status: NOT YET RUN.** This template is intentionally blank — no sandbox purchase has
been executed against a real device/build. Do not mark any row PASS without a real,
reproducible result. `docs/PAYMENTS_V1_STATUS.md` and the final verdict in any
payments readiness report must keep sandbox E2E as **pending** until this file is
filled in with real evidence.

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
| Date/time | |
| Tester | |
| Family ID | |
| `family.created_at` | |
| `payment_start_at` | |
| Confirm post-cutoff | PASS / FAIL |
| Confirm not grandfathered before purchase | PASS / FAIL |
| RevenueCat App User ID | |
| Platform | iOS |
| App/build version | |

### Store / RevenueCat configuration

| Check | Result |
|-------|--------|
| Monthly SKU present | PASS / FAIL |
| Yearly SKU present | PASS / FAIL |
| Yearly SKU | `STORE_PRODUCT_YEARLY (see config/iap-product-contract.js)` |
| Trial | 14 days |
| RevenueCat entitlement | `basic` |
| Offering | `default` |
| Package | `$rc_annual` |
| Apple In-App Purchase Key configured | PASS / FAIL |
| RevenueCat server secret configured on backend (`REVENUECAT_SECRET_API_KEY`) | PASS / FAIL |
| Webhook authentication configured | PASS / FAIL |

### Purchase

| Field | Value |
|-------|-------|
| Paywall opened | PASS / FAIL |
| Yearly selected | PASS / FAIL |
| Store shows 14-day trial | PASS / FAIL |
| Sandbox purchase completed | PASS / FAIL |
| Apple transaction/reference | |
| RevenueCat event ID | |
| RevenueCat event type | |
| Webhook received at | |
| Webhook processing result | |

### Canonical entitlement (after webhook)

| Check | Result |
|-------|--------|
| `source = apple` | PASS / FAIL |
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

Replay/retry webhook once and reconcile again.

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

### iOS verdict

**PASS / FAIL**

**Blocker if FAIL:**

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
| iOS sandbox E2E | PASS / FAIL |
| Android sandbox E2E | PASS / FAIL |
| Canonical resolver verified | PASS / FAIL |
| Webhook verified | PASS / FAIL |
| Trusted reconcile verified | PASS / FAIL |
| Limited-account → Premium transition verified | PASS / FAIL |
| Mirrors verified | PASS / FAIL |
| Audit verified | PASS / FAIL |
| Idempotency verified | PASS / FAIL |

### Decision to enable billing

**GO / NO-GO**

PR #1050 is merged, but do not flip `app_settings.payment_enabled = true` or remove
`BILLING_UI_DISABLED` in the live app if either platform below is FAIL or not yet run.

Gift checkout is outside this gate and remains disabled.
