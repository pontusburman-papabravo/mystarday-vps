# Pre-public release gate

Rollout-safe readiness check before a **broad public rollout**.

Widget is **paused and out of scope**. This gate asserts widget flags stay **OFF** and never enables them.

## Command

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

## Optional env for public-runtime GO

```bash
PRE_PUBLIC_GATE_ADMIN_EMAIL=...
PRE_PUBLIC_GATE_ADMIN_PASSWORD=...
SMOKE_BASE_URL=<live-origin>
```

This enables read-only:

- `GET /api/admin/feature-flags` — global flags must be OFF
- `GET /api/admin/release-readiness` — `{ authzHardeningEnabled, rateLimitEnabled }`

Fallback (no admin creds):

```bash
PRE_PUBLIC_GATE_FLAG_DATABASE_URL=postgresql://...   # read-only SELECT
PRE_PUBLIC_GATE_PROD_ENV='{"AUTHZ_HARDENING_ENABLED":"","RATE_LIMIT_ENABLED":""}'
```

### Native-store only (advisory for public-runtime)

```bash
PRE_PUBLIC_GATE_IOS_DEVICE_QA=PASS
PRE_PUBLIC_GATE_ANDROID_DEVICE_QA=PASS
```

`--skip-test-gate` marks CI health NOT_VERIFIED and **cannot GO**.

### Family-device prod pilot (optional prod evidence)

When admin/QA credentials and prod DB access exist, the gate can run the disposable prod pilot:

```bash
PRE_PUBLIC_GATE_PROD_PILOT=1
FAMILY_DEVICE_PILOT_CONFIRM=1
SMOKE_BASE_URL=https://example.test
FAMILY_DEVICE_PILOT_ALLOWED_BASES=https://example.test
DATABASE_URL=postgresql://...   # prod — disposable fd-pilot-* families only
```

Runs `npm run family-device:prod-pilot` (family-level overrides only; **never** global flag enable). Without these vars, prod acceptance stays optional and does not block public-runtime GO.

## Widget

Do not set `native_widget_enabled` or `widget_completion_enabled`. Do not run WidgetKit/Android widget acceptance as part of this rollout.
