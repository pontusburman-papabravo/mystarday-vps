# ADR-026 — First 25 families, 12 months of Premium

**Status:** Accepted for implementation. Default off. No market is opened by this decision.  
**Date:** 2026-10-10  
**Does not supersede:** ADR-023, ADR-024, or ADR-025. Sweden, Ireland, and Canada keep those terms.

## Decision

When `launch_cohort_offer_v1` is on and that country's `market_launch_cohort_config.enabled` is on, the first 25 eligible families in the country receive Premium for 12 calendar months from the assignment instant.

- No payment method. No automatic charge.
- The right is the family entitlement `source = launch_cohort`. It covers every child and every device, on iOS, Android, and web.
- The end instant is the same local clock time, 12 calendar months later, in the offer timezone for that country. It is stored on the grant and is not recomputed if the family changes country, language, or timezone.
- Luxon clamps a day the target month does not have. 29 February plus 12 months becomes 28 February. Access lasts while `now < expires_at`.
- Family 26 and later keep the ordinary market policy. For these countries that is the 14-day trial in ADR-023, which still requires billing before signup.
- A stored cohort replaces that 14-day trial for the family that received it. When the stored period ends, access becomes limited. The family can buy Premium. Nothing is charged by itself.
- Store, admin, gift, intro-year, and grandfathered rights win over the cohort and are not overwritten. If a store subscription ends while the cohort period is still valid, the cohort becomes the current right again.

Sweden, Ireland, and Canada are excluded in code and in database checks. The offer cannot be enabled for them.

The eligible set is 27 countries. The cap is 25 families in each, so at most 675 families.

Registration and the public offer use the same per-country gate. `market_eu_open` remains in the database, default off, and is not a registration opener. Existing flags keep their meaning: `market_se_open` and `market_ca_open` default on; `market_ie_open`, `market_fi_open`, `market_no_open`, and `market_dk_open` default off. Every other target country has `market_<iso>_open`, inserted off. A missing flag fails closed. If an environment had turned the bulk flag on, those countries close until their own flag is turned on. This decision does not turn any flag on. Public offer copy is hidden while that country's registration gate is closed.

## POS

Constitution 2: no surprise charge. Constitution 5: a signup that cannot be used is refused. R-02: stars are not for sale.

## Rollback

1. Operational: set the global flag off, or set the country row `enabled = false`. Grants already stored keep working until `expires_at`.
2. Migration down: deletes `launch_cohort` entitlement rows and drops the ledger. That is not the kill switch.
