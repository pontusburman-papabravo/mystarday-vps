#!/usr/bin/env bash
# pragma: allowlist secret
# One-time VPS setup: sudo disposable-db helper + deploy-ops env (root required).
# Does NOT create CREATEDB SQL roles or DATABASE_ADMIN_URL — create/drop is sudo-only.
# Usage: sudo APP_OPS_APP_ENV=/path/to/.env bash scripts/ops/install-vps-ops-environment.sh
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
PROTECTED_FILE="${OPS_DIR}/protected-database-name"
SUDOERS_DROP="/etc/sudoers.d/app-disposable-db"
DISPOSABLE_HELPER="/usr/local/sbin/app-disposable-db"

APP_ENV="${APP_OPS_APP_ENV:?set APP_OPS_APP_ENV to app .env path}"
if [ ! -f "$APP_ENV" ]; then
  echo "install-vps-ops-environment: missing ${APP_ENV}" >&2
  exit 1
fi

PROTECTED_DB="$(grep -E '^DATABASE_URL=' "$APP_ENV" | sed -E 's/^DATABASE_URL=//; s/^["'\'']|["'\'']$//g' | python3 -c "import sys,urllib.parse; u=urllib.parse.urlparse(sys.stdin.read().strip()); print(urllib.parse.unquote(u.path.lstrip('/')))")"
APP_DB_ROLE="$(grep -E '^DATABASE_URL=' "$APP_ENV" | sed -E 's/^DATABASE_URL=//; s/^["'\'']|["'\'']$//g' | python3 -c "import sys,urllib.parse; u=urllib.parse.urlparse(sys.stdin.read().strip()); print(urllib.parse.unquote(u.username or ''))")"
if [ -z "$PROTECTED_DB" ] || [[ ! "$PROTECTED_DB" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo "install-vps-ops-environment: could not parse protected database name" >&2
  exit 1
fi
if [ -z "$APP_DB_ROLE" ] || [[ ! "$APP_DB_ROLE" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo "install-vps-ops-environment: could not parse database app role" >&2
  exit 1
fi

mkdir -p "$OPS_DIR"
chmod 750 "$OPS_DIR"
chown root:"$APP_GROUP" "$OPS_DIR"

install -m 0755 -o root -g root "${REPO_ROOT}/scripts/ops/app-disposable-db.sh" "$DISPOSABLE_HELPER"

# Sudo: no SETENV. Args matched with fnmatch; helper re-validates every name.
install -m 0440 -o root -g root /dev/stdin "$SUDOERS_DROP" <<SUDOERS
Cmnd_Alias APP_DISPOSABLE_DB = ${DISPOSABLE_HELPER} create integrity_restore_*, \\
                               ${DISPOSABLE_HELPER} drop integrity_restore_*
${APP_USER} ALL=(root) NOPASSWD: APP_DISPOSABLE_DB
Defaults:${APP_USER} !requiretty
SUDOERS
visudo -cf "$SUDOERS_DROP" >/dev/null

printf '%s' "$PROTECTED_DB" >"$PROTECTED_FILE"
chmod 640 "$PROTECTED_FILE"
chown root:"$APP_GROUP" "$PROTECTED_FILE"

printf '%s' "$APP_DB_ROLE" >"${OPS_DIR}/database-app-role"
chmod 640 "${OPS_DIR}/database-app-role"
chown root:"$APP_GROUP" "${OPS_DIR}/database-app-role"

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
DISPOSABLE_DB_PREFIX=integrity_restore_
EXPECTED_DATABASE_IDENTITY_HASH=${IDENTITY_HASH}
APP_DISPOSABLE_DB_USE_SUDO=1
APP_DISPOSABLE_DB_HELPER=${DISPOSABLE_HELPER}
ENV
chmod 640 "$OPS_ENV"
chown root:"$APP_GROUP" "$OPS_ENV"

echo "install-vps-ops-environment: OK (sudo disposable-db only; no DATABASE_ADMIN_URL)" >&2
