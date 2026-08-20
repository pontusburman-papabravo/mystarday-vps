# PAYMENTS V1 — Implementation status

Last verified HEAD: `3b8f48b3` on `cursor/payments-v1-premium-a1b7` (PR #1050)

## Done

- Canonical `family_entitlements` + `payment_audit_log` migrations with idempotent grandfather backfill
- `resolveFamilyEntitlements()` single resolver with precedence: grandfathered → admin → store → gift → none
- Legacy mirror sync (`family.subscription_status`, `family_subscriptions.components`) — not source of truth
- Entitlement mutations sync mirrors via `syncMirrorsFromResolver()` (resolver winner, not assumed empty state)
- Registration/OAuth signup uses `payment_start_at` cutoff (founder count removed from access)
- RevenueCat webhook writes canonical store rows + audit (skips grandfathered families)
- Yearly SKU enabled in `iap-product-contract.js` + `/api/iap/config`
- **`POST /api/iap/sync` — trusted reconciliation only** (`src/lib/iap-reconcile.js`): server fetches RevenueCat subscriber; client body ignored; fail-closed without RC secret / verify errors
- `/api/subscription/entitlements` + enriched `/api/subscription/status`
- Limited-account API gate (`requirePremiumApi`) for **parents and children** + `/paywall` + `/limited-account`
- Gift schema migration + `/api/gifts/redeem` with stacking queue start + rate limiting
- Native settings: restore purchases + manage subscription (removed “via webbläsaren” copy)
- Release-blocking tests in `test/payments-v1-entitlements.test.js` including:
  - P0 fabricated client sync cannot grant Premium
  - P1 store expiry + active admin → mirrors stay active
  - P1 child product API returns 402 without Premium
  - P1 reconcile unknown RC product → no Premium (`RC_PRODUCT_NOT_ALLOWED`)

## Security patch (PR #1050 — required before store config)

| ID | Issue | Fix |
|----|-------|-----|
| P0 | `/api/iap/sync` trusted client subscription claims | Reconcile from RevenueCat API only |
| P1 | Store expiry wrote `emptyPremium()` mirrors | `syncMirrorsFromResolver()` after mutations |
| P1 | Child sessions bypassed `requirePremiumApi` | Child limited-account allowlist + premium check on product routes |
| P1 | Reconcile accepted non-allowlisted RC product | `isAllowedProductId()` (webhook parity); `RC_PRODUCT_NOT_ALLOWED` |

**Do not merge, deploy, or configure App Store / Play / RevenueCat until this patch is merged and CI green.**

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

- Global `requirePremiumApi` may need path allowlist tuning as new parent/child APIs ship
- Gift checkout without verified external compliance must stay disabled until sign-off
- Default `payment_start_at` (2026-10-01) grandfathers all families created before that date
- `/api/iap/sync` requires `REVENUECAT_SECRET_API_KEY` — returns 503 when unset (fail closed)

## Next action

Security patch landed at `a9704d61`. Re-run full PR CI/E2E before store dashboard work. After CI green: sandbox IAP purchase → webhook → trusted `/api/iap/sync` on device.
