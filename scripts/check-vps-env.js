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

function envStatus(key) {
  const v = process.env[key];
  if (v === undefined) return '(unset)';
  if (v === '') return '(empty string)';
  return '(set)';
}

console.log('ACTIVATION_PROGRAM_LAUNCH_AT:', envStatus('ACTIVATION_PROGRAM_LAUNCH_AT'));
console.log('ACTIVATION_PROGRAM_ENABLED:', envStatus('ACTIVATION_PROGRAM_ENABLED'));

const sha256 = process.env.ANDROID_SHA256_CERT_FINGERPRINT;
if (!sha256 || !sha256.trim()) {
  console.log('WARN: ANDROID_SHA256_CERT_FINGERPRINT is unset — assetlinks.json serves web fallback (Google App Links will fail)');
} else {
  const parts = sha256.split(',').map((s) => s.trim()).filter(Boolean);
  console.log('OK: ANDROID_SHA256_CERT_FINGERPRINT has', parts.length, 'fingerprint(s)');
}
