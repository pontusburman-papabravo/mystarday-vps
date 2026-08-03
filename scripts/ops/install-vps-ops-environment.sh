#!/usr/bin/env bash
# pragma: allowlist secret
# One-time VPS setup: disposable DB ops role + /etc/deploy-ops/deploy-ops.env (root required).
# Usage: sudo bash scripts/ops/install-vps-ops-environment.sh
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "install-vps-ops-environment: run as root (sudo)" >&2
  exit 1
fi

APP_USER="${APP_OPS_UNIX_USER:-deploy}"
APP_GROUP="${APP_OPS_UNIX_GROUP:-deploy}"
OPS_DIR="/etc/deploy-ops"
OPS_ENV="${OPS_DIR}/deploy-ops.env"
SUDOERS_DROP="/etc/sudoers.d/app-disposable-db"
DISPOSABLE_HELPER="/usr/local/sbin/app-disposable-db"
OPS_DB_USER="${MYSTARDAY_OPS_DB_USER:-app_disposable_ops}"
OPS_DB_PASSWORD="${MYSTARDAY_OPS_DB_PASSWORD:-$(openssl rand -hex 24)}"

APP_ENV="${MYSTARDAY_APP_ENV:?set MYSTARDAY_APP_ENV to app .env path}"
if [ ! -f "$APP_ENV" ]; then
  echo "install-vps-ops-environment: missing ${APP_ENV}" >&2
  exit 1
fi

PROTECTED_DB="$(grep -E '^DATABASE_URL=' "$APP_ENV" | sed -E 's/^DATABASE_URL=//; s/^["'\'']|["'\'']$//g' | python3 -c "import sys,urllib.parse; u=urllib.parse.urlparse(sys.stdin.read().strip()); print(urllib.parse.unquote(u.path.lstrip('/')))")"
if [ -z "$PROTECTED_DB" ]; then
  echo "install-vps-ops-environment: could not parse protected database name" >&2
  exit 1
fi

mkdir -p "$OPS_DIR"
chmod 750 "$OPS_DIR"
chown root:"$APP_GROUP" "$OPS_DIR"

install -m 0755 -o root -g root "${REPO_ROOT}/scripts/ops/app-disposable-db.sh" "$DISPOSABLE_HELPER"

install -m 0440 -o root -g root /dev/stdin "$SUDOERS_DROP" <<SUDOERS
${APP_USER} ALL=(root) NOPASSWD: SETENV: ${DISPOSABLE_HELPER}
Defaults:${APP_USER} !requiretty
SUDOERS
visudo -cf "$SUDOERS_DROP" >/dev/null

ESCAPED_PW="$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${OPS_DB_PASSWORD}'''))")"

runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${OPS_DB_USER}') THEN
    CREATE ROLE ${OPS_DB_USER} LOGIN PASSWORD '${OPS_DB_PASSWORD}' CREATEDB NOSUPERUSER NOCREATEROLE;
  ELSE
    ALTER ROLE ${OPS_DB_USER} WITH LOGIN PASSWORD '${OPS_DB_PASSWORD}' CREATEDB NOSUPERUSER NOCREATEROLE;
  END IF;
END
\$\$;
SQL

set -a
# shellcheck disable=SC1090
. "$APP_ENV"
set +a
IDENTITY_HASH="$(cd "$REPO_ROOT" && node --input-type=module -e "
import { databaseIdentityHash } from './scripts/ops/lib/database-identity.mjs';
console.log(databaseIdentityHash(process.env.DATABASE_URL));
")"

BACKUP_DIR="/var/lib/app-db-backups"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
chown "$APP_USER:$APP_GROUP" "$BACKUP_DIR"

umask 077
cat >"$OPS_ENV" <<ENV
APP_DEPLOY_PRODUCTION=1 # pragma: allowlist secret
BACKUP_REQUIRED=1
APP_DB_BACKUP_DIR=${BACKUP_DIR}
PROD_MIN_FAMILY_COUNT=250
PROD_MIN_DATABASE_BYTES=80000000
PROTECTED_DATABASE_NAME=${PROTECTED_DB}
DISPOSABLE_DB_PREFIX=integrity_restore_
EXPECTED_DATABASE_IDENTITY_HASH=${IDENTITY_HASH}
DATABASE_ADMIN_URL=postgresql://${OPS_DB_USER}:${ESCAPED_PW}@localhost:5432/postgres
ENV
chmod 640 "$OPS_ENV"
chown root:"$APP_GROUP" "$OPS_ENV"

echo "install-vps-ops-environment: OK" >&2
