# Backup & restore runbook (ops)

Ops-only. Canonical spec: team DR specification v1.0. Related: `docs/PRE-DEPLOY-DATABASE-BACKUP-GATE.md`.

## Backup classes

| Class | When | Filename pattern | Location |
|-------|------|------------------|----------|
| **Daily** | 03:15 via `app-db-backup.timer` | `app-daily-YYYY-MM-DDTHHMMSS.dump` | `/var/lib/app-db-backups/` |
| **Pre-deploy** | Before prod deploy (backup gate) | `app-predeploy-…` or legacy `predeploy_…` | `/var/lib/app-db-backups/` |

Each dump has sidecars: `.sha256`, `.meta.json`.

Status file: `/var/lib/app-db-backups/backup-status.json` (no credentials).

## Install (VPS, one-time)

```bash
cd "${VPS_APP_PATH:?set VPS_APP_PATH}"
sudo APP_OPS_APP_ENV="${VPS_APP_PATH}/.env" bash scripts/ops/install-vps-ops-environment.sh
```

This installs deploy-ops env, disposable-db sudo helper, backup directory, and systemd timers.

## Manual daily backup

```bash
cd "${VPS_APP_PATH:?set VPS_APP_PATH}"
set -a && source /etc/deploy-ops/deploy-ops.env && source .env && set +a
node scripts/ops/daily-db-backup.mjs
```

Dry-run retention only:

```bash
node scripts/ops/daily-db-backup.mjs --dry-run-prune
```

## Verify a backup file

```bash
sha256sum -c app-daily-….dump.sha256
pg_restore --list app-daily-….dump | head
```

## Restore to a **new** database (never prod in place)

1. Choose backup + verify checksum and `pg_restore --list`.
2. Create disposable DB (VPS):

   ```bash
   sudo /usr/local/sbin/app-disposable-db create integrity_restore_manual_20260816
   ```

3. Restore:

   ```bash
   pg_restore --no-owner --no-acl -d "postgresql://…/integrity_restore_manual_20260816" /var/lib/app-db-backups/<file>.dump
   ```

4. SQL checks: `SELECT count(*) FROM family;` (and parent, child, _migrations).
5. Point a **staging** app instance at the restored DB; run `/health` and read-only smoke tests.
6. Cutover only after explicit incident decision — see `docs/runbooks/P0-DATA-LOSS-RECOVERY-2026-08-14.md`.
7. Drop disposable DB when done:

   ```bash
   sudo /usr/local/sbin/app-disposable-db drop integrity_restore_manual_20260816
   ```

Automated rehearsal:

```bash
node scripts/ops/verify-backup-restore.mjs \
  --database-lifecycle external \
  --backup /var/lib/app-db-backups/<file>.dump \
  --target-db integrity_restore_rehearsal_001
```

## Retention

| Type | Policy |
|------|--------|
| Daily | 30 days |
| Pre-deploy | Min 7 kept; older than 30 days pruned when safe |
| Protected | `incident_*`, `pre_cutover_*`, `manual_keep_*` never auto-pruned |

Pruning runs only after a **verified** daily backup. Failed backup → no prune.

Dry-run:

```bash
node scripts/ops/prune-backups.mjs
node scripts/ops/prune-backups.mjs --apply
```

## Remove legacy cron (after new timer verified)

```bash
crontab -l | grep -v stjarndag-daily-backup | crontab -
```

Only after: manual daily backup OK, restore test OK, `systemctl status app-db-backup.timer` active.

## Monitoring

```bash
systemctl status app-db-backup.timer
journalctl -u app-db-backup.service -n 50 --no-pager
cat /var/lib/app-db-backups/backup-status.json
```

Alert if `last_daily_backup_status` is `FAILED` or no successful daily backup within 30 hours.

## Offsite (phase 8)

Set `BACKUP_OFFSITE_ENABLED=1` and `BACKUP_OFFSITE_TARGET` when object storage is provisioned. Until then local + verified restore tests apply.

## Quarterly DR

Document each quarterly DR test in the backup-restore rehearsal notes under `docs/` (see existing `*-BACKUP-RESTORE-REHEARSAL-*.md` files).
