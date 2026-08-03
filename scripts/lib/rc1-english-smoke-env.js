'use strict';

/**
 * Pure env validation for English RC-1 / RC smoke runners.
 * Keeps secret values out of return payloads — only names and presence.
 */

/** Exit code when smoke cannot run (secrets/deploy contract missing). Not a test PASS. */
const RC1_SMOKE_BLOCKED_EXIT_CODE = 2;

const ALWAYS_REQUIRED = Object.freeze([
  'RC1_QA_EMAIL',
  'RC1_QA_PASSWORD',
  'RC1_CHILD_USERNAME',
  'RC1_CHILD_PIN',
  'RC1_EXPECTED_SHA',
  'RC1_EXPECTED_CACHE',
]);

/**
 * @param {string} raw
 * @returns {{ ok: true, normalized: string } | { ok: false, code: string, message: string }}
 */
function validateSmokeBaseUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return { ok: false, code: 'RC1_SMOKE_BASE_URL_MISSING', message: 'RC1_SMOKE_BASE_URL (or E2E_BASE_URL) is empty' };
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, code: 'RC1_SMOKE_BASE_URL_INVALID', message: 'RC1_SMOKE_BASE_URL is not a valid URL' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      code: 'RC1_SMOKE_BASE_URL_PROTOCOL',
      message: 'RC1_SMOKE_BASE_URL must use http or https',
    };
  }
  if (parsed.username || parsed.password) {
    return {
      ok: false,
      code: 'RC1_SMOKE_BASE_URL_CREDENTIALS',
      message: 'RC1_SMOKE_BASE_URL must not embed credentials (use secrets, not URL userinfo)',
    };
  }
  const normalized = `${parsed.origin}`;
  return { ok: true, normalized };
}

/**
 * @param {string} expectedBaseUrl
 * @param {string} actualUrl
 */
function assertSmokeUrlSameHost(expectedBaseUrl, actualUrl) {
  const expected = validateSmokeBaseUrl(expectedBaseUrl);
  if (!expected.ok) {
    const err = new Error(expected.message);
    err.code = expected.code;
    throw err;
  }
  let actual;
  try {
    actual = new URL(actualUrl);
  } catch {
    const err = new Error('RC1 smoke redirect: actual URL is not valid');
    err.code = 'RC1_SMOKE_REDIRECT_INVALID';
    throw err;
  }
  if (actual.host !== new URL(expected.normalized).host) {
    const err = new Error(
      `RC1 smoke redirect host mismatch (expected ${new URL(expected.normalized).host}, got ${actual.host})`
    );
    err.code = 'RC1_SMOKE_REDIRECT_HOST_MISMATCH';
    throw err;
  }
}

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} env
 * @param {{
 *   requireHandoff?: boolean,
 *   useQaFixture?: boolean,
 *   requireBaseUrl?: boolean,
 * }} [opts]
 * @returns {{
 *   ok: boolean,
 *   missing: string[],
 *   present: string[],
 *   baseUrlConfigured: boolean,
 *   requireHandoff: boolean,
 * }}
 */
function collectRc1EnglishSmokeEnvIssues(env, opts = {}) {
  const requireHandoff = opts.requireHandoff !== false
    && env.RC1_REQUIRE_HANDOFF !== 'false'
    && env.RC1_REQUIRE_HANDOFF !== '0';
  const useQaFixture = opts.useQaFixture !== false && env.RC1_USE_QA_FIXTURE !== '0';
  const requireBaseUrl = opts.requireBaseUrl === true;

  const required = [...ALWAYS_REQUIRED];
  if (requireBaseUrl) {
    required.unshift('RC1_SMOKE_BASE_URL');
  }
  if (useQaFixture) {
    required.push('RC1_QA_FAMILY_ID');
  }
  if (requireHandoff) {
    required.push('RC1_PARENT_PIN');
  }

  const missing = [];
  const present = [];
  for (const key of required) {
    const value = env[key];
    if (value == null || String(value).trim() === '') {
      missing.push(key);
    } else {
      present.push(key);
    }
  }

  // BASE_URL may also come from E2E_BASE_URL — treat as configured for reporting
  const baseUrlConfigured = Boolean(
    (env.RC1_SMOKE_BASE_URL && String(env.RC1_SMOKE_BASE_URL).trim())
    || (env.E2E_BASE_URL && String(env.E2E_BASE_URL).trim())
  );

  if (requireBaseUrl && !baseUrlConfigured && !missing.includes('RC1_SMOKE_BASE_URL')) {
    missing.push('RC1_SMOKE_BASE_URL');
  }

  return {
    ok: missing.length === 0 && (!requireBaseUrl || baseUrlConfigured),
    missing,
    present,
    baseUrlConfigured,
    requireHandoff,
  };
}

/**
 * Human-readable blocked reason without secret values.
 * @param {ReturnType<typeof collectRc1EnglishSmokeEnvIssues>} report
 */
function formatRc1EnglishSmokeBlockedReason(report) {
  if (report.ok) return null;
  if (!report.baseUrlConfigured) {
    return 'BLOCKED: missing RC1_SMOKE_BASE_URL (or E2E_BASE_URL) — prod browser evidence not runnable';
  }
  if (report.missing.length) {
    return `BLOCKED: missing required RC1 secrets/config: ${report.missing.join(', ')}`;
  }
  return 'BLOCKED: RC1 English smoke environment incomplete';
}

module.exports = {
  RC1_SMOKE_BLOCKED_EXIT_CODE,
  ALWAYS_REQUIRED,
  collectRc1EnglishSmokeEnvIssues,
  formatRc1EnglishSmokeBlockedReason,
  validateSmokeBaseUrl,
  assertSmokeUrlSameHost,
};
