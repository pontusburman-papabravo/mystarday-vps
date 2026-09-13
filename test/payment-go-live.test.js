'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  ACTIONS,
  DEFAULT_ARMED,
  evaluatePaymentGoLive,
  collectReadinessGaps,
} = require('../src/lib/payment-go-live');
const {
  nextPaymentGoLiveDelayMs,
  RETRY_MS,
  HEARTBEAT_MS,
  MAX_WAIT_MS,
  shouldStartPaymentGoLiveScheduler,
} = require('../src/lib/payment-go-live-scheduler');
const { DEFAULT_PAYMENT_START_AT } = require('../src/lib/payment-settings');

const CUTOFF = new Date('2026-10-01T00:00:00+02:00');
const BEFORE = new Date('2026-09-30T23:59:59+02:00');
const AFTER = new Date('2026-10-01T00:00:01+02:00');

function base(overrides) {
  return {
    now: BEFORE,
    paymentStartAt: CUTOFF,
    armed: true,
    appliedAt: null,
    paymentEnabled: false,
    paidRolloutReady: false,
    billingUiDisabled: false,
    envPaidRolloutForcedOff: false,
    missingReadiness: [],
    ...overrides,
  };
}

describe('evaluatePaymentGoLive', () => {
  it('waits before cutoff even when ready', () => {
    const d = evaluatePaymentGoLive(base({ now: BEFORE }));
    assert.equal(d.action, ACTIONS.WAIT);
    assert.ok(d.msUntil > 0);
  });

  it('surfaces blockers while waiting so ops can fix BILLING_UI_DISABLED', () => {
    const d = evaluatePaymentGoLive(base({
      now: BEFORE,
      billingUiDisabled: true,
      missingReadiness: ['ios_public_sdk_missing'],
    }));
    assert.equal(d.action, ACTIONS.WAIT);
    assert.ok(d.blockers.includes('billing_ui_disabled'));
    assert.ok(d.blockers.includes('ios_public_sdk_missing'));
  });

  it('applies after cutoff when armed and unblocked', () => {
    const d = evaluatePaymentGoLive(base({ now: AFTER }));
    assert.equal(d.action, ACTIONS.APPLY);
    assert.deepEqual(d.blockers, []);
  });

  it('blocks after cutoff when billing UI kill switch is on', () => {
    const d = evaluatePaymentGoLive(base({ now: AFTER, billingUiDisabled: true }));
    assert.equal(d.action, ACTIONS.BLOCKED);
    assert.ok(d.blockers.includes('billing_ui_disabled'));
  });

  it('blocks after cutoff when not armed', () => {
    const d = evaluatePaymentGoLive(base({ now: AFTER, armed: false }));
    assert.equal(d.action, ACTIONS.BLOCKED);
    assert.ok(d.blockers.includes('not_armed'));
  });

  it('does not re-apply after a successful go-live (admin kill switch wins)', () => {
    const d = evaluatePaymentGoLive(base({
      now: AFTER,
      appliedAt: '2026-10-01T00:00:05.000Z',
      paymentEnabled: false,
      paidRolloutReady: false,
    }));
    assert.equal(d.action, ACTIONS.ALREADY_APPLIED);
  });

  it('treats already-live flags after cutoff as already_live', () => {
    const d = evaluatePaymentGoLive(base({
      now: AFTER,
      paymentEnabled: true,
      paidRolloutReady: true,
    }));
    assert.equal(d.action, ACTIONS.ALREADY_LIVE);
  });

  it('does not treat already-live flags as done before cutoff', () => {
    const d = evaluatePaymentGoLive(base({
      now: BEFORE,
      paymentEnabled: true,
      paidRolloutReady: true,
    }));
    assert.equal(d.action, ACTIONS.WAIT);
  });

  it('blocks when IAP readiness gaps remain after cutoff', () => {
    const d = evaluatePaymentGoLive(base({
      now: AFTER,
      missingReadiness: ['revenuecat_secret_api_key_missing', 'webhook_auth_not_configured'],
    }));
    assert.equal(d.action, ACTIONS.BLOCKED);
    assert.ok(d.blockers.includes('revenuecat_secret_api_key_missing'));
  });
});

describe('payment go-live helpers', () => {
  it('default cutoff is 1 October 2026 Stockholm midnight', () => {
    assert.equal(DEFAULT_PAYMENT_START_AT, '2026-10-01T00:00:00+02:00');
    assert.equal(DEFAULT_ARMED, true);
  });

  it('collectReadinessGaps lists missing secret key', () => {
    const prev = process.env.REVENUECAT_SECRET_API_KEY;
    const prev2 = process.env.REVENUECAT_API_KEY;
    delete process.env.REVENUECAT_SECRET_API_KEY;
    delete process.env.REVENUECAT_API_KEY;
    try {
      const gaps = collectReadinessGaps({
        webhook_auth_configured: true,
        app_allowlist_configured: true,
        product_allowlist_configured: true,
        product_allowlist_matches_contract: true,
        entitlement_configured: true,
        ios_public_sdk_configured: true,
        android_public_sdk_configured: true,
      });
      assert.ok(gaps.includes('revenuecat_secret_api_key_missing'));
    } finally {
      if (prev === undefined) delete process.env.REVENUECAT_SECRET_API_KEY;
      else process.env.REVENUECAT_SECRET_API_KEY = prev;
      if (prev2 === undefined) delete process.env.REVENUECAT_API_KEY;
      else process.env.REVENUECAT_API_KEY = prev2;
    }
  });

  it('caps wait delay at 24h and retries blockers every 5 min', () => {
    assert.equal(
      nextPaymentGoLiveDelayMs({ action: ACTIONS.WAIT, msUntil: 20 * 24 * 60 * 60 * 1000 }),
      MAX_WAIT_MS
    );
    assert.equal(nextPaymentGoLiveDelayMs({ action: ACTIONS.BLOCKED }), RETRY_MS);
    assert.equal(nextPaymentGoLiveDelayMs({ action: ACTIONS.APPLY }), HEARTBEAT_MS);
    assert.equal(nextPaymentGoLiveDelayMs({ action: ACTIONS.ALREADY_APPLIED }), HEARTBEAT_MS);
  });

  it('does not start the scheduler in test env', () => {
    assert.equal(shouldStartPaymentGoLiveScheduler(), false);
  });
});

describe('admin go-live surface', () => {
  it('admin panel explains Sweden grandfathering and Oct 1 go-live', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/admin/index.html'), 'utf8');
    assert.match(html, /1 oktober — slå på betalningen/);
    assert.match(html, /admin-payment-go-live\.js/);
    assert.match(html, /paymentGoLiveArmedToggle/);
    const js = fs.readFileSync(path.join(__dirname, '../public/admin/admin-payment-go-live.js'), 'utf8');
    assert.match(js, /BILLING_UI_DISABLED/);
    assert.match(js, /payment-go-live-armed/);
  });
});
