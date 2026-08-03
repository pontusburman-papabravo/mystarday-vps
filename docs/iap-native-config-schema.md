# Native IAP configuration schema (RevenueCat + Apple/Google)

No secret values in git. Set on VPS `.env` and in native build environments only.

## Native build (public SDK keys)

| Variable | Required | Secret? | Where | Restart/build |
|----------|----------|---------|-------|----------------|
| `REVENUECAT_IOS_PUBLIC_SDK_KEY` | Yes (iOS) | Public (`appl_…`) | Server `.env` → `GET /api/iap/config` | Server restart; WebView picks up on reload |
| `REVENUECAT_ANDROID_PUBLIC_SDK_KEY` | Yes (Android) | Public (`goog_…`) | Server `.env` | Server restart |

Run `npm run cap:sync:ios` / `cap:sync:android` after adding `@revenuecat/purchases-capacitor` so the native `Purchases` plugin is embedded.

## Server (webhook + allowlists)

| Variable | Required | Secret? | Where | Restart |
|----------|----------|---------|-------|---------|
| `REVENUECAT_WEBHOOK_SECRET` | Yes | Yes | VPS `.env` | systemd app restart |
| `REVENUECAT_WEBHOOK_SIGNING_SECRET` | If HMAC enabled in RC | Yes | VPS `.env` | Restart |
| `REVENUECAT_WEBHOOK_AUTH_MODE` | Optional (`static` / `hmac` / `both`) | No | VPS `.env` | Restart |
| `REVENUECAT_SECRET_API_KEY` | Optional (reconcile script) | Yes (`sk_`/`rcsk_`) | VPS `.env` | N/A for runtime |
| `REVENUECAT_ALLOWED_APP_IDS` | Yes for webhook readiness | No | VPS `.env` | Restart |
| `REVENUECAT_ALLOWED_PRODUCT_IDS` | Recommended | No | VPS `.env` | Restart |
| `REVENUECAT_ENTITLEMENT_ID` | Optional (default `basic`) | No | VPS `.env` | Restart |
| `REVENUECAT_SANDBOX_FAMILY_IDS` | Yes for sandbox QA | No (UUID list) | VPS `.env` | Restart |
| `APPLE_BUNDLE_ID` | Yes | No | VPS `.env` | Restart |
| `ANDROID_PACKAGE_NAME` | Yes | No | VPS `.env` | Restart |

## Kill switches (unchanged in sandbox rollout)

| Variable | Effect |
|----------|--------|
| `BILLING_UI_DISABLED=true` | Hides global billing UI; **does not** block sandbox native purchases when family is in `REVENUECAT_SANDBOX_FAMILY_IDS` |
| `payment_enabled` (DB) | Global prod toggle; sandbox families use native gate only |

## Product contract

See `config/iap-native-contract.js` for store SKUs, RevenueCat offering/package ids, and entitlement `basic`.
