# Pre-public release gate

Rollout-safe readiness check before a **broad public rollout**.

Widget is **paused and out of scope**. This gate asserts widget flags stay **OFF** and never enables them.

## Command

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run release:pre-public-gate
```

Exit codes:

| Code | Meaning |
|------|---------|
| 0 | **GO** — every required section is PASS |
| 1 | **BLOCKER** — a required check failed |
| 2 | **NOT_VERIFIED** — no blocker, but required evidence is missing |

Statuses are `PASS` / `BLOCKER` / `NOT_VERIFIED` (never collapse missing evidence into PASS).

JSON is written to `artifacts/pre-public-release-gate.json` (gitignored).

## What it does

1. Does **not** mutate live (no flag updates, no prod pilot unless you run that command yourself).
2. Reuses existing tests (`test:gate` + scoped extras that were missing from CI).
3. Checks migration `snapshotContract` seeds for family-device + widget flags (`enabled: false`).
4. Read-only `SELECT` of global `feature_flag` on the local DB (after local `migrate` only).
5. Optional read-only prod flag SELECT via `PRE_PUBLIC_GATE_FLAG_DATABASE_URL` or admin API.
6. Source kill-switch defaults (`AUTHZ_HARDENING_ENABLED`, `RATE_LIMIT_ENABLED` fail-secure ON).
7. Widget flags OFF — never enabled.
8. Optional founder QA **read-only** login if `FOUNDER_QA_*` + `SMOKE_BASE_URL` are set.

## Optional env for a true GO

Without these, the gate exits **2** (NOT_VERIFIED), which is correct — not a false green.

```bash
# Read-only prod flag query (SELECT only, default_transaction_read_only)
PRE_PUBLIC_GATE_FLAG_DATABASE_URL=postgresql://...

# Or admin read of GET /api/admin/feature-flags
PRE_PUBLIC_GATE_ADMIN_EMAIL=...
PRE_PUBLIC_GATE_ADMIN_PASSWORD=...
SMOKE_BASE_URL=<live-origin>

# Prod kill-switch snapshot (JSON, no secrets)
PRE_PUBLIC_GATE_PROD_ENV='{"AUTHZ_HARDENING_ENABLED":"","RATE_LIMIT_ENABLED":""}'

# Human attestation after real-device QA (exact value PASS only)
PRE_PUBLIC_GATE_IOS_DEVICE_QA=PASS
PRE_PUBLIC_GATE_ANDROID_DEVICE_QA=PASS
```

`--skip-test-gate` marks CI health NOT_VERIFIED and **cannot GO**.

## Widget

Do not set `native_widget_enabled` or `widget_completion_enabled`. Do not run WidgetKit/Android widget acceptance as part of this rollout.
