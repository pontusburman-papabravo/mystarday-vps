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

## P0 coverage (this PR)

| Channel | Message | Status |
|---------|---------|--------|
| Email | Verification | Already localized |
| Email | Password reset | Already localized |
| Email | Welcome shell (header/CTA/footer) | Localized; admin body unchanged |
| Email | Account deletion requested | Localized |
| Email | Account deleted | Localized |
| Email | PIN warning | Localized |
| Email | Child handoff reminder | Localized |
| Push | Schedule reminder | Localized |
| Push | Journey retention d3/d7/d14 | Localized |
| API | Feedback ack | Localized |
| API | Export empty/rate-limit/not-found | Localized |

## P1 backlog

- Co-parent / pedagog invites
- Reward redemption email
- Weekly summary email body
- Inactivity / custody / star-milestone push
- Newsletter confirmation
- Contact form user ack email (today JSON only for contact)

## P2 backlog

- Win-back, activation nudges, dagens nyhet broadcast
- Admin-only emails
- `email_templates` table alignment with runtime sends

## Tests

`test/i18n-server-communications.test.js` — locale resolver, template parity, helper signatures.

## Next phase

**P-i18n-Store-Metadata-and-Beta-Builds** — real iOS/Android beta builds, localized store pages, controlled Swedish English Beta distribution. No new country gates.
