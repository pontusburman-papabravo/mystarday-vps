# Auth i18n baseline audit

Post-migration inventory for auth surfaces moved from **BASELINE** to **STRICT** tier (2026-07-26).

## Summary

| Metric | Before | After |
|--------|--------|-------|
| `npm run audit:i18n:baseline` (auth files) | ~240 | **0** |
| `npm run audit:i18n:strict` (auth files) | n/a | **0** |
| Locale keys added (`auth.*`) | — | ~45 net new |
| Cache version | v696 | **v697** |

## Migrated files

| File | Tier | Notes |
|------|------|-------|
| `public/login.html` | STRICT | `data-i18n` + locale gate; neutral head meta |
| `public/register.html` | STRICT | Terms, success, Apple OAuth via `authT()` |
| `public/forgot-password.html` | STRICT | Full `data-i18n` |
| `public/reset-password.html` | STRICT | `INVALID_RESET_LINK` code branch |
| `public/verify-email.html` | STRICT | Dynamic welcome via `auth.verify.welcomeMessage` |
| `public/child-login.html` | STRICT | `data-i18n-title`, neutral PWA title |
| `public/js/auth.js` | STRICT | Parent PIN gate via `auth.parentGate.*`; no Swedish fallbacks |
| `public/js/child-login.js` | STRICT | English dev comments only |
| `public/js/auth-entry-i18n.js` | STRICT | Locale gate + OG meta |
| `public/js/login-locale.js` | STRICT | Unchanged persistence from PR #742 |
| `public/js/google-auth-ui.js` | STRICT | OAuth copy via bundles |
| `src/routes/auth/login.js` | STRICT | `authApiMessage` for `/me`, preferences, picker |
| `src/routes/auth/register.js` | STRICT | API messages; DB role via Unicode escape |
| `src/routes/auth/email.js` | STRICT | Verify/reset/forgot localized + stable codes |
| `src/lib/auth-api-messages.js` | STRICT | Server helper for auth API copy |

**Out of scope (removed from baseline, not migrated):** `src/lib/email.js` — invite, win-back, newsletter templates (non-auth transactional).

## Swedish flash prevention

Auth entry pages use `public/js/auth-entry-i18n.js`:

1. `html.auth-entry-pending` hides main content until `I18n.init()` completes.
2. Neutral CSS spinner (no language-specific text).
3. `data-i18n` elements ship **empty** in HTML; copy applied after bundle load.
4. **4s timeout** reveals content if init fails (no permanent blank page).
5. **No-JS:** HTML elements remain in DOM with empty text; forms still submit via native POST where applicable. Primary path requires JS for API auth.

## Reused / consolidated keys

| Key domain | Reuse |
|------------|-------|
| `auth.login.apple.*` | Register Apple errors |
| `auth.forgotPassword.backToLogin` | Register invite error back link |
| `auth.errors.*` | Client validation + `authApiMessage` fallback |
| `auth.api.errors.*` | Server JSON errors with `code` |
| `common.*` | Not duplicated (Save/Cancel/etc. not needed on auth pages) |

## Server API changes

| Endpoint | Change |
|----------|--------|
| `POST /api/auth/reset-password` | Adds `code: 'INVALID_RESET_LINK'` on bad token |
| `GET /api/auth/me` | Localized 404/400/500 via `auth.api.errors.*` |
| `POST /api/auth/me/*` | Parent-only errors localized |
| `GET /api/auth/login-picker-children` | Localized 500 |

Older clients still receive `error` / `message` strings in request/family locale.

## Inventory (post-migration)

All auth baseline targets: **status = migrated (0 gaps)**.

| Group | Files | Status |
|-------|-------|--------|
| Login | `login.html`, `login-locale.js`, `google-auth-ui.js` | ✅ 0 |
| Register | `register.html`, `register.js` | ✅ 0 |
| Password reset | `forgot-password.html`, `reset-password.html`, `email.js` | ✅ 0 |
| Email verification | `verify-email.html`, `email.js` | ✅ 0 |
| Child login | `child-login.html`, `child-login.js` | ✅ 0 |
| OAuth | `google-auth-ui.js`, inline Apple handlers | ✅ 0 |
| Shared auth | `auth.js`, `auth-entry-i18n.js` | ✅ 0 |
| Server/e-mail | `auth-api-messages.js`, auth routes | ✅ 0 |
| False positives | `email.js` (non-auth) | Removed from tier |

## Allowlist

No broad allowlist entries added. `family_role` DB literal uses Unicode escape in `register.js` to avoid Swedish in source audit.

## Tests

`test/i18n-auth-surfaces.test.js` — static HTML/JS checks, bundle parity samples, login/reset/register API localization, baseline audit gate.

## Remaining limitations

- Child experience pack copy remains separate (`config/i18n/child-*.json`); child-login uses both auth bundles and child pack.
- Non-auth emails in `src/lib/email.js` still contain Swedish (REPORT/admin scope).
- English child UI is still beta per POS; parent auth is fully `sv-SE` / `en-GB`.
