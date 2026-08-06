#!/usr/bin/env bash
# Push FOUNDER_CHILD_PIN (or QA_CHILD_PIN) to VPS deploy-ops.env without logging the PIN.
set -euo pipefail

PIN="${FOUNDER_CHILD_PIN:-${QA_CHILD_PIN:-}}"
if [ -z "$PIN" ]; then
  echo '{"status":"BLOCKED","reason":"FOUNDER_CHILD_PIN_missing"}' >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
rules="$(find "$ROOT/.cursor/rules" -maxdepth 1 -name '*-deploy.mdc' -print -quit 2>/dev/null || true)"
if [ -n "$rules" ] && [ -f "$rules" ]; then
  ssh_cell="$(grep -E '^\| VPS SSH \|' "$rules" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
  if [[ "$ssh_cell" == *@* ]]; then
    VPS_USER="${VPS_USER:-${ssh_cell%%@*}}"
    VPS_HOST="${VPS_HOST:-${ssh_cell#*@}}"
  fi
fi
KEY="FOUNDER_CHILD_PIN"
TMP="$(mktemp)"
chmod 600 "$TMP"
printf '%s' "$PIN" >"$TMP"
REMOTE_TMP="/tmp/deploy-ops-pin.$$"
trap 'rm -f "$TMP"' EXIT

"${ROOT}/scripts/vps-ssh.sh" "cat > '${REMOTE_TMP}' && chmod 600 '${REMOTE_TMP}'" <"$TMP"
"${ROOT}/scripts/vps-ssh.sh" "KEY='${KEY}' REMOTE_TMP='${REMOTE_TMP}' python3 -" <<'PY'
import os, pwd, re, sys, tempfile

key = os.environ["KEY"]
remote_tmp = os.environ["REMOTE_TMP"]
with open(remote_tmp, encoding="utf-8") as f:
    value = f.read()
os.remove(remote_tmp)
if not value:
    raise SystemExit('{"status":"BLOCKED","reason":"empty_value"}')
ops_path = "/home/deploy/deploy-ops.env"
lines = []
if os.path.isfile(ops_path):
    with open(ops_path, encoding="utf-8") as f:
        lines = f.read().splitlines()
pat = re.compile("^" + re.escape(key) + "=")
lines = [ln for ln in lines if not pat.match(ln)]
lines.append(f"{key}={value}")
ops_dir = os.path.dirname(ops_path) or "."
fd, tmp = tempfile.mkstemp(dir=ops_dir, prefix=".deploy-ops.")
with os.fdopen(fd, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
os.replace(tmp, ops_path)
os.chmod(ops_path, 0o600)
try:
    os.chown(ops_path, pwd.getpwnam("deploy").pw_uid, pwd.getpwnam("deploy").pw_gid)
except OSError:
    pass
print(f'{{"status":"OK","key":"{key}"}}')
PY
