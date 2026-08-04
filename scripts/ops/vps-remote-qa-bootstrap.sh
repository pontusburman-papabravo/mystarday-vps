#!/usr/bin/env bash
# Run on VPS only — generates QA secrets, provisions, resets. Leaves /tmp/qa-bootstrap-secret.env (600).
set -euo pipefail
cd "${VPS_APP_PATH:-/var/www/mystarday}"
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
set -a && . .env && set +a

QA_PASSWORD="$(openssl rand -hex 16)"
QA_CHILD_PIN="$(printf '%04d' $((1000 + RANDOM % 9000)))"
umask 077
cat > /tmp/qa-bootstrap-secret.env <<ENVEOF
QA_EMAIL=founder-activation-qa-sv@test.stjarnday.local
QA_PASSWORD=${QA_PASSWORD}
QA_CHILD_PIN=${QA_CHILD_PIN}
QA_FAMILY_ID=bc825034-7f94-4200-82d6-757505598615
QA_LOCALE=sv-SE
ENVEOF
chmod 600 /tmp/qa-bootstrap-secret.env

set -a && . /tmp/qa-bootstrap-secret.env && set +a
bash /tmp/vps-remote-qa-rotate-only.sh
# Caller pulls /tmp/qa-bootstrap-secret.env then deletes remotely.
echo '{"remote_bootstrap":"ok"}'
