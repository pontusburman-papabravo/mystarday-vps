# RC-1 live deploy browser smoke

Release evidence against the live deploy (review QA account only). **Test-only** — no product writes beyond login, locale restore, and read-only API checks.

## When to run

- After RC-1 merge/deploy, before physical device QA (R4-E, Journeys A–D).
- **Full release gate:** `RC1_REQUIRE_HANDOFF=true`, `RC1_SMOKE_RUNS=2`, **5/5 tests** twice in a row.
- **Limited diagnostic:** `RC1_REQUIRE_HANDOFF=false` runs **4 tests** (no handoff). Output is marked **NOT READY FOR DEVICE QA**.

## Test suite (full gate = 5)

Order (full gate):

| # | Test | Locale |
|---|------|--------|
| 1 | Release identity (SHA + SW cache) | No |
| 2 | Parent locale via **Settings UI** | Settings UI + restore |
| 3 | Child login + i18n | API fixture (`withFamilyLocaleFixture`) |
| 4 | Parent/child handoff (`RC1_PARENT_PIN`) | API fixture only |
| 5 | Reports gating (last — may see documented 429 + Retry-After) | No |

Handoff uses HTTP contract on `POST /api/auth/logout`, `verify-pin`, and `restore-parent-session` — not DOM-only inference.

## Handoff debug (not release gate)

```bash
RC1_SMOKE_FILTER=handoff RC1_HANDOFF_DEBUG_RUNS=3 npm run test:e2e:rc1-prod-smoke
```

Runs release identity + handoff only (2 tests). Requires 3/3 pass before trusting full gate.

## Locale fixtures

- **Settings UI test** — `withFamilyLocaleScope` (Settings selectors; attempt-local 429 retry only).
- **Child + handoff** — `withFamilyLocaleFixture` (authenticated `PUT /api/family/settings`; cleanup via **new isolated parent context**, never child `logout`).

Primary vs cleanup failures use `AggregateError` when both fail; locale audit phases: `test_failed`, `cleanup_started`, `cleanup_passed` / `cleanup_failed`.

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
| `RC1_SMOKE_PACING_MS` | Pause between full suites (default `90000`) |
| `RC1_TEST_GAP_MS` | Pause between individual tests in one suite (default `20000`) |
| `RC1_SMOKE_INITIAL_COOLDOWN_MS` | Optional wait before first suite (rate-limit recovery) |

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
