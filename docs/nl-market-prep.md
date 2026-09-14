# Netherlands market preparation (not an open)

**Status:** PREPARE ONLY — 2026-09-14  
**Authority:** [`docs/ie-paid-launch-kravspec.md`](ie-paid-launch-kravspec.md) §3.3 + [ADR-023](adr/ADR-023-market-commercial-policy.md)  
**This document does not authorize** `market_nl_open`, `market_eu_open`, or any NL signup.

Three layers stay separate:

| Layer | NL now |
|-------|--------|
| **Prepare** | This document. Gap analysis and gate definition. |
| **Build** | Not started. No `market_nl_open` key. No NL storefront launch. |
| **Open** | Only after **NL's own gates** pass + explicit founder approval. Not after IE D30. |

UK stays **parked**. Localization / `de-DE` waits on exportable First Success from IE and/or NL.

---

## 1. Current routing (FACT)

NL is a known registration country (`config/market-countries.js`) but has **no per-country gate**.

```
gateKeyForCountry('NL') → market_eu_open
```

`market_eu_open` is a bulk EU switch. Turning it on would also admit DE, FR, ES, AT and other EEA codes without their own keys. That is **technical debt**, not a rollout tool.

Other live facts:

| Topic | Today | Needed before NL open |
|-------|-------|------------------------|
| Commercial policy | Trial, 14 days, billing-ready (ADR-023 default) | Already inherited. Do not copy Sweden intro year. |
| Timezone | Falls through `EU_REGION_DEFAULTS` → `Europe/Stockholm` | `Europe/Amsterdam` in `COUNTRY_DEFAULTS` when NL is built |
| Currency | EUR via EU defaults | Local store `priceString`; portal targets stay €5.99 / €59.99 |
| Locale | `en-GB` is supported; no `nl-NL` bundle | First NL test **may** use `en-GB`. `nl-NL` is not a prerequisite. |
| Legal | English EEA routes (`/en/eea/*`) | NL-specific legal review before ads / store open |
| Signup | Closed while `market_eu_open` is OFF | Own `market_nl_open`, default OFF |
| Analytics | Funnel can filter `country_code=NL` | Use it. Do not mix with SE. |

---

## 2. Gates to define before NL **open** (not this PR)

Copy Ireland's commercial shape, then add NL-specific evidence. Draft — founder locks these before any NL implementation GO:

1. **Country gate** — `market_nl_open` exists, defaults OFF, is independent of `market_eu_open`.
2. **Billing ready** — public billing usable before post-grandfather NL signup (`MARKET_BILLING_NOT_READY` otherwise).
3. **Trial path** — new NL family gets computed 14-day trial, not `intro_year`.
4. **Day-15 paywall** — same as IE: sessions remain; limited parent/child allowlists unchanged.
5. **Physical purchase + restore** on an NL storefront device; backend entitlement `access_kind=paid`.
6. **Store availability** — App Store / Play NL listing, named SKUs, no stacked Apple/Google 14-day intro on the product trial.
7. **Legal** — EEA English package reviewed for NL consumer/privacy claims. No new legal surface invented here.
8. **Landing / register** — country picker shows NL only when the NL gate is ON; `en-GB` experiment is explicit.
9. **Support** — English support path is enough for the first experiment; no `nl-NL` requirement.
10. **Analytics** — activation funnel and paid conversion segmented on `country_code=NL`.

Do **not** treat IE D30, IE paid-conversion, or a localization platform as NL open gates.

---

## 3. Out of scope until a later GO

- Implementing `market_nl_open` / a migration that inserts that flag
- Flipping `market_eu_open` to “let NL in”
- `nl-NL` UI bundle
- UK / GBP / Children’s Code work
- `de-DE` / AT (those wait on export signal, not on this prep doc)

---

## 4. Recommended first NL experiment

Ship NL as a second **English** paid datapoint:

`en-GB` + `country_code=NL` + EUR store prices + own gate.

That is an experiment, not a decision that Dutch UI is unnecessary forever.
