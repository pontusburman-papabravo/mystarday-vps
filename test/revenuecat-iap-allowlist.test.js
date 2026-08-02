'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  hasAppAllowlistConfigured,
  isAllowedAppId,
  getIapWebhookReadiness,
} = require('../config/revenuecat-iap');

describe('revenuecat app allowlist fail-closed', () => {
  const prev = process.env.REVENUECAT_ALLOWED_APP_IDS;

  test.after(() => {
    if (prev === undefined) delete process.env.REVENUECAT_ALLOWED_APP_IDS;
    else process.env.REVENUECAT_ALLOWED_APP_IDS = prev;
  });

  test('missing allowlist is not configured', () => {
    delete process.env.REVENUECAT_ALLOWED_APP_IDS;
    assert.equal(hasAppAllowlistConfigured(), false);
    assert.equal(isAllowedAppId('com.example.app'), false);
    const readiness = getIapWebhookReadiness();
    assert.equal(readiness.webhookReady, false);
    assert.ok(readiness.issues.includes('REVENUECAT_ALLOWED_APP_IDS'));
  });

  test('empty allowlist is not configured', () => {
    process.env.REVENUECAT_ALLOWED_APP_IDS = '  ,  ';
    assert.equal(hasAppAllowlistConfigured(), false);
    assert.equal(isAllowedAppId('com.example.app'), false);
  });

  test('whitespace-trimmed entries', () => {
    process.env.REVENUECAT_ALLOWED_APP_IDS = ' com.a , com.b ';
    assert.equal(isAllowedAppId('com.a'), true);
    assert.equal(isAllowedAppId('com.b'), true);
    assert.equal(isAllowedAppId('com.c'), false);
  });

  test('missing app_id rejected', () => {
    process.env.REVENUECAT_ALLOWED_APP_IDS = 'com.only';
    assert.equal(isAllowedAppId(null), false);
    assert.equal(isAllowedAppId(''), false);
  });
});
