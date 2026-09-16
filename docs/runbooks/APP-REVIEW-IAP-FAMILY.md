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
- `created_at` on or after `lifetime_free_until` (2026-09-14 00:00 Europe/Stockholm) so they are not lifetime-grandfathered
- intro-year row expired or absent (first year already used), so Swedish IAP go-live date is not enough by itself

Store credentials only in the approved secret store (suggested names: `APP_REVIEW_IAP_EMAIL`, `APP_REVIEW_IAP_PASSWORD`). Never commit them.

## Approval gate (all required before Apple reply)

This is a **review-access fix** — not the start of paid rollout. Do **not** flip `payment_enabled`, remove `BILLING_UI_DISABLED`, or open market gates.

| # | Criterion | How to verify | Status |
|---|-----------|---------------|--------|
| 1 | PR #1163 merged and **exact merge SHA deployed** to prod | Deploy log / `curl` health on deployed SHA | ☐ |
| 2 | `npm run verify:app-review-iap` **GREEN** against prod | `VERIFY_BASE_URL=… APP_REVIEW_IAP_*=… npm run verify:app-review-iap` | ☐ |
| 3 | **Paid Apps Agreement = Active** | App Store Connect → Business → Agreements — confirm Active (FACT before reply) | ☐ |
| 4 | IAP account reaches **Inställningar → Premium → Aktivera Premium** | Physical iPhone, IAP review credentials | ☐ |
| 5 | **Premium Monthly + Premium Yearly** load from Apple sandbox (live StoreKit prices, not static/fallback copy) | Physical iPhone on `/paywall` | ☐ |
| 6 | Both products open **Apple sandbox purchase sheet** | Sandbox Apple Account on physical device | ☐ |
| 7 | Complimentary account stays lifetime-free, **no purchase path** | Same verify script with `APP_REVIEW_EMAIL` / `APP_REVIEW_PASSWORD` | ☐ |
| 8 | Ordinary live-app families unaffected; billing stays **OFF** | VPS: global payment switch off + billing UI disabled | ☐ |
| 9 | App Store Connect Review Information lists **both accounts with explicit labels** (IAP vs complimentary) | Paste from `docs/app-store-review-notes.md` § Build 1160 | ☐ |

**1.4.4 train is closed** (ITMS-90186 / ITMS-90062, Apple delivery 1.4.4 build 1188). Do **not** upload another 1.4.4 binary. Physical IAP proof (rows 4–6) belongs on the **next native submission** (1.4.5) if that binary is actually required. Web/paywall changes continue to reach Capacitor without a new IPA.

Public SE listing already shows Premium Årsvis + Premium Månadsvis with prices — do **not** re-attach those products to a new version unless ASC still shows first-of-type unapproved (`docs/app-store-review-notes.md`).

## Verify before sending Apple notes

Automated API check (no secrets in output):

```bash
APP_REVIEW_IAP_EMAIL=... APP_REVIEW_IAP_PASSWORD=... npm run verify:app-review-iap
```

Optional: pass `APP_REVIEW_EMAIL` / `APP_REVIEW_PASSWORD` to confirm the complimentary account stays purchase-blocked.

Prod read-only family inspection (on VPS):

```bash
cd "$VPS_APP_PATH" && source .env && node scripts/ops/inspect-app-review-iap-prod.cjs
```

As the **complimentary** review account:

- Settings may show complimentary Premium
- `GET /api/iap/config` → `nativePurchasesEnabled: false`, `apiKey: null`

As the **IAP** review account:

- `GET /api/subscription/status` → `subscription_ui_visible: true`, `native_purchase_eligible: true`
- `GET /api/iap/config?platform=ios` → `nativePurchasesEnabled: true`, public `apiKey` present, monthly + yearly product IDs unchanged
- Native `/paywall` loads Monthly and Yearly from StoreKit/RevenueCat (**live Apple prices**, not reference/fallback copy)
- Monthly sheet, Yearly sheet, and Restore Purchases are reachable on a **physical iPhone** with a **Sandbox Apple Account**

### Paid Apps Agreement (manual — App Store Connect)

Apple requires the Account Holder to accept the **Paid Apps Agreement** before paid IAP works in sandbox. Verify in App Store Connect → **Business** → **Agreements** → Paid Apps = **Active**. Record as FACT in your release notes before replying to Apple. The automated verify script cannot check this.

Do **not** use `/review/subscription-preview` as the purchase path (admin-only, non-purchasable).

## Versioning

`MARKETING_VERSION` **1.4.4 is closed** (ITMS-90186 / ITMS-90062 — Apple already approved 1.4.4). The next native train is **1.4.5**. Do **not** tag `ios-v1.4.5` or Submit unless a native binary is actually required. Xcode Cloud applies `CI_BUILD_NUMBER` at archive; do **not** reuse rejected builds **1182** or **1188**.

Android `versionName` is **1.4.5** / `versionCode` **14** (Play AAB after the launcher-name placeholder leak).

## Review notes

Only paste App Review notes after both reviewer paths above are proven on the submitted build. Draft navigation lives in the PR — do not send until verified. Do not write secrets into `docs/app-store-review-notes.md` until that proof exists.
