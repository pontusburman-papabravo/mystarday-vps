'use strict';

/**
 * Fail-closed guard for destructive integration test / gate database use.
 * localhost is NEVER sufficient proof of safety on VPS prod hosts. <!-- pragma: allowlist secret -->
 */

const { createRequire } = require('module');
const {
  databaseNameFromUrl,
  isDisposableTestDatabaseName,
} = require('../../test/helpers/database-branch-guard.js');

const requireMjs = createRequire(__filename);
const { databaseIdentityHash } = requireMjs('../ops/lib/database-identity.mjs');

const REFUSED_CODE = 'REFUSED_PRODUCTION_DATABASE_FOR_TESTS'; // pragma: allowlist secret

function normalizeDatabaseUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.trim());
    const db = decodeURIComponent((parsed.pathname || '').replace(/^\//, '') || '');
    const user = decodeURIComponent(parsed.username || '');
    const host = (parsed.hostname || '').toLowerCase();
    const port = parsed.port || '5432';
    return `${host}:${port}/${db}?user=${user}`;
  } catch {
    return url.trim();
  }
}

/** host + port + database — credentials/user are NOT part of physical identity. */
function physicalDatabaseKey(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.trim());
    const db = decodeURIComponent((parsed.pathname || '').replace(/^\//, '') || '');
    const host = (parsed.hostname || '').toLowerCase();
    const port = parsed.port || '5432';
    if (!host || !db) return '';
    return `${host}:${port}/${db}`;
  } catch {
    return '';
  }
}

function identityHashSafe(url) {
  try {
    return databaseIdentityHash(url);
  } catch {
    return null;
  }
}

function sanitizeMeta(url) {
  const database = databaseNameFromUrl(url);
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    host = 'invalid';
  }
  return {
    host,
    database,
    physical: physicalDatabaseKey(url),
    identity_hash: identityHashSafe(url),
  };
}

/**
 * Original application DB target (A), never the post-validation mapped DATABASE_URL (C).
 */
function resolveApplicationDatabaseUrl(env = process.env) {
  const explicit = String(env.APPLICATION_DATABASE_URL || '').trim();
  if (explicit) return explicit;

  const databaseUrl = String(env.DATABASE_URL || '').trim();
  const testUrl = String(env.TEST_DATABASE_URL || '').trim();
  if (!databaseUrl) return '';

  if (
    env.TEST_DATABASE_VALIDATED === '1'
    && testUrl
    && physicalDatabaseKey(databaseUrl) === physicalDatabaseKey(testUrl)
  ) {
    return '';
  }

  return databaseUrl;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ testDatabaseUrl: string, meta: object, applicationDatabaseUrl: string }}
 */
function assertDestructiveTestDatabaseAllowed(env = process.env) {
  const testUrl = String(env.TEST_DATABASE_URL || '').trim();
  const applicationUrl = resolveApplicationDatabaseUrl(env);
  const reasons = [];

  if (!testUrl) {
    const err = new Error('TEST_DATABASE_URL is required for destructive test database access');
    err.code = REFUSED_CODE;
    err.reason = 'missing_test_database_url';
    throw err;
  }

  if (env.TEST_DB_DESTRUCTIVE_CONFIRM !== '1') {
    const err = new Error('TEST_DB_DESTRUCTIVE_CONFIRM=1 is required for destructive test database access');
    err.code = REFUSED_CODE;
    err.reason = 'missing_destructive_confirm';
    throw err;
  }

  if (env.APP_DEPLOY_PRODUCTION === '1') { // pragma: allowlist secret
    reasons.push('app_deploy_prod'); // pragma: allowlist secret
  }

  const protectedName = String(env.PROTECTED_DATABASE_NAME || '').trim();
  const testDbName = databaseNameFromUrl(testUrl);
  if (protectedName && testDbName === protectedName) {
    reasons.push('protected_database_name');
  }

  const appPhysical = applicationUrl ? physicalDatabaseKey(applicationUrl) : '';
  const testPhysical = physicalDatabaseKey(testUrl);
  if (appPhysical && testPhysical && appPhysical === testPhysical) {
    reasons.push('test_url_same_physical_database_as_application');
  }

  if (!isDisposableTestDatabaseName(testDbName)) {
    reasons.push('database_name_not_disposable');
  }

  const expectedHash = String(env.EXPECTED_DATABASE_IDENTITY_HASH || '').trim();
  const testHash = identityHashSafe(testUrl);
  if (expectedHash && testHash === expectedHash) {
    reasons.push('matches_expected_prod_identity_hash'); // pragma: allowlist secret
  }

  if (applicationUrl) {
    const appHash = identityHashSafe(applicationUrl);
    if (expectedHash && appHash === expectedHash && appPhysical !== testPhysical) {
      if (!testDbName || testDbName === databaseNameFromUrl(applicationUrl)) {
        reasons.push('application_database_is_prod_identity');
      }
    }
  }

  if (reasons.length) {
    const err = new Error(
      `Refused destructive test database access (${reasons.join(', ')})`
    );
    err.code = REFUSED_CODE;
    err.reason = reasons[0];
    err.reasons = reasons;
    err.meta = {
      test: sanitizeMeta(testUrl),
      application: applicationUrl ? sanitizeMeta(applicationUrl) : null,
    };
    throw err;
  }

  return {
    testDatabaseUrl: testUrl,
    applicationDatabaseUrl: applicationUrl,
    meta: sanitizeMeta(testUrl),
  };
}

function tryAssertDestructiveTestDatabaseAllowed(env = process.env) {
  try {
    const result = assertDestructiveTestDatabaseAllowed(env);
    return { ok: true, ...result };
  } catch (err) {
    return {
      ok: false,
      code: err.code || REFUSED_CODE,
      reason: err.reason || err.message,
      reasons: err.reasons || [err.reason || err.message],
      meta: err.meta || null,
    };
  }
}

function buildDestructiveTestChildEnv(env = process.env, extra = {}) {
  const merged = { ...env, ...extra };
  const originalApplicationUrl = resolveApplicationDatabaseUrl(merged);

  const validationEnv = { ...merged };
  if (originalApplicationUrl) {
    validationEnv.APPLICATION_DATABASE_URL = originalApplicationUrl;
  }

  const { testDatabaseUrl } = assertDestructiveTestDatabaseAllowed(validationEnv);

  const out = {
    ...merged,
    TEST_DATABASE_URL: testDatabaseUrl,
    DATABASE_URL: testDatabaseUrl,
    TEST_DATABASE_VALIDATED: '1',
    NODE_ENV: 'test', // pragma: allowlist secret
  };

  if (originalApplicationUrl) {
    out.APPLICATION_DATABASE_URL = originalApplicationUrl;
  }

  return out;
}

function gateDestructiveTestDatabaseCheck(env = process.env) {
  const result = tryAssertDestructiveTestDatabaseAllowed(env);
  if (result.ok) {
    return {
      status: 'PASS',
      evidence: {
        testDatabaseUrl: result.testDatabaseUrl,
        meta: result.meta,
      },
    };
  }
  return {
    status: 'BLOCKER',
    evidence: {
      code: result.code,
      reason: result.reason,
      reasons: result.reasons,
      meta: result.meta,
    },
  };
}

module.exports = {
  REFUSED_CODE,
  assertDestructiveTestDatabaseAllowed,
  tryAssertDestructiveTestDatabaseAllowed,
  buildDestructiveTestChildEnv,
  gateDestructiveTestDatabaseCheck,
  normalizeDatabaseUrl,
  physicalDatabaseKey,
  resolveApplicationDatabaseUrl,
  sanitizeMeta,
  identityHashSafe,
};
