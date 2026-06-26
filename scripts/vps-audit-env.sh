#!/usr/bin/env bash
# Audit prod .env on VPS — lists keys and SET/MISSING, never prints values.
# Usage: ./scripts/vps-audit-env.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_PATH="${VPS_APP_PATH:-/var/www/mystarday}"
ENV_FILE="${APP_PATH}/.env"

EXPECTED=(
  DATABASE_URL JWT_SECRET APP_URL EMAIL_ENABLED EMAIL_FROM EMAIL_FROM_NAME
  RESEND_API_KEY RESEND_API_KEY_WEEKLY RESEND_WEBHOOK_SECRET
  UPLOAD_STORAGE R2_ACCOUNT_ID R2_BUCKET_NAME R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY
  R2_S3_ENDPOINT R2_PUBLIC_BASE_URL
  VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT
  REVENUECAT_API_KEY REVENUECAT_WEBHOOK_SECRET
  APNS_KEY_ID APNS_TEAM_ID APNS_KEY_PATH APNS_BUNDLE_ID
  FCM_SERVER_KEY GOOGLE_WEB_CLIENT_ID ANDROID_PACKAGE_NAME ANDROID_SHA256_CERT_FINGERPRINT
  SENTRY_DSN IN_PROCESS_CRONS_ENABLED REQUIRE_EMAIL_VERIFICATION NODE_ENV
)

bash "$REPO_ROOT/scripts/vps-ssh.sh" check >/dev/null

bash "$REPO_ROOT/scripts/vps-ssh.sh" bash -s "$APP_PATH" "$ENV_FILE" <<'REMOTE'
set -euo pipefail
APP_PATH="$1"
ENV_FILE="$2"

echo "=== VPS .env audit ==="
echo "Host: $(hostname)"
echo "Path: $ENV_FILE"
echo ""

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env not found"
  exit 1
fi

echo "--- Keys in .env (values redacted) ---"
grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | sed 's/=.*$/=***REDACTED***/' | sort

echo ""
echo "--- File stats ---"
ls -la "$ENV_FILE"
wc -l < "$ENV_FILE" | xargs -I{} echo "Lines: {}"

echo ""
echo "--- Service ---"
systemctl is-active mystarday 2>/dev/null || true
curl -fsS http://127.0.0.1:3000/health && echo "" || echo "health: FAIL"

echo ""
echo "--- Git ---"
git -C "$APP_PATH" log -1 --oneline 2>/dev/null || true
REMOTE

echo ""
echo "--- Expected keys ---"
REMOTE_KEYS=$(bash "$REPO_ROOT/scripts/vps-ssh.sh" "grep -E '^[A-Za-z_][A-Za-z0-9_]*=' '$ENV_FILE' | cut -d= -f1 | sort -u")

for key in "${EXPECTED[@]}"; do
  if echo "$REMOTE_KEYS" | grep -qx "$key"; then
    printf '  OK   %s\n' "$key"
  else
    printf '  MISS %s\n' "$key"
  fi
done

echo ""
echo "--- Extra keys (on server, not in expected list) ---"
while IFS= read -r key; do
  [ -z "$key" ] && continue
  found=0
  for exp in "${EXPECTED[@]}"; do
    [ "$key" = "$exp" ] && { found=1; break; }
  done
  [ "$found" -eq 0 ] && printf '  EXTRA %s\n' "$key"
done <<< "$REMOTE_KEYS"
