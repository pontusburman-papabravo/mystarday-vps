# i18n Glossary — en-GB terminology

Canonical English (en-GB) product terms for parent + child surfaces.
When adding or editing locale keys, use these exact terms. Swedish copy is
unchanged by this glossary — it maps concepts, not literal translations.

| Concept (sv) | en-GB term | Notes |
|---|---|---|
| Extra stjärnor | **Bonus stars** | Never "Extra stars". Aligns with the existing child-surface `bonusStars` keys. |
| Ge extra stjärnor | **Give bonus stars** | Modal title. Submit button stays "Give stars" (short, mobile). |
| Fyll vecka | **Populate week** | Never "Fill week". "Fill entire week" was rejected as too long for the mobile toolbar button. |
| Engångsaktivitet | **One-off activity** | Natural British English; kept. |
| Lovperiod | **Holiday period** | Kept ("holiday" is the British term for school breaks). |
| Återställ till veckoschema | **Reset to weekly schedule** | Kept. |
| Jämför barn | **Compare children** | Kept. |
| Veckoplanering | **Weekly planning** | Page title on /schedule. |
| Specialdag | **Special day** | |
| Skattkammaren | **Treasure chest** (child) | Existing child pack term. |

## Legacy-language notice (locale switch sv → en-GB)

Existing user content (activities, sub-steps, categories, rewards, schedule
names) is **never translated or migrated automatically** — it is user data.

Families that switch from Swedish to English see a one-time dismissable notice
on Home:

- en-GB: `Existing activities stay in their original language. New activities use English.`
- sv-SE: `Befintliga aktiviteter behåller sitt nuvarande språk. Nya aktiviteter skapas på svenska.`

**Relevance rule** (pure DB signal, no free-text heuristics — see
`shouldShowLegacyLanguageNotice()` in `src/lib/locale-selection.js`):

```
family.preferred_locale = 'en-GB'
AND family.legacy_language_notice_dismissed_at IS NULL
AND (
  family.previous_locale LIKE 'sv%'          -- tracked switches
  OR (family.previous_locale IS NULL
      AND family.english_beta_offer_state = 'accepted_english_beta')
      -- early beta families backfilled before previous_locale existed
)
```

`previous_locale` is written by the settings PUT (`src/routes/family/core.js`),
the login-picker (`src/lib/apply-login-locale.js`) and the English beta offer
(`src/routes/family/locale.js`), so families registered directly in English
never match. Dismissal is stored once per family via
`POST /api/family/legacy-language-notice/dismiss`
(`family.legacy_language_notice_dismissed_at`).

## Date formats (en-GB)

- App-rendered labels use `Intl` with `I18n.getCurrentLang()` — never a
  hardcoded display locale. en-GB renders e.g. `Monday 20 Jul`, `26/07/2026`.
- `toLocaleDateString('sv-SE')` without display options is allowed **only** as
  a technical `YYYY-MM-DD` formatter for API payloads (`toDateStr`).
- `'en-US'` is allowed **only** for internal weekday-key extraction
  (`Mon`/`Tue`…) in timezone logic (`src/lib/schedule-date-utils.js`,
  `src/routes/onboarding.js`) — never for display.
- Native `<input type="date">` renders in the **device** locale (e.g.
  `07/26/2026` on a US-locale browser); the underlying value is always
  `YYYY-MM-DD`. Tests must assert the value and the app's own formatted
  labels, not the native widget rendering.

## Demo / QA account (English)

`npm run seed:english-demo` (`scripts/seed-english-demo-family.mjs`) creates or
resets the idempotent English demo family — see the script header for the
documented demo address, safety rails and contents.
