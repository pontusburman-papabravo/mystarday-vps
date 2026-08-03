# Prod backup & restore rehearsal — 2026-08-03 (update 2)

<!-- pragma: allowlist secret -->

Follow-up: permanent backup-gate config on VPS + on-host restore gate status.

## Backup-gate configuration (deploy-ops.env)

| Variable | Status |
|----------|--------|
| `APP_DEPLOY_PRODUCTION` | CONFIGURED (`~/deploy-ops.env`, mode 600) |
| `BACKUP_REQUIRED` | CONFIGURED |
| `APP_DB_BACKUP_DIR` | CONFIGURED (`~/db-backups-gate`, mode 700, outside app tree) |
| `PROD_MIN_FAMILY_COUNT` | VALID (250; live families 279) |
| `PROD_MIN_DATABASE_BYTES` | VALID (80_000_000; live ~90.8 MB) |
| `EXPECTED_DATABASE_IDENTITY_HASH` | CONFIGURED (matches live identity) |

`/etc/deploy-ops/deploy-ops.env` (system path from `install-vps-ops-environment.sh`) is **not** installed until one-time `sudo` bootstrap.

## Backup-gate ops test (no deploy / migrate / restart)

| Test | Result |
|------|--------|
| Positive gate run | PASS (new dump + metadata + checksum + `pg_restore --list`) |
| Negative (wrong identity hash) | PASS (`DATABASE_IDENTITY_MISMATCH`, no migrate) |

Verified backup retained: `predeploy_2026-08-03T07-36-50-987Z_e7678a237b78.dump` SHA-256 `bf40a35833a5e09ed838ea180c1d498d824d3d08bb3ed9188d372c35d3276b80`.

## Admin credential / on-VPS restore

| Item | Status |
|------|--------|
| `DATABASE_ADMIN_URL` | **NOT CONFIGURED** |
| App DB role `CREATEDB` | unchanged (false) |
| On-VPS `integrity_restore_*` restore | **NO-GO: SAFE_DATABASE_ADMIN_PATH_UNAVAILABLE** |

**One-time unblock (founder, on VPS, no app restart):**

```bash
cd /var/www/mystarday
git fetch origin cursor/vps-ops-gates-0f7f
sudo APP_OPS_APP_ENV=/var/www/mystarday/.env bash \
  <(git show origin/cursor/vps-ops-gates-0f7f:scripts/ops/install-vps-ops-environment.sh)
```

Then re-run:

```bash
export VPS_APP_PATH=/var/www/mystarday
bash <(git show origin/cursor/vps-ops-gates-0f7f:scripts/ops/run-vps-restore-rehearsal.sh)
```

Tooling PR: `cursor/vps-ops-gates-0f7f` (`verify-backup-restore` requires explicit `DATABASE_ADMIN_URL`).

## GO / NO-GO (release gates)

| Gate | Decision |
|------|----------|
| Backup-gate config + ops test | **GO WITH FOLLOW-UP** (use `/etc/deploy-ops` after sudo install) |
| On-VPS restore integrity | **NO-GO** |
| Migration rehearsal on VPS | **NO-GO** (blocked on restore) |
| Deploy `e7678a23` | **NO-GO** |
| IAP rollout | **NO-GO** (unchanged) |

**LIVE DEPLOY = NO-GO** until sudo bootstrap + successful `run-vps-restore-rehearsal.sh` on VPS.
