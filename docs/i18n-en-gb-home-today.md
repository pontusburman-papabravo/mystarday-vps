# en-GB Home, Journey (coach on Home), and Today — inventory

**Scope:** Parent first-day experience after English onboarding — not a full English product beta.

**Target family:** `preferred_locale = en-GB`, `english_app = ON`, `english_child_experience = OFF`.

## Routes and HTML

| Surface | Route | HTML | Primary JS |
|---------|-------|------|------------|
| Home / dashboard (magic hub) | `/dashboard` | `public/dashboard.html` | `dashboard.js`, `dashboard-home-hub.js`, `dashboard-daily-summary.js`, `home-readiness.js`, `journey-coach.js`, `engine-coach.js` |
| Today / daily log | `/daily-log` | `public/daily-log.html` | `daily-log.js` |
| Journey Gate API | `/api/journey-context/*` | — | `src/routes/journey-context.js`, `src/lib/journey/*` |
| Readiness (Home exceptions) | `/api/family/readiness` | — | `src/routes/family/core.js` |

## Locale domains (fragments)

| Domain | Files | Keys (approx.) |
|--------|-------|----------------|
| `home.*` | `config/i18n/home-{sv-SE,en-GB}.json` | Greetings, status, quick actions, handoff, summary, readiness API copy, child stats |
| `today.*` | `config/i18n/today-{sv-SE,en-GB}.json` | Nav, activities, pause, bump, ratings, empty states, errors |
| `journey.*` | `config/i18n/journey-{sv-SE,en-GB}.json` | Coach chrome labels + tip arrays |
| `time.*` | `config/i18n/time-{sv-SE,en-GB}.json` | Today/yesterday/tomorrow prefixes |
| `sections.*` | `src/locales/*.json` (merged) | Morning / Day / Evening / Night |

Shared client bootstrap: `public/js/parent-app-i18n.js`, `public/js/locale-datetime.js`.

## Journey experiences visible on Home

Loaded via Journey Gate + `journey-coach.js`. Registry locale resolved from `family.preferred_locale` (fallback `sv-SE`). Same `experience_key` across locales; copy from registry row for locale.

Coach chrome (labels, tips fallback) is in `journey.*` fragments. **Journey push notifications:** out of scope — remain Swedish until a dedicated pass.

## Today surfaces inventoried

- Date header and week navigation
- Section groups (morning / day / evening / night)
- Activity cards (status, stars, sub-steps)
- Complete / undo, rate, drag reorder
- Pause day, bump time, retrofill banner
- Empty day, no children
- Mood summary chips
- Print week / my days (toast + titles localized; schedule editor link out of scope)
- Modals: parent rating
- Toasts and confirm dialogs
- Loading and retry

**Not translated:** user-authored activity names, instructions, child names.

## Feature flags

| Flag | Role |
|------|------|
| `english_app` | Enables en-GB parent experience (with `preferred_locale`) |
| `english_child_experience` | Unchanged OFF — child dashboard not in scope |

## Analytics (unchanged)

- `readiness_action_click` — `home-readiness.js`
- Journey / coach events — unchanged in `journey-coach.js` / engine
- No new `analytics.track` in daily-log completion path

## Out of scope (remaining Swedish)

- Schedule editor (`/schedule`)
- Rewards hub, Family settings hubs (`parent-magic-page-hubs.js` settings groups)
- Child dashboard / child_en
- Email, SEO, legal pages
- Journey push copy
- Legacy dashboard sidebar (non-magic layout)

## Manual QA status

**Not run on physical iOS/Android devices in this agent session.** Desktop/API verification via `test:gate` and locale unit tests. Recommend mobile-width smoke using the QA test account documented in `docs/qa-test-account.md` before release.
