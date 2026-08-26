# App Store IAP — RevenueCat + StoreKit / Play Billing Integration

Min Stjärndag supports in-app purchases (IAP) on **iOS and Android** via **RevenueCat** and the platform stores (Apple StoreKit / Google Play Billing). This is the **sole active payment path** — there is no web checkout, and no Stripe. This document covers the current (PAYMENTS V1) architecture: entitlement resolver, RevenueCat webhook backend, kill switches, and troubleshooting. <!-- pragma: allowlist secret -->

> **Stripe removed (Fas 5, 2026-06):** historical web/Stripe integration is archived in [`ARKIVERAT-STRIPE.md`](ARKIVERAT-STRIPE.md).
>
> **PAYMENTS V1 landed via [PR #1050](https://github.com/pontusburman-papabravo/mystarday-vps/pull/1050) — merged.** <!-- pragma: allowlist secret --> The founder-count "lifetime free" model (`src/lib/payment-policy.js`, `hasActiveSubscription()`) is superseded by the canonical entitlement resolver described below. `src/lib/subscription.js`'s `hasActiveSubscription()` still exists but is **not used by any middleware** — do not add new callers.
>
> **Current state: payments are READY BUT OFF.** `app_settings.payment_enabled = false` and `BILLING_UI_DISABLED=true` in the live app. See §8.

---

## 1. Overview

### Why RevenueCat?

Apple requires StoreKit for all digital purchases inside iOS apps (App Store Review Guideline 3.1.1). A direct StoreKit integration requires server-side receipt validation, which RevenueCat abstracts with a webhook + REST reconcile model. The same pattern applies to Android via Google Play Billing.

### Product contract

Authoritative source: `config/iap-product-contract.js`. Do not rename these identifiers without an ADR — they may already exist in App Store Connect / Google Play Console.

| Attribute | Value |
|---|---|
| **RevenueCat entitlement** | `basic` |
| **RevenueCat offering** | `default` |
| **RevenueCat packages** | `$rc_monthly`, `$rc_annual` |
| **iOS monthly product ID** | `se.mystarday.app.subscription.monthly` <!-- pragma: allowlist secret --> |
| **iOS yearly product ID** | `se.mystarday.app.subscription.yearly.v2` <!-- pragma: allowlist secret --> |
| **Android subscription product** | `se.mystarday.app.subscription.premium` <!-- pragma: allowlist secret --> |
| **Android base plans** | `monthly`, `yearly` (RevenueCat product id format `<product>:<base_plan>`) |
| **Plans offered** | Monthly **and** yearly (not monthly-only) |

### Platforms and billing

| Platform | Payment method | Status |
|---|---|---|
| **iOS / Android (native)** | RevenueCat + App Store / Play Store IAP | The only path that can ever charge a user |
| **Web (PWA)** | No purchase UI | No checkout — preview / store-download links only |

Web users can never purchase in the browser. `IAPManager.canShowPaymentUI()` returns `false` on non-native platforms unconditionally — this is not gated by `BILLING_UI_DISABLED`, it's structural (StoreKit/Play Billing don't exist in a browser).

---

## 2. Architecture

### Canonical entitlement resolver — single source of truth

`resolveFamilyEntitlements(familyId)` in `src/lib/family-entitlements.js`, backed by the `family_entitlements` table, is the **only** authority for "does this family have Premium". Precedence (highest wins): `grandfathered` > `admin` > `apple`/`google` (store) > `gift`. Legacy mirror columns (`family.subscription_status`, `family.is_lifetime_free`, `family_subscriptions.*`) are written *from* the resolver for backward compatibility with older UI/report code — they are never themselves authoritative.

### Purchase flow

```
App start (native)
  │
  ├── IAPManager.init()
  │     ↓
  │   GET /api/iap/config   ← fetches nativePurchasesEnabled + a *public* SDK key
  │     ↓ (only if server says nativePurchasesEnabled: true)
  │   Purchases.configure({ apiKey })
  │     ↓
  │   Purchases.logIn(familyId)   ← family UUID as RevenueCat app_user_id
  │
  └── User selects a plan (monthly or yearly)
        ↓
      Purchases.purchasePackage(package)
        ↓
      Apple StoreKit / Google Play Billing (native UI)
        ↓
     purchase completes / is cancelled
        ↓
      RevenueCat records the transaction
        ↓
      POST /api/iap/webhook   →  backend writes a `family_entitlements` row (source apple/google)
        │                        + mirrors family.subscription_status for legacy readers
        ↓
      Client also calls POST /api/iap/sync (trusted server-side reconcile,
      ignores anything the client sends) after purchase/restore for immediate UI feedback
```

### Files involved

| File | Role |
|---|---|
| `public/js/iap-manager.js` | Client: RevenueCat Capacitor SDK bridge, purchase/restore/manage entry points |
| `public/js/iap-native-client-logic.js` | Client: pure gating/mapping rules (no DB, no fetch) |
| `public/js/paywall.js`, `public/paywall.html` | Client: paywall UI (native purchase plans, web store-download fallback) |
| `src/routes/iap.js` | Backend: `GET /api/iap/config`, `POST /api/iap/sync` |
| `src/routes/iap-webhook-handler.js` | Backend: `POST /api/iap/webhook` HTTP handler (auth + response codes) |
| `src/lib/revenuecat-webhook-verify.js` | Static Authorization + optional HMAC signature verification |
| `src/lib/revenuecat-webhook-process.js` | Event parsing, ordering, idempotency, `family_entitlements` writes |
| `src/lib/revenuecat-event-ordering.js` | Deterministic total order for out-of-order/retried webhooks |
| `src/lib/iap-reconcile.js` | `/api/iap/sync` — trusted server-side RevenueCat REST reconcile |
| `src/lib/iap-native-purchase-gate.js` | `getNativePurchaseEligibility()` — the authoritative on/off decision |
| `src/lib/iap-sandbox-allowlist.js` | Strict UUID-only sandbox reviewer/QA allowlist (no wildcard) |
| `src/lib/billing-ui.js` | `BILLING_UI_DISABLED` env + `payment_enabled` DB read |
| `src/lib/family-entitlements.js` | Canonical resolver, precedence, grandfathering, mirror sync |
| `config/iap-product-contract.js` | Product/entitlement/offering/package identifiers (§1) |
| `migrations/1810400000000_payments_v1_entitlements.js` | `family_entitlements` + `payment_audit_log` schema, `payment_start_at` grandfather backfill |
| `migrations/1810000000012_iap_webhook_log.js` (+ `…15`, `…16`, `1810130000000`) | Webhook idempotency + event-ordering audit columns |

---

## 3. Environment variables

All variables are set in the VPS `.env` for the live deploy (see `docs/RELEASE.md`). None of the RevenueCat identifiers below are secrets except the two explicitly marked secret.

| Variable | Requirement | Exposed to client? |
|---|---|---|
| `REVENUECAT_SECRET_API_KEY` | **Secret.** Required for `/api/iap/sync` reconcile. | Never |
| `REVENUECAT_WEBHOOK_SECRET` | **Secret.** Required for webhook static-auth mode. | Never |
| `REVENUECAT_WEBHOOK_SIGNING_SECRET` | Secret. Optional, enables HMAC auth mode. | Never |
| `REVENUECAT_WEBHOOK_AUTH_MODE` | `static` \| `hmac` \| `both`. Default: `both` if both secrets set. | — |
| `REVENUECAT_IOS_PUBLIC_SDK_KEY` (alias `REVENUECAT_APPLE_PUBLIC_SDK_KEY`) | Public key — safe to expose. | Yes, via `GET /api/iap/config?platform=ios`, **only** when the server has decided the requesting family is purchase-eligible (§8) |
| `REVENUECAT_ANDROID_PUBLIC_SDK_KEY` (alias `REVENUECAT_GOOGLE_PUBLIC_SDK_KEY`) | Public key — safe to expose. | Yes, via `?platform=android`, same eligibility gate |
| `REVENUECAT_ENTITLEMENT_ID` | Optional, default `basic`. | — |
| `REVENUECAT_ALLOWED_PRODUCT_IDS` / `REVENUECAT_ALLOWED_APP_IDS` | Recommended webhook/reconcile allowlists. | — |
| `REVENUECAT_SANDBOX_FAMILY_IDS` / `REVENUECAT_SANDBOX_PURCHASES_ENABLED` | Reviewer/QA sandbox allowlist — see §8. | — |
| `BILLING_UI_DISABLED` | **The hard kill switch.** `true`/`1`/`yes` forces all billing UI + native purchase eligibility off, overriding `payment_enabled`. | — |
| `REVENUECAT_STRICT_CLIENT_KEYS` | Optional. `true` makes startup crash (instead of just log) if a secret-shaped key is found in a public key slot. | — |

**There is no `REVENUECAT_API_KEY` env var read for client exposure any more.** Client-visible keys are always the platform-specific `*_PUBLIC_SDK_KEY` variables, gated by `getNativePurchaseEligibility()` — never a single shared key.

**`payment_enabled` is a DB setting, not an env var.** See §8.

---

## 4. Platform gating

All client-side platform logic lives in `public/js/iap-manager.js` + `public/js/iap-native-client-logic.js`. The server is authoritative — the client never decides eligibility on its own.

```javascript
// Simplified — see iap-native-client-logic.js for the real implementation.
function canShowPaymentUI() {
  return isNative(); // native-only; web never shows purchase UI
}

function canPurchase() {
  // Requires the *server* response from GET /api/iap/config to have said
  // nativePurchasesEnabled === true AND supplied a usable apiKey.
  return isNative() && _initialized && _config?.nativePurchasesEnabled === true;
}
```

- Web: `canShowPaymentUI()` is always `false` — the paywall shows App Store / Play Store download links instead.
- Native: purchase controls stay disabled/hidden until `GET /api/iap/config` reports `nativePurchasesEnabled: true` — which, given the currently intended defaults, only happens for a family on the sandbox allowlist (§8).
- `/upgrade` always redirects to `/paywall`; `/paywall` itself is inert while purchases are off.

---

## 5. Webhook validation

### Endpoint

```
POST /api/iap/webhook
Content-Type: application/json
Authorization: <value configured in RevenueCat Dashboard>
```

Optional when HMAC signing is enabled in RevenueCat:

```
X-RevenueCat-Webhook-Signature: t=<unix_timestamp>,v1=<hmac_sha256_hex>
```

### Validation steps

1. **Webhook auth not configured** (`REVENUECAT_WEBHOOK_SECRET` and `REVENUECAT_WEBHOOK_SIGNING_SECRET` both unset) → `500`
2. **Invalid auth** → `401 Unauthorized`
3. **Body not valid JSON** → `400 Bad Request`
4. **Missing `event` or `event.type`** → `400 Bad Request`
5. **Missing app user identity** → `400 Bad Request`
6. **Family not found** → `200 OK` with `{ skipped: "family_not_found" }` (RevenueCat retries on any non-2xx, so 200 here is intentional to stop retries for an orphan event)
7. **Family is grandfathered** → `200 OK` with `{ skipped: "grandfathered" }` — the webhook is a no-op; grandfathering can never be removed by a store event
8. **Stale / out-of-order event** (an event with an older `event_timestamp_ms` than what's already applied) → `200 OK` with `{ skipped: "skipped_stale" }`
9. **Transient DB error** → `503 Service Unavailable` (RevenueCat retries)
10. **Successfully processed, or duplicate `event.id`** → `200 OK`

Idempotency: `event.id` is stored in `iap_webhook_log.revenuecat_event_id` (PRIMARY KEY). Duplicate deliveries return `200` with `{ duplicate: true }` and never re-apply state.

### Event types and status mapping

RevenueCat's webhook contract has **no `REVOCATION` and no `REFUND` event `type`** (verified against the official [event types doc](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields)). A store-side refund/revocation is represented via a reason field on an existing event type:

| Event type | `subscription_status` result | Notes |
|---|---|---|
| `INITIAL_PURCHASE` | `active` | Sets `rc_customer_id` |
| `RENEWAL`, `UNCANCELLATION`, `PRODUCT_CHANGE`, `SUBSCRIPTION_EXTENDED`, `REFUND_REVERSED` | `active` | |
| `CANCELLATION` | `active` if `expiration_at_ms` is still in the future, else `expired` | Does **not** end access immediately — auto-renew was turned off, or (if `cancel_reason: CUSTOMER_SUPPORT`) the current period was refunded but access may continue until expiry |
| `EXPIRATION` | `expired` | The event that actually removes access — including for refunds (`expiration_reason: CUSTOMER_SUPPORT`) |
| `BILLING_ISSUE` | `grace_period` | Store is retrying the charge |
| `SUBSCRIPTION_PAUSED` | `active`/`expired` by expiry | Google Play only |
| `TRANSFER` | *(not implemented — logged and skipped)* | |
| *(other/unknown types)* | *(no status change)* | `200 OK`, logged as `skipped` |

Both Apple and Google support `cancel_reason`/`expiration_reason: CUSTOMER_SUPPORT` identically — there is no platform-specific branch needed for refund/revocation handling.

### Lookup logic

1. `family.id` matches one of: `app_user_id`, `original_app_user_id`, any `aliases` entry
2. Otherwise `family.rc_customer_id` matches one of the same candidates

See also `docs/code-review-p0-iap-deploy.md` for the original security-patch checklist (PR #1050, now merged).

---

## 6. Grandfathering (replaces the old "lifetime free" founder-count model)

Grandfathering is **not** based on a founder headcount any more. A family is grandfathered when **both**:

- `country_code = 'SE'` (Sweden only — grandfathering does not apply to Ireland, Finland, or any other market), and
- `family.created_at` is strictly before `payment_start_at` (DB setting, currently `2026-10-01T00:00:00+02:00`).

Grandfathered families get a `family_entitlements` row with `source = 'grandfathered'`, `expires_at = NULL` — permanent, and immune to any store webhook (webhooks for a grandfathered family are always skipped, never applied).

`src/lib/subscription.js`'s `hasActiveSubscription()` and `is_lifetime_free` are **legacy mirrors**, kept in sync by the resolver for old reporting code — new code must call `resolveFamilyEntitlements()` / `hasPremiumAccess()` instead.

---

## 7. Testing

Run (against a disposable test DB — never `DATABASE_URL`):

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test TEST_DB_DESTRUCTIVE_CONFIRM=1 REQUIRE_EMAIL_VERIFICATION=false npm run test:gate
```

Relevant files: `test/payments-v1-entitlements.test.js`, `test/payments-v1-grandfather-migration.test.js`, `test/iap-webhook.test.js`, `test/iap-webhook-ordering.integration.test.js`, `test/revenuecat-revocation-refund.test.js`, `test/billing-kill-switch-regression.test.js`, `test/iap-native-purchase-gate.test.js`, `test/iap-config-route.test.js`, `test/migration-iap-safety.integration.test.js`.

---

## 8. READY BUT OFF — kill switches and reviewer/sandbox testing

Two independent switches, both currently OFF:

| Switch | Kind | Current value | Effect |
|---|---|---|---|
| `BILLING_UI_DISABLED` | env, hard override | `true` | Forces `nativePurchasesEnabled: false` and no SDK key for every family, unconditionally |
| `app_settings.payment_enabled` | DB setting (admin UI toggle, `PUT /api/admin/subscription-settings`) | `false` | Global rollout switch — irrelevant while `BILLING_UI_DISABLED=true` |

With both off, `GET /api/iap/config` returns `nativePurchasesEnabled: false` and `apiKey: null` for every normal family — the RevenueCat SDK is never even configured client-side, so there is no code path that can reach a real purchase.

### Reviewer / sandbox testing without exposing purchase to everyday users

`getNativePurchaseEligibility()` has a separate, narrow bypass: a family whose UUID is listed in `REVENUECAT_SANDBOX_FAMILY_IDS` **and** with `REVENUECAT_SANDBOX_PURCHASES_ENABLED=true` gets `nativePurchasesEnabled: true` and a real SDK key, even while `BILLING_UI_DISABLED=true`. This is how App Store / Google Play reviewers (or internal QA) can complete a real sandbox purchase end-to-end while every other user is fully blocked. The allowlist:

- requires an **exact** family UUID match (case-insensitive) — never a prefix or substring match
- explicitly **rejects a wildcard `*` entry** — a misconfigured `REVENUECAT_SANDBOX_FAMILY_IDS=*` grants access to nobody
- does **not** itself write to `family_entitlements` or grant Premium — it only lets the family reach the RevenueCat purchase flow; Premium still requires a real (sandbox) purchase + webhook/sync

### Enabling billing later

No DB migration is required. To go live: (1) confirm App Store Connect / Google Play Console / RevenueCat dashboard configuration matches §1 exactly, (2) remove/flip `BILLING_UI_DISABLED`, (3) set `app_settings.payment_enabled = true` via the admin UI. Both are simple configuration changes, not deploys.

---

## 9. Troubleshooting

### RevenueCat Dashboard

1. Log in to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select the project
3. **Purchases → Overview** — active subscriptions per entitlement
4. **Events → Webhooks** — sent webhook events and delivery status
5. **Diagnostics** — webhook errors and retry logs

### Common problems

| Problem | Symptom | Fix |
|---|---|---|
| SDK never configures | `nativePurchasesEnabled: false` even for a sandbox family | Check `REVENUECAT_SANDBOX_FAMILY_IDS` contains the **exact** family UUID and `REVENUECAT_SANDBOX_PURCHASES_ENABLED=true` |
| No purchase reaches RevenueCat | Purchase button stays disabled | This is expected for any family not on the sandbox allowlist while `BILLING_UI_DISABLED=true` — see §8 |
| Webhook `401` | Log shows auth failure | Check `REVENUECAT_WEBHOOK_SECRET` / `REVENUECAT_WEBHOOK_SIGNING_SECRET` match the RevenueCat Dashboard webhook config exactly |
| Webhook `500` | Log shows `Webhook not configured` | Set `REVENUECAT_WEBHOOK_SECRET` and/or `REVENUECAT_WEBHOOK_SIGNING_SECRET` |
| Grandfathered family "can't buy" | Purchase UI never shows for an old SE family | Expected — grandfathered families have permanent free Premium and never see a paywall CTA |
| `/api/iap/sync` returns 503 | `RC_NOT_CONFIGURED` | `REVENUECAT_SECRET_API_KEY` (or fallback `REVENUECAT_API_KEY`) is missing |
