# RC-1 automated QA fixture

**Scope:** scripts, tests, and GitHub workflows — includes a **live-DB prepare script** (not app runtime). See `docs/rc1-github-environment.md` for secret placement and main-only execution.

Dedicated **automation-only** family for RC-1 live deploy smoke and mobile-browser QA.

## Identity (public)

| Field | Value |
|-------|--------|
| Parent email | `rc1-qa-parent@qa-automation.<internal-domain>` |
| Family name | `RC-1 QA Fixture (automation)` |
| Child username | `rc1qachild` (not a secret — wired from prepare job output) |

Passwords and PINs live **only** in GitHub/Cursor deployment secrets.

## Gates

| Verdict | Meaning |
|---------|---------|
| **RC-1 AUTOMATED WEB PASS** | Browser smoke 5/5×2 + mobile-browser iOS/Android profiles (Chromium) |
| **RC-1 NATIVE DEVICE PASS** | Future — real Capacitor iOS/Android (`docs/rc1-native-device-automation-plan.md`) |
| **BROWSER-ONLY DIAGNOSTIC PASS** | Smoke without mobile-browser matrix (`skip_mobile_browser`) |

Mobile-browser tests use viewport + user-agent only — **not** native apps.

## Secrets

| Variable | Where |
|----------|--------|
| `RC1_QA_DATABASE_URL` | **Only** `rc1-qa-db-prepare` deployment target |
| `RC1_QA_EMAIL`, `RC1_QA_PASSWORD`, `RC1_CHILD_PIN`, `RC1_PARENT_PIN` | `rc1-qa-db-prepare` + `rc1-prod-smoke` targets |
| `RC1_QA_FAMILY_ID` | `rc1-prod-smoke` target (until prepare creates fixture) |

Do **not** store `RC1_CHILD_USERNAME` as a secret — use prepare output `child_username`.

## Code layout

| Path | Role |
|------|------|
| `test/support/rc1-qa-fixture.js` | Allowlisted fixture constants (not `src/`) |
| `scripts/lib/rc1-qa-prepare-core.js` | Transactional prepare logic |
| `scripts/lib/rc1-qa-reset-manifest.js` | Reset table manifest + wipe |
| `scripts/rc1-qa-family-prepare.js` | CLI |
| `scripts/rc1-assert-release-gate-context.js` | Main + SHA guard |

PIN verification: `prep_pin_verified_against_database=true` in prepare JSON (in-transaction, before `COMMIT`). End-to-end PIN proof is `verify-pin-picker` in browser smoke.

## Prepare / reset

`prepare_mode` (workflow input / `RC1_PREPARE_MODE` env):

| Mode | Behavior |
|------|----------|
| **none** | No DB job — use existing `RC1_QA_FAMILY_ID` secret |
| **dry-run** | Read-only DB inspect (`rc1-qa-db-prepare`) — guard + plan, no writes |
| **apply** | Atomic prepare (`rc1-qa-db-prepare`) — writes + reset manifest |

```bash
npm run rc1:qa:prepare:dry-run   # legacy CLI plan only (no DB)
RC1_PREPARE_MODE=dry-run npm run rc1:qa:prepare   # DB inspect dry-run
# After SAFE TO PREP PROD — from protected main only:
RC1_PREPARE_MODE=apply npm run rc1:qa:prepare
```

## Workflows

- `.github/workflows/rc1-web-release-gate.yml` — web gate (`prepare_mode` default **none**)
- `.github/workflows/rc1-prod-smoke.yml` — browser smoke only

## First live-DB prepare (operator)

Only when verdict is **SAFE TO PREP PROD**:

1. Merge infrastructure to `main`
2. Configure deployment targets per `docs/rc1-github-environment.md`
3. `prepare_mode: dry-run` on main (read-only guard inspect)
4. `prepare_mode: apply` once — verify `fixture_verified` + idempotent second run
5. Store `family_id` in `RC1_QA_FAMILY_ID` if needed
6. Run full web release gate

## Founder / review

Do **not** use founder or App Store review accounts for RC-1 automation.
