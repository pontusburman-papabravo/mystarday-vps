#!/usr/bin/env bash
# Run strict Extra stöd prod acceptance gate on VPS with correct ops env sourcing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_PATH="${VPS_APP_PATH:-}"
if [ -z "$APP_PATH" ]; then
  rules="$(find "$ROOT/.cursor/rules" -maxdepth 1 -name '*-deploy.mdc' -print -quit 2>/dev/null || true)"
  if [ -n "$rules" ] && [ -f "$rules" ]; then
    APP_PATH="$(grep -E '^\| VPS path \|' "$rules" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
  fi
fi
if [ -z "$APP_PATH" ]; then
  echo '{"pass":false,"error":"vps_app_path_missing"}' >&2
  exit 2
fi

"${ROOT}/scripts/vps-ssh.sh" "cd '${APP_PATH}' && set -a && source .env && if [ -f /home/deploy/deploy-ops.env ]; then source /home/deploy/deploy-ops.env; fi && if [ -f /etc/deploy-ops/deploy-ops.env ]; then source /etc/deploy-ops/deploy-ops.env; fi && set +a && export JOURNEY_QA_BASE_URL=\"\${JOURNEY_QA_BASE_URL:-\$APP_URL}\" && if [ -z \"\${FOUNDER_CHILD_PIN:-}\" ] && [ -z \"\${QA_CHILD_PIN:-}\" ]; then echo '{\"pass\":false,\"error\":\"child_pin_missing_in_ops_env\"}'; exit 2; fi && node scripts/transition-support-prod-acceptance-gate.mjs"
