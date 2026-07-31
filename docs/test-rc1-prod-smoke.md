# RC-1 live deploy browser smoke

Release evidence against the live deploy (review QA account only). **Test-only** — no product writes beyond login, locale restore, and read-only API checks.

## When to run

- After RC-1 merge/deploy, before physical device QA (R4-E, Journeys A–D).
- **Full release gate:** `RC1_REQUIRE_HANDOFF=true`, `RC1_SMOKE_RUNS=2`, **5/5 tests** twice in a row.
- **Limited diagnostic:** `RC1_REQUIRE_HANDOFF=false` runs **4 tests** (no handoff). Output is marked **NOT READY FOR DEVICE QA**.

## Test suite (full gate = 5)

| # | Test | Stateful locale |
|---|------|-----------------|
| 1 | Release identity (SHA + SW cache) | No |
| 2 | Reports gating | No |
| 3 | Parent locale via Settings UI | Yes — restores captured `preferred_locale` in `finally` |
| 4 | Child login + i18n | Yes — sets **en-GB** for the test, restores original in `finally` |
| 5 | Parent/child handoff (requires `RC1_PARENT_PIN`) | Yes — sets **en-GB**, restores original in `finally` |

Tests do **not** rely on execution order. Each stateful test captures the family locale from `/api/auth/me` before changes and restores it after (even on failure). Audit lines append to `artifacts/rc1-prod-smoke/locale-audit.jsonl`.

## Environment

| Variable | Purpose |
|----------|---------|
| `RC1_SMOKE_BASE_URL` | Target host (explicit per release run) |
| `RC1_EXPECTED_SHA` | Exact `/health` `git_sha` |
| `RC1_EXPECTED_CACHE` | Exact `CACHE_NAME` in `/sw.js` (e.g. `stjarndag-v748`) |
| `RC1_REVIEW_EMAIL` / `RC1_REVIEW_PASSWORD` | Parent — [`qa-test-account.md`](qa-test-account.md) |
| `RC1_CHILD_USERNAME` / `RC1_CHILD_PIN` | Child Anna — username **`anna691`** on prod review |
| `RC1_PARENT_PIN` | Parent app-lock PIN — **required** when `RC1_REQUIRE_HANDOFF=true` |
| `RC1_REQUIRE_HANDOFF` | `true` (default) = 5 tests; `false` = limited 4-test diagnostic |
| `RC1_RESTORE_LOCALE` | Optional **post-suite** target (runner); per-test restore always uses captured `/api/auth/me` locale |
| `RC1_SMOKE_RUNS` | Repeat full suite (use `2` for release gate) |
| `RC1_SMOKE_PACING_MS` | Pause between full suites (default `8000`) |

Credentials must **never** appear in logs or committed files.

## Review family release config

Before child/handoff assertions:

- `english_app_enabled` via `/api/family/locale-options`
- `english_child_experience_enabled` via admin **Development → Features** (`POST /api/admin/features/english_child_experience/families`)

Prep helper (admin credentials required, **review family only**):

```bash
node scripts/rc1-prod-smoke-prep-review-family.js
```

Child UI contract requires **temporary** `preferred_locale=en-GB` inside the child test (not global review default). The test sets and restores locale itself.

## Commands

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
export RC1_SMOKE_BASE_URL="<deploy-base-url>"
export RC1_EXPECTED_SHA="<deploy-sha>"
export RC1_EXPECTED_CACHE="stjarndag-v748"
# RC1_REVIEW_*, RC1_CHILD_*, RC1_PARENT_PIN from secure store
RC1_REQUIRE_HANDOFF=true RC1_SMOKE_RUNS=2 npm run test:e2e:rc1-prod-smoke
```

## Rate limiting (429)

`/api/reports/active-count` retries log sanitized warnings (`attempts`, `429_count`, `Retry-After`). Final status must be **403** `COMPONENT_MISSING`. All-429 attempts fail the run.

## Failure artifacts

`artifacts/rc1-prod-smoke/<timestamp>/<test-name>/` — screenshots + summary (no cookies/PIN).

## GitHub Actions

`.github/workflows/rc1-prod-smoke.yml` — `workflow_dispatch`, environment `rc1-prod-smoke`, `RC1_REQUIRE_HANDOFF=true`, artifacts on failure.

## Scope

- No SW bump or product code changes in the smoke PR.
- Does not mark RC-1 as device-approved.
