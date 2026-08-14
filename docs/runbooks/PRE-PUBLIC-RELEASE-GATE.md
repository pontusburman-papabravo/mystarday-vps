# Pre-public release gate

Rollout-safe readiness check before a **broad public rollout**.

Widget is **paused and out of scope**. This gate asserts widget flags stay **OFF** and never enables them.

## Command

**Canonical (required for certification):** GitHub Actions workflow `Pre-public release gate` (`.github/workflows/pre-public-release-gate.yml`).

- `workflow_dispatch` with `target_sha` **must equal current `origin/main` exactly** — historical SHAs are refused before prod credentials are used.
- Run only **after** that main SHA is deployed and public + localhost `/health` report the same `git_sha`.
- `profile`: `public-runtime` (default) or `native-store`.
- Runs on clean CI Postgres — **never** on the live VPS app host (prod app DB URL breaks disposable suites).
- Requires GitHub environment `pre-public-release-gate`:
  - **Secrets:** `PRE_PUBLIC_GATE_ADMIN_EMAIL`, `PRE_PUBLIC_GATE_ADMIN_PASSWORD`
  - **Variable (required):** `SMOKE_BASE_URL` (live prod origin for read-only admin API checks)

**Do not certify an older deployed SHA** (e.g. a prior merge) once `main` has moved — merge #998 and later commits require certifying the **new** main HEAD after deploy.

Example dispatch (replace `<current-main-sha>` with `git rev-parse origin/main` at run time):

```bash
gh workflow run "Pre-public release gate" \
  -f target_sha=<current-main-sha> \
  -f profile=public-runtime
```

Local/dev (diagnostics only — prod evidence needs admin env above):

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
# Override deploy-mode env injection per AGENTS.md (test mode + REQUIRE_EMAIL_VERIFICATION=false)
npm run release:pre-public-gate
npm run release:pre-public-gate -- --profile=native-store
```

Default profile: **`public-runtime`** (web/server rollout — no new App Store/Play binary required).

Exit codes:

| Code | Meaning |
|------|---------|
| 0 | **GO** — profile-specific required sections are PASS |
| 1 | **BLOCKER** — a required check failed |
| 2 | **NOT_VERIFIED** — no blocker, but required evidence is missing |

JSON is written to `artifacts/pre-public-release-gate.json` (gitignored).

## Profiles

| Profile | Scope |
|---------|--------|
| `public-runtime` | Family device, child runtime, server/web rollout. Android signing and physical device QA are **advisory** — they do not block GO. |
| `native-store` | Requires store release evidence: signing, physical device attestation, platform contracts. |

Result model includes:

- `profile`
- `overall` / `runtimeReadiness` / `nativeStoreReadiness`
- `widget: EXCLUDED_PAUSED`

## What it does

1. Does **not** mutate live (no flag updates, no prod pilot unless you run that command yourself).
2. Reuses existing tests (`test:gate` + scoped extras).
3. Checks migration `snapshotContract` seeds for family-device + widget flags (`enabled: false`).
4. Local `migrate` on localhost only, then **local-only** `feature_flag` repair via `scripts/lib/pre-public-release-gate/local-flag-repair.cjs` (`ON CONFLICT DO NOTHING`). Standard `migrate.js` does **not** repair flags.
5. Read-only prod flag SELECT via admin API or `PRE_PUBLIC_GATE_FLAG_DATABASE_URL`.
6. Prod kill-switch verification via admin `GET /api/admin/release-readiness` (or `PRE_PUBLIC_GATE_PROD_ENV` fallback).
7. Widget flags OFF — never enabled.

Spawned tests use `RATE_LIMIT_ENABLED=false` (same as CI).

### Local flag repair (explicit)

```bash
npm run bootstrap:local-feature-flags
```

Refuses non-local `DATABASE_URL`. Also runs automatically after local migrate in the gate and in test DB bootstrap (`test/helpers/setup.js`).

## Required env for GitHub canonical certification

Configure in GitHub environment **`pre-public-release-gate`** (all required for workflow dispatch):

```bash
PRE_PUBLIC_GATE_ADMIN_EMAIL=...
PRE_PUBLIC_GATE_ADMIN_PASSWORD=...
SMOKE_BASE_URL=<live-origin>   # environment variable — required
```

This enables read-only:

- `GET /api/admin/feature-flags` — global flags must be OFF
- `GET /api/admin/release-readiness` — `{ authzHardeningEnabled, rateLimitEnabled, activityTimerV2Disabled, activityTimerV2Available }`

Fallback (no admin creds):

```bash
PRE_PUBLIC_GATE_FLAG_DATABASE_URL=postgresql://...   # read-only SELECT
PRE_PUBLIC_GATE_PROD_ENV='{"AUTHZ_HARDENING_ENABLED":"","RATE_LIMIT_ENABLED":""}'
```

### Activity Timer prod pilot (optional, separate command)

Disposable `at-pilot-*@example.com` family — never mass-enables timers. Self-cleaning with snapshot/restore.

```bash
ACTIVITY_TIMER_PILOT_CONFIRM=1 \
ACTIVITY_TIMER_PILOT_ALLOWED_BASES=https://example.test \
SMOKE_BASE_URL=https://example.test \
npm run activity-timer:prod-pilot
```

Gate advisory hook: `PRE_PUBLIC_GATE_ACTIVITY_TIMER_PILOT=1` (does not auto-run; run pilot separately).

The **activity_timer** section also checks prod `activityTimerV2Available` via the same admin credentials as kill-switches.

**Public-runtime production evidence (REQUIRED for timer rollout certification):**

1. Automated timer UI/browser contracts green in CI (`test:gate` + matrix)
2. Admin `release-readiness`: `activityTimerV2Disabled=false`, `activityTimerV2Available=true`
3. Disposable self-cleaning `at-pilot-*` prod pilot green (`npm run activity-timer:prod-pilot`)
4. Cleanup verified; no timer mass-enable; per-child master default remains OFF

**Legacy Puppeteer VPS smoke (`scripts/activity-timer-prod-acceptance-gate.mjs`) is ADVISORY only.**

Do **not** install desktop/GUI libraries (e.g. `libatk-1.0.so.0`) on the production application server merely to make certification green. Missing Puppeteer deps on prod VPS must **not** block Activity Timer public-runtime readiness. Run optional visual smoke from a CI/QA runner with browser dependencies instead.

### Native-store only (advisory for public-runtime)

```bash
PRE_PUBLIC_GATE_IOS_DEVICE_QA=PASS
PRE_PUBLIC_GATE_ANDROID_DEVICE_QA=PASS
```

`--skip-test-gate` marks CI health NOT_VERIFIED and **cannot GO**.

## Widget

Do not set `native_widget_enabled` or `widget_completion_enabled`. Do not run WidgetKit/Android widget acceptance as part of this rollout.
