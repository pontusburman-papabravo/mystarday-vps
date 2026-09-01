# Android Payments sandbox E2E (manual)

**Status:** `ANDROID_SANDBOX_E2E = MANUAL_VERIFICATION_REQUIRED`

iOS sandbox E2E is recorded PASS (2026-08-28) in `docs/PAYMENTS_V1_SANDBOX_E2E_RUN_LOG.md`.
Android has **not** been recorded as a complete purchase → webhook → entitlement loop.

Do **not** report `IE_BILLING_READY` / `FI_BILLING_READY` as full PASS until this runbook has a dated PASS log.

## Preconditions (fail-closed)

- `billing_ui_globally_disabled` remains `true` on the live server unless an isolated admin/test path is used.
- `iap_paid_rollout_ready` remains `false`.
- `market_ie_open` and `market_fi_open` remain `false`.
- Use a Play license tester account, not a public purchaser.

## Exact steps

1. Install the current Play internal/closed track build on a physical Android device.
2. Confirm Play storefront is Ireland or Finland (EUR) — or use a license tester whose account is in those storefronts.
3. Sign in with an **admin-created test family** whose `family.country_code` is `IE` or `FI` (do not flip public market flags).
4. Open parent Premium / paywall. Confirm prices are **store `priceString`** (not a hardcoded portal target).
5. Start monthly purchase. Complete Play sandbox/test purchase.
6. Confirm `PurchasesPlugin.addCustomerInfoUpdateListener` fires and `/api/iap/reconcile` returns `has_premium: true`.
7. Confirm `POST /api/iap/webhook` for the same `rc_customer_id` (server log or `family_subscription_events`).
8. Kill app → reopen → still premium.
9. Restore Purchases on a second device/session → premium returns.
10. Record: Play version, RC customer id (not PII), product id, base plan, timestamps.

Product IDs: see `config/iap-product-contract.js` (`monthly` / `yearly` + storefront appendix).

## IE/FI paid-transition extras (same family)

11. Before Play billing is usable: confirm `paid_transition.kind` is `upcoming` or `hold`, not paywall.
12. After cutoff with Play/billing still OFF: confirm the family is **held** (no 402 lockout).
13. After Play/billing is usable: purchase → webhook → restore as above, EUR `priceString`.

This environment cannot complete steps 1–10 without a physical Play tester. Keep `ANDROID_SANDBOX_E2E = MANUAL_VERIFICATION_REQUIRED`.

## Pass criteria

All of: purchase UI, store price string, webhook, reconcile, restart persistence, restore.

Until then: **NOT VERIFIED** — never “probably ready”.
