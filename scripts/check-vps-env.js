#!/usr/bin/env node
/**
 * VPS env diagnostic — safe output (no secrets).
 * Usage: cd $VPS_APP_PATH && node scripts/check-vps-env.js
 */
const fs = require('fs');
const path = require('path');
const { loadEnvFile, diagnoseDatabaseUrl } = require('../src/lib/load-env');

const envPath = process.env.ENV_FILE || path.join(process.cwd(), '.env');
console.log('cwd:', process.cwd());
console.log('.env exists:', fs.existsSync(envPath));

const before = process.env.DATABASE_URL;
loadEnvFile();
const after = process.env.DATABASE_URL;

console.log('DATABASE_URL before load:', before === undefined ? '(unset)' : before === '' ? '(empty string)' : '(set)');
console.log('DATABASE_URL after load:', after === undefined ? '(unset)' : after === '' ? '(empty string)' : '(set)');

const diag = diagnoseDatabaseUrl(after);
if (diag.ok) {
  console.log('OK: host =', diag.host, 'database =', diag.database);
} else {
  console.log('FAIL:', diag.code, '-', diag.message);
  process.exit(1);
}
