# International Expansion V1 — Engineering Spec (P-EEA-LAUNCH-FRAMEWORK)

**Status:** Implemented (Ireland-capable, Ireland-closed)  
**Branch:** `cursor/eea-launch-framework-6b85`  
**Related:** ADR-018, Repo vs Reality Audit

---

## Goal

Minimum reusable EEA launch foundation to launch **Ireland later** without opening Ireland in this PR.

Wave order: **SE → IE → NO → DK → UK**

This PR makes the product **Ireland-capable but Ireland-closed**. `P-IE-LAUNCH` is a separate release (legal copy, compliance sign-off, stores, `market_ie_open ON`).

---

## Architecture

```
country_code (registration choice)
    ↓
deriveMarketRegion()  →  EU | UK | US | OTHER   (EU = legacy EEA bucket)
    ↓
gateKeyForCountry()   →  market_*_open feature_flag
    ↓
getMarketConfig()     →  timezone, currency, locale defaults, legal routes
```

**Server is authoritative.** Clients read `/api/market/registration-gates` and `/api/market/legal-routes` but cannot bypass gates.

---

## Gate semantics

| Country | Gate key | Default | Notes |
|---------|----------|---------|-------|
| SE | `market_se_open` | ON | Unchanged |
| IE | `market_ie_open` | **OFF** | Staged; independent of `market_eu_open` |
| NO | `market_no_open` | OFF | Reserved for later wave |
| DK | `market_dk_open` | OFF | Reserved for later wave |
| Other EU/EEA (e.g. DE) | `market_eu_open` | OFF | Bulk fallback |
| GB | `market_uk_open` | OFF | UK work not in this PR |
| US | `market_us_open` | OFF | Unchanged |
| ZZ / OTHER | `market_other_open` | OFF | Unchanged |

**Override rule:** Explicit country gate wins over aggregate. Example: `market_eu_open=OFF` + `market_ie_open=ON` → IE registration allowed.

**Public API:** `GET /api/market/registration-gates` exposes boolean flags including `market_ie_open`.

**Admin API:** `GET /api/admin/market-registration-status` returns structured rows; toggles use existing `PUT /api/admin/feature-flags/:key`.

---

## Market config contract

`getMarketConfig({ countryCode, marketRegion, locale })` in `src/lib/market-config.js`:

| Field | IE (now) | SE (unchanged) |
|-------|----------|----------------|
| timezone | `Europe/Dublin` | `Europe/Stockholm` |
| currency | EUR | SEK |
| defaultLocale | en-GB | sv-SE |
| localeSupported | true | true |
| legal | English EEA routes (placeholder) | sv-SE → `/privacy`, `/terms` |

**Region fallbacks** when no explicit country row exists:

| market_region | timezone | Notes |
|---------------|----------|-------|
| EU | `Europe/Stockholm` | Bulk EU/EEA (e.g. DE) |
| UK | `Europe/London` | |
| US | `America/New_York` | |
| OTHER | `UTC` | Fail-safe — not EU defaults |

**Locale fields:** `locale` reflects caller input (pre-auth defaults to `sv-SE`). `defaultLocale` is the market preference when none is chosen — they may differ (IE omits locale → `locale=sv-SE`, `defaultLocale=en-GB`). Registration requires explicit language choice.

NO/DK rows include `defaultLocale: nb-NO` / `da-DK` with **`localeSupported: false`** — metadata for future waves, not launch-ready UI.

---

## Timezone rules

1. New registrations: `family.timezone` set from `getMarketConfig` at register (`src/routes/auth/register.js`).
2. New children: onboarding uses `fetchFamilyTimezone()` — no hardcoded `Europe/Stockholm` for IE families (`src/routes/onboarding.js`).
3. Existing families: **not migrated** in this PR.
4. Explicit `family.timezone` in DB always wins (`src/lib/family-timezone.js`).

---

## Legal routing rules

`resolveLegalRoutes()` in `src/lib/legal-routing.js`:

- Jurisdiction from **`country_code` + `market_region`**, never `preferred_locale` alone.
- SE + sv-SE → Swedish live docs (`/privacy`, `/terms`).
- SE + en-GB → English EEA family (`/en/eea/*`) — **not** UK.
- IE + en-GB → English EEA family (placeholder until compliance copy ships).
- GB → UK placeholder routes (`/en/uk/*`) — market remains closed.

Placeholder HTML under `public/en/eea-*`, `public/en/uk-*`, `public/en/tracking-choices.html`. **No invented legal body copy.**

Client sync: `public/js/legal-routes.js` on register page.

---

## Account deletion

`DELETE /api/family/delete-account` now deletes `analytics_events WHERE family_id = $1`.

### Tables intentionally not deleted (statutory / audit retention)

| Table | Reason |
|-------|--------|
| `admin_audit_log` | Admin impersonation audit trail (may reference deleted family in metadata) |
| `contact_message` | Support/legal correspondence retention |
| `analytics_daily_snapshots` | Aggregated anonymised metrics — no family_id |
| `win_back_email_log` | Parent email keyed by parent_id; rows deleted via parent cascade where applicable |

Family-scoped operational data (children, schedules, rewards, push, tokens, etc.) continues to delete per existing cascade logic in `src/routes/family/account.js`.

---

## EN-GB launch debt (partial)

- Goals parent API errors localised via `src/lib/parent-api-messages.js` + `parent.api.errors.goals.*`
- Register family name suffix already uses `auth.register.familyNameSuffix`
- Cookie banner English copy on `/en/*` paths (`public/js/cookie-banner.js`)

**Out of scope:** SEO, admin UI copy, pedagog content, full rewards.js sweep.

---

## Analytics

No new platform. Existing `analytics_events.metadata` and admin `locale-analytics` filters support `country_code=IE` once families exist.

---

## Tests

| ID | File | Coverage |
|----|------|----------|
| A–D, E–G, J | `test/eea-launch-framework.test.js` | Gates, timezone, delete analytics |
| H–I | `test/legal-routing.test.js` | Legal routing |
| — | `test/family-timezone.test.js` | Timezone + DST offset sanity |
| — | `test/cookie-banner-en.test.js` | English consent copy |
| — | `test/market-region.test.js` | IE/NO/DK gate keys |

Run: `npm run test:gate` (includes new files in gate lists).

---

## Rollout / rollback

**After merge:** `market_ie_open` **must remain OFF**. Migration seeds OFF; do not enable in admin without P-IE-LAUNCH checklist.

**Rollback:** Revert PR; gates default fail-safe (only SE open). No data migration required.

**Ireland launch (P-IE-LAUNCH) requires separately:**

- English EEA/Ireland Privacy Notice, Terms, child privacy
- DPIA, child data assessment, lawful-basis review
- English RC + physical iOS/Android QA
- Ireland App Store / Play enabled, EUR pricing verified
- Then: `market_ie_open ON`

---

## Explicit non-goals (this PR)

- Open Ireland (`market_ie_open ON`)
- Enable `market_eu_open`
- nb-NO / da-DK locales
- UK compliance implementation
- Rename `market_region` EU → EEA
- Separate backend or billing
- Final legal copy authoring
- Toggling live feature flags during deploy

---

## Files (implementation map)

| Area | Files |
|------|-------|
| Migration | `migrations/1810320000000_market_country_gates.js` |
| Gates | `src/lib/market-region.js`, `src/routes/market.js`, `public/js/country-choice.js` |
| Config | `src/lib/market-config.js`, `src/lib/family-timezone.js` |
| Legal | `src/lib/legal-routing.js`, `public/js/legal-routes.js`, `public/en/eea-*.html`, `config/public-web-routes.js` |
| Register | `src/routes/auth/register.js`, `public/register.html` |
| Onboarding TZ | `src/routes/onboarding.js` |
| Delete fix | `src/routes/family/account.js` |
| i18n | `src/lib/parent-api-messages.js`, `src/routes/goals.js`, locale JSON |
| Admin | `src/routes/admin/system.js`, `public/admin/admin-market-gates.js` |
| Consent | `public/js/cookie-banner.js` |
| Cache | `config/cache-version.json`, `public/sw.js` (v862) |
