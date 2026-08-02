#!/usr/bin/env node
/**
 * Abort if DATABASE_URL is missing or points at a non-disposable / production database.
 * Usage: node scripts/assert-disposable-database.mjs
 * Env: INTEGRITY_REVIEW_DB_NAME — required unique database name for this run.
 */
import { URL } from 'node:url';

const urlRaw = process.env.DATABASE_URL;
const requiredDb = process.env.INTEGRITY_REVIEW_DB_NAME;

if (!urlRaw || !String(urlRaw).trim()) {
  console.error('[db-guard] DATABASE_URL is required');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(urlRaw);
} catch {
  console.error('[db-guard] DATABASE_URL is not a valid URL');
  process.exit(1);
}

const host = (parsed.hostname || '').toLowerCase();
const dbName = decodeURIComponent(parsed.pathname || '').replace(/^\//, '');

const blockedHosts = [
  'neon.tech',
  'supabase.co',
  'render.com',
  'amazonaws.com',
  'rds.amazonaws.com',
];

const allowedHosts = new Set(['localhost', '127.0.0.1', '::1']);

const hostAllowed =
  allowedHosts.has(host) ||
  host.endsWith('.localhost') ||
  process.env.DB_GUARD_ALLOW_HOST === host;

if (!hostAllowed) {
  for (const suffix of blockedHosts) {
    if (host === suffix || host.endsWith('.' + suffix)) {
      console.error('[db-guard] Refusing managed/production host:', host);
      process.exit(1);
    }
  }
  if (process.env.DB_GUARD_ALLOW_HOST !== host) {
    console.error(
      '[db-guard] Host not allowlisted for disposable tests:',
      host,
      '(set DB_GUARD_ALLOW_HOST only for isolated CI)'
    );
    process.exit(1);
  }
}

if (requiredDb) {
  if (dbName !== requiredDb) {
    console.error(
      `[db-guard] DATABASE_URL database must be ${requiredDb}, got ${dbName || '(empty)'}`
    );
    process.exit(1);
  }
} else if (!dbName.includes('integrity_review_') && !/^stjarndag_test/i.test(dbName)) {
  if (process.env.NODE_ENV === 'test' && (dbName === 'stjarndag' || dbName.includes('cursor'))) {
    // Cloud agent default DB — require explicit INTEGRITY_REVIEW_DB_NAME for integrity runs
    if (process.env.REQUIRE_INTEGRITY_DB_NAME === '1') {
      console.error(
        '[db-guard] Set INTEGRITY_REVIEW_DB_NAME to a unique disposable database for this mission'
      );
      process.exit(1);
    }
  }
}

const secretMarkers = [
  process.env.RESEND_API_KEY,
  process.env.REVENUECAT_WEBHOOK_SECRET,
  process.env.REVENUECAT_SECRET_API_KEY,
  process.env.R2_SECRET_ACCESS_KEY,
].filter(Boolean);

if (process.env.DB_GUARD_FAIL_ON_PROD_SECRETS === '1' && secretMarkers.length > 0) {
  console.error('[db-guard] Production integration secrets must be unset for this run');
  process.exit(1);
}

console.error('[db-guard] OK — disposable database', dbName, 'on', host);
