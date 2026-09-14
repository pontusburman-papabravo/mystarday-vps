# ADR-023 — Market commercial policy (intro year vs trial)

**Status:** Accepted — **PRODUCT DECISION GO** (canonical spec locked including kravspec §3.1–3.5; A1–A13 and §0 launch gate unchanged)  
**Date:** 2026-09-14  
**Normativ spec:** [`docs/ie-paid-launch-kravspec.md`](../ie-paid-launch-kravspec.md)  
**Next decision:** founder GO for **implementation against the spec** — not further strategy rewrite.  
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

### 1. Two parallel tracks, not a country queue

| Track | Policy |
|-------|--------|
| **SE** | Keep intro year + grandfather. IAP go-live 2026-10-01. Must not block IE. |
| **A — English** | Ireland is a **paid** experiment (7-day trial, billing required). UK legal/store/representative may proceed in parallel but must not steal IE payment-path engineering. |
| **B — Locale** | No localization platform until Ireland shows exportable First Success **and** a real payment signal. Then per-country gates (never `market_eu_open` as the expansion tool). |
| **FI / NO / DK** | No work from geography or language proximity alone. |

### 2. Commercial policy table (normative)

| Market | entitlement | trial_days | requires_billing_ready |
|--------|-------------|------------|------------------------|
| SE | `intro_year` | 0 | false |
| IE | `trial` | 7 | true |
| GB (when opened) | `trial` | 7 | true |
| Any other newly opened market | `trial` | 7 | true |

Do **not** implement this as scattered `if (country === 'IE')`. Encode a market commercial policy the resolver and signup invariant both read.

### 3. Ireland hard launch gate

No `market_ie_open` until a new Irish family can: register → use the full product for exactly 7 days → paywall on day 8 → complete a real purchase on a physical device.

No card at signup. Do not stack a 7-day product trial with Apple’s 14-day IAP intro on IE SKUs.

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
- **Rollout:** Spec PR ships documents only. Next founder decision is GO to implement against the locked spec (including §3.1–3.5). Do not rewrite strategy. `market_ie_open` stays OFF until the §0 gate.

---

## Not in this ADR

- Flipping any live market or billing flag
- Localization platform or new locales
- UK representative / ICO payment (ops/legal track; same commercial policy when UK opens)
- Changing POS Constitution text
)
