'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { processRevenueCatEvent, findFamilyForAppUserIds } = require('../src/lib/revenuecat-webhook-process');
const { applyIapWebhookTestEnv, TEST_APP_ID } = require('./support/iap-webhook-test-env');
const { STORE_PRODUCT_MONTHLY } = require('../config/iap-product-contract');

applyIapWebhookTestEnv();

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
    product_id: STORE_PRODUCT_MONTHLY,
    entitlement_ids: ['basic'],
    environment: 'LIVE',
    app_id: TEST_APP_ID,
    expiration_at_ms: overrides.expiration_at_ms ?? (now + 86_400_000),
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

  test('newer EXPIRATION then older RENEWAL stays expired', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const familyId = await seedFamily(db, 'active');
      const t1 = Date.now();
      const t0 = t1 - 60_000;
      const realDb = require('../src/lib/db');
      await processRevenueCatEvent(realDb, baseEvent(familyId, {
        type: 'EXPIRATION',
        expiration_at_ms: t0,
        event_timestamp_ms: t1,
      }));
      await processRevenueCatEvent(realDb, baseEvent(familyId, { type: 'RENEWAL', event_timestamp_ms: t0 }));
      const { rows } = await db.query('SELECT subscription_status FROM family WHERE id = $1', [familyId]);
      assert.equal(rows[0].subscription_status, 'expired');
    } finally {
      await db.cleanup();
    }
  });

  test('same event id is duplicate', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const familyId = await seedFamily(db, 'none');
      const realDb = require('../src/lib/db');
      const evt = baseEvent(familyId, { id: 'evt_dup_fixed', type: 'RENEWAL' });
      const r1 = await processRevenueCatEvent(realDb, evt);
      const r2 = await processRevenueCatEvent(realDb, { ...evt });
      assert.equal(r1.duplicate, false);
      assert.equal(r2.duplicate, true);
    } finally {
      await db.cleanup();
    }
  });

  test('same timestamp tie-break: RENEWAL beats EXPIRATION', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const familyId = await seedFamily(db, 'none');
      const ts = Date.now();
      const realDb = require('../src/lib/db');
      await processRevenueCatEvent(realDb, baseEvent(familyId, {
        id: 'evt_exp_first',
        type: 'EXPIRATION',
        expiration_at_ms: ts - 1000,
        event_timestamp_ms: ts,
      }));
      await processRevenueCatEvent(realDb, baseEvent(familyId, {
        id: 'evt_renew_later_id',
        type: 'RENEWAL',
        event_timestamp_ms: ts,
      }));
      const { rows } = await db.query('SELECT subscription_status FROM family WHERE id = $1', [familyId]);
      assert.equal(rows[0].subscription_status, 'active');
    } finally {
      await db.cleanup();
    }
  });

  test('concurrent events same timestamp — deterministic winner (barrier)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const familyId = await seedFamily(db, 'none');
      const ts = Date.now();
      const realDb = require('../src/lib/db');
      const exp = processRevenueCatEvent(realDb, baseEvent(familyId, {
        id: 'evt_z_concurrent',
        type: 'EXPIRATION',
        expiration_at_ms: ts - 500,
        event_timestamp_ms: ts,
      }));
      const renew = processRevenueCatEvent(realDb, baseEvent(familyId, {
        id: 'evt_a_concurrent',
        type: 'RENEWAL',
        event_timestamp_ms: ts,
      }));

      await Promise.all([exp, renew]);

      const { rows } = await db.query(
        'SELECT subscription_status FROM family WHERE id = $1',
        [familyId]
      );
      assert.equal(rows[0].subscription_status, 'active');
    } finally {
      await db.cleanup();
    }
  });

  test('destructive EXPIRATION without timestamp does not override newer state', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const familyId = await seedFamily(db, 'none');
      const realDb = require('../src/lib/db');
      const ts = Date.now();
      await processRevenueCatEvent(realDb, baseEvent(familyId, { type: 'RENEWAL', event_timestamp_ms: ts }));
      const staleExp = baseEvent(familyId, {
        type: 'EXPIRATION',
        expiration_at_ms: ts - 1000,
      });
      delete staleExp.event_timestamp_ms;
      await processRevenueCatEvent(realDb, staleExp);
      const { rows } = await db.query('SELECT subscription_status FROM family WHERE id = $1', [familyId]);
      assert.equal(rows[0].subscription_status, 'active');
    } finally {
      await db.cleanup();
    }
  });

  test('non-destructive RENEWAL without timestamp skipped for reconciliation', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const familyId = await seedFamily(db, 'expired');
      const realDb = require('../src/lib/db');
      const ts = Date.now();
      await processRevenueCatEvent(realDb, baseEvent(familyId, {
        type: 'EXPIRATION',
        expiration_at_ms: ts - 1000,
        event_timestamp_ms: ts,
      }));
      const renewNoTs = baseEvent(familyId, { type: 'RENEWAL' });
      delete renewNoTs.event_timestamp_ms;
      const r = await processRevenueCatEvent(realDb, renewNoTs);
      assert.equal(r.skipped, true);
      assert.ok(['insufficient_ordering', 'skipped_stale'].includes(r.reason));
      const { rows } = await db.query('SELECT subscription_status FROM family WHERE id = $1', [familyId]);
      assert.equal(rows[0].subscription_status, 'expired');
    } finally {
      await db.cleanup();
    }
  });

  test('RENEWAL as first event activates subscription', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const familyId = await seedFamily(db, 'none');
      const realDb = require('../src/lib/db');
      const r = await processRevenueCatEvent(realDb, baseEvent(familyId, { type: 'RENEWAL' }));
      assert.equal(r.subscriptionStatus, 'active');
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

  test('alias app_user_id resolves family', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const familyId = await seedFamily(db);
      const alias = `alias_${Date.now()}`;
      await db.query('UPDATE family SET rc_customer_id = $1 WHERE id = $2', [alias, familyId]);
      const realDb = require('../src/lib/db');
      const r = await processRevenueCatEvent(realDb, baseEvent(familyId, {
        app_user_id: alias,
        type: 'RENEWAL',
      }));
      assert.equal(r.familyId, familyId);
    } finally {
      await db.cleanup();
    }
  });
});
