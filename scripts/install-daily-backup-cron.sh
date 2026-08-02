#!/usr/bin/env bash
# Install (or refresh) the deploy-user cron entry for daily-backup.sh.
# Safe to re-run. Default schedule: 03:15 Europe/Stockholm (server TZ).
#
# Usage on VPS (from app root):
#   ./scripts/install-daily-backup-cron.sh
#   CRON_SCHEDULE='30 2 * * *' ./scripts/install-daily-backup-cron.sh
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly APP_ROOT="${APP_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
readonly BACKUP_SCRIPT="${APP_ROOT}/scripts/daily-backup.sh"
readonly BACKUP_ROOT="${BACKUP_ROOT:-$APP_ROOT/backups}"
readonly LOG_FILE="${BACKUP_ROOT}/backup.log"
# 03:15 local time — after UTC midnight job (~01:00/02:00 Stockholm), before morning rush.
readonly CRON_SCHEDULE="${CRON_SCHEDULE:-15 3 * * *}"
readonly CRON_MARKER='# stjarndag-daily-backup'

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[ -f "$BACKUP_SCRIPT" ] || fail "missing $BACKUP_SCRIPT"
chmod +x "$BACKUP_SCRIPT"
mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"

readonly CRON_LINE="${CRON_SCHEDULE} ${BACKUP_SCRIPT} >>${LOG_FILE} 2>&1 ${CRON_MARKER}"

existing="$(crontab -l 2>/dev/null || true)"
filtered="$(printf '%s\n' "$existing" | grep -vF "$CRON_MARKER" || true)"
{
  if [ -n "$filtered" ]; then
    printf '%s\n' "$filtered"
  fi
  printf '%s\n' "$CRON_LINE"
} | crontab -

printf 'Installed cron for %s\n' "$(whoami)"
printf 'Schedule: %s (server TZ: %s)\n' "$CRON_SCHEDULE" "$(timedatectl show -p Timezone --value 2>/dev/null || date +%Z)"
printf 'Command:  %s\n' "$BACKUP_SCRIPT"
printf 'Log:      %s\n' "$LOG_FILE"
printf '\nCurrent crontab:\n'
crontab -l
