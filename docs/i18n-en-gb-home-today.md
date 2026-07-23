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
| `home.*` | `config/i18n/home-{sv-SE,en-GB}.json` | Greetings, status, quick actions, handoff, summary, readiness API copy, child stats, offline |
| `today.*` | `config/i18n/today-{sv-SE,en-GB}.json` | Nav, activities, pause, bump, ratings, empty states, errors, shell |
| `journey.*` | `config/i18n/journey-{sv-SE,en-GB}.json` | Coach chrome labels + tip arrays |
| `time.*` | `config/i18n/time-{sv-SE,en-GB}.json` | Today/yesterday/tomorrow prefixes |
| `nav.*` | `config/i18n/nav-{sv-SE,en-GB}.json` | Primary nav, sidebar, settings labels |
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

## Journey registry runtime sources

| Layer | Role |
|-------|------|
| `journey_experience_registry` (DB) | **Authority** for logged-in families when `family_journey_registry_v2` is on |
| `config/journey-en-GB-translations.js` | Shared copy source for migration `1810000000004` and JSON fallback |
| `config/journey-experience-registry.json` | `experience_key`, phase, tone, destinations (locale-agnostic structure) |
| `src/lib/journey/registry.js` `loadJsonFallback()` | Safety net when DB empty — must not replace a missing deploy migration |

**Migrations (immutable history):**

- `1810000000003` (PR #709, deployed) — initial sv-SE normalisation + en-GB seed
- `1810000000004` (PR #711) — re-upserts all 20 en-GB rows (incl. `coach_expand`) for DBs that ran 0003 before full coverage

Config keys and DB rows must stay aligned — `test/journey-registry-en-gb-migration.test.js` + `test/i18n-home-today.test.js` enforce 20/20.

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
- `mobile-nav.js` hamburger chrome (Tipsa, Mörkt läge aria) — baseline backlog
- `/for-dig` hub copy (separate product surface)

## Phase C gap inventory (P-i18n-Home-Today-C)

| Area | Issue (en-GB) | Fix |
|------|---------------|-----|
| Today HTML shell | Static Swedish header, tips, modal, child selector | `data-i18n` on `daily-log.html` + early `I18n.apply` |
| Today runtime | Hardcoded `⭐ Betyg sparat!` toast | `today.rating.saved` via `pt()` |
| Today runtime | `formatTime` forced `sv-SE` | `LocaleDateTime.formatTime` + family locale |
| Home bottom nav | `nav-config.js` Swedish labels | `labelKey` + `resolveLabel` / `primaryNavForTabs` |
| Home offline | Swedish offline banner | `home.offline.*` + `data-i18n` on dashboard |
| Home readiness | Raw key flash before i18n init | Reload on `parent-i18n-ready` / `locale-changed` |
| Nav domain | Missing fragment merge | `config/i18n/nav-{locale}.json` + `mergeLocaleFragments` |

**Not translated (by design):** user activity names, child names, instructions, Swedish keyword matchers in category chips.

## Dashboard variant matrix

| Variant | How reached | Visible for en-GB parent | Swedish system copy risk | Mitigation |
|---------|-------------|--------------------------|--------------------------|------------|
| **Magic hub** (default) | `AppViewMode` forces `magic` for parents; `DashboardHomeHub.shouldUse()` true on overview | Yes — primary Home | **None** — all chrome via `pt()` / `home.*` | Default path after onboarding |
| **Magic shell, hub hidden** | `shouldUse()` false (`parent_home_magic` OFF, legacy flags) | Rare for sv-SE only | Classic child cards show Swedish | `parent_home_magic` is `live` in seed |
| **en-GB + english_app ON** | `ParentHomeLocaleGate.forceMagicHub()` (rule P-i18n-Home-B) | Yes — always magic hub | **None** — bypasses `parent_home_magic=false` | `parent-home-locale-gate.js` + tests |
| **Legacy sidebar** | HTML in `dashboard.html` | **No** — `body.parent-magic-view` hides `#sidebar` via CSS | N/A (not visible) | CSS gate in `parent-magic-common.css` |
| **Android flat** | `is-native-android` — same magic hub, flat CSS (no 3D) | Yes | **None** — same `pt()` strings | `platform-native.css` |
| **Classic toggle** | Removed — `app-view-mode.js` documents magic-only parents | **Not reachable** | N/A | Code + tests |

**Conclusion:** English families with `english_app` ON always see the localized magic hub (rule P-i18n-Home-B). Legacy sidebar strings exist in HTML but are CSS-hidden for all parents in magic view.

### Product rule P-i18n-Home-B (explicit English gating)

When **both** are true:

- `family.preferred_locale = en-GB`
- `english_app` feature ON for the family

…the dashboard **always** selects the localized magic hub (`DashboardHomeHub.shouldUse()` returns true on overview), even if `parent_home_magic` is OFF or other legacy per-family flags would hide the hub.

**Not affected:** sv-SE families, en-GB with `english_app` OFF, schedule editor drill-down, Android flat CSS mode, analytics events.

## Audit baseline explanation

| Tier | Before PR | After PR | Notes |
|------|-----------|----------|-------|
| **STRICT** | 0 (onboarding infra) | **0** | Added Home/Today files to strict — see list below |
| **BASELINE** | 289 | **289** | Unchanged — Home/Today files were never in baseline (new migration) |

**Files moved to STRICT tier** (previously untracked / report-only):
`parent-app-i18n.js`, `locale-datetime.js`, `dashboard-home-hub.js`, `dashboard-daily-summary.js`, `daily-log.js`, `journey-coach.js`, `home-readiness.js`, `home/today/journey/time-en-GB.json` fragments. `nav-config.js` uses `labelKey` + `resolveLabel` but remains outside strict until capability labels migrate.

Baseline did not decrease because those files were not previously counted in the 289 baseline (auth/login pages). No whole-file allowlist exemptions added.

## Manual QA checklist (Home → Today, en-GB)

Run with the QA test account documented in `docs/qa-test-account.md` (`preferred_locale=en-GB`, `english_app=ON`) and a control `sv-SE` family.

| # | Check | sv-SE | en-GB |
|---|-------|-------|-------|
| 1 | Cold start → Home loads | Swedish chrome | English chrome |
| 2 | Bottom nav labels | Hem, Planering, … | Home, Planning, … |
| 3 | Journey coach card | Swedish DB copy | English DB copy (20/20) |
| 4 | Navigate Home → Today | Locale preserved | Locale preserved |
| 5 | Today shell (header, tips, PDF) | Swedish | English |
| 6 | Date header / weekdays | Swedish months | English months |
| 7 | Complete activity + star toast | Swedish | English |
| 8 | Undo activity | Swedish | English |
| 9 | Empty schedule day | Swedish | English |
| 10 | Offline banner on Home | Swedish | English |
| 11 | Reload on Today | Swedish | English |
| 12 | Back Today → Home | No mixed language | No mixed language |
| 13 | iPhone Safari portrait | Layout OK | Layout OK (longer EN labels) |
| 14 | iOS / Android WebView | Same as browser | Same as browser |
| 15 | Simulated API error | Localized error + retry | Localized error + retry |
| 16 | Parent rating modal save | Swedish toast | English toast |

**Visual:** button clipping, modal width, bottom nav on 320px width, screen reader labels on nav + date picker where practical.

## Manual QA status

**Not run on physical iOS/Android devices in this agent session.** Desktop/API verification via `test:gate` and locale unit tests. Recommend mobile-width smoke using the QA test account documented in `docs/qa-test-account.md` before release.
