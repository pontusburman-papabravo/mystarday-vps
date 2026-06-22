#!/usr/bin/env bash
# Engångs-setup: GitHub Actions → SSH → VPS (prod).
# Kör från repo-root: ./scripts/setup-github-actions-deploy.sh
#
# Kräver: gh (inloggad), ssh, curl.
# Prod-värden läses från .cursor/rules/*-deploy.mdc (eller env).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [ -z "${DEPLOY_RULES:-}" ]; then
  DEPLOY_RULES="$(find "$REPO_ROOT/.cursor/rules" -maxdepth 1 -name '*-deploy.mdc' -print -quit 2>/dev/null || true)"
fi
if [ -z "${DEPLOY_RULES:-}" ]; then
  DEPLOY_RULES="$REPO_ROOT/.cursor/rules/deploy.mdc"
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { printf '%b\n' "${GREEN}→${NC} $*"; }
warn()  { printf '%b\n' "${YELLOW}!${NC} $*"; }
err()   { printf '%b\n' "${RED}✗${NC} $*" >&2; }
step()  { printf '\n%b\n' "${GREEN}== $* ==${NC}"; }

read_deploy_rules() {
  if [ ! -f "$DEPLOY_RULES" ]; then
    err "Hittar inte deploy-regel: $DEPLOY_RULES"
    err "Sätt VPS_HOST, VPS_USER, VPS_APP_PATH, VPS_SERVICE manuellt eller skapa *-deploy.mdc."
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
  GH_ENV_NAME="${GH_ENV_NAME:-vps}"
  KEY_DIR="${KEY_DIR:-$HOME/.ssh}"
  KEY_NAME="${KEY_NAME:-github_actions_${VPS_SERVICE}_deploy}"
  KEY_PATH="${KEY_PATH:-$KEY_DIR/$KEY_NAME}"

  if [ -z "${VPS_HOST:-}" ] || [ -z "${VPS_USER:-}" ] || [ -z "${VPS_APP_PATH:-}" ] || [ -z "${VPS_SERVICE:-}" ]; then
    err "Kunde inte läsa alla värden från $DEPLOY_RULES"
    err "Sätt: VPS_HOST VPS_USER VPS_APP_PATH VPS_SERVICE"
    exit 1
  fi
}

usage() {
  cat <<'EOF'
Användning: ./scripts/setup-github-actions-deploy.sh [kommando]

Kommandon:
  (ingen)     Interaktiv full setup (nyckel + GitHub env + verifiering)
  check       Kontrollera att GitHub env, SSH och workflow ser OK ut
  github      Sätt bara GitHub environment secrets/variables (kräver gh auth)
  trigger     Kör workflow_dispatch "Deploy to VPS" manuellt
  vps-key     Visa/offentlig nyckel + kommando för att lägga den på VPS

Miljövariabler (valfria, annars från .cursor/rules/*-deploy.mdc):
  VPS_HOST, VPS_USER, VPS_APP_PATH, VPS_SERVICE, VPS_HEALTH_URL, KEY_PATH
EOF
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Saknar kommando: $1"
    exit 1
  fi
}

gh_repo() {
  gh repo view --json nameWithOwner -q .nameWithOwner
}

ensure_gh_auth() {
  need_cmd gh
  if ! gh auth status >/dev/null 2>&1; then
    err "Kör först: gh auth login"
    exit 1
  fi
  info "GitHub: $(gh_repo)"
}

ensure_github_environment() {
  local repo owner name
  repo="$(gh_repo)"
  owner="${repo%%/*}"
  name="${repo#*/}"
  info "Skapar/uppdaterar GitHub environment: $GH_ENV_NAME"
  gh api \
    -X PUT \
    "repos/${owner}/${name}/environments/${GH_ENV_NAME}" \
    -f wait_timer=0 \
    >/dev/null
}

set_github_vars_and_secret() {
  local private_key_file="$1"
  ensure_gh_auth
  ensure_github_environment

  info "Sätter secrets och variables i environment '$GH_ENV_NAME'…"
  gh secret set VPS_SSH_KEY --env "$GH_ENV_NAME" <"$private_key_file"
  gh variable set VPS_HOST --env "$GH_ENV_NAME" --body "$VPS_HOST"
  gh variable set VPS_USER --env "$GH_ENV_NAME" --body "$VPS_USER"
  gh variable set VPS_APP_PATH --env "$GH_ENV_NAME" --body "$VPS_APP_PATH"
  gh variable set VPS_RESTART_CMD --env "$GH_ENV_NAME" --body "sudo systemctl restart ${VPS_SERVICE}"
  gh variable set VPS_HEALTH_URL --env "$GH_ENV_NAME" --body "$VPS_HEALTH_URL"
  if [ "$VPS_SSH_PORT" != "22" ]; then
    gh variable set VPS_SSH_PORT --env "$GH_ENV_NAME" --body "$VPS_SSH_PORT"
  fi

  info "GitHub environment konfigurerad."
}

generate_deploy_key() {
  if [ -n "${KEY_PATH_OVERRIDE:-}" ]; then
    KEY_PATH="$KEY_PATH_OVERRIDE"
  fi

  if [ -f "$KEY_PATH" ]; then
    warn "Nyckel finns redan: $KEY_PATH"
    read -r -p "Använda den? [J/n] " ans
    if [[ "${ans,,}" == "n" ]]; then
      err "Avbrutet. Sätt KEY_PATH till annan fil eller ta bort befintlig nyckel."
      exit 1
    fi
    echo "$KEY_PATH"
    return
  fi

  mkdir -p "$KEY_DIR"
  chmod 700 "$KEY_DIR"
  info "Skapar deploy-nyckel (ed25519, ingen passphrase): $KEY_PATH"
  ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "github-actions-${VPS_SERVICE}-deploy"
  echo "$KEY_PATH"
}

print_vps_key_instructions() {
  local pub="${KEY_PATH}.pub"
  if [ ! -f "$pub" ]; then
    err "Hittar inte $pub — kör setup utan KEY_PATH eller skapa nyckel först."
    exit 1
  fi

  step "Lägg deploy-nyckeln på VPS"
  cat <<EOF

1) Kopiera denna publika nyckel till VPS (en rad):

$(cat "$pub")

2) På VPS (som ${VPS_USER}), kör:

  ssh ${VPS_USER}@${VPS_HOST}
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  echo '$(cat "$pub")' >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys

3) Sudo utan lösenord för restart (på VPS som root):

  sudo visudo -f /etc/sudoers.d/${VPS_USER}-${VPS_SERVICE}
  # Lägg till exakt:
  ${VPS_USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart ${VPS_SERVICE}

4) Testa från din Mac:

  ssh -i ${KEY_PATH} -p ${VPS_SSH_PORT} ${VPS_USER}@${VPS_HOST} \\
    'echo OK && sudo systemctl restart ${VPS_SERVICE} && sleep 3 && curl -fsS ${VPS_HEALTH_URL}'

EOF
}

test_ssh_deploy_key() {
  if [ ! -f "$KEY_PATH" ]; then
    warn "Ingen privat nyckel på $KEY_PATH — hoppar över SSH-test."
    return 1
  fi
  info "Testar SSH med ${KEY_PATH}…"
  ssh -i "$KEY_PATH" -p "$VPS_SSH_PORT" -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
    "${VPS_USER}@${VPS_HOST}" \
    "echo 'SSH OK' && test -d '${VPS_APP_PATH}' && echo 'App path OK: ${VPS_APP_PATH}'"
}

check_github_config() {
  ensure_gh_auth
  local repo owner name
  repo="$(gh_repo)"
  owner="${repo%%/*}"
  name="${repo#*/}"

  step "GitHub environment: $GH_ENV_NAME"
  if ! gh api "repos/${owner}/${name}/environments/${GH_ENV_NAME}" >/dev/null 2>&1; then
    err "Environment '$GH_ENV_NAME' saknas. Kör: $0 github"
    return 1
  fi
  info "Environment finns."

  local vars
  vars="$(gh api "repos/${owner}/${name}/environments/${GH_ENV_NAME}/variables" -q '.variables[].name' 2>/dev/null || true)"
  for v in VPS_HOST VPS_USER VPS_APP_PATH VPS_RESTART_CMD VPS_HEALTH_URL; do
    if echo "$vars" | grep -qx "$v"; then
      info "  variable $v ✓"
    else
      warn "  variable $v saknas"
    fi
  done

  local secrets
  secrets="$(gh api "repos/${owner}/${name}/environments/${GH_ENV_NAME}/secrets" -q '.secrets[].name' 2>/dev/null || true)"
  if echo "$secrets" | grep -qx VPS_SSH_KEY; then
    info "  secret VPS_SSH_KEY ✓"
  else
    warn "  secret VPS_SSH_KEY saknas"
  fi

  if [ -f ".github/workflows/deploy.yml" ]; then
    info "Workflow .github/workflows/deploy.yml ✓"
  else
    err "Saknar deploy workflow"
    return 1
  fi
}

trigger_deploy_workflow() {
  ensure_gh_auth
  info "Startar workflow_dispatch: Deploy to VPS"
  gh workflow run deploy.yml --ref main
  info "Öppna Actions-fliken för status:"
  gh run list --workflow=deploy.yml --limit 3
}

cmd_check() {
  check_github_config || true
  if [ -f "$KEY_PATH" ]; then
    test_ssh_deploy_key || true
  else
    warn "Lokal testnyckel saknas ($KEY_PATH) — SSH-test hoppas över."
  fi
  step "Nästa steg"
  cat <<EOF
När GitHub env + SSH är grönt:
  • Merge till main  → deploy körs automatiskt
  • Eller: $0 trigger
  • Publik health: \${PROD_URL}/health (lokal på servern: ${VPS_HEALTH_URL})
EOF
}

cmd_vps_key() {
  print_vps_key_instructions
}

cmd_github() {
  local key_file="${1:-}"
  if [ -z "$key_file" ]; then
    if [ -f "$KEY_PATH" ]; then
      key_file="$KEY_PATH"
    else
      err "Ange privat nyckel: KEY_PATH=/path/to/key $0 github"
      exit 1
    fi
  fi
  set_github_vars_and_secret "$key_file"
}

cmd_full_setup() {
  step "1/4 — Förutsättningar"
  need_cmd ssh-keygen
  need_cmd ssh
  need_cmd curl
  ensure_gh_auth
  info "Prod-värden från: $DEPLOY_RULES"
  info "  ${VPS_USER}@${VPS_HOST}  ${VPS_APP_PATH}  service=${VPS_SERVICE}"

  step "2/4 — Deploy-nyckel"
  local key_file
  key_file="$(generate_deploy_key)"
  KEY_PATH="$key_file"

  step "3/4 — VPS (manuellt steg)"
  print_vps_key_instructions
  read -r -p "Har du lagt nyckeln på VPS och testat SSH? [j/N] " done
  if [[ "${done,,}" != "j" && "${done,,}" != "y" ]]; then
    warn "Fortsätt när VPS-steget är klart. Kör sedan: $0 github"
    exit 0
  fi

  test_ssh_deploy_key

  step "4/4 — GitHub environment"
  set_github_vars_and_secret "$key_file"

  read -r -p "Vill du köra en test-deploy nu (workflow_dispatch)? [j/N] " run_now
  if [[ "${run_now,,}" == "j" || "${run_now,,}" == "y" ]]; then
    trigger_deploy_workflow
  fi

  step "Klart"
  cat <<EOF

Automatisk prod-deploy är nu kopplad:

  Cursor Agent → PR → merge till main → GitHub Actions → VPS

Manuell deploy behövs inte längre efter merge till main.
Valfritt: aktivera GitHub auto-merge + Cursor Approval Agent (se docs/VPS-DEPLOY-SETUP.md).

Verifiera:
  $0 check
  gh run watch \$(gh run list --workflow=deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')
EOF
}

main() {
  read_deploy_rules
  local cmd="${1:-}"
  case "$cmd" in
    -h|--help|help) usage ;;
    check)          cmd_check ;;
    github)         shift; cmd_github "${1:-}" ;;
    trigger)        trigger_deploy_workflow ;;
    vps-key)        cmd_vps_key ;;
    "")             cmd_full_setup ;;
    *)
      err "Okänt kommando: $cmd"
      usage
      exit 1
      ;;
  esac
}

main "$@"
