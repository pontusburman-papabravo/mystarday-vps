# International market readiness (assessment)

**This document is a product and technical readiness assessment, not legal advice.**

## Locale vs region

| Concept | Canonical store | Values (v1) |
|---------|-----------------|-------------|
| **Locale** (language) | `family.preferred_locale` | `sv-SE`, `en-GB` |
| **Region/market** (jurisdiction) | *Recommended future:* `family.market_region` or billing account | `SE`, `EU`, `GB`, `US`, `OTHER` — **not implemented in v1** |

Child language follows family locale in v1. Child English UX additionally requires `english_child_experience`.

## Global vs locale vs region

| Concern | Global | Locale-based | Region-based |
|---------|--------|--------------|--------------|
| Core app logic | ✅ | | |
| UI copy / i18n bundles | | ✅ | |
| Auth emails | | ✅ | |
| Privacy / terms | | Working EN drafts | Authoritative per jurisdiction |
| Cookie consent copy | | Partial | GDPR vs UK vs US |
| IAP / pricing display | | | ✅ Store region |
| Tax / VAT messaging | | | ✅ |
| Push / email templates | | Future | Future |
| App Store / Play metadata | | Per language | Per territory |

## Legal review required before international launch

- Privacy policy — EN working draft at `/en/privacy` (status tracked here and in `docs/i18n-public-web-coverage.md`; no public warning banner on page)
- Terms of service — EN working draft at `/en/terms` (same status tracking)
- Cookie policy / consent flows
- Child data / parental consent wording
- Marketing claims on `/en` landing

## Store readiness

| Item | Status |
|------|--------|
| iOS localized metadata (EN) | Not in this PR — P-i18n-Apps-and-Regional-Readiness |
| Android localized metadata | Not in this PR |
| Age rating per territory | Not assessed |
| IAP copy per locale | RevenueCat path exists; copy not localized |

## Blockers (high level)

### EU (incl. Sweden)

- Legal review of EN privacy/terms for EU markets
- Cookie/analytics consent alignment per country
- DPA / processor documentation for expansion

### United Kingdom

- UK GDPR / ICO-aligned privacy & terms
- GBP pricing and consumer rights copy if sold direct

### US / other

- COPPA/state privacy laws if targeting US families
- No claim of compliance without counsel

## Recommended launch order

1. **SE** — sv-SE first (existing default locale)
2. **EN beta** — active opt-in en-GB (this foundation)
3. **GB/EU EN** — after legal + store metadata (next phase)
4. **Additional regions** — after region model + billing

## Technical implementation gaps (next phase)

- `family.market_region` decision + migration
- Regional legal document routing
- Locale-specific email/push
- Full Child Core en-GB
- Native app language bundles (iOS/Android)
