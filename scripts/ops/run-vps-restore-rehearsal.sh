#!/usr/bin/env bash
# pragma: allowlist secret
# On-VPS restore + migration rehearsal (no deploy). Sources deploy-ops.env + app .env.
set -Eeuo pipefail

APP="${VPS_APP_PATH:?VPS_APP_PATH required}"
TARGET_SHA="${TARGET_SHA:-e7678a237b7855d3e6a25f2c5c9f4974dcad0ad3}"
REPORT_DIR="${REPORT_DIR:-/tmp/restore-rehearsal-$(date -u +%Y%m%dT%H%M%SZ)}"
BACKUP_BASENAME="${BACKUP_BASENAME:-predeploy_2026-08-03T07-36-50-987Z_e7678a237b78.dump}"
EXPECTED_SHA="${EXPECTED_SHA:-bf40a35833a5e09ed838ea180c1d498d824d3d08bb3ed9188d372c35d3276b80}"

mkdir -p "$REPORT_DIR"
chmod 700 "$REPORT_DIR"

set -a
# shellcheck disable=SC1091
[ -f "$APP/.env" ] && . "$APP/.env"
for f in /etc/deploy-ops/deploy-ops.env "$HOME/deploy-ops.env"; do
  [ -f "$f" ] && . "$f"
done
set +a

cd "$APP"
WORK="/tmp/rehearsal-${TARGET_SHA:0:12}"
mkdir -p "$WORK"
if [ ! -d "$WORK/repo/.git" ]; then
  git clone --depth 1 "$APP" "$WORK/repo"
fi
cd "$WORK/repo"
git fetch origin "$TARGET_SHA" 2>/dev/null || git fetch origin main
git checkout -f "$TARGET_SHA"
[ -d node_modules/pg ] || npm ci --legacy-peer-deps --include=dev --omit=optional >/dev/null

DUMP=""
for dir in "${APP_DB_BACKUP_DIR:-}" "$HOME/db-backups-rehearsal"; do
  [ -n "$dir" ] && [ -f "$dir/$BACKUP_BASENAME" ] && DUMP="$dir/$BACKUP_BASENAME" && break
done
if [ -z "$DUMP" ]; then
  echo "BACKUP_NOT_FOUND"
  exit 1
fi

ACTUAL_SHA="$(sha256sum "$DUMP" | awk '{print $1}')"
if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
  echo "BACKUP_SHA_MISMATCH"
  exit 1
fi

SNAP_PRE="$REPORT_DIR/pre-snapshot.json"
node scripts/ops/db-integrity-snapshot.mjs --out "$SNAP_PRE" --label pre-restore-rehearsal --deploy-sha "$TARGET_SHA"

RESTORE_DB="integrity_restore_$(date -u +%Y%m%d_%H%M%S)"
export RESTORE_DB

if [ ! -x "$(command -v sudo 2>/dev/null)" ] || ! sudo -n /usr/local/sbin/app-disposable-db create integrity_restore_probe_check 2>/dev/null; then
  if [ "${APP_DISPOSABLE_DB_USE_SUDO:-}" != "1" ]; then
    echo "NO_GO: SUDO_DISPOSABLE_DB_UNAVAILABLE"
    exit 2
  fi
fi

node scripts/ops/verify-backup-restore.mjs \
  --backup "$DUMP" \
  --target-db "$RESTORE_DB" \
  --baseline-snapshot "$SNAP_PRE"

RESTORE_URL="$(node -e "const u=new URL(process.env.DATABASE_URL); u.pathname='/'+process.env.RESTORE_DB; console.log(u);")"
SNAP_PRE_MIG="$REPORT_DIR/pre-migrate.json"
DATABASE_URL="$RESTORE_URL" node scripts/ops/db-integrity-snapshot.mjs --out "$SNAP_PRE_MIG" --label pre-migrate

DATABASE_URL="$RESTORE_URL" NODE_ENV=development npm run migrate
SNAP_POST_MIG="$REPORT_DIR/post-migrate.json"
DATABASE_URL="$RESTORE_URL" node scripts/ops/db-integrity-snapshot.mjs --out "$SNAP_POST_MIG" --label post-migrate
node scripts/ops/compare-db-snapshots.mjs --before "$SNAP_PRE_MIG" --after "$SNAP_POST_MIG"

DATABASE_URL="$RESTORE_URL" NODE_ENV=development npm run migrate

DATABASE_URL="$RESTORE_URL" NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false \
  REVENUECAT_ALLOWED_APP_IDS=test_app REVENUECAT_ALLOWED_PRODUCT_IDS=rc_basic_monthly \
  node --test test/migration-iap-safety.integration.test.js test/iap-webhook-ordering.integration.test.js

# Drop restore DB via sudo helper
sudo -n /usr/local/sbin/app-disposable-db drop "$RESTORE_DB"

echo "REHEARSAL_OK report=$REPORT_DIR"
