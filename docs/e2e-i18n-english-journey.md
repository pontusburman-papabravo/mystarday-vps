# E2E: English journey smoke tests

Browser smoke coverage for the English parent + child path after PR #742 (login locale) and PR #747 (auth i18n).

## Infrastructure

| Piece | Choice |
|-------|--------|
| Browser | **Puppeteer** (`devDependency` since 2025; used by `scripts/smoke-act1-*.js`, `platform-qa-parent-hubs.mjs`, etc.) |
| Runner | **node:test** via `scripts/run-e2e-i18n.js` (same pattern as `test:gate`) |
| Server | `listenApp(createApp())` on ephemeral port |
| Database | `setupTestDb()` — isolated family per test, truncated between files |

Playwright appears in ad-hoc prod smoke scripts but is **not** a declared dependency; Puppeteer is the established in-repo browser tool.

## Prerequisites

Merged on `main`:

- `public/js/login-locale.js` (PR #742)
- `public/js/auth-entry-failsafe.js` (PR #747)
- `src/lib/apply-login-locale.js`, `src/lib/auth-api-messages.js`

Without these files, the suite skips with a clear message.

## Feature flags

Per-family flags are set in SQL (`test/e2e/helpers/i18n-flags.js`):

```sql
INSERT INTO family_features (family_id, feature_slug) VALUES ($familyId, 'english_app');
INSERT INTO family_features (family_id, feature_slug) VALUES ($familyId, 'english_child_experience');
```

`features` rows are ensured via `ensureEnglishFeatureRows()` (same as `test/i18n-child-pack-flags.test.js`).

The **child flag OFF** regression clears only `english_child_experience` while keeping `english_app` + `preferred_locale = en-GB`.

## Test data

- Isolated example.com emails only (see `seed-family.js`)
- Outbound email disabled in the test runner script
- Parent `onboarding_completed = true` so hubs load instead of wizard
- Child username + PIN `2468`, one incomplete `daily_log_item` for optional completion check
- Never uses shared review or demo accounts


## Commands

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
sudo pg_ctlcluster 16 main start
# DATABASE_URL + JWT_SECRET from secrets / local bootstrap

REQUIRE_EMAIL_VERIFICATION=false npm run test:e2e:i18n  # pragma: allowlist secret
```

Options:

| Env | Default | Purpose |
|-----|---------|---------|
| `E2E_VIEWPORTS` | `desktop,mobile` | Comma-separated viewports |
| `E2E_HEADED` | `0` | Set `1` to watch browser |
| `E2E_TIMEOUT_MS` | `45000` | Action timeout |

Also run (not in `test:gate` — keeps gate fast):

```bash
REQUIRE_EMAIL_VERIFICATION=false npm run test:gate  # pragma: allowlist secret
npm run audit:i18n:strict
npm run audit:i18n:baseline
```

## Scenarios

### Main journey (`i18n-english-journey.test.js`)

1. Cold browser → `/login` → explicit **English** → English auth copy
2. Login → `family.preferred_locale = en-GB`
3. Smoke parent hubs: Home, Today, Planning, Rewards, Family, Settings
4. Reload → English persists
5. Logout/login without locale click → DB locale still en-GB
6. Child login → English child surfaces (with `english_child_experience`)
7. Optional activity check-off → no Swedish celebration copy

### Login locale regression (`i18n-login-locale-regression.test.js`)

- DB en-GB, no switch → English UI
- DB en-GB, explicit sv-SE → Swedish
- DB sv-SE, explicit en-GB → English
- Failed login → locale unchanged
- `english_child_experience` OFF → child login Swedish pack

### Auth failsafe (`i18n-auth-failsafe.test.js`)

- Block `auth-entry-i18n.js` → `#auth-entry-fallback` visible
- Block locale bundle → page not permanently hidden
- Simulated bootstrap throw → login form visible
- Swedish copy detector unit tests

## CI

Separate workflow: `.github/workflows/e2e-i18n.yml` (not part of `test:gate`).

## Known gaps / follow-up

- **Home hub body copy:** seeded Swedish activity names and some journey labels (e.g. “Nästa” in readiness widgets) may appear in the page body; smoke checks **parent shell chrome** (bottom nav, headers, h1) only. Full dashboard/schedule i18n is a separate track.
- Safari/WebKit not in CI (Chromium only via Puppeteer)
- Parent hub copy may still leak Swedish on deep surfaces (schedule editor, reports) — out of scope
- Admin, SEO, legal pages excluded
- Physical device QA still required per `docs/i18n-pr713-mobile-qa-report.md`
