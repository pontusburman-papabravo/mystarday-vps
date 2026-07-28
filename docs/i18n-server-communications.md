# P-i18n-Server-Communications

Locale-aware server-generated messages for **sv-SE** and **en-GB**.

## Canonical locale

| Context | Source |
|---------|--------|
| Family-scoped email/push | `family.preferred_locale` via `resolveCommunicationLocale()` |
| Pre-family auth email | `auth-email-locale.js` (registration locale / reset body / default sv-SE) |
| User-created data | **Never translated** — child names, activity names, reward names, admin template body |

## Scheduled send locale policy

| Type | Policy |
|------|--------|
| Transactional (PIN, deletion, verification) | Locale at trigger time |
| Scheduled reminders (handoff, push, weekly) | Current `family.preferred_locale` at send time |
| Legal confirmations | Locale snapshot at trigger (deletion request) |

## Coverage (this PR)

| Channel | Message | Status |
|---------|---------|--------|
| Email | Verification, reset, welcome shell, deletion, PIN, child handoff | Localized |
| Email | Co-parent / pedagog invites | Localized |
| Email | Win-back, activation nudge, activation program invite | Localized |
| Email | Newsletter subscription confirm | Localized |
| Email | Reward redemption | Localized |
| Email | Weekly summary body | Localized |
| Email | Trial welcome (if sent) | Localized |
| Push | Schedule reminder, retention d3/d7/d14 | Localized |
| Push | Activation program days 2–7 | Localized |
| Push | Inactivity, star milestone, backfill, custody morning/eve | Localized |
| Push | Activity complete, star grant, reward request | Localized |
| API | Activation program day banner copy | Localized via family locale |

Admin-editable welcome body (`welcome_email_template`) and manual admin newsletters remain unchanged.

## HTML escaping (transactional email)

User/DB display values (`childName`, `firstName`, `familyName`, `rewardName`, etc.) are escaped via `src/lib/escape-html.js` + `src/lib/email-html.js` before interpolation into HTML bodies. Trusted server-built link fragments (settings/deletion mailto anchors) are passed as intentional HTML — not double-escaped.

## Push dedupe keys

Custody morning/evening and schedule reminders dedupe on `notification_log.metadata` (`child_id`, `schedule_date`, `schedule_item_id`) — **not** localized `title`. Locale or copy changes cannot create duplicate sends for the same event.

Star milestones already dedupe on `metadata.child_id` + `metadata.milestone`.

## Out of scope

- PDF generation
- Manual admin newsletter compose (non-system-generated)
- Admin / SEO / legal static pages
- `dagens_nyhet` broadcast copy (admin-authored)

## Tests

`test/i18n-server-communications.test.js` — locale resolver, template parity, helper signatures, suppressed test-mailbox sends.

## Next phase

**P-i18n-Store-Metadata-and-Beta-Builds** — real iOS/Android beta builds, localized store pages, controlled Swedish English Beta distribution. No new country gates.
