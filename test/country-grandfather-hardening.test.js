'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isFamilyEligibleForGrandfathering,
  DEFAULT_PAYMENT_START_AT,
} = require('../src/lib/payment-settings');
const { evaluateSignupCompleteness } = require('../src/lib/market-launch-invariants');
const { setupTestDb } = require('./helpers/setup.js');

const CUTOFF = DEFAULT_PAYMENT_START_AT;
const CREATED = '2026-09-01T00:00:00+02:00';

describe('unknown country never becomes Sweden for entitlements', () => {
  const nonSe = [null, undefined, '', '  ', 'XX', 'Ireland', 'IE', 'FI', 'fi'];

  for (const countryCode of nonSe) {
    it(`isFamilyEligibleForGrandfathering(${JSON.stringify(countryCode)}) is false`, () => {
      assert.equal(isFamilyEligibleForGrandfathering({
        countryCode,
        createdAt: CREATED,
        paymentStartAt: CUTOFF,
      }), false);
    });
  }

  it('explicit SE still grandfathers before cutoff', () => {
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'SE',
      createdAt: CREATED,
      paymentStartAt: CUTOFF,
    }), true);
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'se',
      createdAt: CREATED,
      paymentStartAt: CUTOFF,
    }), true);
  });

  it('signup with missing country is rejected', () => {
    const decision = evaluateSignupCompleteness({
      countryCode: null,
      marketOpen: true,
      publicBillingUsable: true,
      paymentStartAt: CUTOFF,
      now: new Date('2026-09-01T00:00:00+02:00'),
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, 'unknown_country');
  });
});

describe('null country_code family is not lazy-grandfathered', () => {
  it('resolveFamilyEntitlements stays limited', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    try {
      for (const mod of [
        '../src/lib/db',
        '../db/app-settings',
        '../db/family-entitlements',
        '../src/lib/payment-settings',
        '../src/lib/family-entitlements',
      ]) {
        delete require.cache[require.resolve(mod)];
      }
      const runtimeDb = require('../src/lib/db');
      const appSettings = require('../db/app-settings');
      await appSettings.upsertSetting('payment_start_at', CUTOFF);
      const { resolveFamilyEntitlements, grantGrandfatheredOnCreate } = require('../src/lib/family-entitlements');

      const { rows } = await runtimeDb.query(
        `INSERT INTO family (name, subscription_status, is_lifetime_free, created_at, country_code, market_region)
         VALUES ('Unknown country', 'none', false, $1::timestamptz, 'XX', 'EU')
         RETURNING id, created_at, country_code`,
        [CREATED]
      );
      const family = rows[0];
      const grantedMissing = await grantGrandfatheredOnCreate(family.id, family.created_at, {});
      assert.equal(grantedMissing, null);
      const granted = await grantGrandfatheredOnCreate(family.id, family.created_at, { countryCode: family.country_code });
      assert.equal(granted, null);
      const { premium, access_kind } = await resolveFamilyEntitlements(family.id, new Date('2026-09-15T00:00:00+02:00'));
      assert.equal(premium.is_grandfathered, false);
      assert.notEqual(premium.source, 'grandfathered');
      assert.equal(access_kind, 'limited');
      const fam = await runtimeDb.query('SELECT is_lifetime_free FROM family WHERE id = $1', [family.id]);
      assert.equal(fam.rows[0].is_lifetime_free, false);
    } finally {
      await db.cleanup();
    }
  });
});
