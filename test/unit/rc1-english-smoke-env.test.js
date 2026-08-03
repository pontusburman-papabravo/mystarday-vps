'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  collectRc1EnglishSmokeEnvIssues,
  formatRc1EnglishSmokeBlockedReason,
  ALWAYS_REQUIRED,
} = require('../../scripts/lib/rc1-english-smoke-env');

function fullEnv(overrides = {}) {
  return {
    RC1_SMOKE_BASE_URL: 'https://example.test',
    RC1_QA_EMAIL: 'rc1-qa-parent@qa-automation.example.se',
    RC1_QA_PASSWORD: 'x',
    RC1_QA_FAMILY_ID: '11111111-1111-1111-1111-111111111111',
    RC1_CHILD_USERNAME: 'rc1qachild',
    RC1_CHILD_PIN: '1111',
    RC1_PARENT_PIN: '2222',
    RC1_EXPECTED_SHA: 'abc123',
    RC1_EXPECTED_CACHE: 'stjarndag-v762',
    ...overrides,
  };
}

describe('rc1-english-smoke-env', () => {
  it('reports ok when full release env is present', () => {
    const report = collectRc1EnglishSmokeEnvIssues(fullEnv(), {
      requireBaseUrl: true,
      requireHandoff: true,
      useQaFixture: true,
    });
    assert.equal(report.ok, true);
    assert.deepEqual(report.missing, []);
    assert.equal(report.requireHandoff, true);
    assert.equal(formatRc1EnglishSmokeBlockedReason(report), null);
  });

  it('lists missing QA secrets without echoing values', () => {
    const report = collectRc1EnglishSmokeEnvIssues(
      fullEnv({
        RC1_QA_EMAIL: '',
        RC1_QA_PASSWORD: undefined,
        RC1_CHILD_PIN: '   ',
      }),
      { requireBaseUrl: true, requireHandoff: true, useQaFixture: true }
    );
    assert.equal(report.ok, false);
    assert.ok(report.missing.includes('RC1_QA_EMAIL'));
    assert.ok(report.missing.includes('RC1_QA_PASSWORD'));
    assert.ok(report.missing.includes('RC1_CHILD_PIN'));
    const reason = formatRc1EnglishSmokeBlockedReason(report);
    assert.match(reason, /BLOCKED/);
    assert.doesNotMatch(reason, /1111|password|@/);
  });

  it('requires RC1_PARENT_PIN only when handoff gate is on', () => {
    const withHandoff = collectRc1EnglishSmokeEnvIssues(
      fullEnv({ RC1_PARENT_PIN: '' }),
      { requireHandoff: true, useQaFixture: true }
    );
    assert.ok(withHandoff.missing.includes('RC1_PARENT_PIN'));

    const without = collectRc1EnglishSmokeEnvIssues(
      fullEnv({ RC1_PARENT_PIN: '', RC1_REQUIRE_HANDOFF: 'false' }),
      { requireHandoff: true, useQaFixture: true }
    );
    assert.ok(!without.missing.includes('RC1_PARENT_PIN'));
    assert.equal(without.requireHandoff, false);
  });

  it('treats E2E_BASE_URL as configured base URL', () => {
    const report = collectRc1EnglishSmokeEnvIssues(
      fullEnv({ RC1_SMOKE_BASE_URL: '', E2E_BASE_URL: 'https://example.test' }),
      { requireBaseUrl: true }
    );
    assert.equal(report.baseUrlConfigured, true);
  });

  it('exports stable always-required names for docs/CI', () => {
    assert.ok(ALWAYS_REQUIRED.includes('RC1_QA_EMAIL'));
    assert.ok(ALWAYS_REQUIRED.includes('RC1_EXPECTED_CACHE'));
  });
});
