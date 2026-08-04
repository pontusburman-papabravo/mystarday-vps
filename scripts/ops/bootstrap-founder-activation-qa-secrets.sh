#!/usr/bin/env bash
# Secure local QA credential bootstrap + prod rotate/reset (no secrets on stdout).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SSH_TARGET="${MYSTARDAY_SSH_TARGET:-mystarday-deploy}"
CONFIG_DIR="${HOME}/.config/mystarday"
ENV_FILE="${ACTIVATION_QA_SECRETS_FILE:-${CONFIG_DIR}/founder-activation-qa.env}"

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

if ! ssh -o BatchMode=yes -o ConnectTimeout=10 "$SSH_TARGET" 'true' 2>/dev/null; then
  echo '{"status":"BLOCKED","reason":"secure_qa_provisioning_unavailable","hint":"SSH alias mystarday-deploy or MYSTARDAY_SSH_TARGET required"}'
  exit 2
fi

scp -q "${ROOT}/scripts/ops/vps-remote-qa-bootstrap.sh" "${ROOT}/scripts/ops/vps-remote-qa-rotate-only.sh" "${SSH_TARGET}:/tmp/"
ssh "$SSH_TARGET" 'chmod 700 /tmp/vps-remote-qa-bootstrap.sh /tmp/vps-remote-qa-rotate-only.sh && /tmp/vps-remote-qa-bootstrap.sh'
scp -q "${SSH_TARGET}:/tmp/qa-bootstrap-secret.env" "$ENV_FILE"
chmod 600 "$ENV_FILE"
ssh "$SSH_TARGET" 'rm -f /tmp/qa-bootstrap-secret.env /tmp/vps-remote-qa-bootstrap.sh /tmp/vps-remote-qa-rotate-only.sh'

echo "{\"status\":\"OK\",\"env_file\":\"$ENV_FILE\",\"provisioned\":true,\"method\":\"ssh_alias\"}"
