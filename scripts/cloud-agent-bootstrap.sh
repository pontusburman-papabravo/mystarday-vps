#!/usr/bin/env bash
# Bootstrap local PostgreSQL role + database from DATABASE_URL (Cursor Cloud Agent).
# Run after pg_ctlcluster start and before npm run migrate.
set -euo pipefail

fail() {
  printf 'cloud-agent-bootstrap: %s\n' "$*" >&2
  exit 1
}

if [ -z "${DATABASE_URL:-}" ]; then
  fail 'DATABASE_URL is not set. Add it in Cursor → Cloud Agents → Secrets.'
fi

node - <<'NODE'
const { execFileSync } = require('child_process');

const url = process.env.DATABASE_URL;
if (!url) process.exit(1);

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error('cloud-agent-bootstrap: DATABASE_URL is not a valid URL');
  process.exit(1);
}

const user = decodeURIComponent(parsed.username || '');
const password = decodeURIComponent(parsed.password || '');
const db = decodeURIComponent((parsed.pathname || '').replace(/^\//, ''));

if (!user || !password || !db) {
  console.error('cloud-agent-bootstrap: DATABASE_URL must include user, password, and database name');
  process.exit(1);
}

if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) {
  console.error('cloud-agent-bootstrap: expected localhost DATABASE_URL for Cloud Agent dev DB');
  process.exit(1);
}

function psql(sql) {
  execFileSync('sudo', ['-u', 'postgres', 'psql', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    stdio: 'inherit',
  });
}

const esc = (value) => value.replace(/'/g, "''");

psql(
  `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${esc(user)}') THEN CREATE ROLE "${user}" LOGIN PASSWORD '${esc(password)}' SUPERUSER; ELSE ALTER ROLE "${user}" WITH LOGIN PASSWORD '${esc(password)}' SUPERUSER; END IF; END $$;`
);

try {
  execFileSync('sudo', ['-u', 'postgres', 'createdb', '-O', user, db], { stdio: 'inherit' });
} catch {
  // Database already exists on recycled VMs.
}

console.log('cloud-agent-bootstrap: role and database ready');
NODE
