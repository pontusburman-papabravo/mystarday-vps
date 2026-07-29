#!/usr/bin/env bash
# Deploy an exact git revision to the VPS app directory.
# Invoked from GitHub Actions with DEPLOY_SHA set to the CI-tested commit.
set -Eeuo pipefail

TARGET_SHA="${DEPLOY_SHA:-}"
if [ -z "$TARGET_SHA" ]; then
  echo "DEPLOY_SHA is required"
  exit 1
fi

if ! [[ "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "DEPLOY_SHA must be a 40-character git commit SHA"
  exit 1
fi

if [ -z "${VPS_APP_PATH:-}" ]; then
  echo "VPS_APP_PATH variable is not set"
  exit 1
fi

cd "$VPS_APP_PATH"

rollback_to_sha() {
  local sha="$1"
  if [ -z "$sha" ] || ! git cat-file -e "${sha}^{commit}" 2>/dev/null; then
    echo "Rollback skipped — previous SHA unavailable: ${sha:-<empty>}"
    return 1
  fi
  echo "→ Rolling back to ${sha}"
  git fetch --depth 1 origin "$sha"
  git checkout --detach "$sha"
  if [ "$(git rev-parse HEAD)" != "$sha" ]; then
    echo "Rollback checkout failed — HEAD does not match ${sha}"
    return 1
  fi
  export NPM_CONFIG_MIN_RELEASE_AGE=0
  npm ci --legacy-peer-deps
  if [ -n "${VPS_RESTART_CMD:-}" ]; then
    eval "$VPS_RESTART_CMD"
  elif [ -n "${VPS_SERVICE:-}" ]; then
    sudo systemctl restart "$VPS_SERVICE"
  else
    echo "VPS_RESTART_CMD or VPS_SERVICE must be set"
    return 1
  fi
  sleep 3
  HEALTH_URL="${VPS_HEALTH_URL:-http://127.0.0.1:3000/health}"
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    echo "Rollback health check OK: $HEALTH_URL"
    return 0
  fi
  echo "Rollback health check failed: $HEALTH_URL"
  return 1
}

PREV_SHA="$(git rev-parse HEAD 2>/dev/null || true)"
echo "→ Previous deployed SHA: ${PREV_SHA:-<unknown>}"
echo "→ Target deploy SHA: $TARGET_SHA"

echo "→ Fetch exact target revision"
git fetch --depth 1 origin "$TARGET_SHA"

if ! git cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null; then
  echo "Target commit not found after fetch: $TARGET_SHA"
  rollback_to_sha "$PREV_SHA" || true
  exit 1
fi

echo "→ Checkout target revision"
git checkout --detach "$TARGET_SHA"

DEPLOYED_SHA="$(git rev-parse HEAD)"
if [ "$DEPLOYED_SHA" != "$TARGET_SHA" ]; then
  echo "Checkout verification failed — HEAD=$DEPLOYED_SHA expected=$TARGET_SHA"
  rollback_to_sha "$PREV_SHA" || true
  exit 1
fi

echo "→ Node 20"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
shopt -s nullglob
for node_bin in "$NVM_DIR"/versions/node/v20*/bin; do
  if [ -x "$node_bin/node" ]; then
    export PATH="$node_bin:$PATH"
    break
  fi
done
shopt -u nullglob
if ! command -v node >/dev/null 2>&1; then
  echo "node not found — install Node 20 on VPS"
  rollback_to_sha "$PREV_SHA" || true
  exit 1
fi
echo "node $(node -v) npm $(npm -v)"

echo "→ npm ci"
export NPM_CONFIG_MIN_RELEASE_AGE=0
if [ ! -f package-lock.json ]; then
  echo "package-lock.json missing — cannot npm ci"
  rollback_to_sha "$PREV_SHA" || true
  exit 1
fi
if ! npm ci --legacy-peer-deps; then
  echo "npm ci failed"
  rollback_to_sha "$PREV_SHA" || true
  exit 1
fi

echo "→ migrate"
if ! npm run migrate; then
  echo "migrate failed"
  rollback_to_sha "$PREV_SHA" || true
  exit 1
fi

echo "→ restart app"
if [ -n "${VPS_RESTART_CMD:-}" ]; then
  if ! eval "$VPS_RESTART_CMD"; then
    echo "restart command failed"
    rollback_to_sha "$PREV_SHA" || true
    exit 1
  fi
elif [ -n "${VPS_SERVICE:-}" ]; then
  if ! sudo systemctl restart "$VPS_SERVICE"; then
    echo "systemctl restart failed"
    rollback_to_sha "$PREV_SHA" || true
    exit 1
  fi
else
  echo "VPS_RESTART_CMD or VPS_SERVICE must be set"
  rollback_to_sha "$PREV_SHA" || true
  exit 1
fi

echo "→ health check"
sleep 3
HEALTH_URL="${VPS_HEALTH_URL:-http://127.0.0.1:3000/health}"
for i in 1 2 3 4 5; do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    FINAL_SHA="$(git rev-parse HEAD)"
    if [ "$FINAL_SHA" != "$TARGET_SHA" ]; then
      echo "Post-deploy SHA mismatch — HEAD=$FINAL_SHA expected=$TARGET_SHA"
      rollback_to_sha "$PREV_SHA" || true
      exit 1
    fi
    echo "OK: deployed $FINAL_SHA — $HEALTH_URL"
    exit 0
  fi
  echo "waiting for app… ($i/5)"
  sleep 3
done

echo "health check failed: $HEALTH_URL"
rollback_to_sha "$PREV_SHA" || true
exit 1
