#!/usr/bin/env bash
# Deploy på VPS: git pull, npm ci, migrate, restart mystarday.
# Kör från /var/www/mystarday som användare deploy.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/mystarday}"
SERVICE_NAME="${SERVICE_NAME:-mystarday}"

cd "$APP_DIR"

echo "==> git pull"
git pull --ff-only

echo "==> npm ci"
npm ci

echo "==> npm run build (migrate)"
npm run build

echo "==> restart ${SERVICE_NAME}"
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl is-active --quiet "$SERVICE_NAME"
echo "==> deploy klar ($(curl -sf http://127.0.0.1:3000/health || echo 'health check misslyckades'))"
