# International market readiness (assessment)

**This document is a product and technical readiness assessment, not legal advice.**

## Locked model (ADR-018)

| Concept | Canonical store | Values |
|---------|-----------------|--------|
| **Language** | `family.preferred_locale` | `sv-SE`, `en-GB` |
| **Country** | `family.country_code` | ISO 3166-1 alpha-2 (`SE`, `DE`, `GB`, `US`, `ZZ`, …) |
| **Market/jurisdiction** | `family.market_region` (server-derived) | `EU`, `UK`, `US`, `OTHER` |

**Principle:** Language controls what the user reads. Country/market controls which rules and legal documents apply.

Example:

```
preferred_locale = en-GB
country_code     = SE
market_region    = EU
→ English UI, EU/Swedish-market legal terms
```

Registration collects **language + country** (no full address). `market_region` is never client-authoritative.

## Regional gates (registration)

| Gate | feature_flag | Default | When ON |
|------|--------------|---------|---------|
| United Kingdom | `market_uk_open` | OFF | Allow `GB` signups |
| United States | `market_us_open` | OFF | Allow `US` signups |

English language beta in Sweden does **not** imply UK/US market opening.

## Global vs locale vs region

| Concern | Global | Locale-based | Region-based |
|---------|--------|--------------|--------------|
| Core app logic | ✅ | | |
| UI copy / i18n bundles | | ✅ | |
| Auth emails | | ✅ | |
| Privacy / terms | | | ✅ per `market_region` |
| Cookie consent copy | | Partial | GDPR vs UK vs US |
| IAP / pricing display | | | ✅ Store region |
| Child consent age thresholds | | | ✅ per `country_code` within EU |

## Legal review required before international launch

- Privacy policy — EN working draft at `/en/privacy` (status here + `docs/i18n-public-web-coverage.md`; no public warning banner)
- Terms of service — EN working draft at `/en/terms`
- UK: UK GDPR, Children’s Code, DPIA before `market_uk_open`
- US: COPPA assessment, parental verification flows before `market_us_open`
- Cookie/analytics consent alignment per country

## Translation coverage before market launch

**Must be complete** on chosen language before public launch in a market:

- Registration, onboarding, Home/Today/schedule
- Child login and core child flow
- Errors, offline, security messages
- Settings, language switch
- Purchases, pricing, terms
- Privacy and consent copy
- Account deletion, export, support
- Auth emails and critical push
- Store metadata
- Child-directed copy (clear, simple language)

**May remain beta-labelled:**

- Older SEO articles, parts of För dig, PDF resources, admin, non-core features with explicit tester notice

**Never:** half-translated legal/privacy with Swedish fallback for consent-critical text.

## Recommended launch order

1. **Sweden + English language beta** — `country_code=SE`, `market_region=EU`; tests EN UI without new jurisdiction
2. **EU/EES** — concrete `country_code` per family; shared GDPR base + national difference matrix
3. **United Kingdom** — `market_uk_open`, UK documents, Children’s Code review
4. **United States** — `market_us_open`, COPPA, state requirements as needed

## Technical status

| Item | Status |
|------|--------|
| `country_code` + `market_region` on family | Migration `1810000000007` |
| Registration country picker | `country-choice.js` |
| Server derivation | `src/lib/market-region.js` |
| UK/US registration gates | `market_uk_open`, `market_us_open` |
| Regional legal routing | Backlog |
| US state field | Backlog (when billing/state law requires) |
| Full Child Core en-GB | Blocked on `english_child_experience` |
| iOS/Android localized store metadata | P-i18n-Apps-and-Regional-Readiness |

## Store readiness

| Item | Status |
|------|--------|
| iOS localized metadata (EN) | Next phase |
| Android localized metadata | Next phase |
| Age rating per territory | Not assessed |
| IAP copy per locale | RevenueCat path exists; copy not localized |
