#!/usr/bin/env bash
# Keep data/deployed-sha and app .env DEPLOY_SHA aligned with the running release.
# Sourced by scripts/vps-deploy-revision.sh — not invoked directly by operators.

sync_deploy_sha_env() {
  local sha="$1"
  local env_file="${APP_ENV_FILE:-${VPS_APP_PATH:-.}/.env}"
  if [ ! -f "$env_file" ]; then
    return 0
  fi
  local tmp
  tmp="$(mktemp)"
  if grep -qE '^DEPLOY_SHA=' "$env_file" 2>/dev/null; then
    sed "s/^DEPLOY_SHA=.*/DEPLOY_SHA=${sha}/" "$env_file" >"$tmp"
  else
    cp "$env_file" "$tmp"
    printf '\nDEPLOY_SHA=%s\n' "$sha" >>"$tmp"
  fi
  mv "$tmp" "$env_file"
}

sync_deploy_identity() {
  local sha="$1"
  if ! [[ "$sha" =~ ^[0-9a-f]{40}$ ]]; then
    echo "sync_deploy_identity: invalid SHA: ${sha:-<empty>}" >&2
    return 1
  fi
  mkdir -p "${VPS_APP_PATH}/data"
  echo "$sha" >"${VPS_APP_PATH}/data/deployed-sha"
  sync_deploy_sha_env "$sha"
}
