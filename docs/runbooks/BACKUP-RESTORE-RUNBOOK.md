# Backup & restore runbook (ops)

Ops-only. Canonical spec: team DR specification v1.0. Related: `docs/PRE-DEPLOY-DATABASE-BACKUP-GATE.md`.

## Backup classes

| Class | When | Filename pattern | Location |
|-------|------|------------------|----------|
| **Daily** | 03:15 via `app-db-backup.timer` | `app-daily-YYYY-MM-DDTHHMMSS.dump` | `/var/lib/app-db-backups/` |
| **Pre-deploy** | Before prod deploy (backup gate) | `app-predeploy-…` or legacy `predeploy_…` | `/var/lib/app-db-backups/` |

Each dump has sidecars: `.sha256`, `.meta.json`.

Status file: `/var/lib/app-db-backups/backup-status.json` (no credentials).

## First VPS rollout (strict order)

Do **not** skip or reorder these steps. Timers stay **stopped** until step 6.

1. **Install** (units + `enable`, timers **not** started):

   ```bash
   cd "${VPS_APP_PATH:?set VPS_APP_PATH}"
   sudo APP_OPS_APP_ENV="${VPS_APP_PATH}/.env" bash scripts/ops/install-vps-ops-environment.sh
   ```

   Confirms: deploy-ops env, disposable-db sudo helper, backup directory, systemd units installed, both timers **enabled but inactive**.

2. **Manual daily backup** (no prune yet):

   ```bash
   cd "${VPS_APP_PATH:?set VPS_APP_PATH}"
   set -a && source /etc/deploy-ops/deploy-ops.env && source .env && set +a
   node scripts/ops/daily-db-backup.mjs --skip-prune
   ```

3. **Verify** the new backup end-to-end:

   - Dump file exists under `/var/lib/app-db-backups/` (`app-daily-*.dump`)
   - Checksum: `sha256sum -c /var/lib/app-db-backups/app-daily-….dump.sha256`
   - Metadata: matching `app-daily-….dump.meta.json` with `status: VERIFIED`
   - Status: `cat /var/lib/app-db-backups/backup-status.json` — `last_daily_backup_status` OK
   - Restore rehearsal: journal shows disposable DB created, restore + sanity OK, cleanup OK (no `disposable_db_cleanup_failed`)

4. **Retention dry-run** (no deletes):

   ```bash
   node scripts/ops/prune-backups.mjs
   ```

   Default is dry-run (`dry_run=1`). Do **not** pass `--apply` yet.

5. **Inspect dry-run output** — confirm `WOULD_DELETE` / `WOULD_KEEP` lists are sane (legacy `predeploy_*` retained until policy is understood).

6. **Start timers** (only after steps 2–5 pass):

   ```bash
   sudo systemctl start app-db-backup.timer app-weekly-restore-test.timer
   ```

7. **Verify both timers active**:

   ```bash
   systemctl is-active app-db-backup.timer app-weekly-restore-test.timer
   systemctl status app-db-backup.timer app-weekly-restore-test.timer
   ```

8. **Remove legacy cron** (only after step 7):

   ```bash
   crontab -l | grep -v stjarndag-daily-backup | crontab -
   ```

## Manual daily backup (routine)

```bash
cd "${VPS_APP_PATH:?set VPS_APP_PATH}"
set -a && source /etc/deploy-ops/deploy-ops.env && source .env && set +a
node scripts/ops/daily-db-backup.mjs
```

Dry-run retention only (no backup):

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
