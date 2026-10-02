# ADR-024 — Ireland complimentary access until 31 December 2026

**Status:** Accepted — founder decision 2026-09-28  
**Supersedes for Ireland only:** ADR-023 §2 row `IE = trial / 14 days / requires_billing_ready` and the “paywall on day 15” launch model  
**Does not supersede:** Sweden intro year + grandfather, `market_ie_open` as the registration gate, Apple/Google IAP as the only payment path, or the 14-day trial default for other not-yet-open markets (FI, GB, NL, …)

## Decision

Families with `family.country_code = 'IE'` have complimentary full app access until **2027-01-01 00:00:00 Europe/Dublin** (`market_ie_free_until`, default `2027-01-01T00:00:00.000Z`).

- No subscription and no payment method during the period.
- The offer does **not** create a store subscription and does **not** convert into a paid entitlement.
- Existing Apple/Google/admin/gift/grandfather rows still win.
- After the cutoff, complimentary access ends, family data remains, the normal paywall returns, and the family may choose to subscribe with Apple/Google IAP.
- Ordinary IE families are not prompted to purchase during the complimentary window. The existing App Review sandbox allowlist can still open Monthly/Yearly.
- Sweden’s commercial policy is unchanged. FI, GB, and other closed markets stay closed. No GeoIP.

## Canada

Canada uses the same absolute instant. English free period ends at `2027-01-01T00:00:00Z` for all IE/CA accounts, regardless of household timezone. `America/Toronto` is the family schedule zone. It does not extend complimentary access to local midnight. Founder confirmation 2026-10-02.

## Setting

`app_settings.market_ie_free_until` — absolute instant. Code default matches the migration seed.

Public read: `GET /api/market/registration-gates` → `launch_offer.IE`.
