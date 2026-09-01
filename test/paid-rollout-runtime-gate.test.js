'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateSignupCompleteness,
  isPublicBillingUsable,
  BILLING_NOT_READY_CODE,
} = require('../src/lib/market-launch-invariants');
const { isPrebillingAccessActive } = require('../src/lib/payment-settings');
const { setupTestDb } = require('./helpers/setup.js');
const {
  enablePublicBillingForTest,
  enablePaymentUiWithoutPaidRolloutForTest,
  disablePublicBillingForTest,
} = require('./helpers/public-billing');

const IE_CUTOFF = '2026-10-15T00:00:00+02:00';
const BEFORE = new Date('2026-10-14T23:59:59+02:00');
const AFTER = new Date('2026-10-15T00:00:01+02:00');
const CREATED = '2026-09-01T00:00:00+02:00';

const COMBOS = [
  { payment: false, uiOff: true, paid: false, usable: false },
  { payment: true, uiOff: true, paid: false, usable: false },
  { payment: false, uiOff: false, paid: false, usable: false },
  { payment: true, uiOff: false, paid: false, usable: false },
  { payment: true, uiOff: false, paid: true, usable: true },
  { payment: false, uiOff: false, paid: true, usable: false },
  { payment: true, uiOff: true, paid: true, usable: false },
];

describe('three-part public billing gate', () => {
  it('isPublicBillingUsable requires payment + billing UI + paid rollout', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    for (const mod of ['../src/lib/db', '../db/app-settings', '../src/lib/billing-ui', '../src/lib/iap-paid-rollout', '../src/lib/market-launch-invariants']) {
      delete require.cache[require.resolve(mod)];
    }
    const appSettings = require('../db/app-settings');
    const { isPublicBillingUsable: usable } = require('../src/lib/market-launch-invariants');

    const envSnap = {
      BILLING_UI_DISABLED: process.env.BILLING_UI_DISABLED,
      IAP_PAID_ROLLOUT_READY: process.env.IAP_PAID_ROLLOUT_READY,
    };
    try {
      for (const combo of COMBOS) {
        if (combo.uiOff) process.env.BILLING_UI_DISABLED = 'true';
        else delete process.env.BILLING_UI_DISABLED;
        delete process.env.IAP_PAID_ROLLOUT_READY;
        await appSettings.setPaymentEnabled(combo.payment);
        await appSettings.setIapPaidRolloutReady(combo.paid);
        assert.equal(
          await usable(),
          combo.usable,
          `payment=${combo.payment} uiOff=${combo.uiOff} paid=${combo.paid}`
        );
      }
    } finally {
      await appSettings.setPaymentEnabled(false);
      await appSettings.setIapPaidRolloutReady(false);
      if (envSnap.BILLING_UI_DISABLED === undefined) delete process.env.BILLING_UI_DISABLED;
      else process.env.BILLING_UI_DISABLED = envSnap.BILLING_UI_DISABLED;
      if (envSnap.IAP_PAID_ROLLOUT_READY === undefined) delete process.env.IAP_PAID_ROLLOUT_READY;
      else process.env.IAP_PAID_ROLLOUT_READY = envSnap.IAP_PAID_ROLLOUT_READY;
      await db.cleanup();
    }
  });
});

describe('IE/FI hold survives payment+UI without paid rollout', () => {
  for (const country of ['IE', 'FI']) {
    it(`${country} after cutoff keeps hold when paid rollout is false`, () => {
      assert.equal(isPrebillingAccessActive({
        countryCode: country,
        createdAt: CREATED,
        paymentStartAt: IE_CUTOFF,
        now: AFTER,
        publicBillingUsable: false,
      }), true);
    });

    it(`${country} after cutoff ends hold only when public billing is fully usable`, () => {
      assert.equal(isPrebillingAccessActive({
        countryCode: country,
        createdAt: CREATED,
        paymentStartAt: IE_CUTOFF,
        now: AFTER,
        publicBillingUsable: true,
      }), false);
    });

    it(`${country} before cutoff signs up without public billing`, () => {
      const decision = evaluateSignupCompleteness({
        countryCode: country,
        marketOpen: true,
        publicBillingUsable: false,
        paymentStartAt: IE_CUTOFF,
        now: BEFORE,
      });
      assert.equal(decision.allowed, true);
      assert.equal(decision.reason, 'prebilling_launch_access');
    });

    it(`${country} after cutoff blocks signup unless all three paid conditions are true`, () => {
      const blocked = evaluateSignupCompleteness({
        countryCode: country,
        marketOpen: true,
        publicBillingUsable: false,
        paymentStartAt: IE_CUTOFF,
        now: AFTER,
      });
      assert.equal(blocked.allowed, false);
      assert.equal(blocked.code, BILLING_NOT_READY_CODE);

      const paid = evaluateSignupCompleteness({
        countryCode: country,
        marketOpen: true,
        publicBillingUsable: true,
        paymentStartAt: IE_CUTOFF,
        now: AFTER,
      });
      assert.equal(paid.allowed, true);
      assert.equal(paid.reason, 'billing_usable');
    });
  }
});

describe('enablePaymentUiWithoutPaidRolloutForTest does not open public billing', () => {
  it('payment+UI on, paid rollout off → isPublicBillingUsable false', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    for (const mod of ['../src/lib/db', '../db/app-settings', '../src/lib/billing-ui', '../src/lib/iap-paid-rollout', '../src/lib/market-launch-invariants']) {
      delete require.cache[require.resolve(mod)];
    }
    let snap;
    try {
      snap = await enablePaymentUiWithoutPaidRolloutForTest();
      delete require.cache[require.resolve('../src/lib/market-launch-invariants')];
      const { isPublicBillingUsable: usable } = require('../src/lib/market-launch-invariants');
      assert.equal(await usable(), false);
      const full = await enablePublicBillingForTest();
      delete require.cache[require.resolve('../src/lib/market-launch-invariants')];
      const { isPublicBillingUsable: usableOn } = require('../src/lib/market-launch-invariants');
      assert.equal(await usableOn(), true);
      await disablePublicBillingForTest(full);
    } finally {
      if (snap) await disablePublicBillingForTest(snap);
      await db.cleanup();
    }
  });
});
