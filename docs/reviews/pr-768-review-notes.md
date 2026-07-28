# PR #768 — i18n push + email review pack

Branch: `cursor/i18n-push-email-fbe1`  
PR: #768

This folder is for **offline review** when GitHub or the agent VM paths are unavailable.

| File | Purpose |
|------|---------|
| `pr-768-i18n-push-email.diff` | Full `git diff origin/main...HEAD` at time of pack (regenerate after new commits) |
| `pr-768-review-notes.md` | This document |

Regenerate diff locally:

```bash
git fetch origin cursor/i18n-push-email-fbe1
git diff origin/main...origin/cursor/i18n-push-email-fbe1 > docs/reviews/pr-768-i18n-push-email.diff
```

## Scope

Localize server-generated push + transactional email for `sv-SE` / `en-GB` using `family.preferred_locale` at send time.

## Hardening (merge blockers addressed)

### 1. HTML escaping

- Shared helpers: `src/lib/escape-html.js`, `src/lib/email-html.js`
- `src/lib/email.js` — all P1 senders escape user/DB display values before HTML interpolation
- `src/lib/welcome-mailer.js` — template `{{foralderns_namn}}` / `{{barnets_namn}}` substitutions escaped
- `src/lib/weekly-summary-scheduler.js` — child names and parent greeting escaped in HTML
- Trusted server HTML (deletion mailto/brand links, settings link fragments from locale strings) is **not** double-escaped
- Tests: `test/email-html-escaping.test.js`

### 2. Push dedupe (locale-independent)

| Notification | Dedupe key |
|--------------|------------|
| `custody_morning_reminder` | `type` + `metadata.child_id` + `created_at::date` |
| `custody_handoff_reminder` | `type` + `metadata.child_id` + `created_at::date` |
| `schedule_reminder` | `type` + `metadata.child_id` + `metadata.schedule_item_id` + `metadata.schedule_date` (+ 2h window) |
| `star_milestone` | `type` + `metadata.child_id` + `metadata.milestone` (unchanged) |

**No dedupe remains title/subject-based** in touched schedulers.

Tests: `test/push-notification-dedupe.test.js`

## Locale resolution

- `resolveCommunicationLocale(family.preferred_locale)` or `getFamilyPreferredLocale(familyId)`
- SQL: `COALESCE(preferred_locale, 'sv-SE')` in scheduler queries
- Scheduled sends use **current** family locale at run time

## Still Swedish / out of scope

- Admin `welcome_email_template` body (DB)
- `newsletter-mailer.js`, `nyhet-scheduler.js`, `library-notifications.js`
- Custody once-task DB label `Packa väska` (activity data)
- Child API JSON in `rewards.js` redeem message
- PDF, legal/SEO static pages

## Tests to run before merge

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:gate
npm run audit:i18n:strict
```

## CI

PR #768 CI (test:gate + E2E i18n) should be green after hardening commit.
