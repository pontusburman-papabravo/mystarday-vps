# en-GB Planning, Library, Family & Settings — inventory

**Scope:** Parent P0/P1 path — Planning hub → Schedule → Library → Family → Settings. Not child experience (`english_child_experience`).

**Target family:** `preferred_locale = en-GB`, `english_app = ON`.

## Routes and HTML

| Surface | Route | HTML | Primary JS |
|---------|-------|------|------------|
| Planning hub | `/planning` | `public/planning.html` | `planning-hub.js`, `parent-magic-page-hubs.js` |
| Weekly schedule | `/schedule` | `public/schedule.html` | `schedule.js`, `schedule-*.js` |
| Library | `/library` | `public/library.html` | `library.js`, `library-magic-hub.js` |
| Family | `/family` | `public/family.html` | `family.js`, `family-hub.js` |
| Settings | `/settings` | `public/settings.html` | `parent-magic-page-hubs.js`, settings sections |

## Locale domains (fragments)

| Domain | Files | Notes |
|--------|-------|-------|
| `planning.*` | `config/i18n/planning-{sv-SE,en-GB}.json` | Hub sections, links, getting started |
| `library.*` | `config/i18n/library-{sv-SE,en-GB}.json` | Hub chrome, errors, empty states, modals |
| `family.*` | `config/i18n/family-{sv-SE,en-GB}.json` | Shell, roles, drawer, toasts, errors |
| `schedule.*` | `config/i18n/schedule-{sv-SE,en-GB}.json` | Editor P0/P1 copy |
| `settings.*` | `config/i18n/settings-{sv-SE,en-GB}.json` | Settings groups, page heroes |
| `nav.*` | `config/i18n/nav-{sv-SE,en-GB}.json` | Extended: capability, header, avatar, mobile |

Shared bootstrap: `public/js/parent-app-i18n.js`, `public/js/parent-magic-i18n.js`, `public/js/locale-datetime.js`.

## Runtime journey (P0/P1)

1. Home (`/dashboard`)
2. Planning (`/planning`)
3. Open schedule (`/schedule`)
4. Edit activity / add from library
5. Save schedule
6. Family (`/family`)
7. Settings (`/settings`)
8. Back to Home or Today

## Classified copy

| Class | Examples |
|-------|----------|
| Static HTML `data-i18n` | Planning/family shell headings, loading |
| Dynamic JS `pt()` / `fpt()` / `spt()` / `lpt()` | Hubs, toasts, modals, schedule editor |
| Server-generated | API errors (localized where server i18n exists) |
| Config `labelKey` | `nav-config.js` CAPABILITIES, HEADER_ACTIONS, AVATAR_ACTIONS |
| User-authored (not translated) | Activity names, schedule names, child names, reward names |
| Out of scope | `/for-dig` hub body, child dashboard, admin, SEO, legal |

## Migrations (immutable)

- `1810000000003` — unchanged
- `1810000000004` — unchanged
- Journey registry 20/20 — unchanged

## Mobile QA checklist

**Devices:** iOS Safari or WebView · Android Chrome or WebView

**Flows (sv-SE + en-GB):**

- [ ] Cold start → Planning hub
- [ ] Open existing schedule → edit → save
- [ ] Library → search placeholder → add activity
- [ ] Family hub → children list → settings link
- [ ] Settings → language row (if enabled)
- [ ] Home → Planning → Family → Home (locale persists)
- [ ] Reload on Planning and Family
- [ ] Bottom nav labels (no clipping)
- [ ] Empty schedule / empty library (if testable)
- [ ] Complete/undo not in scope (Today — regression from PR #713)

**Account:** see [`docs/qa-test-account.md`](qa-test-account.md) (parent review account + child Anna).

## Known backlog (post-phase)

- `/for-dig` hub full localization
- `settings.html` classic sections (deep form labels)
- `library.js` activity modal / category CRUD remaining strings
- `schedule.js` advanced tools (special days detail, template mode edge cases)
- `family.html` drawer/modal static copy (give stars form labels)
- Child experience pack (`P-i18n-Child-Core-C`)

## Recommended next phase

**P-i18n-Child-Core-C** — Child login, child Today, first star, `english_child_experience` pack.
