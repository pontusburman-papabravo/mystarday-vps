#!/usr/bin/env bash
# pragma: allowlist secret
# Create/drop integrity_restore_* databases only — invoked via sudo NOPASSWD on VPS.
set -Eeuo pipefail

ACTION="${1:-}"
NAME="${2:-}"

if [ "$ACTION" != "create" ] && [ "$ACTION" != "drop" ]; then
  echo "usage: app-disposable-db create|drop <db_name>" >&2
  exit 1
fi

if [[ ! "$NAME" =~ ^integrity_restore_[a-z0-9_]+$ ]]; then
  echo "invalid disposable database name" >&2
  exit 1
fi

PROTECTED="${PROTECTED_DATABASE_NAME:-${MYSTARDAY_PROTECTED_DATABASE_NAME:-}}"
if [ -n "$PROTECTED" ] && [ "$NAME" = "$PROTECTED" ]; then
  echo "refused protected database name" >&2
  exit 1
fi

if [ "$ACTION" = "create" ]; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d postgres -c "CREATE DATABASE \"${NAME}\""
else
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${NAME}' AND pid <> pg_backend_pid()"
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d postgres -c "DROP DATABASE IF EXISTS \"${NAME}\""
fi
