# PAYMENTS V1 — Implementation status

## Done

- Canonical `family_entitlements` + `payment_audit_log` migrations with idempotent grandfather backfill
- `resolveFamilyEntitlements()` single resolver with precedence: grandfathered → admin → store → gift → none
- Legacy mirror sync (`family.subscription_status`, `family_subscriptions.components`) — not source of truth
- Registration/OAuth signup uses `payment_start_at` cutoff (founder count removed from access)
- RevenueCat webhook writes canonical store rows + audit (skips grandfathered families)
- Yearly SKU enabled in `iap-product-contract.js` + `/api/iap/config`
- `/api/iap/sync` post-purchase reconciliation
- `/api/subscription/entitlements` + enriched `/api/subscription/status`
- Limited-account API gate (`requirePremiumApi`) + `/paywall` + `/limited-account`
- Gift schema migration + `/api/gifts/redeem` with stacking queue start + rate limiting
- Native settings: restore purchases + manage subscription (removed “via webbläsaren” copy)
- Release-blocking tests in `test/payments-v1-entitlements.test.js`

## In progress

- Gift web checkout (Stripe gift-only PSP)
- Gift purchaser self-service status links + PDF/email delivery
- Admin family subscription view + economics dashboard + churn survey
- Scheduled gift delivery worker + reminders

## Blocked externally

- App Store Connect monthly/yearly + 14-day trial — **EXTERNAL_VERIFICATION_REQUIRED**
- Google Play monthly/yearly + 14-day trial — **EXTERNAL_VERIFICATION_REQUIRED**
- RevenueCat offering/packages/webhook dashboard config — **EXTERNAL_VERIFICATION_REQUIRED**
- Gift card sale/redemption Apple and Google compliance sign-off — see `PAYMENTS_STORE_COMPLIANCE.md`

## Launch blockers

All items in spec §47 remain open until external verification + remaining UX/admin/gift checkout work completes.

## Store configuration required

See spec §46 and `PAYMENTS_STORE_COMPLIANCE.md`.

## Known risks

- Global `requirePremiumApi` may need path allowlist tuning as new parent APIs ship
- Gift checkout without verified external compliance must stay disabled until sign-off
- Default `payment_start_at` (2026-10-01) grandfathers all families created before that date

## Next action

Complete Stripe gift-only checkout behind `gift_cards_sales_enabled` after compliance doc sign-off; run sandbox IAP purchase → webhook → `/api/iap/sync` end-to-end on device.
