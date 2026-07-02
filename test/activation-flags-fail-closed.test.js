'use strict';

/**
 * N8 — isActivationFlagEnabled must fail-closed (return false) on DB errors,
 * never throw and crash activation flows.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { injectMockDb } = require('./helpers/setup.js');

function loadFlagsModule() {
  const flagsPath = require.resolve('../src/lib/activation-flags');
  delete require.cache[flagsPath];
  return require('../src/lib/activation-flags');
}

test('isActivationFlagEnabled returns false when db.query throws', async () => {
  const mock = injectMockDb();
  mock.setQuery(async () => {
    throw new Error('connection refused');
  });

  try {
    const { isActivationFlagEnabled } = loadFlagsModule();
    const result = await isActivationFlagEnabled('activation_nudge_v1', 'family-id');
    assert.equal(result, false);
  } finally {
    mock.restore();
    delete require.cache[require.resolve('../src/lib/activation-flags')];
  }
});

test('isActivationFlagEnabled returns false when family lookup throws after flag enabled', async () => {
  const mock = injectMockDb();
  mock.setQuery(async (sql) => {
    if (String(sql).includes('feature_flag')) {
      return { rows: [{ enabled: true }] };
    }
    if (String(sql).includes('FROM family')) {
      throw new Error('pool exhausted');
    }
    return { rows: [] };
  });

  const prevLaunch = process.env.ACTIVATION_ONBOARDING_LAUNCH_AT;
  process.env.ACTIVATION_ONBOARDING_LAUNCH_AT = '2020-01-01T00:00:00Z';

  try {
    const { isActivationFlagEnabled, FLAG_KEYS } = loadFlagsModule();
    const result = await isActivationFlagEnabled(FLAG_KEYS.onboarding, 'family-id');
    assert.equal(result, false);
  } finally {
    if (prevLaunch === undefined) delete process.env.ACTIVATION_ONBOARDING_LAUNCH_AT;
    else process.env.ACTIVATION_ONBOARDING_LAUNCH_AT = prevLaunch;
    mock.restore();
    delete require.cache[require.resolve('../src/lib/activation-flags')];
  }
});

test('isActivationFlagEnabled returns true when flag is enabled (happy path)', async () => {
  const mock = injectMockDb();
  mock.setQuery(async (sql) => {
    if (String(sql).includes('feature_flag')) {
      return { rows: [{ enabled: true }] };
    }
    return { rows: [] };
  });

  try {
    const { isActivationFlagEnabled, FLAG_KEYS } = loadFlagsModule();
    const result = await isActivationFlagEnabled(FLAG_KEYS.custodySchedule);
    assert.equal(result, true);
  } finally {
    mock.restore();
    delete require.cache[require.resolve('../src/lib/activation-flags')];
  }
});
