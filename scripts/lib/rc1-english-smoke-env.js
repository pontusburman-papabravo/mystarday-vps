'use strict';

/**
 * Pure env validation for English RC-1 / RC smoke runners.
 * Keeps secret values out of return payloads — only names and presence.
 */

const ALWAYS_REQUIRED = Object.freeze([
  'RC1_QA_EMAIL',
  'RC1_QA_PASSWORD',
  'RC1_CHILD_USERNAME',
  'RC1_CHILD_PIN',
  'RC1_EXPECTED_SHA',
  'RC1_EXPECTED_CACHE',
]);

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
  ALWAYS_REQUIRED,
  collectRc1EnglishSmokeEnvIssues,
  formatRc1EnglishSmokeBlockedReason,
};
