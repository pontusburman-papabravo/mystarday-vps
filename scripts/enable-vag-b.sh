#!/usr/bin/env bash
# Enable väg B (7d activation program email to inactive families).
# Run on VPS: cd /var/www/mystarday && ./scripts/enable-vag-b.sh
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=".env"
SYSTEMD_SERVICE="${SYSTEMD_SERVICE:-mystarday}"

if [ ! -f "$ENV_FILE" ]; then
  echo "enable-vag-b: $ENV_FILE saknas" >&2
  exit 1
fi

if grep -qE '^#+ACTIVATION_PROGRAM_EMAIL_ENABLED=' "$ENV_FILE"; then
  sed -i.bak 's/^#\{0,1\}ACTIVATION_PROGRAM_EMAIL_ENABLED=.*/ACTIVATION_PROGRAM_EMAIL_ENABLED=true/' "$ENV_FILE"
  echo "→ Aktiverade ACTIVATION_PROGRAM_EMAIL_ENABLED i .env (backup: .env.bak)"
elif grep -qE '^ACTIVATION_PROGRAM_EMAIL_ENABLED=true' "$ENV_FILE"; then
  echo "→ ACTIVATION_PROGRAM_EMAIL_ENABLED redan true"
else
  echo 'ACTIVATION_PROGRAM_EMAIL_ENABLED=true' >>"$ENV_FILE"
  echo "→ Lade till ACTIVATION_PROGRAM_EMAIL_ENABLED=true i .env"
fi

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use 20 2>/dev/null || true
fi

echo "→ preview"
node scripts/preview-activation-vag-b.js || true

echo "→ restart $SYSTEMD_SERVICE"
sudo systemctl restart "$SYSTEMD_SERVICE"
sleep 3

if curl -fsS "http://127.0.0.1:${PORT:-3000}/health" >/dev/null; then
  echo "→ health OK"
else
  echo "Health check misslyckades" >&2
  exit 1
fi

echo ""
echo "Väg B är på. Första batch: midnatt (Stockholm) eller kör manuellt:"
echo "  node scripts/run-activation-vag-b-now.js --dry-run"
echo "  node scripts/run-activation-vag-b-now.js"
