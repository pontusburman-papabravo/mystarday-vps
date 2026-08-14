# P0 test database safety — destructive path audit

Audit date: 2026-08-14. Scope: paths that can **TRUNCATE**, **DROP**, mass-**DELETE**, or **pg_restore --clean** prod data when prod PostgreSQL is **localhost** (VPS). <!-- pragma: allowlist secret -->

## Root cause (fixed in P0 PR)

| Path | Mechanism | Fix |
|------|-----------|-----|
| `test/helpers/setup.js` → `setupTestDb()` | `TRUNCATE … RESTART IDENTITY CASCADE` on `DATABASE_URL` | Uses validated `TEST_DATABASE_URL` only; shared `assertDestructiveTestDatabaseAllowed()` before lock/migrate/truncate |
| `release:pre-public-gate` → `runLocalMigrateAndRepair` | `localDatabaseIsNotProd()` treated localhost as safe; loaded prod `.env` | `gateDestructiveTestDatabaseCheck()` BLOCKER before migrate/test:gate |
| `migrate.js` in test mode | Applied migrations to `DATABASE_URL` | Requires `buildDestructiveTestChildEnv()` |
| `local-flag-repair.cjs` | localhost-only repair | Requires disposable `TEST_DATABASE_URL` validation |
| `run-checks.cjs` `testEnv()` | Passed prod `DATABASE_URL` to child tests | Uses `buildDestructiveTestChildEnv()` |

## Primary destructive paths

| Location | Operation | Live DB risk | Mitigation |
|----------|-----------|-----------------|------------|
| `test/helpers/setup.js` | TRUNCATE all public tables | **Was P0** | TEST_DATABASE_URL + confirm |
| `migrate.js` | DDL/DML migrations | Medium if test mode on prod | Test-mode safety guard | <!-- pragma: allowlist secret -->
| `test/helpers/database-branch-guard.js` | DROP DATABASE (disposable create) | Low — only in tests with admin URL | Disposable name patterns |
| `test/verify-backup-restore-lifecycle.test.js` | DROP DATABASE, pg_restore | Test-only; uses disposable names | Not run on VPS prod |
| `scripts/run-npm-test-disposable.mjs` | Creates/drops disposable DB | Safe pattern — explicit disposable | Use on VPS instead of raw npm test |
| `scripts/compare-npm-test-main-vs-pr.sh` | migrate + npm test on compare DBs | VPS if DATABASE_URL=prod | Manual script — do not run on prod |
| `scripts/ops/run-vps-restore-rehearsal.sh` | pg_restore, migrate, test | Intentional ops — separate RESTORE_DB | Not test harness |
| `scripts/import-*.js`, `backfill-standard-library.js` | Writes to DATABASE_URL | Ops scripts — require explicit confirm | Out of scope for test identity bug |

## DELETE FROM family (ops / tests)

| Location | Context |
|----------|---------|
| `scripts/ops/family-device-pilot-db.cjs` | Pilot cleanup — requires explicit ops |
| `scripts/ops/activity-timer-pilot-db.cjs` | Pilot cleanup |
| Integration tests | Per-test fixtures after TRUNCATE — gated by setupTestDb |

## pg_restore

| Location | Context |
|----------|---------|
| `test/verify-backup-restore-lifecycle.test.js` | Disposable DB names only |
| `scripts/ops/run-vps-restore-rehearsal.sh` | Ops rehearsal — RESTORE_DB env |
| Recovery runbook B3/B6 | Operator-controlled — not automated |

## Gate / CI

| Location | Notes |
|----------|-------|
| `.github/workflows/ci.yml` | `TEST_DATABASE_URL` + `TEST_DB_DESTRUCTIVE_CONFIRM` (no prod DATABASE_URL) |
| `.github/workflows/pre-public-release-gate.yml` | Same — **must not** run on VPS app host |
| `scripts/assert-disposable-database.mjs` | Validates TEST_DATABASE_URL |

## Explicitly out of scope (different threat model)

- Release deploy `npm run migrate` (non-test mode) — required for releases; protected by backup gate + deploy process
- Admin ops scripts with manual confirmation flags
- RevenueCat / email / external APIs

## Operator rule (VPS)

**Never run** on the APP_SERVICE app server: <!-- pragma: allowlist secret -->

- `npm test` / `npm run test:gate`
- `npm run release:pre-public-gate`
- test-mode `npm run migrate`

Use GitHub Actions pre-public-release-gate workflow with disposable Postgres instead.
