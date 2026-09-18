# Secret references (no values in git)

Values are stored **outside the repository** in approved secret management (GitHub Environments, Cursor encrypted secrets, VPS-only files with `0600` permissions, 1Password, etc.).

**Never** commit passwords, PINs, or connection strings.

## Founder QA (agents — not App Store review)

| Secret name | Purpose |
|-------------|---------|
| `FOUNDER_QA_EMAIL` | Parent login email |
| `FOUNDER_QA_PASSWORD` | Parent login password |
| `FOUNDER_CHILD_USERNAME` | Child login username (picker) |
| `FOUNDER_CHILD_PIN` | Child PIN |
| `FOUNDER_PARENT_PIN` | Parent app-lock PIN (if set) |

Canonical flow: [`founder-qa-test-account.md`](founder-qa-test-account.md)

## Meta Ads (admin + Cursor drafts)

| Secret name | Purpose |
|-------------|---------|
| `META_ADS_ACCESS_TOKEN` | Meta system user token (`ads_management`, `ads_read`) |
| `META_AD_ACCOUNT_ID` | Ad account id (`act_…`) |
| `META_ADS_PAGE_ID` | Page id for ad creatives (or reuse `FACEBOOK_PAGE_ID`) |
| `META_ADS_INSTAGRAM_ACTOR_ID` | Optional Instagram actor id |
| `META_ADS_PIXEL_ID` | Optional Pixel id |

Operator guide: [`meta-ads.md`](meta-ads.md). Approval is required before spend.

## App Store / Play review demo family

| Secret name | Purpose |
|-------------|---------|
| `APP_REVIEW_EMAIL` | Complimentary review parent email (grandfathered Premium — no IAP path) |
| `APP_REVIEW_PASSWORD` | Complimentary review parent password |
| `APP_REVIEW_CHILD_PIN` | Child Anna PIN |
| `APP_REVIEW_PARENT_PIN` | Parental gate PIN when configured |
| `APP_REVIEW_IAP_EMAIL` | Dedicated IAP review parent email (sandbox purchase path) |
| `APP_REVIEW_IAP_PASSWORD` | Dedicated IAP review parent password |

Canonical flow: [`app-store-demo-konto.md`](app-store-demo-konto.md) · IAP setup: [`runbooks/APP-REVIEW-IAP-FAMILY.md`](runbooks/APP-REVIEW-IAP-FAMILY.md)

## RC-1 automation fixture (separate from founder/review)

See [`rc1-qa-fixture.md`](rc1-qa-fixture.md) — `RC1_QA_*` only.

## Mobile QA smoke (local/staging scripts)

| Secret name | Purpose |
|-------------|---------|
| `SMOKE_PARENT_EMAIL` | Parent email |
| `SMOKE_PARENT_PASSWORD` | Parent password |
| `SMOKE_CHILD_PIN` | Child 1 PIN |
| `SMOKE_CHILD2_PIN` | Child 2 PIN |

## GitHub secret scanning

Enable **secret scanning** and **push protection** on the repository when the GitHub plan supports it (Settings → Code security and analysis).
