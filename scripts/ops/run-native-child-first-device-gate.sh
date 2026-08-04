#!/usr/bin/env bash
# Native child-first cold launch — physical device gate (run on operator Mac with USB devices).
# Requires founder activation QA env (see docs/founder-qa-test-account.md); never commit credentials.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${FOUNDER_QA_ENV_FILE:-}" # pragma: allowlist secret
ANDROID_SERIAL="${ANDROID_SERIAL:-}"
COLD_LAUNCH_REPEATS="${COLD_LAUNCH_REPEATS:-5}"
APP_ID="${NATIVE_ANDROID_APP_ID:-}"
HEALTH_URL="${PROD_HEALTH_URL:-}"

if [[ -z "$ENV_FILE" ]]; then
  echo "BLOCKED: set FOUNDER_QA_ENV_FILE to your local QA env file path" >&2
  exit 2
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "BLOCKED: missing QA env file at configured path" >&2
  exit 2
fi

if [[ -z "$ANDROID_SERIAL" ]]; then
  echo "BLOCKED: set ANDROID_SERIAL from adb devices" >&2
  exit 2
fi

if [[ -z "$APP_ID" ]]; then
  echo "BLOCKED: set NATIVE_ANDROID_APP_ID (Capacitor applicationId)" >&2
  exit 2
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

if ! command -v adb >/dev/null 2>&1; then
  echo "BLOCKED: adb not found" >&2
  exit 2
fi

if ! adb devices | grep -q "${ANDROID_SERIAL}[[:space:]]*device"; then
  echo "BLOCKED: Android device not connected (ANDROID_SERIAL)" >&2
  exit 2
fi

echo "== Native child-first device gate =="
echo "Device serial set | Cold launches: $COLD_LAUNCH_REPEATS"
if [[ -n "$HEALTH_URL" ]]; then
  echo "Prod health:"
  curl -fsS "$HEALTH_URL" | jq '{status, cache_version, git_sha}' || true
fi

echo ""
echo "Manual physical checklist (record PASS/FAIL per run):"
cat <<'CHECKLIST'
[ ] Parent login → First Success coach → child picker → PIN → Child Today
[ ] force-stop app → cold launch → stable /child/today (no flicker, no PIN)
[ ] Correct child + family + schema visible
[ ] Activity completion + star
[ ] Parent restore (Förälder / PIN gate)
[ ] Back button per product contract
[ ] Repeat cold launch 5/5 identical end state
CHECKLIST

echo ""
echo "Launching app ($COLD_LAUNCH_REPEATS cold starts via adb)…"
for i in $(seq 1 "$COLD_LAUNCH_REPEATS"); do
  echo "--- Cold launch $i/$COLD_LAUNCH_REPEATS ---"
  adb -s "$ANDROID_SERIAL" shell am force-stop "$APP_ID" || true
  sleep 1
  adb -s "$ANDROID_SERIAL" shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null
  sleep 4
  echo "  (Observe device: expect stable Child Today if child session valid)"
done

echo ""
echo "iOS (optional): attach iPhone and run devicectl list; manual force-quit/reopen checklist."
echo ""
echo "Automated harness (host):"
node "$ROOT/scripts/native-child-cold-launch-harness.cjs"
echo "Device gate script finished — operator must mark physical checklist PASS/FAIL."
