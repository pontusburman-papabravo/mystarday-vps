# ADR-017 — Family locale (sv-SE / en-GB) i18n platform

**Status:** Accepted (2026-07-23)  
**Scope:** Full product localisation foundation (Scope C)  
**POS:** Constitution rule 2 (no surprise), P-02, 15 Section A

---

## Context

The product serves Swedish families today. English marketing (`/en`) and waitlist exist, but the product UI, server messages, Journey coach, child experience pack, emails, and registration seed content are overwhelmingly Swedish and hardcoded.

Requirements:

- Two supported locales: `sv-SE` (default) and `en-GB`
- Canonical source: `family.preferred_locale` — set at registration, never auto-changed
- User-created content (activities, rewards, names) is **not** translated
- System content (defaults, coach, child pack copy, transactional email) is locale-aware
- English rollout gated by feature flag `english_app` for existing families changing language
- No duplicate HTML pages per language for product UI

Partial i18n existed (`src/lib/i18n.js`, `src/locales/sv.json`, `public/js/i18n.js`) but was unused on the server and wired to only ~13 DOM attributes.

---

## Decision

### 1. Single locale resolver (`src/lib/locale.js`)

All normalisation, validation, Accept-Language parsing, Journey locale candidates, and experience-pack mapping go through one module. No parallel resolvers.

Resolution order:

| Context | Order |
|---------|--------|
| Pre-auth | explicit body/param → `Accept-Language` → `sv-SE` |
| Post-registration | `family.preferred_locale` only |

Legacy aliases: `sv` → `sv-SE`, `en` → `en-GB`.

### 2. Locale bundles (`src/locales/sv-SE.json`, `en-GB.json`)

Nested JSON keys, dot notation, `{{param}}` interpolation (escaped in client — no HTML from `t()`).

Missing keys: fall back to `sv-SE`; warn in development/test.

API: `GET /api/i18n/:lang` returns merged bundle; invalid locale → 400.

### 3. Database

`family.preferred_locale VARCHAR(16) NOT NULL DEFAULT 'sv-SE'` with CHECK constraint.

Backfill all existing families to `sv-SE`.

### 4. System default content

`config/default-content/<locale>/` — activities, categories, rewards JSON.

Loader: `src/lib/default-content/index.js`.

Registration:

- `sv-SE`: unchanged priority (admin `default_activity_template` if present, else locale file)
- `en-GB`: locale files for activities/rewards (no Swedish admin library)

### 5. Journey

`journey_experience_registry.locale` already exists. Normalise `sv` → `sv-SE`; seed `en-GB` rows with same `experience_key`.

`loadRegistry({ locale })` reads family locale via `db/journey-registry.js`.

### 6. Child experience pack

`child_se` (sv-SE) and `child_en` (en-GB) — same schema, translated copy.

`experiencePackIdForLocale()` selects pack; no per-child locale (v1).

### 7. Email

Transactional auth email uses `t(familyLocale, …)` — never client locale.

Family locale read from DB at send time.

### 8. Feature flag

`english_app` (default OFF): hides English in settings switcher for existing families until QA approves full journey.

New registrations may set `en-GB` regardless (product decision: acquisition path from `/en`).

### 9. Client

`public/js/i18n.js`: `I18n.init()`, `I18n.t()`, `data-i18n*` attributes including `aria-label` and `title`.

Pre-auth: `sessionStorage` key `sd_preferred_locale`. Post-login: `/api/auth/me` `preferred_locale`.

`public/js/locale-switcher.js` on register, login, settings.

### 10. Explicitly out of scope (v1)

- Admin panel Swedish-only
- SEO article translation
- PDF / bildstöd resources
- Legal pages (English copies require separate legal review — mark `LEGAL_REVIEW_REQUIRED`)
- Per-parent or per-child locale
- URL-prefix product routes (`/en/dashboard`)

---

## Consequences

- New migrations: `1810000000001`–`1810000000003` (after `1810000000000_family_avatar_private_storage`)
- `english_child_experience` gates `child_en` separately from `english_app`
- `test/i18n-locale.test.js` + registration integration tests
- `scripts/audit-hardcoded-swedish.mjs` for P0/P1 regression
- SW cache bump when static JS changes
- Incremental extraction of strings from large files (`dashboard.js`, etc.) — not big-bang search-replace

---

## Rollout

1. Merge platform + migrations
2. Enable `english_app` per QA family
3. Mobile QA (iOS Safari/WebView, Android Chrome/WebView)
4. Public English beta when P0 path is audit-clean: register → onboarding → Home → child login → first star
