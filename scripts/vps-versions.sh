#!/usr/bin/env bash
# Runtime- och beroendeversioner för Min Stjärndag på VPS.
#
#   cd /var/www/mystarday && ./scripts/vps-versions.sh
#   ./scripts/vps-versions.sh --json
#
# Visar inga hemligheter (.env-värden).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
SERVICE_NAME="${SERVICE_NAME:-mystarday}"
JSON_MODE=false
[[ "${1:-}" == "--json" ]] && JSON_MODE=true

declare -a ROWS=()

row() {
  local component="$1" version="$2" note="${3:-}"
  ROWS+=("${component}|${version}|${note}")
  if ! $JSON_MODE; then
    printf "  %-28s %s" "$component" "$version"
    [[ -n "$note" ]] && printf "  (%s)" "$note"
    printf "\n"
  fi
}

section() {
  $JSON_MODE || { echo ""; echo "── $1 ──"; }
}

have_cmd() { command -v "$1" >/dev/null 2>&1; }

ver_cmd() {
  local label="$1"
  shift
  if have_cmd "$1"; then
    local out
    out=$("$@" 2>/dev/null | head -1 | tr -d '\r')
    row "$label" "${out:-ok}"
  else
    row "$label" "—" "saknas"
  fi
}

service_version() {
  local label="$1" unit="$2"
  if have_cmd systemctl && systemctl list-unit-files "$unit" &>/dev/null; then
    local state active
    state=$(systemctl is-active "$unit" 2>/dev/null || echo unknown)
    active=$(systemctl show "$unit" -p ActiveEnterTimestamp --value 2>/dev/null || true)
    row "$label" "$state" "${active:-systemd}"
  else
    row "$label" "—" "enhet saknas"
  fi
}

npm_pkg_version() {
  local pkg="$1"
  local pkg_path="$APP_DIR/node_modules/$pkg"
  if [[ -d "$pkg_path" ]]; then
    node -e "
      try {
        const p = require(process.argv[1] + '/package.json');
        console.log(p.version);
      } catch { process.exit(1); }
    " "$pkg_path" 2>/dev/null || echo "?"
  else
    echo "—"
  fi
}

# ─── Header ───────────────────────────────────────────────────
if ! $JSON_MODE; then
  echo "Min Stjärndag — runtime-versioner"
  echo "Tid:  $(date -Iseconds 2>/dev/null || date)"
  echo "Värd: $(hostname -f 2>/dev/null || hostname)"
  echo "App:  $APP_DIR"
fi

# ─── OS / kernel ──────────────────────────────────────────────
section "Operativsystem"

if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  row "Linux" "${PRETTY_NAME:-$NAME}" "kernel $(uname -r)"
else
  row "Linux" "$(uname -s) $(uname -r)"
fi

row "Architecture" "$(uname -m)"
if have_cmd lsb_release; then
  ver_cmd "lsb_release" lsb_release -ds
fi

# ─── Node / npm ───────────────────────────────────────────────
section "Node.js (app)"

expected_node=""
[[ -f "$APP_DIR/.nvmrc" ]] && expected_node=$(tr -d '[:space:]' < "$APP_DIR/.nvmrc")

if have_cmd node; then
  node_v=$(node -v 2>/dev/null | tr -d 'v')
  note=""
  [[ -n "$expected_node" ]] && note="förväntat major ${expected_node}.x (.nvmrc)"
  row "node" "v${node_v}" "$note"
else
  row "node" "—" "saknas"
fi

ver_cmd "npm" npm -v

if [[ -f "$APP_DIR/package.json" ]]; then
  app_pkg=$(node -e "console.log(require('${APP_DIR}/package.json').version)" 2>/dev/null || echo "?")
  row "package.json" "v${app_pkg}"
fi

if [[ -d "$APP_DIR/node_modules" ]]; then
  lock_age="installerad"
  [[ -f "$APP_DIR/package-lock.json" ]] && lock_age="lockfile $(stat -c %y "$APP_DIR/package-lock.json" 2>/dev/null | cut -d' ' -f1 || echo '?')"
  row "node_modules" "finns" "$lock_age"
else
  row "node_modules" "—" "kör npm ci"
fi

# ─── PostgreSQL ───────────────────────────────────────────────
section "PostgreSQL"

ver_cmd "psql (client)" psql --version

if have_cmd postgres; then
  ver_cmd "postgres (server)" postgres --version
elif [[ -d /etc/postgresql ]]; then
  pg_ver=$(find /etc/postgresql -maxdepth 1 -mindepth 1 -type d -printf '%f\n' 2>/dev/null | sort -V | tail -1)
  row "postgresql (deb)" "${pg_ver:-?}" "/etc/postgresql"
fi

service_version "postgresql.service" "postgresql.service"

if [[ -f "$ENV_FILE" ]] && have_cmd psql; then
  db_url=$(grep -E '^DATABASE_URL=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d "'\"")
  if [[ -n "$db_url" ]]; then
    if pg_ver=$(psql "$db_url" -tAc "SELECT version();" 2>/dev/null | head -1); then
      row "DB server (via app)" "$(echo "$pg_ver" | sed 's/PostgreSQL /PostgreSQL /' | cut -c1-60)…"
    else
      row "DB server (via app)" "—" "anslutning misslyckades"
    fi
    if ext=$(psql "$db_url" -tAc "SELECT extversion FROM pg_extension WHERE extname='pgcrypto';" 2>/dev/null); then
      [[ -n "$ext" ]] && row "pgcrypto" "v${ext}" || row "pgcrypto" "—" "extension saknas"
    fi
    if families=$(psql "$db_url" -tAc "SELECT COUNT(*) FROM family;" 2>/dev/null); then
      row "family (rader)" "$families"
    fi
  fi
fi

# ─── Web / SSL ────────────────────────────────────────────────
section "Webb & SSL"

service_version "httpd (Apache)" "httpd.service"
ver_cmd "httpd -v" httpd -v
service_version "nginx" "nginx.service"
ver_cmd "nginx -v" nginx -v
ver_cmd "certbot" certbot --version
ver_cmd "openssl" openssl version

if have_cmd curl; then
  health=$(curl -sf --max-time 3 "http://127.0.0.1:3000/health" 2>/dev/null || true)
  if [[ -n "$health" ]]; then
    app_ver=$(echo "$health" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).version||'?')}catch{console.log('?')}})" 2>/dev/null || echo "?")
    row "app /health (lokal)" "v${app_ver}" "$health"
  else
    row "app /health (lokal)" "—" "svarar inte på :3000"
  fi
fi

service_version "mystarday.service" "${SERVICE_NAME}.service"

# ─── Hosting (DirectAdmin) ────────────────────────────────────
section "Hosting (valfritt)"

if [[ -x /usr/local/directadmin/directadmin ]]; then
  da_ver=$(/usr/local/directadmin/directadmin v 2>/dev/null | head -1 || echo "?")
  row "DirectAdmin" "$da_ver"
else
  row "DirectAdmin" "—" "ej installerad"
fi

service_version "directadmin" "directadmin.service"
ver_cmd "php" php -v
service_version "mysqld" "mysqld.service"
ver_cmd "mysql" mysql --version

# ─── npm dependencies (installerade) ──────────────────────────
section "npm-paket (installerade i node_modules)"

if [[ -d "$APP_DIR/node_modules" ]]; then
  for pkg in express pg pino nodemailer stripe web-push "@aws-sdk/client-s3" zod jsonwebtoken; do
    v=$(npm_pkg_version "$pkg")
    row "npm:$pkg" "v${v}"
  done
else
  row "npm dependencies" "—" "node_modules saknas"
fi

# ─── Git ──────────────────────────────────────────────────────
section "Git (deploy)"

if [[ -d "$APP_DIR/.git" ]]; then
  branch=$(git -C "$APP_DIR" branch --show-current 2>/dev/null || echo "?")
  commit=$(git -C "$APP_DIR" log -1 --oneline 2>/dev/null || echo "?")
  row "branch" "$branch"
  row "senaste commit" "$commit"
else
  row "git" "—" "ingen repo"
fi

# ─── JSON output ──────────────────────────────────────────────
if $JSON_MODE; then
  export APP_DIR
  node -e "
    const rows = process.argv.slice(1).map(r => {
      const [component, version, note = ''] = r.split('|');
      return { component, version, note };
    });
    console.log(JSON.stringify({
      host: require('os').hostname(),
      app_dir: process.env.APP_DIR || '/var/www/mystarday',
      items: rows,
    }, null, 2));
  " "${ROWS[@]}"
fi
