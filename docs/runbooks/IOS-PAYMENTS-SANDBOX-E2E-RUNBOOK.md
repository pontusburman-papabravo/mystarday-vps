# iOS Payments Sandbox E2E — Physical Device Runbook

**Scope:** iOS RevenueCat/StoreKit sandbox purchase only. Payments must remain **READY BUT OFF**
for everyone except the allowlisted reviewer/test family throughout this runbook.

**Do not** flip `app_settings.payment_enabled` or remove `BILLING_UI_DISABLED` as part of this
runbook. Both stay exactly as they are in prod. This procedure only proves the **existing** strict
sandbox bypass works end-to-end on a real device — it does not turn billing on for anyone else.

Record the result in [`docs/PAYMENTS_V1_SANDBOX_E2E_RUN_LOG.md`](../PAYMENTS_V1_SANDBOX_E2E_RUN_LOG.md).
This runbook is the **how**; that file is the **evidence log**.

Product contract (do not change here): `config/iap-product-contract.js` — entitlement `basic`,
offering `default`, packages `$rc_monthly` / `$rc_annual`, 14-day trial, monthly + yearly SKUs.

---

## Before the test

### 1. Identify the reviewer/test-family UUID safely

- Use a **new, post-cutoff test family** — `family.created_at` must be **after**
  `payment_start_at` (`2026-10-01T00:00:00+02:00` by default) and must not already be
  grandfathered. Grandfathered families are permanently immune to store webhooks
  (`docs/PAYMENTS_V1_STATUS.md` §6) and would make the sandbox purchase a no-op.
- Look the family UUID up **directly in Postgres**, not via application logs (server logs mask
  email via `maskEmail()` in `src/lib/log-redact.js`, but the raw family UUID itself is not a
  secret — email addresses and PINs are the sensitive part, so query by email and only ever paste
  the resulting **UUID**, never the email, PIN, JWT, or password, into a ticket/chat):
  ```sql
  SELECT id, created_at, country_code, is_lifetime_free
  FROM family
  WHERE id IN (SELECT family_id FROM parent WHERE LOWER(email) = LOWER('<test-family-email>'));
  ```
- Confirm it is **not** grandfathered:
  ```sql
  SELECT source, status, expires_at FROM family_entitlements
  WHERE family_id = '<family-uuid>' AND entitlement_key = 'basic';
  -- expect: no row, or a row with source != 'grandfathered'
  ```

### 2. Prod env/config values that must exist (verify, do not change the payment ones)

| Variable | Required value for this test | Notes |
|---|---|---|
| `app_settings.payment_enabled` | `false` | **Unchanged.** Global rollout switch stays off. |
| `BILLING_UI_DISABLED` | `true` | **Unchanged.** Hard kill switch stays on. |
| `REVENUECAT_SANDBOX_PURCHASES_ENABLED` | `true` | Enables the narrow sandbox bypass (§8 in `docs/app-store-iap.md`). |
| `REVENUECAT_SANDBOX_FAMILY_IDS` | exact test-family UUID(s), comma-separated | **No wildcard** — `*` is explicitly rejected by `src/lib/iap-sandbox-allowlist.js`. One UUID per family under test; do not add extra families "just in case." |
| `REVENUECAT_IOS_PUBLIC_SDK_KEY` (or `REVENUECAT_APPLE_PUBLIC_SDK_KEY`) | RevenueCat **public** SDK key (never `sk_…`/`rcsk_…`) | Exposed to the client only for allowlisted families — verified by `test/billing-kill-switch-regression.test.js`. |
| `REVENUECAT_SECRET_API_KEY` | RevenueCat **secret** key | Server-only, required for `/api/iap/sync` reconcile (503 `RC_NOT_CONFIGURED` if unset). |
| `REVENUECAT_WEBHOOK_SECRET` and/or `REVENUECAT_WEBHOOK_SIGNING_SECRET` | configured, matching RevenueCat Dashboard → Webhooks | Webhook returns 500 "Webhook not configured" if both are unset. |

After the run, remove the family UUID from `REVENUECAT_SANDBOX_FAMILY_IDS` (see "After the test")
— do not leave a standing bypass configured longer than needed.

### 3. Which build to install

- Install the build produced from the **`ios-v<version>` tag** on merged `main` that contains the
  IAP capability + RevenueCat Podfile fix (functionally the same diff as commit
  `783670b7`, merged to `main` as `cc4dc52a` via PR #1077). As of this writing that is
  **`ios-v1.4.3`** or any later tag — confirm you are not installing something older.
- Install via **TestFlight**, not an ad-hoc/local archive, so the build is traceable to a specific
  Xcode Cloud run and tag.

### 4. Verify the installed build actually contains the IAP fix

Because `CURRENT_PROJECT_VERSION` in the repo is only a **local fallback** — Xcode Cloud applies
the real `CI_BUILD_NUMBER` at archive time (`docs/ios-xcode-cloud-release.md`) — you cannot trust
the repo's build number alone. Do both:

1. **Repo-side (before you install anything):** confirm the tag you intend to test contains the
   fix:
   ```bash
   git fetch origin ios-v1.4.3   # or the tag you are about to build/install
   git show ios-v1.4.3:ios/App/App.xcodeproj/project.pbxproj | grep -A1 'com.apple.InAppPurchase ='
   git show ios-v1.4.3:ios/App/Podfile | grep RevenuecatPurchasesCapacitor
   # both must be present
   ```
2. **App Store Connect-side (after install):** In App Store Connect → your app → **Xcode Cloud**,
   open the CI run that produced the TestFlight build you installed and confirm its **source**
   (branch/tag/commit) matches the tag you verified in step 1. If Xcode Cloud shows a different
   source, or you cannot find a matching CI run, treat the build as **unverified** and stop —
   do not proceed with the sandbox purchase on that build.

---

## On iPhone

Use a **physical device** signed into a **Sandbox Apple ID** (App Store Connect → Users and
Access → Sandbox Testers) — StoreKit sandbox does not work reliably on the Simulator.

1. Fresh install (or force-quit + relaunch) the TestFlight build identified above.
2. Log in as the **test family** identified in step 1 (not the founder QA account — this test
   needs a post-cutoff, non-grandfathered family).
3. Navigate to the paywall/subscription UI (`/paywall`).
4. Verify **both** Monthly and Yearly products render (from `GET /api/iap/config?platform=ios` →
   `packages.monthly` / `packages.yearly`, product IDs matching `APPLE_PRODUCT_MONTHLY` /
   `APPLE_PRODUCT_YEARLY` in `config/iap-product-contract.js` — `<bundle-id>.subscription.monthly`
   / `<bundle-id>.subscription.yearly.v2`).
5. Verify price and **14-day trial** text matches ASC's configured pricing/trial for both plans.
6. Start a purchase, then **cancel** at the native StoreKit sheet (system "Cancel" or swipe-down).
   Confirm the app returns to the paywall in a clean, non-broken state and no entitlement is
   granted (`IAPManager.purchasePackage` returns `{ ok: false, code: ... }` — check via Safari Web
   Inspector / a debug console attached to the WebView, not by adding new logging).
7. Start the purchase again and **complete** it for real (sandbox purchase, sandbox account gets
   charged nothing).
8. Verify Premium unlocks in the UI (paywall/limited-account screens clear, subscription-gated
   features become available).
9. Force-quit and reopen the app **without** purchasing again — verify Premium is still active
   (entitlement persists via `/api/iap/config` + cached `IAPManager` state, not just a client-side
   flag that resets on relaunch).
10. Use **Restore Purchases** (native settings entry point) on the same account and confirm it
    reports the subscription as active without creating a duplicate purchase.
11. Repeat the "app restart" check once more after Restore Purchases to confirm entitlement is
    still read correctly on a cold start.

---

## Backend verification

### Safe to inspect

- Server logs for the `[iap-webhook]` / `[IAP]` prefixes (event type, family id, resulting
  `subscription_status` — these lines never include email, PIN, JWT, or raw secrets by design;
  see `src/routes/iap-webhook-handler.js` and `src/routes/iap.js`).
- `payment_audit_log` rows for the test family (event type, product id, timestamps, metadata —
  no PII).
- `family_entitlements` rows for the test family.
- `iap_webhook_log` for the `revenuecat_event_id` idempotency key.

### Never log or paste anywhere

- `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_WEBHOOK_SIGNING_SECRET`
- Any RevenueCat key matching `sk_…` / `rcsk_…` (see `isSecretSdkKey()` in
  `config/revenuecat-iap.js` — a startup check already fails loudly if one of these ends up in a
  *public* key slot, but never manually paste one into a log/ticket either way)
- JWT access/refresh tokens, session cookies, CSRF tokens
- Parent PIN, child PIN, passwords
- Raw email addresses (mask per `maskEmail()` convention: `a***@example.com`) — use the family
  **UUID** in any written test report instead

### Checks

1. **Webhook success** — after the sandbox purchase, the RevenueCat Dashboard → Webhooks delivery
   log shows a `200` to `POST /api/iap/webhook`, and the server log shows
   `[iap-webhook] Family <uuid> subscription_status → active` (not `expired`, not `skipped`).
2. **Reconcile success** — the client's `POST /api/iap/sync` (fired automatically after purchase
   and on app resume) returns `200` with `ok: true`; a `503`/`502` means
   `REVENUECAT_SECRET_API_KEY` is missing or RevenueCat verification failed (`RC_NOT_CONFIGURED` /
   `RC_VERIFY_FAILED`) — this is a backend config gap, fix before re-testing.
3. **Entitlement source = apple:**
   ```sql
   SELECT source, status, expires_at, metadata->>'plan' AS plan, revoked_at
   FROM family_entitlements
   WHERE family_id = '<family-uuid>' AND entitlement_key = 'basic'
   ORDER BY granted_at;
   -- expect exactly one active row, source = 'apple'
   ```
4. **Sandbox indicator** — the RevenueCat event/subscriber payload for this transaction should
   show `environment: 'SANDBOX'` (RevenueCat Dashboard → Customer → this subscriber). This is the
   confirmation that no real money moved and this was in fact a sandbox transaction.
5. **Product id** — matches `APPLE_PRODUCT_YEARLY` or `APPLE_PRODUCT_MONTHLY` from
   `config/iap-product-contract.js`, not the deprecated `STORE_PRODUCT_YEARLY_DEPRECATED` alias.
6. **Expiry** — `family_entitlements.expires_at` matches the sandbox-accelerated expiry RevenueCat
   reports for this subscription (sandbox subscriptions renew/expire on a compressed clock —
   minutes, not months — this is expected and not a bug).
7. **Duplicate/idempotency behaviour** — manually trigger a webhook replay (RevenueCat Dashboard →
   Webhooks → resend the same event, or re-POST the captured payload) and confirm:
   - the response is `200` with `{ duplicate: true }`
   - no second `family_entitlements` row is created
   - no second `payment_audit_log` row is created
   - `subscription_status` is unchanged

---

## After the test

1. **Remove** the test family's UUID from `REVENUECAT_SANDBOX_FAMILY_IDS` (or clear the variable
   entirely if no other sandbox testing is in progress). Do not leave a standing sandbox allowlist
   entry beyond the test window.
2. Re-confirm `app_settings.payment_enabled = false` and `BILLING_UI_DISABLED = true` were **never
   changed** during the test (re-check via `GET /api/admin/subscription-settings` or the DB
   directly).
3. **Verify a normal, non-allowlisted family still cannot purchase:** log in as any other family
   (not on the allowlist) on the same build and confirm `GET /api/iap/config?platform=ios` returns
   `nativePurchasesEnabled: false` and `apiKey: null` — the paywall must show store-download/no-op
   state, never a live purchase button.
4. Fill in the real results — including the sandbox environment indicator, product id, event IDs,
   and PASS/FAIL per row — in
   [`docs/PAYMENTS_V1_SANDBOX_E2E_RUN_LOG.md`](../PAYMENTS_V1_SANDBOX_E2E_RUN_LOG.md). Do not mark
   any row PASS without the real evidence from this run.
5. If the iOS run passes, this runbook's Android/Google Play equivalent still needs to run
   separately before flipping any global switch — see `docs/PAYMENTS_V1_STATUS.md` §"Next action".
   Do not enable `app_settings.payment_enabled` or remove `BILLING_UI_DISABLED` until **both**
   platforms are PASS.
