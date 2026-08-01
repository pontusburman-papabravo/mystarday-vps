# App Store Review — Test Account

> Test account **references** for Apple App Store and Google Play reviewers.
> English — Apple reviewers read English.
>
> **Cursor / Cloud Agents:** use [`founder-qa-test-account.md`](founder-qa-test-account.md) (`FOUNDER_QA_*`) for routine QA — **not** this account unless the task is App Store / release QA.

**Values are stored outside the repository** in approved secret management. See [`secret-references.md`](secret-references.md).

## Credentials (secret names only)

| Field | Secret / reference |
|-------|---------------------|
| Parent email | `APP_REVIEW_EMAIL` |
| Parent password | `APP_REVIEW_PASSWORD` |
| Child name | Anna (public) |
| Child PIN | `APP_REVIEW_CHILD_PIN` |
| Parent app-lock PIN | `APP_REVIEW_PARENT_PIN` (when parental gate is used) |
| App URL | deployment base URL (not stored in git) |

## How to log in

1. Open the configured live app URL from App Store Connect / Play Console notes.
2. Parent login: `APP_REVIEW_EMAIL` / `APP_REVIEW_PASSWORD`.
3. Child login: select **Anna** → PIN from `APP_REVIEW_CHILD_PIN`.

## What the parent sees

The parent dashboard shows:

- Family name (Review Family)
- Child profile **Anna** with an active weekly schedule
- Example schedule and rewards (Skattkammaren)

## What the child sees

After child login:

- Child daily view (Idag)
- Stars and rewards per family configuration

## Store Connect / Play Console

Paste **secret names** in internal runbooks; paste **actual values** only in App Store Connect / Play Console secure fields or 1Password — never in git.

## Rotation

If review credentials may have been exposed, rotate via `scripts/ops/rotate-compromised-credentials.mjs` on the server (see ops runbook) and update App Store Connect / Play Console demo account fields.

## Related

- [`app-store-review-notes.md`](app-store-review-notes.md)
- [`google-play-review-notes.md`](google-play-review-notes.md)
