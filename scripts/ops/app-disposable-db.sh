#!/usr/bin/env bash
# pragma: allowlist secret
# Create/drop integrity_restore_* only. Installed as /usr/local/sbin/app-disposable-db.
# Invoked via sudo NOPASSWD (no SETENV). Ignores caller environment for PostgreSQL.
set -Eeuo pipefail

readonly RUNUSER="/usr/sbin/runuser"
readonly PSQL="/usr/bin/psql"
readonly ENVI="/usr/bin/env"
readonly MAX_NAME_LEN=63
readonly PREFIX="integrity_restore_"
readonly NAME_RE='^integrity_restore_[a-z0-9_]+$'
readonly PG_SOCKET_DIR="/var/run/postgresql"
# Optional override for CI only (never set on VPS install).
CONFIG_DIR="${APP_DISPOSABLE_DB_CONFIG_DIR:-/etc/deploy-ops}"
PROTECTED_FILE="${CONFIG_DIR}/protected-database-name"
APP_ROLE_FILE="${CONFIG_DIR}/database-app-role"

if [ "$#" -ne 2 ]; then
  echo "usage: app-disposable-db create|drop <db_name>" >&2
  exit 1
fi

ACTION="$1"
NAME="$2"

if [ "$ACTION" != "create" ] && [ "$ACTION" != "drop" ]; then
  echo "invalid action" >&2
  exit 1
fi

if [ "${#NAME}" -gt "$MAX_NAME_LEN" ] || [ "${#NAME}" -le "${#PREFIX}" ]; then
  echo "invalid disposable database name" >&2
  exit 1
fi

if [[ ! "$NAME" =~ $NAME_RE ]]; then
  echo "invalid disposable database name" >&2
  exit 1
fi

if [ ! -d "$CONFIG_DIR" ] || [ ! -f "$PROTECTED_FILE" ]; then
  echo "ops config missing" >&2
  exit 1
fi

PROTECTED="$(tr -d '\r\n' <"$PROTECTED_FILE")"
if [ -z "$PROTECTED" ]; then
  echo "protected database name not configured" >&2
  exit 1
fi

if [ "$NAME" = "$PROTECTED" ]; then
  echo "refused protected database name" >&2
  exit 1
fi

APP_ROLE=""
if [ -f "$APP_ROLE_FILE" ]; then
  APP_ROLE="$(tr -d '\r\n' <"$APP_ROLE_FILE")"
fi
if [ -z "$APP_ROLE" ] || [[ ! "$APP_ROLE" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo "database app role not configured" >&2
  exit 1
fi

if [ ! -x "$RUNUSER" ] || [ ! -x "$PSQL" ] || [ ! -x "$ENVI" ]; then
  echo "required system binaries missing" >&2
  exit 1
fi

if [ ! -d "$PG_SOCKET_DIR" ]; then
  echo "local postgresql socket dir missing" >&2
  exit 1
fi

# Identifier is validated; safe to embed in SQL after regex gate.
run_psql_sql() {
  local sql="$1"
  "$ENVI" -i \
    PATH="/usr/bin:/bin" \
    HOME="/var/lib/postgresql" \
    USER=postgres \
    LOGNAME=postgres \
    "$RUNUSER" -u postgres -- \
    "$PSQL" -X -v ON_ERROR_STOP=1 \
    -h "$PG_SOCKET_DIR" \
    -d postgres \
    -c "$sql"
}

if [ "$ACTION" = "create" ]; then
  run_psql_sql "CREATE DATABASE \"${NAME}\" OWNER \"${APP_ROLE}\""
else
  run_psql_sql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${NAME}' AND pid <> pg_backend_pid()"
  run_psql_sql "DROP DATABASE IF EXISTS \"${NAME}\""
fi
