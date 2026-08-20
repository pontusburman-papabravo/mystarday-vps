# PAYMENTS V1 — Store compliance checklist

Max ~2 pages. **Do not enable paid gift sales or in-app external purchase CTAs until each row is verified.**

## Requirements

| Area | Requirement | Status |
|------|-------------|--------|
| Apple subscriptions | Monthly + yearly in one subscription group; 14-day introductory trial; Swedish pricing | **EXTERNAL_VERIFICATION_REQUIRED** |
| Google subscriptions | Monthly + yearly base plans; 14-day trial offer; Swedish pricing | **EXTERNAL_VERIFICATION_REQUIRED** |
| RevenueCat | Entitlement `basic`; offering `default`; monthly + yearly packages; webhook auth | **EXTERNAL_VERIFICATION_REQUIRED** |
| Ordinary Premium on web | Must **not** sell auto-renewing Premium on web — app stores only | Implemented (web → app direction) |
| Gift card **sale** in iOS app | Digital gift codes sold **inside** iOS app must use IAP unless eligible external program | **EXTERNAL_VERIFICATION_REQUIRED** — web-only sale path planned |
| Gift card **sale** promoted from Android | External offers / Billing Choice enrollment if linking to web checkout | **EXTERNAL_VERIFICATION_REQUIRED** |
| Gift card **redemption** in app | Code entry / external link must match current App Review + Play policies | Implemented as authenticated redeem API; native UX pending compliance sign-off |
| EU consumer law / VAT | Receipts, refund rules, B2B fields for business gifts | Partial — audit log + order schema; full checkout/receipts pending |

## Verified in repo (not store consoles)

- Server-side entitlement resolver is canonical; RevenueCat client is not access source of truth
- Grandfathered families cannot lose access via webhook; **grandfathering is SE-only** (`payment_start_at` cutoff does not apply to IE/NO/DK/GB)
- No Stripe subscription checkout reintroduced
- Gift purchase checkout disabled until PSP + compliance verified (`/api/gifts/settings.checkout_available: false`)

### Product contract (configure identically in Apple, Google, RevenueCat)

Authoritative IDs: `config/iap-product-contract.js` (`APPLE_PRODUCT_*`, `GOOGLE_PRODUCT_*`).

**RevenueCat:** entitlement `basic` · offering `default` · packages `$rc_monthly` / `$rc_annual`.

**Portal target prices (runtime UI uses store-localized prices, not these literals):**

| Market | Monthly | Yearly | Trial |
|--------|---------|--------|-------|
| Sweden | 59 SEK | 590 SEK | 14-day intro (one per subscription group) |
| Ireland | €5.99 | €59.99 | 14-day intro on both base plans |

**Rollout (must stay closed until portal E2E):** `market_ie_open` OFF · paid rollout OFF · sandbox allowlist required · no web Premium checkout.

## External checks before go/no-go

1. App Store Connect: products live, trial configured, review notes updated
2. Play Console: products active, trial eligible, package name verified in console
3. RevenueCat dashboard: products mapped, sandbox and live API keys separated, webhook destination live
4. Apple Legal / App Review: confirm gift **web sale** + in-app **redemption UX** for current storefront
5. Google Play: confirm external offer requirements if Android app links to web gift purchase
6. Stripe (or chosen PSP): gift-only account, PCI scope, refund/chargeback webhooks
7. Sandbox purchase iOS + Android → webhook → `/api/iap/sync` → Premium active
8. Legal review of gift terms (12-month redemption window from delivery, no auto-renew)

## Go / no-go

| Decision | Condition |
|----------|-----------|
| **GO** subscriptions | §46 subscription rows verified + sandbox E2E pass |
| **GO** gift sales | Compliance rows 4–6 signed off + checkout + email/PDF tested |
| **NO-GO** | Any required enrollment missing — do not ship workaround obfuscation |

## Fees / reporting

Apple/Google net proceeds are **not** inferred in-repo. Use import adapter boundary for store financial reports (spec §34).
