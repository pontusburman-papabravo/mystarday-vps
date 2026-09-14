# ADR-023 — Market commercial policy (intro year vs trial)

**Status:** Accepted — **PRODUCT DECISION GO** (canonical spec; §0 + A1–A13 unchanged)  
**Date:** 2026-09-14  
**Amendment (same day):** expansion sequencing — UK deferred; NL parallel preparation; localization after export signal, not after D30.  
**Amendment (same day):** founder — new-market product trial is **14 days** (not 7); paywall on day 15. Do not stack Apple’s 14-day IAP intro on IE SKUs.  
**Normativ spec:** [`docs/ie-paid-launch-kravspec.md`](../ie-paid-launch-kravspec.md)  
**Next decision:** IE implementation GO received 2026-09-14. This PR builds the path. Next human step is physical-device purchase + restore, then founder may flip `market_ie_open`. NL remains prepare-only ([`docs/nl-market-prep.md`](../nl-market-prep.md)). Not a UK sprint.  
**POS:** Constitution 2 (no surprise trial→paid), Constitution 5 (complete signup), R-02 (stars not purchasable), PA-01 (no fourth coach)  
**Related:** ADR-018 (jurisdiction + gates — still in force; **launch order / commercial model** superseded here), ADR-017 (locale)

**Supersedes (partial):**

- ADR-018 §6 launch order as a sequential country list (`SE → IE → NO/DK → bulk EU → UK`)
- IE/FI **prebilling year** as the Ireland launch model ([`docs/ie-fi-prebilling-access.md`](../ie-fi-prebilling-access.md))
- Country-blind intro-year grant as the default for every newly opened market

**Does not supersede:** ADR-018 country vs language, per-country gates vs locale, legal routing by `country_code`, or Sweden’s grandfather + intro-year *for Sweden*.

---

## Context

Ireland is listed on the App Store (English name, free download as of 2026-09-14) but `market_ie_open` is OFF — correctly. Current entitlements are **country-blind**: any family created at/after `lifetime_free_until` gets `source = 'intro_year'`. Opening IE today would give Irish families Sweden’s free year and hide the paywall.

A previous engineering path treated IE/FI as a **prebilling year** (full access until a country `payment_start_at`, then paywall). That is the wrong commercial experiment: it delays the payment signal and copies Sweden’s intro economics into a new market.

Sweden must still go IAP-live on **2026-10-01** without blocking Ireland, and without surprising grandfathered or intro-year Swedish families.

---

## Decision

### 1. Prepare next market early; open on that market’s own gates

> Prepare the next market before the previous one is proven. Open the next market when **its** gates are ready. Invest heavily in a new language only after the product exports.

This must **not** weaken Ireland’s launch gate.

| Priority | Policy |
|---------|--------|
| **SE** | Keep intro year + grandfather. IAP go-live 2026-10-01. Must not block IE/NL. |
| **IE = P0 paid** | First international paid experiment (14-day trial, billing required). Physical purchase + restore before `market_ie_open`. |
| **NL = parallel preparation / next market** | Gap analysis and own `market_nl_open` (when implemented). May first test `en-GB`. Open when **NL** gates pass — not after IE D30. Never via `market_eu_open`. |
| **Localization** | After **export signal** (genuine IE and/or NL families reach First Success). Not an IE launch prerequisite. Not a D30 requirement. |
| **DE+AT** | Next locale wave after export signal (`de-DE`, then DE gate, then AT). |
| **UK = deferred** | Founder paused UK (Children’s Code, UK GDPR, representative, ICO, consumer law). No legal sprint, representative procurement, GB storefront, or GBP work now. Resume only on later explicit founder decision. |
| **FI / NO / DK** | No work from geography or language proximity alone. |

### 2. Commercial policy table (normative)

| Market | entitlement | trial_days | requires_billing_ready |
|--------|-------------|------------|------------------------|
| SE | `intro_year` | 0 | false |
| IE | `trial` | 14 | true |
| GB (when opened) | `trial` | 14 | true |
| Any other newly opened market | `trial` | 14 | true |

Do **not** implement this as scattered `if (country === 'IE')`. Encode a market commercial policy the resolver and signup invariant both read.

### 3. Ireland hard launch gate

No `market_ie_open` until a new Irish family can: register → use the full product for exactly 14 days → paywall on day 15 → complete a real purchase on a physical device.

No card at signup. Do not stack a 14-day product trial with Apple’s 14-day IAP intro on IE SKUs.

Prices: portal targets **€5.99 / €59.99** (`config/iap-product-contract.js`). Runtime UI uses store `priceString`. Yearly stays the attractive plan.

### 4. Signup completeness

Open market + `requires_billing_ready` + public billing unusable → reject signup (`MARKET_BILLING_NOT_READY`). Never create an account the family cannot use.

Sweden remains allowed without public billing because intro year makes the account usable.

### 5. Entitlement winner order

`grandfathered` > `admin` > `apple` > `google` > `gift` > `intro_year` (SE-policy families only) > computed `trial` > `limited`.

IE trial is **computed** (`access_kind = 'trial'`), not an `intro_year` row and not a prebilling year. Existing Swedish grandfather/intro-year rows stay untouched. Global paid rollout must not 402 those families.

### 6. `market_eu_open`

Forbidden as the expansion switch. It would open NL+DE+FR+ES together. Future locale-track countries get explicit keys (`market_nl_open`, `market_de_open`, …) when that track is authorized. Not this spec’s implementation.

---

## Consequences

- **Positive:** Ireland can test a real funnel (ad → First Success → paywall → purchase). Sweden’s promise is kept. New markets inherit a default paid experiment instead of silently copying intro year.
- **Negative:** Current tests that expect IE-after-cutoff = `intro_year` will fail once implementation starts and must be rewritten against this ADR. Prebilling helpers remain for historical FI/IE *code* until an implementation PR removes or isolates them — they are not launch authority.
- **Rollout:** Implementation PR builds the IE trial path. `market_ie_open` stays OFF until the §0 gate. NL preparation is docs only (`docs/nl-market-prep.md`). UK stays deferred. `market_eu_open` stays debt.

---

## Not in this ADR

- Flipping any live market or billing flag
- Implementing `market_nl_open` (design/docs only until an implementation GO)
- Localization platform or `de-DE` before export signal
- UK representative / ICO / Children’s Code sprint (deferred)
- Changing POS Constitution text
)
