#!/usr/bin/env bash
# Daily VPS backup: PostgreSQL dump + local uploads (if any).
# Retention: 14 days. Intended cron: 03:15 Europe/Stockholm.
#
# Usage (on VPS as deploy, from the app root):
#   ./scripts/daily-backup.sh
#   BACKUP_ROOT=/path/to/backups RETENTION_DAYS=14 ./scripts/daily-backup.sh
#
# Env (optional overrides):
#   APP_ROOT          default: directory containing this repo
#   BACKUP_ROOT       default: $APP_ROOT/backups
#   RETENTION_DAYS    default: 14
#   ENV_FILE          default: $APP_ROOT/.env
#   SKIP_UPLOADS=1    skip local uploads archive
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly APP_ROOT="${APP_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
readonly BACKUP_ROOT="${BACKUP_ROOT:-$APP_ROOT/backups}"
readonly RETENTION_DAYS="${RETENTION_DAYS:-14}"
readonly ENV_FILE="${ENV_FILE:-$APP_ROOT/.env}"
readonly LOCK_FILE="${BACKUP_ROOT}/.daily-backup.lock"
readonly DATE_STAMP="$(date +%Y-%m-%d)"
readonly DAY_DIR="${BACKUP_ROOT}/${DATE_STAMP}"
readonly LOG_PREFIX="[daily-backup ${DATE_STAMP}]"

log() { printf '%s %s\n' "$LOG_PREFIX" "$*"; }
fail() { printf '%s ERROR: %s\n' "$LOG_PREFIX" "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

load_env() {
  if [ ! -f "$ENV_FILE" ]; then
    fail "env file not found: $ENV_FILE"
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  if [ -z "${DATABASE_URL:-}" ]; then
    fail "DATABASE_URL is empty after sourcing $ENV_FILE"
  fi
}

acquire_lock() {
  mkdir -p "$BACKUP_ROOT"
  chmod 700 "$BACKUP_ROOT" 2>/dev/null || true
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    fail "another daily-backup is already running (lock: $LOCK_FILE)"
  fi
}

local_upload_dir() {
  if [ -n "${UPLOAD_LOCAL_DIR:-}" ]; then
    printf '%s\n' "$UPLOAD_LOCAL_DIR"
  else
    printf '%s\n' "$APP_ROOT/data/uploads"
  fi
}

backup_database() {
  require_cmd pg_dump
  local dest="${DAY_DIR}/db.dump"
  log "dumping PostgreSQL → ${dest}"
  # Custom format: compressed, parallel-restore friendly.
  pg_dump \
    --format=custom \
    --file="$dest" \
    --no-owner \
    --no-acl \
    "$DATABASE_URL"
  chmod 600 "$dest"
  log "db.dump size=$(du -h "$dest" | awk '{print $1}')"
}

backup_uploads() {
  if [ "${SKIP_UPLOADS:-0}" = "1" ]; then
    log "SKIP_UPLOADS=1 — skipping uploads archive"
    return 0
  fi

  local uploads
  uploads="$(local_upload_dir)"
  if [ ! -d "$uploads" ]; then
    log "uploads dir missing (${uploads}) — skip"
    return 0
  fi

  # Count real files (ignore .gitkeep / empty placeholders).
  local file_count
  file_count="$(find "$uploads" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')"
  if [ "${file_count:-0}" -eq 0 ]; then
    log "no local upload files (UPLOAD_STORAGE=${UPLOAD_STORAGE:-unset}) — skip uploads.tar.gz"
    return 0
  fi

  require_cmd tar
  local dest="${DAY_DIR}/uploads.tar.gz"
  log "archiving ${file_count} upload file(s) from ${uploads}"
  tar -czf "$dest" -C "$(dirname "$uploads")" "$(basename "$uploads")"
  chmod 600 "$dest"
  log "uploads.tar.gz size=$(du -h "$dest" | awk '{print $1}')"
}

write_manifest() {
  require_cmd sha256sum
  local manifest="${DAY_DIR}/manifest.json"
  local db_sha="" uploads_sha="" db_bytes=0 uploads_bytes=0
  if [ -f "${DAY_DIR}/db.dump" ]; then
    db_sha="$(sha256sum "${DAY_DIR}/db.dump" | awk '{print $1}')"
    db_bytes="$(wc -c <"${DAY_DIR}/db.dump" | tr -d ' ')"
  fi
  if [ -f "${DAY_DIR}/uploads.tar.gz" ]; then
    uploads_sha="$(sha256sum "${DAY_DIR}/uploads.tar.gz" | awk '{print $1}')"
    uploads_bytes="$(wc -c <"${DAY_DIR}/uploads.tar.gz" | tr -d ' ')"
  fi

  cat >"$manifest" <<EOF
{
  "type": "stjarndag-daily-backup",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "host": "$(hostname -f 2>/dev/null || hostname)",
  "app_root": "${APP_ROOT}",
  "retention_days": ${RETENTION_DAYS},
  "upload_storage": "${UPLOAD_STORAGE:-}",
  "database": {
    "file": "db.dump",
    "format": "pg_dump custom (-Fc)",
    "bytes": ${db_bytes},
    "sha256": "${db_sha}"
  },
  "uploads": {
    "file": "$([ -f "${DAY_DIR}/uploads.tar.gz" ] && echo uploads.tar.gz || echo null)",
    "bytes": ${uploads_bytes},
    "sha256": "${uploads_sha:-}"
  }
}
EOF
  chmod 600 "$manifest"
  log "wrote manifest.json"
}

prune_old() {
  require_cmd find
  local removed=0
  # Only prune dated day dirs (YYYY-MM-DD), never touch other files under BACKUP_ROOT.
  while IFS= read -r -d '' old; do
    log "pruning expired backup: $(basename "$old")"
    rm -rf "$old"
    removed=$((removed + 1))
  done < <(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d \
    -regextype posix-extended -regex '.*/[0-9]{4}-[0-9]{2}-[0-9]{2}' \
    -mtime "+${RETENTION_DAYS}" -print0 2>/dev/null)

  log "prune complete (removed=${removed}, retention_days=${RETENTION_DAYS})"
}

main() {
  require_cmd flock
  require_cmd date
  require_cmd hostname
  load_env
  acquire_lock

  mkdir -p "$DAY_DIR"
  chmod 700 "$DAY_DIR"

  log "start APP_ROOT=${APP_ROOT} BACKUP_ROOT=${BACKUP_ROOT}"
  backup_database
  backup_uploads
  write_manifest
  prune_old
  log "done → ${DAY_DIR}"
}

main "$@"
