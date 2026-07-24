#!/usr/bin/env bash
# Deploy PR #713 to a separate staging process (port 3001) on VPS.
# Does NOT touch the live app service on port 3000.
set -euo pipefail

STAGING_ROOT="${STAGING_ROOT:-/home/deploy/pr713-staging}"
STAGING_PORT="${STAGING_PORT:-3001}"
PROD_APP="${PROD_APP:-${VPS_APP_PATH:-}}"
TARGET_SHA="${TARGET_SHA:-d6b3df0e}"
BRANCH="${BRANCH:-cursor/i18n-today-home-shell-b8ba}"
PID_FILE="${STAGING_ROOT}/staging.pid"
LOG_FILE="${STAGING_ROOT}/staging.log"

mkdir -p "$STAGING_ROOT"

if [ -z "$PROD_APP" ]; then
  echo "ERROR: set PROD_APP or VPS_APP_PATH to the live app git directory" >&2
  exit 1
fi

if [ ! -d "$PROD_APP/.git" ]; then
  echo "ERROR: prod app git dir missing at $PROD_APP" >&2
  exit 1
fi

echo "==> Fetch branch $BRANCH"
git -C "$PROD_APP" fetch origin "$BRANCH" --prune

if [ -d "$STAGING_ROOT/.git" ] || [ -f "$STAGING_ROOT/.git" ]; then
  echo "==> Update existing worktree"
  git -C "$PROD_APP" worktree remove --force "$STAGING_ROOT" 2>/dev/null || rm -rf "$STAGING_ROOT"
fi

echo "==> Add worktree at $TARGET_SHA"
git -C "$PROD_APP" worktree add "$STAGING_ROOT" "$TARGET_SHA"

cd "$STAGING_ROOT"

echo "==> Install dependencies"
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npm install --legacy-peer-deps --omit=dev

echo "==> Link runtime env (read-only copy, PORT override)"
rm -f .env
cp "$PROD_APP/.env" .env
if grep -q '^PORT=' .env; then
  sed -i "s/^PORT=.*/PORT=${STAGING_PORT}/" .env
else
  echo "PORT=${STAGING_PORT}" >> .env
fi

echo "==> Migrate (idempotent)"
set -a
# shellcheck disable=SC1091
source .env
set +a
npm run migrate

echo "==> Stop previous staging if running"
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" || true
    sleep 2
  fi
  rm -f "$PID_FILE"
fi

echo "==> Start staging on port $STAGING_PORT"
set -a
# shellcheck disable=SC1091
source .env
set +a
nohup node server.js >>"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"
sleep 3

echo "==> Health check"
curl -sf "http://127.0.0.1:${STAGING_PORT}/health" | tee "${STAGING_ROOT}/health.json"
echo
echo "==> Deployed SHA"
git -C "$STAGING_ROOT" rev-parse HEAD
echo "==> SW version"
node -e "console.log(require('./config/cache-version.json').cacheName)"
echo "==> Staging PID $(cat "$PID_FILE")"
echo "==> Log: $LOG_FILE"
