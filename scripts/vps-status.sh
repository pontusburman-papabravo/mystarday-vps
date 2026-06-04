#!/usr/bin/env bash
# VPS migrationsstatus — kör på servern för att se vad som är klart.
#
#   cd /var/www/mystarday && ./scripts/vps-status.sh
#   sudo ./scripts/vps-status.sh          # fler systemkontroller
#   ./scripts/vps-status.sh --json        # maskinläsbart (för agent/CI)
#
# Visar aldrig hemligheter — bara om variabler finns och är icke-tomma.
set -uo pipefail

APP_DIR="${APP_DIR:-/var/www/mystarday}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
SERVICE_NAME="${SERVICE_NAME:-mystarday}"
DOMAIN="${DOMAIN:-mystarday.se}"
JSON_MODE=false
[[ "${1:-}" == "--json" ]] && JSON_MODE=true

OK=0
WARN=0
FAIL=0
declare -a ITEMS=()

note() {
  local status="$1" id="$2" msg="$3"
  case "$status" in
    ok) OK=$((OK + 1)); icon="✓" ;;
    warn) WARN=$((WARN + 1)); icon="!" ;;
    fail) FAIL=$((FAIL + 1)); icon="✗" ;;
    *) icon="?" ;;
  esac
  ITEMS+=("${status}|${id}|${msg}")
  if ! $JSON_MODE; then
    printf "  [%s] %s — %s\n" "$icon" "$id" "$msg"
  fi
}

have_cmd() { command -v "$1" >/dev/null 2>&1; }

env_set() {
  local key="$1"
  [[ -f "$ENV_FILE" ]] || return 1
  local line val
  line=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -1) || return 1
  val="${line#*=}"
  val="${val%\"}"; val="${val#\"}"
  val="${val%\'}"; val="${val#\'}"
  [[ -n "${val// }" ]]
}

env_len_at_least() {
  local key="$1" min="$2"
  [[ -f "$ENV_FILE" ]] || return 1
  local line val
  line=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -1) || return 1
  val="${line#*=}"
  val="${val%\"}"; val="${val#\"}"
  [[ ${#val} -ge "$min" ]]
}

run_as_root() {
  [[ "$(id -u)" -eq 0 ]]
}

section() {
  $JSON_MODE || echo ""
  $JSON_MODE || echo "── $1 ──"
}

# ─── Header ───────────────────────────────────────────────────
if ! $JSON_MODE; then
  echo "Min Stjärndag — VPS-status"
  echo "Tid: $(date -Iseconds 2>/dev/null || date)"
  echo "Värd: $(hostname -f 2>/dev/null || hostname)"
  echo "App:  $APP_DIR"
fi

# ─── 1. System ─────────────────────────────────────────────────
section "System & säkerhet"

if [[ -r /etc/os-release ]]; then
  # shellcheck source=/dev/null
  . /etc/os-release
  if [[ "${ID:-}" == "ubuntu" ]]; then
    note ok "os" "Ubuntu ${VERSION_ID:-?}"
  else
    note warn "os" "OS: ${PRETTY_NAME:-okänt} (förväntat Ubuntu 24)"
  fi
else
  note warn "os" "Kunde inte läsa /etc/os-release"
fi

for u in pontus deploy; do
  if id "$u" &>/dev/null; then
    note ok "user_$u" "Användare $u finns"
  else
    note fail "user_$u" "Användare $u saknas"
  fi
done

if [[ -d /home/pontus/.ssh ]] && [[ -f /home/pontus/.ssh/authorized_keys ]]; then
  note ok "ssh_pontus" "pontus har authorized_keys"
else
  note warn "ssh_pontus" "pontus: ingen .ssh/authorized_keys (ännu?)"
fi

if [[ -d /home/deploy/.ssh ]] && [[ -f /home/deploy/.ssh/authorized_keys ]]; then
  note ok "ssh_deploy" "deploy har authorized_keys"
else
  note warn "ssh_deploy" "deploy: ingen .ssh/authorized_keys (ännu?)"
fi

if [[ -r /etc/ssh/sshd_config ]]; then
  if grep -qE '^PermitRootLogin\s+no' /etc/ssh/sshd_config; then
    note ok "ssh_root" "PermitRootLogin no"
  else
    note warn "ssh_root" "PermitRootLogin är inte no"
  fi
  if grep -qE '^PasswordAuthentication\s+no' /etc/ssh/sshd_config; then
    note ok "ssh_password" "PasswordAuthentication no"
  else
    note warn "ssh_password" "Lösenords-SSH kan fortfarande vara på"
  fi
fi

if have_cmd ufw; then
  if ufw status 2>/dev/null | grep -q "Status: active"; then
    note ok "ufw" "UFW aktiv"
  else
    note warn "ufw" "UFW inte aktiv"
  fi
else
  note warn "ufw" "ufw saknas"
fi

if systemctl is-active --quiet fail2ban 2>/dev/null; then
  note ok "fail2ban" "fail2ban körs"
else
  note warn "fail2ban" "fail2ban körs inte"
fi

# ─── 2. Runtime ────────────────────────────────────────────────
section "Runtime (Node, Postgres, nginx)"

if have_cmd node; then
  nv=$(node -v 2>/dev/null | sed 's/v//')
  major="${nv%%.*}"
  if [[ "${major:-0}" -ge 20 ]]; then
    note ok "node" "Node $nv"
  else
    note fail "node" "Node $nv — kräver v20+"
  fi
else
  note fail "node" "Node inte installerat"
fi

if systemctl is-active --quiet postgresql 2>/dev/null; then
  note ok "postgresql" "PostgreSQL-tjänst aktiv"
else
  note fail "postgresql" "PostgreSQL körs inte"
fi

if have_cmd psql && sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='mystarday'" 2>/dev/null | grep -q 1; then
  note ok "db_mystarday" "Databas mystarday finns"
else
  note fail "db_mystarday" "Databas mystarday saknas — kör scripts/postgres-vps-init.sh"
fi

if have_cmd nginx && systemctl is-active --quiet nginx 2>/dev/null; then
  note ok "nginx" "nginx körs"
else
  note warn "nginx" "nginx saknas eller körs inte"
fi

if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  note ok "ssl" "Let's Encrypt-cert för $DOMAIN"
else
  note warn "ssl" "Inget cert under /etc/letsencrypt/live/${DOMAIN}/"
fi

# ─── 3. Appkatalog ─────────────────────────────────────────────
section "App ($APP_DIR)"

if [[ -d "$APP_DIR" ]]; then
  note ok "app_dir" "Katalog finns"
else
  note fail "app_dir" "Katalog saknas — klona mystarday-vps hit"
fi

if [[ -f "$APP_DIR/package.json" ]]; then
  note ok "package_json" "package.json finns"
else
  note fail "package_json" "package.json saknas"
fi

if [[ -d "$APP_DIR/node_modules" ]]; then
  note ok "node_modules" "npm ci körd (node_modules finns)"
else
  note warn "node_modules" "Kör: npm ci"
fi

if [[ -d "$APP_DIR/.git" ]]; then
  branch=$(git -C "$APP_DIR" branch --show-current 2>/dev/null || echo "?")
  note ok "git" "Git repo, branch: $branch"
else
  note warn "git" "Ingen .git — ok om du deployar annorlunda"
fi

# ─── 4. .env ───────────────────────────────────────────────────
section "Miljö (.env)"

if [[ -f "$ENV_FILE" ]]; then
  perms=$(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%OLp' "$ENV_FILE" 2>/dev/null)
  if [[ "$perms" == "600" ]]; then
    note ok "env_file" ".env finns (chmod 600)"
  else
    note warn "env_file" ".env finns men chmod är $perms (bör vara 600)"
  fi
else
  note fail "env_file" ".env saknas i $APP_DIR"
fi

# Kärna (utan Polsia)
for key in NODE_ENV APP_URL JWT_SECRET DATABASE_URL IN_PROCESS_CRONS_ENABLED; do
  if env_set "$key"; then
    note ok "env_$key" "$key satt"
  else
    note fail "env_$key" "$key saknas eller tom"
  fi
done

if env_len_at_least JWT_SECRET 32; then
  note ok "env_jwt_len" "JWT_SECRET ≥ 32 tecken"
else
  note fail "env_jwt_len" "JWT_SECRET för kort (min 32 i prod)"
fi

if env_set DATABASE_URL && [[ "$(grep '^DATABASE_URL=' "$ENV_FILE" | tail -1)" == *localhost* ]]; then
  note ok "env_db_local" "DATABASE_URL pekar på localhost"
elif env_set DATABASE_URL; then
  note warn "env_db_local" "DATABASE_URL är inte localhost (Neon/extern?)"
fi

# Polsia — ska bort
for key in POLSIA_API_KEY POLSIA_API_URL POLSIA_IN_PROCESS_CRONS_ENABLED; do
  if env_set "$key"; then
    note warn "legacy_$key" "$key finns kvar — ta bort (Polsia avvecklas)"
  fi
done

# SMTP
for key in SMTP_HOST SMTP_USER SMTP_PASS; do
  if env_set "$key"; then
    note ok "env_$key" "$key satt"
  else
    note fail "env_$key" "$key saknas (e-post)"
  fi
done

# R2
for key in R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET_NAME R2_PUBLIC_BASE_URL; do
  if env_set "$key"; then
    note ok "env_$key" "$key satt"
  else
    note warn "env_$key" "$key saknas (bilduppladdning)"
  fi
done

# Vanliga prod-tillägg
for key in VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY REVENUECAT_API_KEY REVENUECAT_WEBHOOK_SECRET; do
  if env_set "$key"; then
    note ok "env_$key" "$key satt"
  else
    note warn "env_$key" "$key saknas (push/IAP)"
  fi
done

for key in APNS_KEY_ID APNS_TEAM_ID APNS_BUNDLE_ID; do
  if env_set "$key"; then
    note ok "env_$key" "$key satt"
  else
    note warn "env_$key" "$key saknas (iOS push)"
  fi
done

# ─── 5. Databas-innehåll ───────────────────────────────────────
section "Databas (innehåll)"

if env_set DATABASE_URL && have_cmd psql; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | tail -1 | sed 's/^DATABASE_URL=//' | tr -d '"' | tr -d "'")
  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -tAc "SELECT 1" &>/dev/null; then
    note ok "db_connect" "Anslutning till DATABASE_URL OK"
    families=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM family" 2>/dev/null | tr -d ' ') || families=""
    if [[ -n "$families" && "$families" -gt 0 ]]; then
      note ok "db_families" "$families familjer i databasen (import klar?)"
    else
      note warn "db_families" "0 familjer — kör migrate + import?"
    fi
    if psql "$DATABASE_URL" -tAc "SELECT to_regclass('public.daily_log')" 2>/dev/null | grep -q daily_log; then
      note ok "db_schema" "Tabell daily_log finns (schema/migrate)"
    else
      note fail "db_schema" "Schema saknas — kör npm run build"
    fi
  else
    note fail "db_connect" "Kunde inte ansluta med DATABASE_URL"
  fi
  unset DATABASE_URL 2>/dev/null || true
else
  note warn "db_connect" "Hoppar över DB-test (saknar psql eller DATABASE_URL)"
fi

# ─── 6. Tjänster & hälsa ───────────────────────────────────────
section "App-tjänst & hälsa"

if systemctl list-unit-files 2>/dev/null | grep -q "^${SERVICE_NAME}.service"; then
  if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    note ok "systemd" "$SERVICE_NAME körs"
  else
    note fail "systemd" "$SERVICE_NAME finns men körs inte"
  fi
else
  note fail "systemd" "$SERVICE_NAME.service saknas — kopiera deploy/mystarday.service"
fi

if curl -sf --max-time 5 "http://127.0.0.1:3000/health" >/dev/null 2>&1; then
  note ok "health_local" "GET http://127.0.0.1:3000/health OK"
else
  note fail "health_local" "App svarar inte på :3000/health"
fi

if curl -sf --max-time 8 "https://${DOMAIN}/health" >/dev/null 2>&1; then
  note ok "health_public" "GET https://${DOMAIN}/health OK"
else
  note warn "health_public" "https://${DOMAIN}/health nås inte (DNS/nginx/SSL?)"
fi

# DNS mot denna maskin
if have_cmd dig; then
  resolved=$(dig +short A "$DOMAIN" 2>/dev/null | head -1)
  local_ip=$(curl -sf --max-time 3 https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
  if [[ -n "$resolved" && -n "$local_ip" ]]; then
    if [[ "$resolved" == "$local_ip" ]]; then
      note ok "dns" "$DOMAIN → $resolved (denna server)"
    else
      note warn "dns" "$DOMAIN → $resolved (server utåt: $local_ip)"
    fi
  fi
fi

# ─── Sammanfattning ─────────────────────────────────────────────
TOTAL=$((OK + WARN + FAIL))

if $JSON_MODE; then
  printf '{"ok":%s,"warn":%s,"fail":%s,"total":%s,"app_dir":"%s","items":[' "$OK" "$WARN" "$FAIL" "$TOTAL" "$APP_DIR"
  first=true
  for item in "${ITEMS[@]}"; do
    IFS='|' read -r st id msg <<< "$item"
    $first || printf ','
    first=false
    printf '{"status":"%s","id":"%s","message":%s}' "$st" "$id" "$(printf '%s' "$msg" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo "\"$msg\"")"
  done
  printf ']}\n'
  exit $([[ "$FAIL" -eq 0 ]] && echo 0 || echo 1)
fi

echo ""
echo "════════════════════════════════════════"
echo "  ✓ $OK klart   ! $WARN att kolla   ✗ $FAIL saknas"
echo "════════════════════════════════════════"

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "Prioriterat nästa steg:"
  for item in "${ITEMS[@]}"; do
    IFS='|' read -r st id msg <<< "$item"
    [[ "$st" == "fail" ]] && echo "  • $msg"
  done
fi

if [[ "$WARN" -gt 0 ]]; then
  echo ""
  echo "Rekommenderat (varningar):"
  for item in "${ITEMS[@]}"; do
    IFS='|' read -r st id msg <<< "$item"
    [[ "$st" == "warn" ]] && echo "  • $msg"
  done
fi

echo ""
echo "Klistra in hela denna utskrift om du vill att agenten ska veta var ni är."
echo "JSON: ./scripts/vps-status.sh --json"
echo ""

exit $([[ "$FAIL" -eq 0 ]] && echo 0 || echo 1)
