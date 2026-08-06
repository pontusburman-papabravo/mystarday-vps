#!/usr/bin/env bash
# Merge one KEY=VALUE into a VPS env file (value on stdin; never echoed).
# Usage: printf '%s' "$VAL" | ./scripts/ops/vps-merge-env-key.sh /path/to/file KEY
set -euo pipefail
FILE="${1:?file}"
KEY="${2:?key}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp)"
chmod 600 "$TMP"
cat >"$TMP"
REMOTE_TMP="/tmp/env-merge-pin.$$"
trap 'rm -f "$TMP"' EXIT
"${ROOT}/scripts/vps-ssh.sh" "cat > '${REMOTE_TMP}' && chmod 600 '${REMOTE_TMP}'" <"$TMP"
"${ROOT}/scripts/vps-ssh.sh" "FILE='${FILE}' KEY='${KEY}' REMOTE_TMP='${REMOTE_TMP}' python3 -" <<'PY'
import os, pwd, re, sys, tempfile

file_path = os.environ["FILE"]
key = os.environ["KEY"]
remote_tmp = os.environ["REMOTE_TMP"]
with open(remote_tmp, encoding="utf-8") as f:
    value = f.read()
os.remove(remote_tmp)
if not value:
    raise SystemExit('{"status":"BLOCKED","reason":"empty_value"}')
lines = []
if os.path.isfile(file_path):
    with open(file_path, encoding="utf-8") as f:
        lines = f.read().splitlines()
pat = re.compile("^" + re.escape(key) + "=")
lines = [ln for ln in lines if not pat.match(ln)]
# quote if needed
if re.search(r'[\s#"\']', value):
    esc = value.replace("\\", "\\\\").replace('"', '\\"')
    line = f'{key}="{esc}"'
else:
    line = f"{key}={value}"
lines.append(line)
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(file_path) or ".", prefix=".env-merge.")
with os.fdopen(fd, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
os.replace(tmp, file_path)
os.chmod(file_path, 0o600)
try:
    uid = pwd.getpwnam("deploy").pw_uid
    gid = pwd.getpwnam("deploy").pw_gid
    os.chown(file_path, uid, gid)
except OSError:
    pass
print(f'{{"status":"OK","file":"{file_path}","key":"{key}"}}')
PY
