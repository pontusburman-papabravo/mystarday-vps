# Native IAP configuration schema (RevenueCat + Apple/Google)

No secret values in git. Set on VPS `.env` and in native build environments only.

Canonical product contract: `config/iap-product-contract.js`.

## Native build (public SDK keys)

| Variable | Required | Secret? | Where | Restart/build |
|----------|----------|---------|-------|----------------|
| `REVENUECAT_IOS_PUBLIC_SDK_KEY` | Yes (iOS) | Public (`appl_…`) | Server `.env` → `GET /api/iap/config` | Server restart; WebView reload |
| `REVENUECAT_ANDROID_PUBLIC_SDK_KEY` | Yes (Android) | Public (`goog_…`) | Server `.env` | Server restart |

Keys are **not** baked into the native binary — the authenticated config API returns the correct public key after sandbox gate checks.

Run `npm run cap:sync:ios` / `cap:sync:android` after `@revenuecat/purchases-capacitor` is installed.

## Server (webhook + allowlists)

| Variable | Required | Secret? | Where | Restart |
|----------|----------|---------|-------|---------|
| `REVENUECAT_WEBHOOK_SECRET` | Yes | Yes | VPS `.env` | systemd app restart |
| `REVENUECAT_WEBHOOK_SIGNING_SECRET` | If HMAC enabled in RC | Yes | VPS `.env` | Restart |
| `REVENUECAT_ALLOWED_APP_IDS` | Yes for webhook readiness | No | VPS `.env` | Restart |
| `REVENUECAT_ALLOWED_PRODUCT_IDS` | Recommended (defaults to store SKU from contract) | No | VPS `.env` | Restart |
| `REVENUECAT_SANDBOX_FAMILY_IDS` | Yes for sandbox QA (UUIDs only, no `*`) | No | VPS `.env` | Restart |
| `REVENUECAT_SANDBOX_PURCHASES_ENABLED` | Must be `true` for native sandbox purchases | No | VPS `.env` | Restart |
| `APPLE_BUNDLE_ID` / `ANDROID_PACKAGE_NAME` | Yes | No | VPS `.env` | Restart |

## Kill switches

| Variable | Effect |
|----------|--------|
| `BILLING_UI_DISABLED=true` | Global billing UI off (unchanged) |
| `payment_enabled` (DB) | Paid IAP off until rollout |
| `REVENUECAT_SANDBOX_PURCHASES_ENABLED` | Master switch for sandbox native purchases |

Sandbox QA requires **both** `REVENUECAT_SANDBOX_PURCHASES_ENABLED=true` and family UUID in `REVENUECAT_SANDBOX_FAMILY_IDS`.

## Readiness

`GET /health` includes `iap_readiness`, `iap_native_ios_ready`, `iap_native_android_ready`, `iap_sandbox_ready`, `iap_paid_rollout_ready` (boolean flags only; paid rollout stays false until global flags allow purchases).
