# PAYMENTS V1 — Implementation status

**PR #1050 is merged to `main`.** The live-deployed app is currently running `main` HEAD with this code shipped. See `docs/app-store-iap.md` for the full architecture writeup and `docs/PAYMENTS_STORE_COMPLIANCE.md` for the store-configuration checklist.

**Current live state: READY BUT OFF.** `app_settings.payment_enabled = false`, `BILLING_UI_DISABLED = true`, `payment_start_at = 2026-10-01T00:00:00+02:00`. No normal live-app user can reach a real Apple/Google purchase (see "Kill switches" below). All entitlement/webhook/sync backend code is shipped and covered by automated tests.

## Done (code, shipped)

- Canonical `family_entitlements` + `payment_audit_log` migrations with idempotent grandfather backfill
- `resolveFamilyEntitlements()` single resolver with precedence: grandfathered → admin → store (apple/google) → gift → computed IE/FI `prebilling` → none
- Legacy mirror sync (`family.subscription_status`, `family_subscriptions.components`) — not source of truth, kept in sync via `syncMirrorsFromResolver()`
- Registration/OAuth signup uses country payment-start: SE grandfather via `payment_start_at`; IE/FI temporary launch access via `market_ie_payment_start_at` / `market_fi_payment_start_at` (see `docs/ie-fi-prebilling-access.md`)
- RevenueCat webhook writes canonical store rows + audit (skips grandfathered families; skips sandbox events for non-allowlisted families)
- Monthly **and** yearly SKUs live in `config/iap-product-contract.js` + `/api/iap/config`
- **`POST /api/iap/sync` — trusted reconciliation only** (`src/lib/iap-reconcile.js`): server fetches the RevenueCat subscriber via REST; client body is ignored; fails closed (503) without `REVENUECAT_SECRET_API_KEY` or on verify errors
- `/api/subscription/entitlements` + enriched `/api/subscription/status`
- Limited-account API gate (`requirePremiumApi`) for **parents and children** + `/paywall` + `/limited-account`
- Gift schema migration + `/api/gifts/redeem` with stacking queue start + rate limiting
- Native settings: restore purchases + manage subscription
- **RevenueCat event contract audit (this PR):** confirmed RevenueCat has no `REVOCATION` and no `REFUND` webhook event `type` — refunds/revocations surface via `CANCELLATION`/`EXPIRATION` with `cancel_reason`/`expiration_reason = CUSTOMER_SUPPORT`. Removed a dead, never-fired `'REFUND'` event-type branch; added `cancel_reason`/`expiration_reason` capture into `payment_audit_log.metadata` for observability. Behavior for Apple and Google is identical (`CUSTOMER_SUPPORT` is supported on both).
- Release-blocking tests, including:
  - `test/payments-v1-entitlements.test.js` — P0 fabricated client sync cannot grant Premium; P1 store expiry + active admin → mirrors stay active; P1 child product API returns 402 without Premium; P1 reconcile unknown RC product → no Premium (`RC_PRODUCT_NOT_ALLOWED`)
  - `test/revenuecat-revocation-refund.test.js` — revocation/refund via `CUSTOMER_SUPPORT` reason, duplicate/stale event protection, grandfathering immunity, Apple/Google parity
  - `test/billing-kill-switch-regression.test.js` — `payment_enabled=false` + `BILLING_UI_DISABLED=true` never exposes an SDK key or `nativePurchasesEnabled: true` to a normal family; sandbox allowlist requires the exact UUID **and** the explicit flag together; wildcard allowlist entries are always rejected; allowlist membership never itself grants Premium

## iOS / Android native readiness (this PR)

- iOS: `ios/App/App.xcodeproj/project.pbxproj` now declares the `com.apple.InAppPurchase` Xcode capability on the App target (Xcode's `SystemCapabilities` bookkeeping — note there is **no valid `.entitlements` key** for In-App Purchase; Apple's own guidance calls `com.apple.developer.in-app-purchase` / `com.apple.InAppPurchase` in an entitlements file a "hallucinated entitlement"). `ios/App/Podfile` now includes the `RevenuecatPurchasesCapacitor` pod (was missing — `pod install` would never have linked RevenueCat's native code). Verified via `scripts/verify-iap-native-capacitor.mjs` + `test/ios-iap-capability.test.js`.
- Android: `scripts/patch-android-manifest.mjs` now rewrites `MainActivity`'s `android:launchMode` from Capacitor's default `singleTask` to `singleTop` — RevenueCat requires `standard` or `singleTop` (backgrounding the app during Google Play's payment-verification redirect can otherwise cancel the purchase). `singleTop` is **not** equivalent to `singleTask`: it only reuses the existing instance when MainActivity is already topmost (`onNewIntent()`); App Link / back-stack behavior must be verified separately. Verified via `scripts/verify-android-native.mjs` + `test/patch-android-manifest-launch-mode.test.js`. `capacitor.settings.gradle` / `capacitor.build.gradle` confirm the RevenueCat Capacitor module resolves; Google Play Billing itself is pulled in transitively via RevenueCat's own `purchases-hybrid-common` Maven dependency (no manual Gradle change needed).
- **Both platforms need a new build** before submitting IAP: iOS needs the capability + a fresh archive; Android needs a fresh signed AAB regenerated via `npx cap sync android` (to pick up the manifest/Podfile changes) — see `docs/google-play-checklist.md` and `docs/r45-native-release-runbook.md`.

## In progress

- Gift web checkout (Stripe gift-only PSP)
- Gift purchaser self-service status links + PDF/email delivery
- Admin family subscription view + economics dashboard + churn survey
- Scheduled gift delivery worker + reminders

## Blocked externally (cannot be verified or completed from this repo)

- App Store Connect: subscription group, monthly + yearly products, 14-day trial, pricing/localization, banking/tax agreements — **EXTERNAL_VERIFICATION_REQUIRED**
- Google Play Console: subscription product + monthly/yearly base plans, 14-day trial, pricing — **EXTERNAL_VERIFICATION_REQUIRED**
- RevenueCat dashboard: offering/packages/webhook destination configuration matching `config/iap-product-contract.js` — **EXTERNAL_VERIFICATION_REQUIRED**
- Gift card sale/redemption Apple and Google compliance sign-off — see `PAYMENTS_STORE_COMPLIANCE.md`
- **Sandbox E2E purchase on a real device/build has not been executed.** See `PAYMENTS_V1_SANDBOX_E2E_RUN_LOG.md` — it remains an empty template. Do not treat sandbox E2E as passed until it has actually been run and the results pasted in.

## Store configuration required

See `PAYMENTS_STORE_COMPLIANCE.md`.

## Known risks

- Global `requirePremiumApi` may need path allowlist tuning as new parent/child APIs ship
- Gift checkout without verified external compliance must stay disabled until sign-off
- Default `payment_start_at` (2026-10-01) grandfathers all SE families created before that date
- `/api/iap/sync` requires `REVENUECAT_SECRET_API_KEY` — returns 503 when unset (fail closed)
- `PAYMENT_ENABLED` is a legacy env-var name that some older docs/secrets still reference by name — the app does **not** read it. The real switches are `app_settings.payment_enabled` (DB, admin UI) and `BILLING_UI_DISABLED` (env, hard override). Do not set `PAYMENT_ENABLED` expecting it to do anything.

## Next action

1. App Store Connect / Google Play Console / RevenueCat dashboard configuration (external — outside this repo)
2. A fresh iOS build (IAP capability) and Android AAB (manifest launch-mode fix) once store products exist
3. A real sandbox purchase → webhook → `/api/iap/sync` on both platforms, with results recorded in `PAYMENTS_V1_SANDBOX_E2E_RUN_LOG.md`
4. Only after all of the above: flip `app_settings.payment_enabled = true` and remove `BILLING_UI_DISABLED` — both are config-only changes, no redeploy or migration required
