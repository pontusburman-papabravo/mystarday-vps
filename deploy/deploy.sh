#!/usr/bin/env bash
#
# Auto-deploy script — pulls the latest code for the configured branch and
# restarts the app service. Safe to run repeatedly (idempotent).
#
# It derives the app directory from its own location (deploy/ lives at the repo
# root), so there is no hard-coded path. The service name and branch are
# configurable via env vars.
#
#   DEPLOY_SERVICE_NAME   systemd service to restart   (required)
#   DEPLOY_BRANCH         branch to deploy             (default: main)
#
# Dependencies are only reinstalled when package.json / package-lock.json
# change, and migrations only run when files under migrations/ change.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_NAME="${DEPLOY_SERVICE_NAME:?set DEPLOY_SERVICE_NAME to the systemd service to restart}"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$APP_DIR"
echo "[deploy] $(date -Is) starting in $APP_DIR (branch $BRANCH, service $SERVICE_NAME)"

BEFORE="$(git rev-parse HEAD)"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git merge --ff-only "origin/$BRANCH"
AFTER="$(git rev-parse HEAD)"

if [ "$BEFORE" = "$AFTER" ]; then
  echo "[deploy] already up to date ($AFTER) — nothing to do"
  exit 0
fi
echo "[deploy] $BEFORE -> $AFTER"

if ! git diff --quiet "$BEFORE" "$AFTER" -- package.json package-lock.json; then
  echo "[deploy] dependency manifest changed -> npm install"
  npm install --omit=dev --legacy-peer-deps
fi

if ! git diff --quiet "$BEFORE" "$AFTER" -- migrations/; then
  echo "[deploy] migrations changed -> npm run migrate"
  npm run migrate
fi

echo "[deploy] restarting $SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
echo "[deploy] done -> $AFTER"
