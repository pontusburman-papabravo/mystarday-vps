# RC-1 automated QA fixture

Dedicated **automation-only** family for RC-1 prod smoke and device QA. Not used for App Store review or founder accounts.

## Identity (public)

| Field | Value |
|-------|--------|
| Parent email | `rc1-qa-parent@qa-automation.<internal-domain>` |
| Family name | `RC-1 QA Fixture (automation)` |
| Child display name | `RC1 Child` |
| Child username | `rc1qachild` |

Passwords and PINs live **only** in Cursor/GitHub Environment secrets — never in the repo.

## Secrets

| Variable | Purpose |
|----------|---------|
| `RC1_QA_EMAIL` | Must match allowlisted parent email above |
| `RC1_QA_PASSWORD` | Parent login password (synced by prepare) |
| `RC1_CHILD_PIN` | 4-digit child PIN |
| `RC1_PARENT_PIN` | 4-digit parent **app-lock** PIN (synced by prepare) |
| `RC1_CHILD_USERNAME` | `rc1qachild` (smoke + device harness) |
| `RC1_QA_FAMILY_ID` | UUID after first prepare (pin in environment) |
| `RC1_PIN_FINGERPRINT_KEY` | Shared HMAC key for prep/smoke fingerprint check |
| `RC1_QA_DATABASE_URL` | Prod DB URL for prepare (GitHub `rc1-prod-smoke` environment) |
| `DATABASE_URL` | Same as above when running prepare locally |
| `RC1_SMOKE_BASE_URL` | Live deploy HTTPS origin (per release run) |

## Prepare / reset

```bash
export DATABASE_URL=…
export RC1_QA_EMAIL=rc1-qa-parent@qa-automation.<internal-domain>
export RC1_QA_PASSWORD=…
export RC1_CHILD_PIN=…
export RC1_PARENT_PIN=…
export RC1_PIN_FINGERPRINT_KEY=…

npm run rc1:qa:prepare:dry-run
npm run rc1:qa:prepare
```

Prepare will **refuse** any email not on the allowlist and only mutates the resolved QA family (guarded by family name + email domain).

## Browser smoke

```bash
export RC1_RUN_QA_PREP=1   # optional: reset fixture before smoke (needs DATABASE_URL)
export RC1_EXPECTED_SHA=…
export RC1_EXPECTED_CACHE=stjarndag-v753
# RC1_SMOKE_BASE_URL + RC1_QA_* + RC1_QA_FAMILY_ID + RC1_PIN_FINGERPRINT_KEY

RC1_SMOKE_FILTER=handoff RC1_HANDOFF_DEBUG_RUNS=1 npm run test:e2e:rc1-prod-smoke
RC1_SMOKE_FILTER=handoff RC1_HANDOFF_DEBUG_RUNS=3 npm run test:e2e:rc1-prod-smoke
RC1_REQUIRE_HANDOFF=true RC1_SMOKE_RUNS=2 npm run test:e2e:rc1-prod-smoke
```

On `PARENT_PIN_INVALID` with QA fixture enabled, the harness classifies **`QA_FIXTURE_OR_SECRET_INJECTION_FAILURE`** (no repeated PIN attempts).

## Device QA (automated mobile matrix)

```bash
# RC1_SMOKE_BASE_URL + RC1_QA_EMAIL / RC1_QA_PASSWORD / RC1_CHILD_* 
export RC1_CHILD_USERNAME=rc1qachild
export RC1_DEVICE_PROFILE=ios   # or android
npm run rc1:device-qa
```

Uses Puppeteer mobile viewport + user-agent profiles (not a substitute for native Capacitor binaries; native farm hooks are **VISUAL_REVIEW_OPTIONAL** where OS permission dialogs cannot be scripted).

## GitHub workflows

- `.github/workflows/rc1-prod-smoke.yml` — browser smoke only (`workflow_dispatch`)
- `.github/workflows/rc1-release-gate.yml` — prepare → handoff 1/1 → 3/3 → 5/5×2 → iOS/Android device matrix → summary

## Founder / review accounts

- **Do not** use `pontus@burman.cc` or the App Store review parent for RC-1 automation.
- App Store review: `docs/app-store-demo-konto.md` only.
- Founder manual QA: `docs/founder-qa-test-account.md` (not RC-1 release fixture).
