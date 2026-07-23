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

## Dashboard variant matrix

| Variant | How reached | Visible for en-GB parent | Swedish system copy risk | Mitigation |
|---------|-------------|--------------------------|--------------------------|------------|
| **Magic hub** (default) | `AppViewMode` forces `magic` for parents; `DashboardHomeHub.shouldUse()` true on overview | Yes — primary Home | **None** — all chrome via `pt()` / `home.*` | Default path after onboarding |
| **Magic shell, hub hidden** | `shouldUse()` false (schedule editor open, `parent_home_magic` OFF) | Rare — editor/flag only | Classic child cards may show Swedish | `parent_home_magic` is `live` in seed; English path uses magic overview |
| **Legacy sidebar** | HTML in `dashboard.html` | **No** — `body.parent-magic-view` hides `#sidebar` via CSS | N/A (not visible) | CSS gate in `parent-magic-common.css` |
| **Android flat** | `is-native-android` — same magic hub, flat CSS (no 3D) | Yes | **None** — same `pt()` strings | `platform-native.css` |
| **Classic toggle** | Removed — `app-view-mode.js` documents magic-only parents | **Not reachable** | N/A | Code + tests |

**Conclusion:** English families with `english_app` ON see magic hub with localized copy. Legacy sidebar strings exist in HTML but are CSS-hidden for all parents in magic view.

## Audit baseline explanation

| Tier | Before PR | After PR | Notes |
|------|-----------|----------|-------|
| **STRICT** | 0 (onboarding infra) | **0** | Added Home/Today files to strict — see list below |
| **BASELINE** | 289 | **289** | Unchanged — Home/Today files were never in baseline (new migration) |

**Files moved to STRICT tier** (previously untracked / report-only):
`parent-app-i18n.js`, `locale-datetime.js`, `dashboard-home-hub.js`, `dashboard-daily-summary.js`, `daily-log.js`, `journey-coach.js`, `home-readiness.js`, `home/today/journey/time-en-GB.json` fragments.

Baseline did not decrease because those files were not previously counted in the 289 baseline (auth/login pages). No whole-file allowlist exemptions added.

## Manual QA status

**Not run on physical iOS/Android devices in this agent session.** Desktop/API verification via `test:gate` and locale unit tests. Recommend mobile-width smoke using the QA test account documented in `docs/qa-test-account.md` before release.
