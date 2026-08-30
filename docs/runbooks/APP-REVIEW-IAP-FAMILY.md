# App Review IAP family — READY BUT OFF

Create a **dedicated** sandbox family so Apple can exercise Premium Monthly and Premium Yearly **without** turning on billing for ordinary users.

This runbook does **not** flip `payment_enabled`, remove `BILLING_UI_DISABLED`, change `payment_start_at`, or open market gates.

**STOP before live VPS env mutation or live account creation until this procedure is independently reviewed.**

Do **not** put the family UUID, email, or password in git.

## Why a second account

The complimentary App Store demo account (`APP_REVIEW_*`, founding/grandfathered) must keep full free Premium and **must not** be the IAP allowlist UUID. Grandfathered families do not show a Monthly/Yearly purchase path.

## Required live-app state (unchanged)

| Switch | Value |
|---|---|
| `app_settings.payment_enabled` | `false` |
| `BILLING_UI_DISABLED` | `true` |
| `payment_start_at` | `2026-10-01T00:00:00+02:00` (do not change) |
| Public market registration gates | unchanged (SE open; others closed) |

## Required sandbox env (VPS process restart)

| Variable | Value |
|---|---|
| `REVENUECAT_SANDBOX_PURCHASES_ENABLED` | `true` |
| `REVENUECAT_SANDBOX_FAMILY_IDS` | **exactly one** family UUID — the IAP review family. No `*`. |

Public RevenueCat iOS SDK key must already be configured (`REVENUECAT_IOS_PUBLIC_SDK_KEY` or equivalent). Never put a secret `sk_` / `rcsk_` key in a client env.

After the review cycle, remove that UUID from `REVENUECAT_SANDBOX_FAMILY_IDS` (or clear the variable) so no standing bypass remains.

## Family requirements

Create (or verify) one family that is **all** of:

- not grandfathered (`family_entitlements` has no active `source = 'grandfathered'` row)
- not `is_lifetime_free`
- no active store/gift/admin Premium row
- can log in with email/password (do not depend on public registration remaining open — seed the parent server-side)
- `country_code` **not** `SE` **or** `created_at` after `payment_start_at`, so Swedish cutoff grandfathering cannot apply

Store credentials only in the approved secret store (suggested names: `APP_REVIEW_IAP_EMAIL`, `APP_REVIEW_IAP_PASSWORD`). Never commit them.

## Verify before sending Apple notes

As the **complimentary** review account:

- Settings may show complimentary Premium
- `GET /api/iap/config` → `nativePurchasesEnabled: false`, `apiKey: null`

As the **IAP** review account:

- `GET /api/subscription/status` → `subscription_ui_visible: true`, `native_purchase_eligible: true`
- `GET /api/iap/config?platform=ios` → `nativePurchasesEnabled: true`, public `apiKey` present, monthly + yearly product IDs unchanged
- Native `/paywall` loads Monthly and Yearly from StoreKit/RevenueCat
- Monthly sheet, Yearly sheet, and Restore Purchases are reachable

Do **not** use `/review/subscription-preview` as the purchase path (admin-only, non-purchasable).

## Versioning

Keep `MARKETING_VERSION` **1.4.3** unless App Store Connect cannot accept another 1.4.3 build. Submit a new Xcode Cloud build **1123+**. Do not reuse 1122.

## Review notes

Only paste App Review notes after both reviewer paths above are proven on the submitted build. Draft navigation lives in the PR — do not send until verified. Do not write secrets into `docs/app-store-review-notes.md` until that proof exists.
