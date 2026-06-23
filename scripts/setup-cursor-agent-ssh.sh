#!/usr/bin/env bash
# Engångs-setup: Cursor Cloud Agent → SSH → VPS (prod).
# Kör från repo-root på din Mac: ./scripts/setup-cursor-agent-ssh.sh
#
# Skapar en separat deploy-nyckel för Cursor (inte samma som GitHub Actions).
# Du lägger privat nyckel + host/user i Cursor → Cloud Agents → Secrets.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [ -z "${DEPLOY_RULES:-}" ]; then
  DEPLOY_RULES="$(find "$REPO_ROOT/.cursor/rules" -maxdepth 1 -name '*-deploy.mdc' -print -quit 2>/dev/null || true)"
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { printf '%b\n' "${GREEN}→${NC} $*" >&2; }
warn()  { printf '%b\n' "${YELLOW}!${NC} $*" >&2; }
err()   { printf '%b\n' "${RED}✗${NC} $*" >&2; }
step()  { printf '\n%b\n' "${GREEN}== $* ==${NC}" >&2; }

is_yes() {
  case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
    y|j|ja|yes) return 0 ;;
    *) return 1 ;;
  esac
}

is_no() {
  case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
    n|nej|no) return 0 ;;
    *) return 1 ;;
  esac
}

prompt_read() {
  printf '%s' "$1" >&2
  read -r "$2"
}

read_deploy_rules() {
  if [ ! -f "$DEPLOY_RULES" ]; then
    err "Hittar inte deploy-regel: $DEPLOY_RULES"
    exit 1
  fi

  local ssh_cell path_cell service_cell url_cell
  ssh_cell="$(grep -E '^\| VPS SSH \|' "$DEPLOY_RULES" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
  path_cell="$(grep -E '^\| VPS path \|' "$DEPLOY_RULES" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
  service_cell="$(grep -E '^\| systemd \|' "$DEPLOY_RULES" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
  url_cell="$(grep -E '^\| URL \|' "$DEPLOY_RULES" | sed -E 's/.*`([^`]+)`.*/\1/' || true)"

  if [[ "$ssh_cell" == *@* ]]; then
    VPS_USER="${VPS_USER:-${ssh_cell%%@*}}"
    VPS_HOST="${VPS_HOST:-${ssh_cell#*@}}"
  fi
  VPS_APP_PATH="${VPS_APP_PATH:-$path_cell}"
  VPS_SERVICE="${VPS_SERVICE:-$service_cell}"
  PROD_URL="${PROD_URL:-$url_cell}"
  VPS_HEALTH_URL="${VPS_HEALTH_URL:-http://127.0.0.1:3000/health}"
  VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
  KEY_DIR="${KEY_DIR:-$HOME/.ssh}"
  KEY_NAME="${KEY_NAME:-cursor_agent_${VPS_SERVICE}_deploy}"
  KEY_PATH="${KEY_PATH:-$KEY_DIR/$KEY_NAME}"
}

usage() {
  cat <<'EOF'
Användning: ./scripts/setup-cursor-agent-ssh.sh [kommando]

Kommandon:
  (ingen)        Interaktiv setup (nyckel + instruktioner för Cursor Secrets)
  vps-key        Visa publik nyckel + kommando för authorized_keys på VPS
  secrets        Visa exakt vilka secrets som ska in i Cursor dashboard
  test           Testa SSH med lokal nyckel (samma som agenten får via secret)

Efter setup: lägg secrets i Cursor → Cloud Agents → Secrets (Runtime Secret för nyckeln).
Se docs/CURSOR-AGENT-VPS-SSH.md
EOF
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Saknar kommando: $1"
    exit 1
  fi
}

generate_key() {
  if [ -f "$KEY_PATH" ]; then
    warn "Nyckel finns redan: $KEY_PATH"
    prompt_read "Använda den? [J/n] " ans
    if is_no "$ans"; then
      err "Avbrutet. Sätt KEY_PATH till annan fil eller ta bort befintlig nyckel."
      exit 1
    fi
    return 0
  fi

  mkdir -p "$KEY_DIR"
  chmod 700 "$KEY_DIR"
  info "Skapar Cursor-agent-nyckel (ed25519, ingen passphrase): $KEY_PATH"
  ssh-keygen -q -t ed25519 -f "$KEY_PATH" -N "" -C "cursor-agent-${VPS_SERVICE}-deploy" </dev/null
}

print_vps_key_instructions() {
  local pub="${KEY_PATH}.pub"
  if [ ! -f "$pub" ]; then
    err "Hittar inte $pub — kör setup utan KEY_PATH eller skapa nyckel först."
    exit 1
  fi

  step "Lägg Cursor-agent-nyckeln på VPS"
  cat <<EOF

1) Publik nyckel (en rad):

$(cat "$pub")

2) På VPS (som ${VPS_USER}):

  ssh ${VPS_USER}@${VPS_HOST}
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  echo '$(cat "$pub")' >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys

3) Testa från din Mac:

  ssh -i ${KEY_PATH} -p ${VPS_SSH_PORT} ${VPS_USER}@${VPS_HOST} 'echo OK'

EOF
}

print_cursor_secrets_instructions() {
  if [ ! -f "$KEY_PATH" ]; then
    err "Ingen privat nyckel på $KEY_PATH — kör hela setup först."
    exit 1
  fi

  step "Cursor Cloud Agents → Secrets"
  cat <<EOF

Öppna: https://cursor.com/dashboard → Cloud Agents → Secrets
(Lägg dem i samma environment som repot använder, om du har flera.)

| Secret / env | Typ | Värde |
|--------------|-----|-------|
| VPS_SSH_KEY | Runtime Secret | Hela privata nyckeln från ${KEY_PATH} |
| VPS_HOST | Environment Variable | ${VPS_HOST} |
| VPS_USER | Environment Variable | ${VPS_USER} |
| VPS_APP_PATH | Environment Variable | ${VPS_APP_PATH} |
| VPS_SERVICE | Environment Variable | ${VPS_SERVICE} |

Valfritt:
| VPS_SSH_PORT | Environment Variable | ${VPS_SSH_PORT} (bara om inte 22) |

Kopiera privat nyckel till urklipp (Mac):

  pbcopy < ${KEY_PATH}

Nätverk: om Cloud Agent-miljön har egress-begränsning, tillåt utgående TCP ${VPS_SSH_PORT}
till ${VPS_HOST} (Cursor → Security & Network → allowlist).

Verifiera i en ny Cloud Agent-körning:

  ./scripts/vps-ssh.sh check
  ./scripts/vps-ssh.sh 'cd ${VPS_APP_PATH} && git log -1 --oneline'

EOF
}

test_local_key() {
  if [ ! -f "$KEY_PATH" ]; then
    err "Ingen nyckel på $KEY_PATH"
    exit 1
  fi
  info "Testar SSH med ${KEY_PATH}…"
  ssh -i "$KEY_PATH" -p "$VPS_SSH_PORT" -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
    "${VPS_USER}@${VPS_HOST}" \
    "echo 'SSH OK' && test -d '${VPS_APP_PATH}' && echo 'App path OK: ${VPS_APP_PATH}'"
}

cmd_full_setup() {
  step "1/3 — Förutsättningar"
  need_cmd ssh-keygen
  need_cmd ssh
  info "Prod-värden från: $DEPLOY_RULES"
  info "  ${VPS_USER}@${VPS_HOST}  ${VPS_APP_PATH}  service=${VPS_SERVICE}"

  step "2/3 — Cursor-agent-nyckel"
  generate_key

  step "3/3 — VPS + Cursor Secrets (manuellt)"
  print_vps_key_instructions
  print_cursor_secrets_instructions

  prompt_read "Har du lagt nyckeln på VPS och secrets i Cursor? [j/N] " done
  if is_yes "$done"; then
    test_local_key || warn "Lokal SSH-test misslyckades — kontrollera authorized_keys."
  else
    warn "Kör ./scripts/setup-cursor-agent-ssh.sh test när du är klar."
  fi
}

main() {
  read_deploy_rules
  local cmd="${1:-}"

  case "$cmd" in
    -h|--help|help) usage ;;
    vps-key) print_vps_key_instructions ;;
    secrets) print_cursor_secrets_instructions ;;
    test) test_local_key ;;
    "") cmd_full_setup ;;
    *)
      err "Okänt kommando: $cmd"
      usage
      exit 1
      ;;
  esac
}

main "$@"
