# ADR-025 — Sweden 14-day trial from 3 October 2026

**Status:** Accepted — founder decision 2026-10-02  
**Supersedes for new Swedish families only:** ADR-023 §2 row `SE = intro_year` when `family.created_at` is at or after 2026-10-03 00:00 Europe/Stockholm  
**Does not supersede:** Grandfathering before 2026-09-14, intro year for Swedish families created from 2026-09-14 through 2026-10-02, Ireland complimentary access (ADR-024), or the 14-day default for other markets

## Decision

Swedish families created at or after **2026-10-03 00:00 Europe/Stockholm** get a 14-day product trial (no card). When the trial ends they choose Monthly or Yearly in the app via App Store or Google Play.

- Families created before that instant are not rewritten. That includes families who registered on 1–2 October 2026: they keep intro year.
- The trial is computed from `created_at`. It does not insert an `intro_year` row.
- Signup from that instant requires public billing to be usable, so we do not create an account that cannot choose a plan on day 15.
- The parent home shows a banner when one day remains (`trial_days_remaining === 1`). The banner points to `/paywall`. It is not shown to intro-year, grandfathered, or child sessions.
- Landing, FAQ, and pricing-info state the same offer. Prices shown there are the portal targets (59 SEK / 590 SEK). The paywall still uses the store price.

## POS

Constitution 2 (no surprise for families who already registered). Constitution 5 (signup can finish). R-02 (no star purchase, no paywall on the child surface).
