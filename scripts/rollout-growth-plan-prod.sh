#!/usr/bin/env bash
# Post-deploy rollout: migrate + ACT-1 flags + optional FEAT-1/RET-3.
# Usage on VPS: ./scripts/rollout-growth-plan-prod.sh [--custody-beta] [--retention-push]
set -euo pipefail

cd "$(dirname "$0")/.."

ENABLE_CUSTODY=false
ENABLE_RETENTION=false
for arg in "$@"; do
  case "$arg" in
    --custody-beta) ENABLE_CUSTODY=true ;;
    --retention-push) ENABLE_RETENTION=true ;;
  esac
done

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

echo "→ npm ci"
export NPM_CONFIG_MIN_RELEASE_AGE=0
npm ci --legacy-peer-deps

echo "→ migrate"
npm run migrate

echo "→ ACT-1 + referral flags"
node scripts/enable-act1-flags.js

if [ "$ENABLE_CUSTODY" = true ]; then
  echo "→ FEAT-1 custody_schedule_beta"
  node scripts/enable-custody-beta.js
fi

if [ "$ENABLE_RETENTION" = true ]; then
  echo "→ RET-3 retention_reengagement_v1"
  node -e "
    const { loadEnvFile } = require('./src/lib/load-env');
    loadEnvFile();
    const db = require('./src/lib/db');
    db.query(\"UPDATE feature_flag SET enabled = true WHERE key = 'retention_reengagement_v1'\")
      .then(() => { console.log('retention_reengagement_v1 = ON'); process.exit(0); })
      .catch((e) => { console.error(e); process.exit(1); });
  "
fi

echo "→ restart $SYSTEMD_SERVICE"
sudo systemctl restart "$SYSTEMD_SERVICE"
sleep 3

PORT="${PORT:-3000}"
if curl -fsS "http://127.0.0.1:${PORT}/health"; then
  echo ""
  echo "→ rollout klar"
  echo "   Verifiera: admin Analytics → Aktivering"
  [ "$ENABLE_CUSTODY" = true ] && echo "   Boendeschema: Familj → inställningar"
else
  echo "Health check misslyckades"
  exit 1
fi
