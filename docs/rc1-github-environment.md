# RC-1 GitHub deployment targets (live QA)

Configure these **before** the first `prepare_mode: apply` against the live deploy database.

## Deployment targets

| GitHub target | Purpose | Secrets |
|-------------|---------|---------|
| `rc1-qa-db-prepare` | **Only** job that may read live DB URL | `RC1_QA_DATABASE_URL`, plus `RC1_QA_EMAIL`, `RC1_QA_PASSWORD`, `RC1_CHILD_PIN`, `RC1_PARENT_PIN`, optional `RC1_QA_FAMILY_ID` |
| `rc1-prod-smoke` | Browser + mobile-browser smoke | `RC1_QA_EMAIL`, `RC1_QA_PASSWORD`, `RC1_CHILD_PIN`, `RC1_PARENT_PIN`, `RC1_QA_FAMILY_ID` — **no** `RC1_QA_DATABASE_URL` |

## Branch protection (Model B — required)

GitHub deployment targets are **not** branch-protected by default. Configure in **Settings → Environments**:

### `rc1-qa-db-prepare`

- **Deployment branches:** Selected branches → `main` only
- **Required reviewers:** at least one (recommended)
- **Wait timer:** optional cooldown

### `rc1-prod-smoke`

- **Deployment branches:** `main` only (for release gate workflows)
- DB URL must **not** be added here

## Workflow guards (in repo)

`.github/workflows/rc1-web-release-gate.yml`:

1. `enforce-release-context` — checkout at `github.sha`, then `scripts/rc1-assert-release-gate-context.js` fails unless `github.ref == refs/heads/main` and `github.sha == inputs.expected_sha`
2. `prepare-qa-fixture` — only when `prepare_mode: apply`, target `rc1-qa-db-prepare`, checkout at `github.sha`
3. Browser/mobile jobs — no `DATABASE_URL`, target `rc1-prod-smoke`

PR branches can dispatch workflows but **cannot** receive deployment secrets for protected targets when deployment branches = main only.

## DB role (recommended)

Use a dedicated Postgres role limited to DML on the QA fixture family where possible. Never log connection strings; prepare script redacts DB errors.

## First live-DB prepare checklist

See `docs/rc1-qa-fixture.md` — only after merge to `main` and `SAFE TO PREP PROD` verdict.
