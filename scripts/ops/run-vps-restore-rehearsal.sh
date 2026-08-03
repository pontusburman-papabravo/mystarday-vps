#!/usr/bin/env bash
# pragma: allowlist secret
# On-VPS restore + migration rehearsal (no deploy). Sources deploy-ops.env + app .env.
set -Eeuo pipefail

APP="${VPS_APP_PATH:?VPS_APP_PATH required}"
TARGET_SHA="${TARGET_SHA:-8f601af5860ce522c9580cbcc2a40ef657b6c1a8}"
REPORT_DIR="${REPORT_DIR:-/tmp/restore-rehearsal-$(date -u +%Y%m%dT%H%M%SZ)}"
BACKUP_BASENAME="${BACKUP_BASENAME:-predeploy_2026-08-03T08-00-14-328Z_e7678a237b78.dump}"
EXPECTED_SHA="${EXPECTED_SHA:-bae2df455b9502ca454f5160c008e61330b0b4da57780e86639f6151904a41ee}"

readonly PROBE_DB="integrity_restore_probe_check"
PROBE_CREATED=0
RESTORE_DB=""
RESTORE_DB_CREATED=0
RESTORE_DB_DROPPED=0

rehearsal_cleanup() {
  local ec=$?
  if [ "$PROBE_CREATED" = 1 ]; then
    sudo -n /usr/local/sbin/app-disposable-db drop "$PROBE_DB" 2>/dev/null || true
    PROBE_CREATED=0
  fi
  if [ "$RESTORE_DB_CREATED" = 1 ] && [ "$RESTORE_DB_DROPPED" != 1 ] && [ -n "$RESTORE_DB" ]; then
    sudo -n /usr/local/sbin/app-disposable-db drop "$RESTORE_DB" 2>/dev/null || true
  fi
  trap - EXIT
  exit "$ec"
}

mkdir -p "$REPORT_DIR"
chmod 700 "$REPORT_DIR"

set -a
# shellcheck disable=SC1091
[ -f "$APP/.env" ] && . "$APP/.env"
for f in /etc/deploy-ops/deploy-ops.env "$HOME/deploy-ops.env"; do
  [ -f "$f" ] && . "$f"
done
set +a

# verify-backup-restore external lifecycle must not see admin URL
unset DATABASE_ADMIN_URL

trap rehearsal_cleanup EXIT

cd "$APP"
WORK="/tmp/rehearsal-${TARGET_SHA:0:12}"
WORK_REPO="$WORK/repo"
mkdir -p "$WORK"

# Deterministic checkout: --no-checkout clone avoids binding to live APP HEAD; fetch TARGET_SHA from APP.
if [ -d "$WORK_REPO/.git" ] && [ -f "$WORK_REPO/.rehearsal-target-sha" ] \
  && [ "$(tr -d '\n' <"$WORK_REPO/.rehearsal-target-sha")" = "$TARGET_SHA" ]; then
  :
else
  rm -rf "$WORK_REPO"
  git clone --no-checkout "$APP" "$WORK_REPO"
fi
cd "$WORK_REPO"
RESOLVED_SHA="$(git -C "$APP" rev-parse "${TARGET_SHA}^{commit}")"
git fetch --depth 1 "$APP" "$RESOLVED_SHA"
git checkout -f FETCH_HEAD
printf '%s' "$TARGET_SHA" >"$WORK_REPO/.rehearsal-target-sha"
[ -d node_modules/pg ] || npm ci --legacy-peer-deps --include=dev --omit=optional >/dev/null

DUMP=""
for dir in "${APP_DB_BACKUP_DIR:-}" "$HOME/db-backups-gate" "$HOME/db-backups-rehearsal"; do
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

if ! sudo -n /usr/local/sbin/app-disposable-db create "$PROBE_DB" 2>/dev/null; then
  if [ "${APP_DISPOSABLE_DB_USE_SUDO:-}" != "1" ]; then
    echo "NO_GO: SUDO_DISPOSABLE_DB_UNAVAILABLE"
    exit 2
  fi
else
  PROBE_CREATED=1
fi

if ! sudo -n /usr/local/sbin/app-disposable-db create "$RESTORE_DB"; then
  echo "NO_GO: RESTORE_DB_CREATE_FAILED"
  exit 2
fi
RESTORE_DB_CREATED=1

node scripts/ops/verify-backup-restore.mjs \
  --database-lifecycle external \
  --backup "$DUMP" \
  --target-db "$RESTORE_DB" \
  --baseline-snapshot "$SNAP_PRE"

RESTORE_URL="$(node -e "const u=new URL(process.env.DATABASE_URL); u.pathname='/'+process.env.RESTORE_DB; console.log(u.toString());")"
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

sudo -n /usr/local/sbin/app-disposable-db drop "$RESTORE_DB"
RESTORE_DB_DROPPED=1

echo "REHEARSAL_OK report=$REPORT_DIR"
