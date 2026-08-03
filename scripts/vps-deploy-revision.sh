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

ROLLBACK_SHA=""
HEALTH_CHECK_RESULT="pending"
DEPLOY_OUTCOME="DEPLOY_PASS"
MIGRATIONS_APPLIED=0
NEW_MIGRATION_NAMES=""
FAILED_PHASE=""

log_deploy_summary() {
  local status="$1"
  echo "DEPLOY_SUMMARY status=${status} outcome=${DEPLOY_OUTCOME} requested_sha=${TARGET_SHA} previous_sha=${PREV_SHA:-unknown} deployed_sha=$(git rev-parse HEAD 2>/dev/null || echo unknown) health_check_result=${HEALTH_CHECK_RESULT} rollback_sha=${ROLLBACK_SHA:-none} failed_phase=${FAILED_PHASE:-none} migrations_applied=${MIGRATIONS_APPLIED}"
}

maybe_rollback_code() {
  local phase="$1"
  local sha="$2"
  FAILED_PHASE="$phase"
  local assess_args=(--phase "$phase" --migrations-applied "$MIGRATIONS_APPLIED")
  if [ -n "${NEW_MIGRATION_NAMES}" ]; then
    assess_args+=(--new-migrations "${NEW_MIGRATION_NAMES}")
  fi
  local assess_out
  assess_out="$(node "${OPS_DIR}/assess-deploy-rollback.mjs" "${assess_args[@]}" 2>&1)" || true
  DEPLOY_OUTCOME="$(printf '%s\n' "$assess_out" | head -1)"
  if node "${OPS_DIR}/assess-deploy-rollback.mjs" "${assess_args[@]}" >/dev/null 2>&1; then
    rollback_to_sha "$sha" || true
    log_deploy_summary failed
    return 1
  fi
  echo "→ ${DEPLOY_OUTCOME}: automatic code rollback skipped (DB may be ahead of code)"
  log_deploy_summary failed
  return 1
}

rollback_to_sha() {
  local sha="$1"
  if [ -z "$sha" ] || ! git cat-file -e "${sha}^{commit}" 2>/dev/null; then
    echo "Rollback skipped — previous SHA unavailable: ${sha:-<empty>}"
    return 1
  fi
  ROLLBACK_SHA="$sha"
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
  DEPLOY_OUTCOME="BLOCKED_BEFORE_MIGRATION"
  FAILED_PHASE="checkout"
  rollback_to_sha "$PREV_SHA" || true
  log_deploy_summary failed
  exit 1
fi

echo "→ Checkout target revision"
git checkout --detach "$TARGET_SHA"

mkdir -p data
echo "$TARGET_SHA" > data/deployed-sha

DEPLOYED_SHA="$(git rev-parse HEAD)"
if [ "$DEPLOYED_SHA" != "$TARGET_SHA" ]; then
  echo "Checkout verification failed — HEAD=$DEPLOYED_SHA expected=$TARGET_SHA"
  DEPLOY_OUTCOME="BLOCKED_BEFORE_MIGRATION"
  FAILED_PHASE="checkout"
  rollback_to_sha "$PREV_SHA" || true
  log_deploy_summary failed
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
  DEPLOY_OUTCOME="BLOCKED_BEFORE_MIGRATION"
  FAILED_PHASE="npm_ci"
  rollback_to_sha "$PREV_SHA" || true
  log_deploy_summary failed
  exit 1
fi
echo "node $(node -v) npm $(npm -v)"

echo "→ npm ci"
export NPM_CONFIG_MIN_RELEASE_AGE=0
if [ ! -f package-lock.json ]; then
  echo "package-lock.json missing — cannot npm ci"
  DEPLOY_OUTCOME="BLOCKED_BEFORE_MIGRATION"
  FAILED_PHASE="npm_ci"
  rollback_to_sha "$PREV_SHA" || true
  log_deploy_summary failed
  exit 1
fi
if ! npm ci --legacy-peer-deps; then
  echo "npm ci failed"
  DEPLOY_OUTCOME="BLOCKED_BEFORE_MIGRATION"
  FAILED_PHASE="npm_ci"
  rollback_to_sha "$PREV_SHA" || true
  log_deploy_summary failed
  exit 1
fi

OPS_DIR="$(cd "${VPS_APP_PATH}/scripts/ops" && pwd)"
DEPLOY_DATA_DIR="${VPS_APP_PATH}/data/deploy"
mkdir -p "${DEPLOY_DATA_DIR}/snapshots"

# Ops-only deploy gate config (not loaded by Node app systemd unit) # pragma: allowlist secret
for _ops_env in /etc/deploy-ops/deploy-ops.env "${HOME}/deploy-ops.env"; do
  if [ -f "${_ops_env}" ]; then
    set -a
    # shellcheck disable=SC1090
    . "${_ops_env}"
    set +a
    break
  fi
done
unset _ops_env

# App DATABASE_URL: same contract as migrate.js (systemd .env on VPS) # pragma: allowlist secret
if [ -z "${DATABASE_URL:-}" ]; then
  for _app_env in "${APP_ENV_FILE:-}" "${VPS_APP_PATH}/.env"; do
    if [ -n "${_app_env}" ] && [ -f "${_app_env}" ]; then
      set -a
      # shellcheck disable=SC1090
      . "${_app_env}"
      set +a
      break
    fi
  done
  unset _app_env
fi

export APP_DEPLOY_PRODUCTION="${APP_DEPLOY_PRODUCTION:-1}"
export BACKUP_REQUIRED="${BACKUP_REQUIRED:-1}"
export BACKUP_EMERGENCY_MARKER_FILE="${DEPLOY_EMERGENCY_MARKER:-${BACKUP_EMERGENCY_MARKER_FILE:-}}"

echo "→ verify deploy database configuration"
if ! node "${OPS_DIR}/ensure-deploy-database-env.mjs" --verify-only; then
  echo "deploy database configuration missing or invalid — migration blocked"
  DEPLOY_OUTCOME="BLOCKED_BEFORE_MIGRATION"
  FAILED_PHASE="database_url"
  rollback_to_sha "$PREV_SHA" || true
  log_deploy_summary failed
  exit 1
fi

PRE_SNAPSHOT="${DEPLOY_DATA_DIR}/snapshots/pre-${TARGET_SHA}.json"
POST_MIG_SNAPSHOT="${DEPLOY_DATA_DIR}/snapshots/post-migrate-${TARGET_SHA}.json"
POST_SNAPSHOT="${DEPLOY_DATA_DIR}/snapshots/post-${TARGET_SHA}.json"

echo "→ pre-deploy database snapshot"
if ! node "${OPS_DIR}/db-integrity-snapshot.mjs" --out "${PRE_SNAPSHOT}" --label pre-deploy --deploy-sha "${TARGET_SHA}"; then
  echo "pre-deploy snapshot failed"
  DEPLOY_OUTCOME="BLOCKED_BEFORE_MIGRATION"
  FAILED_PHASE="pre_snapshot"
  rollback_to_sha "$PREV_SHA" || true
  log_deploy_summary failed
  exit 1
fi

echo "→ pre-deploy backup gate"
GATE_ARGS=(--deploy-sha "${TARGET_SHA}" --snapshot-in "${PRE_SNAPSHOT}")
if [ -n "${BACKUP_EMERGENCY_MARKER_FILE:-}" ]; then
  GATE_ARGS+=(--emergency-marker "${BACKUP_EMERGENCY_MARKER_FILE}")
fi
if ! node "${OPS_DIR}/pre-deploy-backup-gate.mjs" "${GATE_ARGS[@]}"; then
  echo "pre-deploy backup gate failed — migration and restart blocked"
  DEPLOY_OUTCOME="BLOCKED_BEFORE_MIGRATION"
  FAILED_PHASE="backup_gate"
  rollback_to_sha "$PREV_SHA" || true
  log_deploy_summary failed
  exit 1
fi

echo "→ migrate"
if ! npm run migrate; then
  echo "migrate failed"
  DEPLOY_OUTCOME="BLOCKED_BEFORE_MIGRATION"
  FAILED_PHASE="migrate"
  rollback_to_sha "$PREV_SHA" || true
  log_deploy_summary failed
  exit 1
fi
MIGRATIONS_APPLIED=1

echo "→ post-migrate database snapshot"
if ! node "${OPS_DIR}/db-integrity-snapshot.mjs" --out "${POST_MIG_SNAPSHOT}" --label post-migrate --deploy-sha "${TARGET_SHA}"; then
  echo "post-migrate snapshot failed"
  FAILED_PHASE="post_migrate_snapshot"
  maybe_rollback_code "post_migrate_snapshot" "$PREV_SHA"
  exit 1
fi

NEW_MIGRATION_NAMES="$(node -e "
const fs=require('fs');
const before=JSON.parse(fs.readFileSync('${PRE_SNAPSHOT}','utf8'));
const after=JSON.parse(fs.readFileSync('${POST_MIG_SNAPSHOT}','utf8'));
const b=new Set(before.applied_migration_names||[]);
const names=(after.applied_migration_names||[]).filter(n=>!b.has(n));
process.stdout.write(names.join(','));
")"

echo "→ post-migrate snapshot compare (migration-aware)"
if ! node "${OPS_DIR}/compare-db-snapshots.mjs" --before "${PRE_SNAPSHOT}" --after "${POST_MIG_SNAPSHOT}" --mode post-migration --repo-root "${VPS_APP_PATH}"; then
  echo "Post-migrate snapshot drift detected — forward-fix required"
  HEALTH_CHECK_RESULT="post_migrate_drift"
  FAILED_PHASE="post_migration_compare"
  maybe_rollback_code "post_migration_compare" "$PREV_SHA"
  exit 1
fi

echo "→ restart app"
if [ -n "${VPS_RESTART_CMD:-}" ]; then
  if ! eval "$VPS_RESTART_CMD"; then
    echo "restart command failed"
    FAILED_PHASE="restart"
    maybe_rollback_code "restart" "$PREV_SHA"
    exit 1
  fi
elif [ -n "${VPS_SERVICE:-}" ]; then
  if ! sudo systemctl restart "$VPS_SERVICE"; then
    echo "systemctl restart failed"
    FAILED_PHASE="restart"
    maybe_rollback_code "restart" "$PREV_SHA"
    exit 1
  fi
else
  echo "VPS_RESTART_CMD or VPS_SERVICE must be set"
  FAILED_PHASE="restart"
  maybe_rollback_code "restart" "$PREV_SHA"
  exit 1
fi

echo "→ health check"
sleep 3
HEALTH_URL="${VPS_HEALTH_URL:-http://127.0.0.1:3000/health}"
HEALTH_JSON_FILE="${DEPLOY_DATA_DIR}/health-${TARGET_SHA}.json"
for i in 1 2 3 4 5; do
  if curl -fsS "$HEALTH_URL" -o "$HEALTH_JSON_FILE"; then
    FINAL_SHA="$(git rev-parse HEAD)"
    if [ "$FINAL_SHA" != "$TARGET_SHA" ]; then
      echo "Post-deploy SHA mismatch — HEAD=$FINAL_SHA expected=$TARGET_SHA"
      FAILED_PHASE="health"
      maybe_rollback_code "health" "$PREV_SHA"
      exit 1
    fi

    echo "→ release identity (SHA + cache)"
    if ! node "${OPS_DIR}/verify-deploy-release-identity.mjs" \
      --sha "${TARGET_SHA}" \
      --health-json "${HEALTH_JSON_FILE}" \
      --sw "${VPS_APP_PATH}/public/sw.js" \
      --app-root "${VPS_APP_PATH}"; then
      HEALTH_CHECK_RESULT="release_identity_mismatch"
      FAILED_PHASE="release_identity"
      maybe_rollback_code "release_identity" "$PREV_SHA"
      exit 1
    fi

    echo "OK: deployed $FINAL_SHA — $HEALTH_URL"
    HEALTH_CHECK_RESULT="ok"

    echo "→ post-deploy database snapshot"
    if node "${OPS_DIR}/db-integrity-snapshot.mjs" --out "${POST_SNAPSHOT}" --label post-deploy --deploy-sha "${TARGET_SHA}"; then
      echo "→ post-deploy runtime snapshot compare"
      if ! node "${OPS_DIR}/compare-db-snapshots.mjs" --before "${POST_MIG_SNAPSHOT}" --after "${POST_SNAPSHOT}" --mode post-deploy-runtime --repo-root "${VPS_APP_PATH}"; then
        echo "Post-deploy runtime drift detected"
        HEALTH_CHECK_RESULT="snapshot_drift"
        FAILED_PHASE="post_deploy_runtime"
        maybe_rollback_code "post_deploy_runtime" "$PREV_SHA"
        exit 1
      fi
    else
      echo "post-deploy snapshot failed"
      HEALTH_CHECK_RESULT="post_snapshot_failed"
      FAILED_PHASE="post_snapshot"
      maybe_rollback_code "post_snapshot" "$PREV_SHA"
      exit 1
    fi

    DEPLOY_OUTCOME="DEPLOY_PASS"
    log_deploy_summary success
    exit 0
  fi
  echo "waiting for app… ($i/5)"
  sleep 3
done

echo "health check failed: $HEALTH_URL"
HEALTH_CHECK_RESULT="failed"
FAILED_PHASE="health"
maybe_rollback_code "health" "$PREV_SHA"
exit 1
