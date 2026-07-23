#!/usr/bin/env node
'use strict';

/**
 * Audit P0/P1 product files for hardcoded Swedish strings.
 * Report-only by default; pass --strict to exit 1 on matches.
 *
 * Usage: node scripts/audit-hardcoded-swedish.mjs [--strict]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STRICT = process.argv.includes('--strict');

const SWEDISH_RE = /[åäöÅÄÖ]/;

const P0_FILES = [
  'public/js/i18n.js',
  'public/js/locale-switcher.js',
  'public/js/auth.js',
  'public/js/child-login.js',
  'public/login.html',
  'public/register.html',
  'public/child-login.html',
  'public/forgot-password.html',
  'public/reset-password.html',
  'public/verify-email.html',
  'public/onboarding.html',
  'src/routes/auth/register.js',
  'src/routes/auth/login.js',
  'src/lib/email.js',
];

const ALLOWLIST_PATTERNS = [
  /förälder/i,
  /pragma:/,
  /console\./,
  /\/\//,
  /family_role/,
  /mamma|pappa|bonus/,
];

function shouldIgnore(line) {
  return ALLOWLIST_PATTERNS.some((re) => re.test(line));
}

function auditFile(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return [];
  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  const hits = [];
  lines.forEach((line, idx) => {
    if (!SWEDISH_RE.test(line)) return;
    if (shouldIgnore(line)) return;
    hits.push({ file: relPath, line: idx + 1, text: line.trim().slice(0, 120) });
  });
  return hits;
}

const allHits = P0_FILES.flatMap(auditFile);

if (allHits.length === 0) {
  console.log('[audit-hardcoded-swedish] P0 files: no Swedish characters found.');
  process.exit(0);
}

console.log(`[audit-hardcoded-swedish] ${allHits.length} potential Swedish strings in P0 files:\n`);
for (const h of allHits) {
  console.log(`${h.file}:${h.line}: ${h.text}`);
}

process.exit(STRICT && allHits.length > 0 ? 1 : 0);
