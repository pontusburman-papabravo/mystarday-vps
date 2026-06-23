#!/usr/bin/env bash
# SSH helper for Cursor Cloud Agents when VPS_* secrets are configured.
# Usage:
#   ./scripts/vps-ssh.sh                    # interactive shell
#   ./scripts/vps-ssh.sh 'git log -1'       # remote command
#   ./scripts/vps-ssh.sh -- scp local remote:path
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

read_deploy_rules() {
  local rules
  rules="$(find "$REPO_ROOT/.cursor/rules" -maxdepth 1 -name '*-deploy.mdc' -print -quit 2>/dev/null || true)"
  if [ -n "$rules" ] && [ -f "$rules" ]; then
    local ssh_cell path_cell service_cell
    ssh_cell="$(grep -E '^\| VPS SSH \|' "$rules" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
    path_cell="$(grep -E '^\| VPS path \|' "$rules" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
    service_cell="$(grep -E '^\| systemd \|' "$rules" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
    if [[ "$ssh_cell" == *@* ]]; then
      VPS_USER="${VPS_USER:-${ssh_cell%%@*}}"
      VPS_HOST="${VPS_HOST:-${ssh_cell#*@}}"
    fi
    VPS_APP_PATH="${VPS_APP_PATH:-$path_cell}"
    VPS_SERVICE="${VPS_SERVICE:-$service_cell}"
  fi
}

read_deploy_rules

VPS_USER="${VPS_USER:-deploy}"
VPS_HOST="${VPS_HOST:-}"
VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
KEY_FILE=""

cleanup() {
  if [ -n "$KEY_FILE" ] && [ -f "$KEY_FILE" ]; then
    rm -f "$KEY_FILE"
  fi
}
trap cleanup EXIT

fail() {
  printf 'vps-ssh: %s\n' "$*" >&2
  exit 1
}

prepare_key() {
  if [ -z "${VPS_SSH_KEY:-}" ]; then
    fail "VPS_SSH_KEY is not set. Run ./scripts/setup-cursor-agent-ssh.sh on your Mac, then add the secrets in Cursor → Cloud Agents → Secrets."
  fi
  if [ -z "${VPS_HOST:-}" ]; then
    fail "VPS_HOST is not set (and could not be read from .cursor/rules/*-deploy.mdc)."
  fi

  KEY_FILE="$(mktemp)"
  chmod 600 "$KEY_FILE"
  printf '%s\n' "$VPS_SSH_KEY" >"$KEY_FILE"
}

ssh_base() {
  ssh -i "$KEY_FILE" -p "$VPS_SSH_PORT" \
    -o BatchMode=yes \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=15 \
    "${VPS_USER}@${VPS_HOST}" "$@"
}

cmd_check() {
  prepare_key
  printf 'Checking SSH to %s@%s …\n' "$VPS_USER" "$VPS_HOST"
  ssh_base 'echo SSH_OK'
  if [ -n "${VPS_APP_PATH:-}" ]; then
    ssh_base "test -d '${VPS_APP_PATH}' && echo APP_PATH_OK=${VPS_APP_PATH}"
  fi
  if [ -n "${VPS_SERVICE:-}" ]; then
    ssh_base "systemctl is-active '${VPS_SERVICE}' >/dev/null && echo SERVICE_OK=${VPS_SERVICE} || echo SERVICE_INACTIVE=${VPS_SERVICE}"
  fi
}

main() {
  case "${1:-}" in
    check)
      cmd_check
      return 0
      ;;
    --)
      shift
      prepare_key
      ssh -i "$KEY_FILE" -p "$VPS_SSH_PORT" \
        -o BatchMode=yes \
        -o StrictHostKeyChecking=accept-new \
        -o ConnectTimeout=15 \
        "$@"
      return 0
      ;;
  esac

  prepare_key

  if [ "$#" -gt 0 ]; then
    ssh_base "$@"
  else
    ssh -i "$KEY_FILE" -p "$VPS_SSH_PORT" \
      -o StrictHostKeyChecking=accept-new \
      -o ConnectTimeout=15 \
      -t "${VPS_USER}@${VPS_HOST}"
  fi
}

main "$@"
