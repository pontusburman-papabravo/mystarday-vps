#!/usr/bin/env bash
# Post-pull on VPS when you deploy manually (git pull && …).
# Enables ACT-1 + referral flags, migrates, restarts, health-checks.
# Full rollout (fetch hard reset): ./scripts/rollout-growth-plan-prod.sh [--custody-beta]
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use 20 2>/dev/null || nvm use default 2>/dev/null || true
fi

echo "→ migrate"
npm run migrate

echo "→ ACT-1 + referral flags"
node scripts/enable-act1-flags.js

SERVICE="${SYSTEMD_SERVICE:-mystarday}"
echo "→ restart $SERVICE"
sudo systemctl restart "$SERVICE"
sleep 3

PORT="${PORT:-3000}"
curl -fsS "http://127.0.0.1:${PORT}/health"
echo ""
echo "→ klar — verifiera admin Analytics → Aktivering"
