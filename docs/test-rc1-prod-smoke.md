# RC-1 live deploy browser smoke

Release evidence against the live deploy (review QA account only). **Test-only** — no product writes beyond login, locale restore, and read-only API checks.

## When to run

- After RC-1 merge/deploy, before physical device QA (R4-E, Journeys A–D).
- Twice in a row on the same `RC1_EXPECTED_SHA` with `RC1_SMOKE_RUNS=2`.

## Environment

| Variable | Purpose |
|----------|---------|
| `RC1_SMOKE_BASE_URL` | Target host (set explicitly per release run) |
| `RC1_EXPECTED_SHA` | Exact `/health` `git_sha` |
| `RC1_EXPECTED_CACHE` | Exact `CACHE_NAME` in `/sw.js` (e.g. `stjarndag-v748`) |
| `RC1_REVIEW_EMAIL` / `RC1_REVIEW_PASSWORD` | Parent — see [`qa-test-account.md`](qa-test-account.md) |
| `RC1_CHILD_USERNAME` / `RC1_CHILD_PIN` | Child Anna — username is **`anna691`** on prod review; PIN in [`app-store-demo-konto.md`](app-store-demo-konto.md) |
| `RC1_RESTORE_LOCALE` | Locale restored after Settings test (default `sv-SE`) |
| `RC1_PARENT_PIN` | Optional parent app-lock PIN for handoff test |
| `RC1_SMOKE_RUNS` | Repeat full suite (default `1`, use `2` for flake gate) |

Credentials must **never** appear in logs or committed files.

### Review family release config (RC-1)

Before expecting 5/5 prod smoke, the App Store review family must have:

- `english_app_enabled` (via `english_app` / locale-options)
- `english_child_experience_enabled` on the family (`family_features`)
- `preferred_locale` `en-GB` after the locale smoke step restores `sv-SE` by default

If `english_child_experience_enabled` is false, child/i18n assertions fail by design (**release config**, not a flaky test).

## Command

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
export RC1_SMOKE_BASE_URL="<deploy-base-url>"
export RC1_EXPECTED_SHA="<deploy-sha>"
export RC1_EXPECTED_CACHE="stjarndag-v748"
# set RC1_REVIEW_* and RC1_CHILD_* from secure store
RC1_SMOKE_RUNS=2 npm run test:e2e:rc1-prod-smoke
```

## Failure artifacts

On assertion failure, diagnostics are written under `artifacts/rc1-prod-smoke/<timestamp>/<test-name>/` (gitignored). Contents are sanitized (no cookies, PIN, or passwords).

## GitHub Actions

Manual workflow: `.github/workflows/rc1-prod-smoke.yml` (`workflow_dispatch`) with GitHub Environment secrets and required inputs for URL, SHA, and cache version.

## Scope

- Does **not** bump service worker or change product code.
- Does **not** create rewards, goals, or family data on the review account.
- Does **not** mark RC-1 as device-approved.
