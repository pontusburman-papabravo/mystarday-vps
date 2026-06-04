#!/usr/bin/env bash
# Engångs-setup: PostgreSQL-databas och app-användare på VPS.
# Kör: sudo ./scripts/postgres-vps-init.sh
set -euo pipefail

DB_NAME="${DB_NAME:-mystarday}"
DB_USER="${DB_USER:-mystarday_app}"
DB_APP_PASSWORD="${DB_APP_PASSWORD:-$(openssl rand -base64 24)}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Kör med sudo: sudo $0" >&2
  exit 1
fi

if ! command -v psql >/dev/null; then
  apt-get update
  apt-get install -y postgresql postgresql-contrib
fi

systemctl enable --now postgresql

PG_CONF=$(find /etc/postgresql -name postgresql.conf 2>/dev/null | head -1)
if [[ -n "$PG_CONF" ]]; then
  sed -i "s/^#*listen_addresses.*/listen_addresses = 'localhost'/" "$PG_CONF"
  systemctl reload postgresql 2>/dev/null || systemctl restart postgresql
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_APP_PASSWORD}';"
else
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER ROLE ${DB_USER} PASSWORD '${DB_APP_PASSWORD}';"
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
fi

sudo -u postgres psql -d "${DB_NAME}" -v ON_ERROR_STOP=1 <<SQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
SQL

echo ""
echo "PostgreSQL klar."
echo "Lägg i /var/www/mystarday/.env:"
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_APP_PASSWORD}@localhost:5432/${DB_NAME}"
echo ""
echo "Spara lösenordet — det visas inte igen."
