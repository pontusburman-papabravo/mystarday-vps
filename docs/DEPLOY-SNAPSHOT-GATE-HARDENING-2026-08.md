# Deploy snapshot gate hardening (2026-08-03) # pragma: allowlist secret

Incident follow-up for GitHub Actions deploy to VPS (`Deploy to VPS` workflow). **No product feature changes** — deploy ops scripts, snapshot compare, tests, and documentation only.

## Root cause

Two independent failures compounded:

1. **`DATABASE_URL` not available to deploy-time ops scripts** — `scripts/ops/db-integrity-snapshot.mjs` read `process.env.DATABASE_URL` only. On VPS the app process gets credentials via systemd `EnvironmentFile` (app `.env`), but the deploy shell did not load that file before snapshot/backup gate. `npm run migrate` still worked because `migrate.js` calls `loadEnvFile()` from the app tree. Automated deploy runs failed at **pre-deploy snapshot** with `[db-snapshot] DATABASE_URL is not set` and rolled code back (see GitHub Actions run `30846832205` and siblings on 2026-08-03).

2. **Post-deploy snapshot compare treated migration seed drift as unexpected live drift** — Compare used a single pre-deploy vs post-deploy diff on `feature_flag` fingerprints. Migrations `1810140000003_*` and `1810150000000_*` legitimately insert **default OFF** flags. That mismatch triggered **code rollback while migrations remained applied** (documented manual recovery: prod SHA `3d57d4772426a029958d925c954094131769435d`, cache `stjarndag-v767`).

## Previous failure chain

```text
checkout → npm ci → pre-snapshot (FAIL: no DATABASE_URL) → rollback code
— or —
… → migrate OK → restart → health OK → pre vs post compare (feature_flag drift) → rollback code (DB still migrated)
```

## New DATABASE_URL contract

| Source (order) | Role |
|----------------|------|
| `process.env.DATABASE_URL` | If already set (e.g. sourced shell) |
| `ENV_FILE` / `APP_OPS_APP_ENV` / `APP_ENV_FILE` | Explicit override |
| `$VPS_APP_PATH/.env` | Documented app env (same as `migrate.js`) |
| `scripts/ops/ensure-deploy-database-env.mjs` | Fail-closed verify before snapshots; logs **identity hash only** |
| `EXPECTED_DATABASE_IDENTITY_HASH` | Optional mismatch guard (from `/etc/deploy-ops/deploy-ops.env`) |

`vps-deploy-revision.sh` sources app `.env` when needed and calls `ensure-deploy-database-env.mjs` **before** pre-deploy snapshot. Secrets are never printed (`redactDeploySecrets` + tests).

## Migration-aware snapshot compare (Model B + C)

| Phase | Compare | Allowlist |
|-------|---------|-----------|
| After `npm run migrate` | `pre-*.json` vs `post-migrate-*.json` | **Only** new `_migrations` names this deploy, via `scripts/ops/lib/migration-snapshot-manifest.mjs` |
| After restart + traffic window | `post-migrate-*.json` vs `post-*.json` | **Strict** runtime drift (no migration allowlist) |

New migration names come from `applied_migration_names` on each snapshot (not re-used on future deploys).

Declared mutations today:

- `1810140000003_growth_feedback_loop_flags` — four `feature_flag` inserts, `enabled: false`
- `1810150000000_activation_first_success_v1_flag` — `activation_first_success_v1`, `enabled: false`
- `1810140000000`–`1810140000002` — schema-only (`backwardCompatible`, no business-table fingerprint change)

Future migrations may export `snapshotContract` from `migrations/*.js` (merged with registry).

**Still fails:** toggling existing flags, undeclared inserts/deletes, unrelated table drift, migrations without contract.

Snapshots now include `feature_flag.flag_rows` (`key`, `enabled` only — operational keys, not PII).

## Rollback semantics

| Outcome | When |
|---------|------|
| `DEPLOY_PASS` | All phases OK |
| `BLOCKED_BEFORE_MIGRATION` | Failure before/at migrate (incl. missing DB config) — code rollback allowed |
| `SAFE_CODE_ROLLBACK` | Backward-compatible migration applied, runtime check failed — code rollback **may** run; **DB stays migrated** |
| `FORWARD_FIX_REQUIRED` | Unknown/non-contract migration, or post-migrate compare drift — **no** automatic code rollback |

`DEPLOY_SUMMARY` includes `outcome`, `failed_phase`, `migrations_applied`.

## Release identity

After `/health` succeeds:

- `scripts/ops/verify-deploy-release-identity.mjs` checks `status`, `git_sha` == `DEPLOY_SHA`, `cache_version` == `config/cache-version.json`, and `public/sw.js` `CACHE_NAME`.

Mismatch fails deploy before post-deploy runtime snapshot compare.

## Tests

`test/ops-deploy-snapshot-gate.test.js` (in `npm run test:gate:unit`) covers:

1. Missing DB config  
2. Secret redaction  
3. Identical snapshot / runtime compare  
4. Declared flag insert default OFF  
5. Unexpected existing flag toggle  
6. Unrelated table drift  
7. Already-applied migration (no new names)  
8. Multiple migrations one deploy  
9. Unknown migration contract  
10. Rollback policy (before migrate / forward-fix / safe runtime)  
11. SHA/cache mismatch  

Plus updated `test/ops-deploy-revision-contract.test.js`.

## Operator flow

1. Ensure VPS has `~/deploy-ops.env` or `/etc/deploy-ops/deploy-ops.env` and app `.env` with `DATABASE_URL` (install via `scripts/ops/install-vps-ops-environment.sh` when needed).  
2. Merge this PR — **no deploy from agent**.  
3. Next CI-green `main` deploy: verify logs show `ensure-deploy-database-env` → post-migrate compare → release identity → post-deploy-runtime compare.  
4. If `FORWARD_FIX_REQUIRED`, do **not** assume rollback fixed DB+code; follow `docs/PRE-DEPLOY-DATABASE-BACKUP-GATE.md` and forward-fix or restore runbook.

## Remaining risks

- Live traffic between post-migrate and post-deploy snapshots can still cause runtime drift (alarm by design).  
- New migrations **must** add a snapshot contract before deploy.  
- `maybe_rollback_code` still leaves DB ahead of code on `SAFE_CODE_ROLLBACK` — operators must understand skew.  
- VPS must keep app `.env` readable to deploy user (unchanged from migrate today).

## Related files

- `scripts/vps-deploy-revision.sh`  
- `scripts/ops/lib/deploy-database-url.mjs`  
- `scripts/ops/lib/compare-snapshots.mjs`  
- `scripts/ops/lib/migration-snapshot-manifest.mjs`  
- `scripts/ops/lib/deploy-rollback-policy.mjs`  
- `scripts/ops/lib/deploy-release-identity.mjs`  
- `docs/PRE-DEPLOY-DATABASE-BACKUP-GATE.md`
