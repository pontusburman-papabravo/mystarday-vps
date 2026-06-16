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

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL saknas. Sätt i .env eller exportera innan körning."
  exit 1
fi

echo "→ git fetch main"
git fetch origin main
git reset --hard origin/main

echo "→ npm install"
npm install --legacy-peer-deps

echo "→ migrate"
npm run migrate

echo "→ for_dig live"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "UPDATE features SET status = 'live', updated_at = NOW() WHERE slug = 'for_dig';"

FOR_DIG_STATUS="$(psql "$DATABASE_URL" -tAc "SELECT status FROM features WHERE slug = 'for_dig' LIMIT 1" | tr -d '[:space:]')"
if [ -z "$FOR_DIG_STATUS" ]; then
  echo "→ seed features (for_dig saknas)"
  node scripts/seed-features.js
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
    "UPDATE features SET status = 'live', updated_at = NOW() WHERE slug = 'for_dig';"
  FOR_DIG_STATUS="$(psql "$DATABASE_URL" -tAc "SELECT status FROM features WHERE slug = 'for_dig' LIMIT 1" | tr -d '[:space:]')"
fi

echo "for_dig status: ${FOR_DIG_STATUS:-okänd}"

echo "→ restart"
if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files stjarndag.service >/dev/null 2>&1; then
  sudo systemctl restart stjarndag
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart stjarndag
else
  echo "Ingen stjarndag-tjänst hittad. Starta om appen manuellt."
fi

echo "→ health"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/health}"
for i in 1 2 3 4 5; do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    echo "OK: $HEALTH_URL"
    echo "För dig: /for-dig (på er publika domän)"
    exit 0
  fi
  sleep 3
done

echo "Health check misslyckades: $HEALTH_URL"
exit 1
