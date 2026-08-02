# Ops — daglig VPS-backup

Automatisk säkerhetskopia av **PostgreSQL** (+ lokala uploads om de finns) en gång per dygn, med **14 dagars** retention.

## Tidsslag

| | |
|--|--|
| **Cron** | `15 3 * * *` |
| **Tidzon** | `Europe/Stockholm` (VPS `timedatectl`) |
| **Klockslag** | **03:15** |

Varför 03:15:

- Efter midnattsjobbet (`midnight-scheduler` ~00:00:30 UTC ≈ 01:00/02:00 Stockholm)
- Före morgonrush och Family Journey (~06:00)
- Låg belastning på disk/DB

## Vad som backas upp

| Artefakt | Path i dagsmappen | Kommentar |
|----------|-------------------|-----------|
| Databas | `db.dump` | `pg_dump -Fc` (custom, komprimerat) |
| Lokala uploads | `uploads.tar.gz` | Bara om `data/uploads` har filer |
| Manifest | `manifest.json` | storlek + sha256 |

**Prod idag:** `UPLOAD_STORAGE=r2` → bilder ligger i Cloudflare R2 (inte lokal disk). Lokala uploads hoppas över automatiskt när katalogen är tom. R2 har egen hållbarhet; denna cron ersätter inte R2-versioning.

**Ingår inte** (medvetet): `.env`, APNs `.p8`, git-kod, `node_modules`. Secrets ska ligga separat (lösenordshanterare / krypterad offline-kopia).

## Paths

Utgår från app-roten på VPS (se `.cursor/rules/*-deploy.mdc` → **VPS path**):

| | |
|--|--|
| Script | `$APP_ROOT/scripts/daily-backup.sh` |
| Installer | `$APP_ROOT/scripts/install-daily-backup-cron.sh` |
| Backup-root | `$APP_ROOT/backups/` |
| Dagsmapp | `$APP_ROOT/backups/YYYY-MM-DD/` |
| Logg | `$APP_ROOT/backups/backup.log` |
| Retention | 14 dagar (`RETENTION_DAYS`) |

Behörighet: `chmod 700` på kataloger, `600` på dump-filer (deploy-ägda).

## Installera / uppdatera cron

På VPS som `deploy` (efter att scriptet finns i appträdet — via git pull/deploy):

```bash
cd "$APP_ROOT"   # VPS path från deploy-regeln
./scripts/install-daily-backup-cron.sh
```

Manuell engångskörning:

```bash
./scripts/daily-backup.sh
tail -n 50 backups/backup.log
ls -lah "backups/$(date +%Y-%m-%d)/"
```

## Återställning (kort)

```bash
# Lista
ls backups/

# Restore DB (STOPPA appen först — planera downtime)
sudo systemctl stop <service>   # systemd-namn från deploy-regeln
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" \
  "backups/YYYY-MM-DD/db.dump"
sudo systemctl start <service>
sleep 3 && curl -s http://127.0.0.1:3000/health
```

Lokala uploads (om arkiv finns):

```bash
tar -xzf "backups/YYYY-MM-DD/uploads.tar.gz" -C data
```

## Övervakning

- Kolla att dagens mapp finns: `ls backups/$(date +%Y-%m-%d)`
- Logg: `tail backups/backup.log`
- Cron: `crontab -l` ska innehålla markören `# stjarndag-daily-backup`

## Relaterat

- Engångs-/migrationsbackup via admin API: `npm run harvest:full` (`scripts/harvest-full-backup.js`)
- Incident-runbook: [`ops-incident-runbook.md`](ops-incident-runbook.md)
