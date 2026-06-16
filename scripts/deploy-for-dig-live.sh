#!/usr/bin/env bash
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

echo "→ git fetch main"
git fetch origin main
git reset --hard origin/main

echo "→ npm install"
npm install --legacy-peer-deps

echo "→ migrate"
npm run migrate

echo "→ for_dig live (via node — läser .env som migrate)"
node scripts/set-for-dig-live.js

echo "→ restart"
if [ -n "${SYSTEMD_SERVICE:-}" ]; then
  sudo systemctl restart "$SYSTEMD_SERVICE"
  echo "restart: $SYSTEMD_SERVICE"
elif command -v pm2 >/dev/null 2>&1 && pm2 describe app >/dev/null 2>&1; then
  pm2 restart app
  echo "restart: pm2 app"
else
  echo "Sätt SYSTEMD_SERVICE i .env och kör: sudo systemctl restart \$SYSTEMD_SERVICE"
fi

echo "→ health"
PORT="${PORT:-3000}"
for URL in "http://127.0.0.1:${PORT}/health" "http://127.0.0.1/health"; do
  for i in 1 2 3 4 5; do
    if curl -fsS "$URL" >/dev/null 2>&1; then
      echo "OK: $URL"
      curl -fsS "$URL"
      echo ""
      exit 0
    fi
    sleep 3
  done
done

echo "Health check misslyckades. Kör: sudo systemctl status \$SYSTEMD_SERVICE"
exit 1
