'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isFamilyEligibleForGrandfathering,
  DEFAULT_LIFETIME_FREE_UNTIL,
} = require('../src/lib/payment-settings');
const { evaluateSignupCompleteness } = require('../src/lib/market-launch-invariants');
const { setupTestDb } = require('./helpers/setup.js');

const CUTOFF = DEFAULT_LIFETIME_FREE_UNTIL;
const CREATED = '2026-09-13T12:00:00+02:00';

describe('grandfathering is by date, signup still requires a country', () => {
  it('stored non-SE countries before cutoff are eligible', () => {
    for (const countryCode of ['XX', 'IE', 'FI', 'NO', null, '']) {
      assert.equal(isFamilyEligibleForGrandfathering({
        countryCode,
        createdAt: CREATED,
        lifetimeFreeUntil: CUTOFF,
      }), true, String(countryCode));
    }
  });

  it('explicit SE still grandfathers before cutoff', () => {
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'SE',
      createdAt: CREATED,
      lifetimeFreeUntil: CUTOFF,
    }), true);
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'se',
      createdAt: CREATED,
      lifetimeFreeUntil: CUTOFF,
    }), true);
  });

  it('signup with missing country is rejected', () => {
    const decision = evaluateSignupCompleteness({
      countryCode: null,
      marketOpen: true,
      publicBillingUsable: true,
      lifetimeFreeUntil: CUTOFF,
      now: new Date(CREATED),
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, 'unknown_country');
  });
});

describe('null/unknown country_code family is still grandfathered by date', () => {
  it('resolveFamilyEntitlements grants worldwide grandfather', async (t) => {
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
      await appSettings.upsertSetting('lifetime_free_until', CUTOFF);
      const { resolveFamilyEntitlements, grantGrandfatheredOnCreate } = require('../src/lib/family-entitlements');

      const { rows } = await runtimeDb.query(
        `INSERT INTO family (name, subscription_status, is_lifetime_free, created_at, country_code, market_region)
         VALUES ('Unknown country', 'none', false, $1::timestamptz, 'XX', 'EU')
         RETURNING id, created_at, country_code`,
        [CREATED]
      );
      const family = rows[0];
      const grantedMissing = await grantGrandfatheredOnCreate(family.id, family.created_at, {});
      assert.ok(grantedMissing, 'date-only grandfather must not require SE');
      const { premium, access_kind } = await resolveFamilyEntitlements(family.id, new Date('2026-09-13T18:00:00+02:00'));
      assert.equal(premium.is_grandfathered, true);
      assert.equal(premium.source, 'grandfathered');
      assert.equal(access_kind, 'grandfathered');
      const fam = await runtimeDb.query('SELECT is_lifetime_free FROM family WHERE id = $1', [family.id]);
      assert.equal(fam.rows[0].is_lifetime_free, true);
    } finally {
      await db.cleanup();
    }
  });
});

describe('omitted grant countryCode uses stored family country', () => {
  it('explicit SE family still grandfathers when caller omits countryCode', async (t) => {
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
      await appSettings.upsertSetting('lifetime_free_until', CUTOFF);
      const { grantGrandfatheredOnCreate, resolveFamilyEntitlements } = require('../src/lib/family-entitlements');

      const { rows } = await runtimeDb.query(
        `INSERT INTO family (name, subscription_status, is_lifetime_free, created_at, country_code, market_region)
         VALUES ('Stored SE', 'none', false, $1::timestamptz, 'SE', 'EU')
         RETURNING id, created_at`,
        [CREATED]
      );
      const family = rows[0];
      const granted = await grantGrandfatheredOnCreate(family.id, family.created_at);
      assert.ok(granted, 'stored SE must grandfather when countryCode is omitted');
      const { premium, access_kind } = await resolveFamilyEntitlements(family.id, new Date('2026-09-13T18:00:00+02:00'));
      assert.equal(premium.active, true);
      assert.equal(premium.is_grandfathered, true);
      assert.equal(access_kind, 'grandfathered');
    } finally {
      await db.cleanup();
    }
  });
});
