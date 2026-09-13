'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');

const CUTOFF = '2026-10-01T00:00:00+02:00';
const AFTER = new Date('2026-10-01T00:00:01+02:00');
const BEFORE = new Date('2026-09-13T12:00:00+02:00');

function snapshotEnv(keys) {
  const out = {};
  for (const k of keys) out[k] = process.env[k];
  return out;
}

function restoreEnv(snap) {
  for (const [k, v] of Object.entries(snap)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function readyIapEnv() {
  process.env.REVENUECAT_WEBHOOK_SECRET = 'test-webhook-secret';
  process.env.REVENUECAT_ALLOWED_APP_IDS = 'app1';
  process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY = 'appl_test_public';
  process.env.REVENUECAT_ANDROID_PUBLIC_SDK_KEY = 'goog_test_public';
  process.env.REVENUECAT_SECRET_API_KEY = 'sk_test_secret';
  delete process.env.BILLING_UI_DISABLED;
  delete process.env.IAP_PAID_ROLLOUT_READY;
  delete process.env.REVENUECAT_ALLOWED_PRODUCT_IDS;
}

describe('payment go-live apply', () => {
  it('flips payment + paid rollout after cutoff when ready, and does not re-enable after admin off', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }

    const envKeys = [
      'REVENUECAT_WEBHOOK_SECRET',
      'REVENUECAT_ALLOWED_APP_IDS',
      'REVENUECAT_IOS_PUBLIC_SDK_KEY',
      'REVENUECAT_ANDROID_PUBLIC_SDK_KEY',
      'REVENUECAT_SECRET_API_KEY',
      'REVENUECAT_API_KEY',
      'BILLING_UI_DISABLED',
      'IAP_PAID_ROLLOUT_READY',
      'REVENUECAT_ALLOWED_PRODUCT_IDS',
    ];
    const envSnap = snapshotEnv(envKeys);

    for (const mod of [
      '../src/lib/db',
      '../db/app-settings',
      '../src/lib/billing-ui',
      '../src/lib/iap-paid-rollout',
      '../src/lib/iap-readiness',
      '../src/lib/payment-settings',
      '../src/lib/payment-audit',
      '../src/lib/payment-go-live',
    ]) {
      delete require.cache[require.resolve(mod)];
    }

    const { query } = require('../src/lib/db');
    const appSettings = require('../db/app-settings');
    const {
      runPaymentGoLive,
      setPaymentGoLiveArmed,
      PAYMENT_GO_LIVE_APPLIED_AT_KEY,
      ACTIONS,
    } = require('../src/lib/payment-go-live');

    try {
      readyIapEnv();
      await setPaymentGoLiveArmed(true);
      await appSettings.setPaymentEnabled(false);
      await appSettings.setIapPaidRolloutReady(false);
      await query('DELETE FROM app_settings WHERE key = $1', [PAYMENT_GO_LIVE_APPLIED_AT_KEY]);
      await appSettings.upsertSetting('payment_start_at', CUTOFF);

      const waiting = await runPaymentGoLive({ now: BEFORE });
      assert.equal(waiting.decision.action, ACTIONS.WAIT);
      assert.equal(await appSettings.getPaymentEnabled(), false);

      process.env.BILLING_UI_DISABLED = 'true';
      const blocked = await runPaymentGoLive({ now: AFTER });
      assert.equal(blocked.decision.action, ACTIONS.BLOCKED);
      assert.ok(blocked.decision.blockers.includes('billing_ui_disabled'));
      assert.equal(await appSettings.getPaymentEnabled(), false);

      delete process.env.BILLING_UI_DISABLED;
      const applied = await runPaymentGoLive({ now: AFTER });
      assert.equal(applied.applied, true);
      assert.equal(applied.decision.action, ACTIONS.APPLY);
      assert.equal(await appSettings.getPaymentEnabled(), true);
      assert.equal(await appSettings.getIapPaidRolloutReady(), true);

      await appSettings.setPaymentEnabled(false);
      await appSettings.setIapPaidRolloutReady(false);
      const again = await runPaymentGoLive({ now: AFTER });
      assert.equal(again.decision.action, ACTIONS.ALREADY_APPLIED);
      assert.equal(again.applied, false);
      assert.equal(await appSettings.getPaymentEnabled(), false);
    } finally {
      await appSettings.setPaymentEnabled(false);
      await appSettings.setIapPaidRolloutReady(false);
      await query('DELETE FROM app_settings WHERE key = $1', [PAYMENT_GO_LIVE_APPLIED_AT_KEY]);
      restoreEnv(envSnap);
      await db.cleanup();
    }
  });
});
