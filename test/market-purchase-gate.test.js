'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateMarketPurchaseAllowed,
  isMarketPurchaseAllowed,
} = require('../src/lib/payment-settings');
const { setupTestDb } = require('./helpers/setup.js');
const {
  enablePublicBillingForTest,
  disablePublicBillingForTest,
} = require('./helpers/public-billing');

const SE_START = new Date('2026-10-01T00:00:00+02:00');

/** Wall-clock tests must not assume the suite still runs before Sweden's go-live. */
function paymentStartStillAheadIso() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}
const IE_START = new Date('2026-09-20T00:00:00+01:00');
const BEFORE_SE = new Date('2026-09-25T12:00:00+02:00');
const AFTER_SE = new Date('2026-10-02T00:00:00+02:00');
const BEFORE_IE = new Date('2026-09-19T12:00:00+01:00');
const AFTER_IE = new Date('2026-09-21T12:00:00+01:00');

describe('evaluateMarketPurchaseAllowed (pure)', () => {
  it('SE before payment_start_at is denied', () => {
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'SE',
      now: BEFORE_SE,
      paymentStartAt: SE_START,
    }), false);
  });

  it('SE at/after payment_start_at is allowed', () => {
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'SE',
      now: AFTER_SE,
      paymentStartAt: SE_START,
    }), true);
  });

  it('IE during complimentary access cannot start a purchase', () => {
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'IE',
      now: BEFORE_IE,
      irelandFreeUntil: '2027-01-01T00:00:00.000Z',
      marketPaymentStartResolved: {
        configured: true,
        invalid: false,
        instant: IE_START,
      },
    }), false);
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'IE',
      now: AFTER_IE,
      irelandFreeUntil: '2027-01-01T00:00:00.000Z',
    }), false);
  });

  it('IE at the complimentary cutoff can purchase even if market payment start is unset', () => {
    const cutoff = new Date('2027-01-01T00:00:00.000Z');
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'IE',
      now: cutoff,
      irelandFreeUntil: cutoff,
      marketPaymentStartResolved: { configured: false, instant: null },
    }), true);
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'IE',
      now: new Date(cutoff.getTime() - 1000),
      irelandFreeUntil: cutoff,
    }), false);
  });

  it('FI/NL/DE/AT fail closed without per-market billing start', () => {
    for (const code of ['FI', 'NL', 'DE', 'AT']) {
      assert.equal(evaluateMarketPurchaseAllowed({
        countryCode: code,
        now: AFTER_SE,
        paymentStartAt: SE_START,
      }), false, code);
    }
  });

  it('FI allows purchase only when market_fi_payment_start_at is configured and passed', () => {
    const fiStart = new Date('2026-11-01T00:00:00+02:00');
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'FI',
      now: BEFORE_SE,
      marketPaymentStartResolved: {
        configured: true,
        invalid: false,
        instant: fiStart,
      },
    }), false);
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'FI',
      now: new Date('2026-11-02T00:00:00+02:00'),
      marketPaymentStartResolved: {
        configured: true,
        invalid: false,
        instant: fiStart,
      },
    }), true);
  });
});

describe('isMarketPurchaseAllowed (async)', () => {
  it('reads SE payment_start_at from app_settings', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const appSettings = require('../db/app-settings');
    try {
      await appSettings.upsertSetting('payment_start_at', '2026-10-01T00:00:00+02:00');
      await appSettings.upsertSetting('market_ie_payment_start_at', '2026-09-20T00:00:00+01:00');
      assert.equal(await isMarketPurchaseAllowed('SE', BEFORE_SE), false);
      assert.equal(await isMarketPurchaseAllowed('SE', AFTER_SE), true);
      assert.equal(await isMarketPurchaseAllowed('IE', BEFORE_IE), false);
      assert.equal(await isMarketPurchaseAllowed('IE', AFTER_IE), false);
      assert.equal(await isMarketPurchaseAllowed('IE', new Date('2027-01-01T00:00:00.000Z')), true);
      assert.equal(await isMarketPurchaseAllowed('DE', AFTER_SE), false);
    } finally {
      await db.cleanup();
    }
  });
});

function reloadPurchaseGate() {
  for (const mod of [
    '../src/lib/db',
    '../db/app-settings',
    '../src/lib/billing-ui',
    '../src/lib/iap-paid-rollout',
    '../src/lib/payment-settings',
    '../src/lib/iap-native-purchase-gate',
  ]) {
    delete require.cache[require.resolve(mod)];
  }
  return require('../src/lib/iap-native-purchase-gate').getNativePurchaseEligibility;
}

describe('getNativePurchaseEligibility market gate', () => {
  test('SE family denied while payment_start_at is still ahead, even when global billing is on', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    reloadPurchaseGate();
    const appSettings = require('../db/app-settings');
    let snap;
    try {
      snap = await enablePublicBillingForTest();
      await appSettings.upsertSetting('payment_start_at', paymentStartStillAheadIso());
      const familyId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      await db.pool.query(
        `INSERT INTO family (id, name, timezone, country_code, created_at)
         VALUES ($1, 'SE test', 'Europe/Stockholm', 'SE', NOW())
         ON CONFLICT (id) DO UPDATE SET country_code = EXCLUDED.country_code`,
        [familyId]
      );
      const gate = reloadPurchaseGate();
      const result = await gate(familyId, { checkGlobalRollout: true });
      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'market_purchase_not_open');
    } finally {
      if (snap) await disablePublicBillingForTest(snap);
      await db.cleanup();
    }
  });

  test('IE family denied during complimentary access even when market_ie_payment_start_at passed', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    reloadPurchaseGate();
    const appSettings = require('../db/app-settings');
    let snap;
    try {
      snap = await enablePublicBillingForTest();
      await appSettings.upsertSetting('payment_start_at', '2026-10-01T00:00:00+02:00');
      await appSettings.upsertSetting('market_ie_payment_start_at', '2026-09-01T00:00:00+01:00');
      const familyId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      await db.pool.query(
        `INSERT INTO family (id, name, timezone, country_code, created_at)
         VALUES ($1, 'IE test', 'Europe/Dublin', 'IE', NOW())
         ON CONFLICT (id) DO UPDATE SET country_code = EXCLUDED.country_code`,
        [familyId]
      );
      const gate = reloadPurchaseGate();
      const result = await gate(familyId, { checkGlobalRollout: true });
      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'market_purchase_not_open');
    } finally {
      if (snap) await disablePublicBillingForTest(snap);
      await db.cleanup();
    }
  });

  test('IE App Review sandbox family can purchase during complimentary access', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const familyId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc';
    const prevIds = process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
    const prevFlag = process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;
    reloadPurchaseGate();
    let snap;
    try {
      snap = await enablePublicBillingForTest();
      process.env.REVENUECAT_SANDBOX_FAMILY_IDS = familyId;
      process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = 'true';
      await db.pool.query(
        `INSERT INTO family (id, name, timezone, country_code, created_at)
         VALUES ($1, 'IE review', 'Europe/Dublin', 'IE', NOW())
         ON CONFLICT (id) DO UPDATE SET country_code = EXCLUDED.country_code`,
        [familyId]
      );
      const gate = reloadPurchaseGate();
      const result = await gate(familyId, { checkGlobalRollout: true });
      assert.equal(result.allowed, true);
      assert.equal(result.reason, 'sandbox_family');
    } finally {
      if (prevIds === undefined) delete process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
      else process.env.REVENUECAT_SANDBOX_FAMILY_IDS = prevIds;
      if (prevFlag === undefined) delete process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;
      else process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = prevFlag;
      if (snap) await disablePublicBillingForTest(snap);
      await db.cleanup();
    }
  });

  test('IE family denied when market_ie_payment_start_at unset', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    reloadPurchaseGate();
    const appSettings = require('../db/app-settings');
    let snap;
    try {
      snap = await enablePublicBillingForTest();
      await appSettings.upsertSetting('payment_start_at', '2026-10-01T00:00:00+02:00');
      await db.pool.query("DELETE FROM app_settings WHERE key = 'market_ie_payment_start_at'");
      const familyId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
      await db.pool.query(
        `INSERT INTO family (id, name, timezone, country_code, created_at)
         VALUES ($1, 'IE closed billing', 'Europe/Dublin', 'IE', NOW())
         ON CONFLICT (id) DO UPDATE SET country_code = EXCLUDED.country_code`,
        [familyId]
      );
      const gate = reloadPurchaseGate();
      const result = await gate(familyId, { checkGlobalRollout: true });
      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'market_purchase_not_open');
    } finally {
      if (snap) await disablePublicBillingForTest(snap);
      await db.cleanup();
    }
  });

  test('BILLING_UI_DISABLED blocks all markets including IE', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    reloadPurchaseGate();
    const appSettings = require('../db/app-settings');
    const prevBilling = process.env.BILLING_UI_DISABLED;
    let snap;
    try {
      snap = await enablePublicBillingForTest();
      process.env.BILLING_UI_DISABLED = 'true';
      await appSettings.upsertSetting('market_ie_payment_start_at', '2026-09-15T00:00:00+01:00');
      const familyId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
      await db.pool.query(
        `INSERT INTO family (id, name, timezone, country_code, created_at)
         VALUES ($1, 'IE kill switch', 'Europe/Dublin', 'IE', NOW())
         ON CONFLICT (id) DO UPDATE SET country_code = EXCLUDED.country_code`,
        [familyId]
      );
      const gate = reloadPurchaseGate();
      const result = await gate(familyId, { checkGlobalRollout: true });
      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'billing_ui_disabled');
    } finally {
      if (snap) await disablePublicBillingForTest(snap);
      if (prevBilling === undefined) delete process.env.BILLING_UI_DISABLED;
      else process.env.BILLING_UI_DISABLED = prevBilling;
      await db.cleanup();
    }
  });
});

describe('getNativeRestoreEligibility market isolation', () => {
  function reloadRestoreGate() {
    for (const mod of [
      '../src/lib/db',
      '../db/app-settings',
      '../src/lib/billing-ui',
      '../src/lib/iap-paid-rollout',
      '../src/lib/payment-settings',
      '../src/lib/iap-native-purchase-gate',
    ]) {
      delete require.cache[require.resolve(mod)];
    }
    const gate = require('../src/lib/iap-native-purchase-gate');
    return {
      purchase: gate.getNativePurchaseEligibility,
      restore: gate.getNativeRestoreEligibility,
    };
  }

  test('SE family may restore while payment_start_at is still ahead and global billing is on', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    reloadRestoreGate();
    const appSettings = require('../db/app-settings');
    let snap;
    try {
      snap = await enablePublicBillingForTest();
      await appSettings.upsertSetting('payment_start_at', paymentStartStillAheadIso());
      const familyId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
      await db.pool.query(
        `INSERT INTO family (id, name, timezone, country_code, created_at)
         VALUES ($1, 'SE restore', 'Europe/Stockholm', 'SE', NOW())
         ON CONFLICT (id) DO UPDATE SET country_code = EXCLUDED.country_code`,
        [familyId]
      );
      const { purchase, restore } = reloadRestoreGate();
      const purchaseResult = await purchase(familyId, { checkGlobalRollout: true });
      const restoreResult = await restore(familyId, { checkGlobalRollout: true });
      assert.equal(purchaseResult.allowed, false);
      assert.equal(purchaseResult.reason, 'market_purchase_not_open');
      assert.equal(restoreResult.allowed, true);
      assert.equal(restoreResult.reason, 'global_infrastructure_ready');
    } finally {
      if (snap) await disablePublicBillingForTest(snap);
      await db.cleanup();
    }
  });

  test('IE family may restore when market purchase permission is OFF', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    reloadRestoreGate();
    const appSettings = require('../db/app-settings');
    let snap;
    try {
      snap = await enablePublicBillingForTest();
      await appSettings.upsertSetting('payment_start_at', '2026-10-01T00:00:00+02:00');
      await db.pool.query("DELETE FROM app_settings WHERE key = 'market_ie_payment_start_at'");
      const familyId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
      await db.pool.query(
        `INSERT INTO family (id, name, timezone, country_code, created_at)
         VALUES ($1, 'IE restore only', 'Europe/Dublin', 'IE', NOW())
         ON CONFLICT (id) DO UPDATE SET country_code = EXCLUDED.country_code`,
        [familyId]
      );
      const { purchase, restore } = reloadRestoreGate();
      const purchaseResult = await purchase(familyId, { checkGlobalRollout: true });
      const restoreResult = await restore(familyId, { checkGlobalRollout: true });
      assert.equal(purchaseResult.allowed, false);
      assert.equal(restoreResult.allowed, true);
    } finally {
      if (snap) await disablePublicBillingForTest(snap);
      await db.cleanup();
    }
  });

  const OTHER_MARKET_FAMILY_IDS = {
    FI: 'f1111111-1111-4111-8111-111111111111',
    NL: 'a1111111-1111-4111-8111-111111111111',
    DE: 'd1111111-1111-4111-8111-111111111111',
    AT: 'b1111111-1111-4111-8111-111111111111',
    GB: 'c1111111-1111-4111-8111-111111111111',
  };

  for (const code of ['FI', 'NL', 'DE', 'AT', 'GB']) {
    test(`${code} family purchase denied before Oct 1`, async (t) => {
      const db = await setupTestDb();
      if (db.skip) {
        t.skip('No real TEST_DATABASE_URL');
        return;
      }
      reloadRestoreGate();
      const appSettings = require('../db/app-settings');
      let snap;
      try {
        snap = await enablePublicBillingForTest();
        await appSettings.upsertSetting('payment_start_at', '2026-10-01T00:00:00+02:00');
        const familyId = OTHER_MARKET_FAMILY_IDS[code];
        await db.pool.query(
          `INSERT INTO family (id, name, timezone, country_code, created_at)
           VALUES ($1, $2, 'Europe/Stockholm', $3, NOW())
           ON CONFLICT (id) DO UPDATE SET country_code = EXCLUDED.country_code`,
          [familyId, `${code} test`, code]
        );
        const { purchase } = reloadRestoreGate();
        const result = await purchase(familyId, { checkGlobalRollout: true });
        assert.equal(result.allowed, false);
        assert.equal(result.reason, 'market_purchase_not_open');
      } finally {
        if (snap) await disablePublicBillingForTest(snap);
        await db.cleanup();
      }
    });
  }
});
