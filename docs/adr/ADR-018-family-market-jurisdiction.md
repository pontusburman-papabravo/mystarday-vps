# ADR-018 — Family market jurisdiction (country vs language)

**Status:** Accepted (2026-07-24)  
**Scope:** Registration, legal routing, regional rollout gates  
**Related:** ADR-017 (locale), P-i18n-Language-Launch-Foundation  
**POS:** Constitution rule 2 (no surprise), rule 5 (complete signup)

---

## Context

International expansion requires knowing **which jurisdiction’s rules apply** to a family. This is independent of UI language:

- A family in Sweden may choose English (`preferred_locale = en-GB`) but still falls under **EU/Swedish** legal terms.
- A Swedish-speaking family in the UK falls under **UK** rules, not EU defaults.

Product and legal review identified separate needs for:

| Field | Purpose | Examples |
|-------|---------|----------|
| `preferred_locale` | What language the user reads | `sv-SE`, `en-GB` |
| `country_code` | Where the family lives (ISO 3166-1 alpha-2) | `SE`, `DE`, `GB`, `US`, `ZZ` |
| `market_region` | Jurisdiction bucket for legal/terms/consent | `EU`, `UK`, `US`, `OTHER` |

`market_region` is **derived on the server** from `country_code`. Clients must not set it directly.

---

## Decision

### 1. Mandatory registration inputs (new users)

1. **Language** — active choice (`sv-SE` or `en-GB` beta)
2. **Country of residence** — active choice (no full address required)

Stored on `family`:

- `country_code CHAR(2) NOT NULL`
- `market_region VARCHAR(8) NOT NULL` with CHECK (`EU`, `UK`, `US`, `OTHER`)
- `country_selected_at`, `country_selection_source`

Legacy API clients without `country_code` default to `SE` / `EU` (same pattern as locale).

### 2. market_region derivation (`src/lib/market-region.js`)

| country_code | market_region |
|--------------|---------------|
| `SE` + EU/EEA/CH ISO codes | `EU` |
| `GB` | `UK` |
| `US` | `US` |
| `ZZ` (other) or unknown | `OTHER` |

### 3. Regional rollout gates

UK and US registration are **closed by default** until legal/readiness gates pass:

| feature_flag | Default | Effect |
|--------------|---------|--------|
| `market_se_open` | ON | Sweden (explicit gate; fail-safe if row missing) |
| `market_ie_open` | OFF | Ireland — staged EEA expansion (first wave after SE) |
| `market_no_open` | OFF | Norway — reserved for later wave |
| `market_dk_open` | OFF | Denmark — reserved for later wave |
| `market_eu_open` | OFF | Other EU/EEA countries (bulk fallback) |
| `market_uk_open` | OFF | Blocks new `GB` registrations |
| `market_us_open` | OFF | Blocks new `US` registrations |
| `market_other_open` | OFF | Blocks `ZZ` / unknown |

**Staged override:** Per-country gates (IE, NO, DK) take precedence over `market_eu_open`. Example: IE can open while bulk EU remains closed.

**Note:** `market_region = EU` is the **legacy technical bucket** for EU/EEA/CH — not renamed to EEA in code. Legal rules may depend on `country_code` inside that bucket (e.g. IE vs SE).

EU/SE registrations remain open via `market_se_open`. English beta in Sweden does **not** open UK/US/IE.

See `docs/international-expansion-v1-engineering-spec.md` for implementation detail.

### 4. Legal document routing

Privacy/terms/consent versions are keyed by **`country_code` + `market_region`**, not `preferred_locale` alone.

Implementation: `src/lib/legal-routing.js`, `GET /api/market/legal-routes`.

Example:

```
preferred_locale = en-GB
country_code     = SE
market_region    = EU
→ English UI + English EEA legal routes (/en/eea/*), not UK

country_code     = IE
→ English EEA legal routes (placeholder until IE overlay copy ships)
```

### 5. Child consent model (principle)

- Parent creates and administers child accounts (existing model).
- Child self-consent age thresholds (13–16 in EU) are **per-country** within `EU` — use `country_code` when that distinction matters.
- Do not build the entire product on child self-consent; assess per processing activity.

### 6. Launch order (locked)

1. **Sweden + English language beta** — same EU market; tests translation without new jurisdiction
2. **Ireland (staged)** — first explicit EEA country gate (`market_ie_open`); en-GB; compliance gate before ON
3. **Norway / Denmark** — later per-country gates (`market_no_open`, `market_dk_open`)
4. **Other EU/EES** — `market_eu_open` bulk when ready
5. **United Kingdom** — separate release (`market_uk_open`, UK privacy, Children's Code, DPIA)
6. **United States** — separate release after COPPA review (`market_us_open`)

### 7. Translation coverage rule

Before public market launch, all **safety-critical** surfaces must be complete in the chosen language (registration, core flows, errors, settings, legal/consent, child-facing copy). Beta-labelled gaps allowed only for non-core areas with explicit tester communication.

---

## Consequences

- Registration UI: `language-choice.js` + `country-choice.js`
- Migration: `1810000000007_family_market_country`
- Admin analytics may aggregate by `market_region` and `country_code`
- US state collection deferred until needed (billing, state law, COPPA flows)

---

## Not in scope (this ADR)

- `family.market_region` manual override UI
- Regional IAP/pricing
- Full UK/US legal documents
- Child Core English (`english_child_experience`)
