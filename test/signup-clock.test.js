'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  TEST_SIGNUP_COHORT_ISO,
  signupCohortAt,
  signupNow,
} = require('../src/lib/signup-clock');
const { swedenUsesProductTrial, SWEDEN_TRIAL_FROM_ISO } = require('../src/lib/market-commercial-policy');

const SWEDEN_TRIAL_FROM_MS = new Date(SWEDEN_TRIAL_FROM_ISO).getTime();
const LIFETIME_FREE_UNTIL_MS = new Date('2026-09-14T00:00:00+02:00').getTime();

describe('signup clock', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalPin = process.env.TEST_SIGNUP_NOW;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalPin == null) delete process.env.TEST_SIGNUP_NOW;
    else process.env.TEST_SIGNUP_NOW = originalPin;
  });

  it('pins ordinary test signups before the Sweden trial boundary', () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_SIGNUP_NOW = TEST_SIGNUP_COHORT_ISO;
    const pinned = signupCohortAt();
    assert.ok(pinned);
    assert.equal(pinned.toISOString(), TEST_SIGNUP_COHORT_ISO);
    assert.ok(pinned.getTime() > LIFETIME_FREE_UNTIL_MS);
    assert.ok(pinned.getTime() < SWEDEN_TRIAL_FROM_MS);
    assert.equal(swedenUsesProductTrial(pinned), false);
    assert.equal(signupNow().toISOString(), TEST_SIGNUP_COHORT_ISO);
  });

  it('still treats the Sweden trial boundary as trial when now is that instant', () => {
    assert.equal(swedenUsesProductTrial(new Date(SWEDEN_TRIAL_FROM_ISO)), true);
    assert.equal(swedenUsesProductTrial(new Date('2026-10-02T21:59:59.999Z')), false);
  });

  it('an explicit later pin still wins over the cohort instant', () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_SIGNUP_NOW = SWEDEN_TRIAL_FROM_ISO;
    assert.equal(signupNow().toISOString(), new Date(SWEDEN_TRIAL_FROM_ISO).toISOString());
    assert.equal(swedenUsesProductTrial(signupNow()), true);
  });

  it('e2e-i18n workflow pins the same cohort instant', () => {
    const yaml = fs.readFileSync(path.join(__dirname, '../.github/workflows/e2e-i18n.yml'), 'utf8');
    const escaped = TEST_SIGNUP_COHORT_ISO.replace(/[.]/g, '\\.');
    assert.match(yaml, new RegExp(`TEST_SIGNUP_NOW:\\s*'${escaped}'`));
  });

  it('ignores TEST_SIGNUP_NOW outside the test environment', () => {
    process.env.NODE_ENV = 'development';
    process.env.TEST_SIGNUP_NOW = TEST_SIGNUP_COHORT_ISO;
    assert.equal(signupCohortAt(), null);
    const before = Date.now();
    const now = signupNow().getTime();
    assert.ok(now >= before && now - before < 2000);
  });

  it('uses the wall clock when a test clears the pin', () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_SIGNUP_NOW = '   ';
    assert.equal(signupCohortAt(), null);
    const before = Date.now();
    const now = signupNow().getTime();
    assert.ok(now >= before && now - before < 2000);
  });

  it('ignores an invalid pin', () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_SIGNUP_NOW = 'not-a-date';
    assert.equal(signupCohortAt(), null);
  });
});
