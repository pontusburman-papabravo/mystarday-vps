#!/usr/bin/env bash
# Secure local QA credential bootstrap + prod provision/reset (no secrets on stdout).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VPS_APP_PATH="${VPS_APP_PATH:-/var/www/mystarday}"
CONFIG_DIR="${HOME}/.config/mystarday"
ENV_FILE="${ACTIVATION_QA_SECRETS_FILE:-${CONFIG_DIR}/founder-activation-qa.env}"
TMP_SECRET="$(mktemp)"
TMP_REMOTE="$(mktemp)"
cleanup() {
  rm -f "$TMP_SECRET" "$TMP_REMOTE"
}
trap cleanup EXIT

umask 077
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

if [[ -f "$ENV_FILE" ]] && [[ -z "${FORCE_QA_BOOTSTRAP:-}" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
  if [[ -n "${QA_PASSWORD:-}" ]] && [[ ${#QA_PASSWORD} -ge 12 ]]; then
    echo '{"status":"SKIP","reason":"env_file_exists","path":"'"$ENV_FILE"'"}'
    exit 0
  fi
fi

QA_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
# 4-digit PIN (product child PIN format)
QA_CHILD_PIN="$(printf '%04d' $((1000 + RANDOM % 9000)))"
QA_EMAIL="founder-activation-qa-sv@test.stjarnday.local"
QA_FAMILY_ID="bc825034-7f94-4200-82d6-757505598615"
QA_LOCALE="sv-SE"

{
  printf 'QA_EMAIL=%s\n' "$QA_EMAIL"
  printf 'QA_PASSWORD=%s\n' "$QA_PASSWORD"
  printf 'QA_CHILD_PIN=%s\n' "$QA_CHILD_PIN"
  printf 'QA_FAMILY_ID=%s\n' "$QA_FAMILY_ID"
  printf 'QA_LOCALE=%s\n' "$QA_LOCALE"
} >"$TMP_SECRET"
chmod 600 "$TMP_SECRET"

run_remote() {
  if [[ -n "${VPS_SSH_KEY:-}" ]] && [[ -x "${ROOT}/scripts/vps-ssh.sh" ]]; then
    "${ROOT}/scripts/vps-ssh.sh" 'cat > /tmp/qa-bootstrap-secret.env' <"$TMP_SECRET"
    "${ROOT}/scripts/vps-ssh.sh" "cat > ${VPS_APP_PATH}/scripts/ops/reset-founder-activation-qa-scenario.mjs" <"${ROOT}/scripts/ops/reset-founder-activation-qa-scenario.mjs"
    "${ROOT}/scripts/vps-ssh.sh" bash -s <<REMOTE
set -euo pipefail
cd "$VPS_APP_PATH"
export PATH="\$HOME/.nvm/versions/node/v20.20.2/bin:\$PATH"
set -a && . .env && set +a
set -a && . /tmp/qa-bootstrap-secret.env && set +a
node scripts/provision-founder-activation-qa-families.mjs
QA_CHILD_PIN="\$QA_CHILD_PIN" node scripts/ops/reset-founder-activation-qa-scenario.mjs
rm -f /tmp/qa-bootstrap-secret.env
REMOTE
    return 0
  fi

  local SSH_CMD=(ssh -o BatchMode=yes -o ConnectTimeout=15)
  if [[ -n "${VPS_SSH_KEY:-}" ]] && [[ -f "$VPS_SSH_KEY" ]]; then
    SSH_CMD+=(-i "$VPS_SSH_KEY")
  fi
  local HOST="${VPS_USER:-deploy}@${VPS_HOST:-188.66.60.93}"
  "${SSH_CMD[@]}" "$HOST" 'cat > /tmp/qa-bootstrap-secret.env' <"$TMP_SECRET"
  "${SSH_CMD[@]}" "$HOST" "cat > ${VPS_APP_PATH}/scripts/ops/reset-founder-activation-qa-scenario.mjs" <"${ROOT}/scripts/ops/reset-founder-activation-qa-scenario.mjs"
  "${SSH_CMD[@]}" "$HOST" bash -s <<REMOTE
set -euo pipefail
cd "$VPS_APP_PATH"
export PATH="\$HOME/.nvm/versions/node/v20.20.2/bin:\$PATH"
set -a && . .env && set +a
set -a && . /tmp/qa-bootstrap-secret.env && set +a
node scripts/provision-founder-activation-qa-families.mjs
QA_CHILD_PIN="\$QA_CHILD_PIN" node scripts/ops/reset-founder-activation-qa-scenario.mjs
rm -f /tmp/qa-bootstrap-secret.env
REMOTE
}

if ! run_remote 2>/dev/null; then
  if [[ -n "${DATABASE_URL:-}" ]] && [[ "${DATABASE_URL}" != *localhost* ]] && [[ "${DATABASE_URL}" != *127.0.0.1* ]]; then
    set -a && source "$TMP_SECRET" && set +a
    export PATH="${HOME}/.nvm/versions/node/v20.20.2/bin:${PATH}"
    cd "$ROOT"
    NODE_ENV=development node scripts/provision-founder-activation-qa-families.mjs
    NODE_ENV=development node scripts/ops/reset-founder-activation-qa-scenario.mjs
  else
    echo '{"status":"BLOCKED","reason":"secure_qa_provisioning_unavailable","hint":"VPS SSH or non-local DATABASE_URL required"}'
    exit 2
  fi
fi

install -m 600 "$TMP_SECRET" "$ENV_FILE"
echo "{\"status\":\"OK\",\"env_file\":\"$ENV_FILE\",\"provisioned\":true}"
