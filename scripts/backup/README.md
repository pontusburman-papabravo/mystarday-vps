# Backup scripts (ops)

Implementation lives in `scripts/ops/` — this directory documents entry points.

| Script | Role |
|--------|------|
| `scripts/ops/daily-db-backup.mjs` | Daily backup + restore test + retention |
| `scripts/ops/pre-deploy-backup-gate.mjs` | Pre-deploy backup gate (existing deploy path) |
| `scripts/ops/prune-backups.mjs` | Manual/dry-run retention pruning |
| `scripts/ops/weekly-historical-restore-test.mjs` | Weekly older-backup restore test |
| `scripts/ops/verify-backup-restore.mjs` | Manual restore rehearsal |

Shared core: `scripts/ops/lib/db-backup-core.mjs`, `backup-restore-test-core.mjs`, `backup-prune-core.mjs`.

Systemd units: `ops/systemd/app-db-backup.{service,timer}`.

Runbook: `docs/runbooks/BACKUP-RESTORE-RUNBOOK.md`.
