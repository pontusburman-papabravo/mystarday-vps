# First 25 families — 12 months of Premium

The offer is off. This document does not open a market, change a price, or change Sweden, Ireland, or Canada.

Normative decision: [ADR-026](adr/ADR-026-launch-cohort-offer.md).

## What a family gets

The first 25 eligible families in an enabled country get Premium for 12 calendar months, counted from the moment the place is assigned. There are 27 eligible countries, so the offer covers at most 675 families.

- No payment method is stored.
- Nothing is charged automatically when the period ends.
- Every child in the family is included, on iOS, Android, and web. The right is one family row, not a device row.
- Routines, stars, and rewards stay after the period ends.
- The family can then buy Premium at the price in App Store or Google Play.
- Family 26 and later get the ordinary policy for that country: a 14-day trial that still requires billing before the account is created.

## How the end instant is calculated

The offer timezone is fixed per country in `src/lib/launch-cohort-offer.js`. It is not `family.timezone`.

The end is the same local wall-clock time, 12 calendar months later. A date the target month does not have is clamped (29 February + 12 months → 28 February). The stored `expires_at` is exclusive.

Country, language, reinstall, and account switch do not move that instant and do not create a second place. A failed registration rolls back the increment, so it does not consume a place. A place is not reused when the family becomes inactive or is deleted.

## How it sits with other Premium rights

Winner order: grandfathered, admin, Apple, Google, gift, intro year, then launch cohort, then a computed trial or complimentary period.

- An existing store, admin, gift, intro-year, or grandfathered right is not replaced. The claim is refused and the counter does not move.
- While a store subscription is active it wins. If it ends and the cohort period is still valid, the cohort wins again.
- A family that has a cohort row does not also receive the 14-day trial after the cohort ends.

`family.subscription_status` stays `none` for this right. It is not an App Store or Google Play subscription. The payment audit row has no amount, currency, or store.

## Protected markets

Sweden, Ireland, and Canada are absent from the config table. Database checks reject those country codes. Admin enable returns 403. Signup never treats them as cohort-eligible, including Swedish families on the 14-day trial from 3 October 2026.

Their policies stay:

- Sweden before 2026-10-03 00:00 Europe/Stockholm: intro year.
- Sweden from that instant: 14-day trial.
- Ireland and Canada: complimentary access until 2027-01-01T00:00:00Z.

## Eligible countries

27 countries, seeded disabled: AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, NO, IS.

At most 25 families per country, and at most 675 families in total.

Not seeded and not eligible: GB, CH, LI, US, and any other country. Sweden, Ireland, and Canada are excluded above.

## Activate and deactivate

Both switches must be on before a new place is assigned. Default is off for the flag and for every country.

```sql
-- global arm, still assigns nothing until a country row is enabled
UPDATE feature_flag SET enabled = true WHERE key = 'launch_cohort_offer_v1';

-- one country
UPDATE market_launch_cohort_config SET enabled = true WHERE country_code = 'DE';
```

Admin API, after an admin session:

- `GET /api/admin/launch-cohort-offer` — assigned and remaining for every seeded country
- `GET /api/admin/launch-cohort-offer/expiring?within_days=30` — families whose stored period ends inside the window
- `GET /api/admin/launch-cohort-offer/:countryCode/families` — slot, start, and end
- `PUT /api/admin/launch-cohort-offer/:countryCode` with `{ "enabled": true|false }`

Disabling the flag or the country stops new assignments. It does not change rows already granted, and the resolver does not read the flag.

Public copy:

- `GET /api/market/launch-cohort-offer?country_code=DE&locale=de-DE`
- `slots_remaining` is an integer only while a place can still be assigned and that country's registration gate is open. Otherwise it is null, and `show` is false. The register page prints a count only in that case. A closed country does not show the offer, even if the country row is enabled and places remain.

A signed-in family sees its own end date on `GET /api/subscription/status` as `launch_cohort`. Settings uses that copy and does not offer "manage subscription" during the free period. After the period, the paywall explains that nothing was charged.

## Rollback

1. Set `launch_cohort_offer_v1` to false, and/or set the country `enabled` to false. Existing grants continue until `expires_at`.
2. Migration `1810560000000_launch_cohort_offer` down deletes cohort entitlement rows and drops the ledger. Use that only to remove the feature, not to pause a country.

Each country has its own registration flag (`market_fi_open`, `market_de_open`, and the same pattern for the other countries). `market_eu_open` stays off and does not open any country. A missing country flag fails closed. Opening one country does not open another.
