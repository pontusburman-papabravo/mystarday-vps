#!/usr/bin/env bash
# Full ACT-1 + referral + nudge rollout on VPS.
# Run on server: cd /var/www/mystarday && ./scripts/rollout-act1-full.sh
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

SYSTEMD_SERVICE="${SYSTEMD_SERVICE:-mystarday}"

echo "→ git fetch main"
git fetch origin main
git reset --hard origin/main
echo "   $(git log -1 --oneline)"

echo "→ npm install"
export NPM_CONFIG_MIN_RELEASE_AGE=0
if [ -f package-lock.json ]; then
  npm ci --legacy-peer-deps || npm install --legacy-peer-deps
else
  npm install --legacy-peer-deps
fi

echo "→ migrate"
npm run migrate

echo "→ enable ACT-1 flags"
node scripts/enable-act1-flags.js

echo "→ restart $SYSTEMD_SERVICE"
sudo systemctl restart "$SYSTEMD_SERVICE"
sleep 3

echo "→ health"
PORT="${PORT:-3000}"
if curl -fsS "http://127.0.0.1:${PORT}/health"; then
  echo ""
else
  echo "Health check misslyckades — kör: sudo journalctl -u $SYSTEMD_SERVICE -n 40 --no-pager"
  exit 1
fi

echo "→ rollout klar — verifiera admin Analytics → Aktivering (experiment + tratt)"
