'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { processRevenueCatEvent, findFamilyForAppUserIds } = require('../src/lib/revenuecat-webhook-process');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function seedFamily(db, status = 'active') {
  const familyId = crypto.randomUUID();
  await db.query(
    `INSERT INTO family (id, name, is_lifetime_free, subscription_status)
     VALUES ($1, 'Ordering test', false, $2)`,
    [familyId, status]
  );
  return familyId;
}

function baseEvent(familyId, overrides = {}) {
  const now = Date.now();
  return {
    id: overrides.id || `evt_${crypto.randomUUID()}`,
    type: overrides.type || 'RENEWAL',
    app_user_id: familyId,
    product_id: 'rc_basic_monthly',
    entitlement_ids: ['basic'],
    environment: 'LIVE',
    expiration_at_ms: now + 86_400_000,
    event_timestamp_ms: overrides.event_timestamp_ms ?? now,
    ...overrides,
  };
}

describe('iap webhook event ordering', () => {
  test('newer RENEWAL then older EXPIRATION keeps active', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const familyId = await seedFamily(db, 'none');
      const t1 = Date.now();
      const t0 = t1 - 60_000;

      const realDb = require('../src/lib/db');
      await processRevenueCatEvent(realDb, baseEvent(familyId, { type: 'RENEWAL', event_timestamp_ms: t1 }));
      await processRevenueCatEvent(realDb, baseEvent(familyId, {
        type: 'EXPIRATION',
        expiration_at_ms: Date.now() - 1000,
        event_timestamp_ms: t0,
      }));

      const { rows } = await db.query('SELECT subscription_status FROM family WHERE id = $1', [familyId]);
      assert.equal(rows[0].subscription_status, 'active');
    } finally {
      await db.cleanup();
    }
  });

  test('findFamilyForAppUserIds matches non-UUID rc_customer_id', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const familyId = await seedFamily(db);
      const rcId = `rc_customer_${Date.now()}`;
      await db.query('UPDATE family SET rc_customer_id = $1 WHERE id = $2', [rcId, familyId]);
      const family = await findFamilyForAppUserIds(db, [rcId]);
      assert.equal(family.id, familyId);
    } finally {
      await db.cleanup();
    }
  });
});
