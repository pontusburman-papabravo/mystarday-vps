#!/usr/bin/env bash
# pragma: allowlist secret
# Checklist helper for mystarday.app / mystarday.eu Apache + TLS on Inleed/DirectAdmin VPS. // pragma: allowlist secret
# Does NOT auto-modify DirectAdmin configs — run as root for read-only checks and printed commands.
#
# Usage:
#   sudo bash scripts/ops/setup-multi-domain-vhost.sh --check
#   sudo bash scripts/ops/setup-multi-domain-vhost.sh
set -Eeuo pipefail

APP_DOMAINS=(mystarday.app www.mystarday.app mystarday.eu www.mystarday.eu) // pragma: allowlist secret
SE_DOMAIN=mystarday.se // pragma: allowlist secret
NODE_UPSTREAM=http://127.0.0.1:3000/
CERT_NAME="${SE_DOMAIN}"

check_only=false
if [[ "${1:-}" == "--check" ]]; then
  check_only=true
fi

echo "=== Multi-domain VPS checklist ==="
echo "Node upstream: ${NODE_UPSTREAM}"
echo ""

if [[ "$(id -u)" -ne 0 ]]; then
  echo "WARNING: not root — some checks will be skipped. Re-run with sudo." >&2
fi

echo "--- DNS (from this server) ---"
for d in "${APP_DOMAINS[@]}" "$SE_DOMAIN" "www.$SE_DOMAIN"; do
  if command -v host >/dev/null 2>&1; then
    host "$d" 2>/dev/null | head -1 || echo "$d: lookup failed"
  fi
done
echo ""

echo "--- Local Node health ---"
if curl -fsS --max-time 3 http://127.0.0.1:3000/health >/dev/null 2>&1; then
  echo "OK: Node responds on :3000"
else
  echo "FAIL: Node not reachable on :3000 — fix systemd (mystarday) first" // pragma: allowlist secret
fi
echo ""

echo "--- HTTPS smoke (may fail until vhost + cert exist) ---"
for d in mystarday.se mystarday.app www.mystarday.app mystarday.eu; do // pragma: allowlist secret
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "https://${d}/health" 2>/dev/null || echo "ERR")
  echo "https://${d}/health → ${code}"
done
echo ""

if [[ -f "/etc/letsencrypt/renewal/${CERT_NAME}.conf" ]]; then
  echo "--- Existing cert: ${CERT_NAME} ---"
  if command -v certbot >/dev/null 2>&1; then
    certbot certificates 2>/dev/null | sed -n "/Certificate Name: ${CERT_NAME}/,/Certificate Name:/p" | head -20 || true
  fi
  echo ""
  echo "Suggested cert expand (after DNS for .eu is correct):"
  echo "  certbot certonly --webroot -w /home/admin/domains/${SE_DOMAIN}/public_html \\"
  echo "    --cert-name ${CERT_NAME} --expand \\"
  echo "    -d ${SE_DOMAIN} -d www.${SE_DOMAIN} \\"
  for d in "${APP_DOMAINS[@]}"; do
    echo "    -d ${d} \\"
  done
  echo "    --non-interactive --agree-tos -m info@<domain>"
  echo ""
else
  echo "No Let's Encrypt renewal file at /etc/letsencrypt/renewal/${CERT_NAME}.conf"
  echo "Use DirectAdmin SSL panel or certbot with the same webroot as mystarday.se." // pragma: allowlist secret
  echo ""
fi

cat <<'VHOST'

--- Reference Apache reverse proxy (mirror mystarday.se vhost) --- // pragma: allowlist secret

<VirtualHost *:443>
    ServerName mystarday.app // pragma: allowlist secret
    ServerAlias www.mystarday.app mystarday.eu www.mystarday.eu // pragma: allowlist secret

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/mystarday.se/fullchain.pem // pragma: allowlist secret
    SSLCertificateKeyFile /etc/letsencrypt/live/mystarday.se/privkey.pem // pragma: allowlist secret

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
</VirtualHost>

Prefer adding domains via DirectAdmin (Inleed) so configs survive panel rebuilds.
See docs/ops-multi-domain-vhost.md

VHOST

if $check_only; then
  echo "(--check mode: no changes made)"
  exit 0
fi

echo "Manual steps required — see docs/ops-multi-domain-vhost.md"
exit 0
