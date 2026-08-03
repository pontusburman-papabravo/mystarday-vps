'use strict';

/**
 * IAP migration 0016 + tiebreak: disposable DB scenarios A/B/C.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { acquireDbTestLock } = require('./helpers/db-test-lock.js');
const { isMockDatabaseUrl } = require('./helpers/migration-gate.js');
const {
  createDisposableDatabase,
  dropDisposableDatabase,
  runMigrate,
  runMigrationsUpTo,
  makePool,
  tableRowCounts,
  familyStableBusinessChecksum,
} = require('./helpers/disposable-postgres.js');
const { STORE_PRODUCT_MONTHLY } = require('../config/iap-product-contract');

const STOP_BEFORE = '1810000000016_iap_event_ordering_audit';
async function filterExistingTables(client, names) {
  const existing = [];
  for (const tbl of names) {
    const { rows } = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [tbl]
    );
    if (rows.length) existing.push(tbl);
  }
  return existing;
}

function requireLocalUrl(t) {
  const url = process.env.DATABASE_URL;
  if (isMockDatabaseUrl(url)) {
    t.skip('DATABASE_URL not set');
    return null;
  }
  if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
    t.skip('disposable migration tests require localhost DATABASE_URL');
    return null;
  }
  return url;
}

async function seedPre0016Data(client) {
  const activeFamily = crypto.randomUUID();
  const expiredFamily = crypto.randomUUID();
  const lifetimeFamily = crypto.randomUUID();

  await client.query(
    `INSERT INTO family (id, name, is_lifetime_free, subscription_status, rc_customer_id)
     VALUES ($1, 'Active IAP', false, 'active', 'rc_active_1'),
            ($2, 'Expired IAP', false, 'expired', 'rc_expired_1'),
            ($3, 'Lifetime', true, 'none', NULL)`,
    [activeFamily, expiredFamily, lifetimeFamily]
  );

  await client.query(
    `INSERT INTO iap_webhook_log (
       revenuecat_event_id, event_type, family_id, product_id, processing_outcome
     ) VALUES ('evt_seed_1', 'RENEWAL', $1, $3, 'applied'),
              ('evt_seed_2', 'EXPIRATION', $2, $3, 'applied')`,
    [activeFamily, expiredFamily, STORE_PRODUCT_MONTHLY]
  );

  return { activeFamily, expiredFamily, lifetimeFamily };
}

async function assertIapColumnsExist(client) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'family'
       AND column_name IN (
         'iap_last_event_timestamp_ms',
         'iap_last_applied_environment',
         'iap_last_applied_product_id',
         'iap_last_revenuecat_event_id',
         'iap_last_event_type'
       )`
  );
  assert.equal(rows.length, 5);
}

describe('migration IAP safety (disposable DBs)', () => {
  test('A: empty database — full migrate + IAP columns + idempotent second run', async (t) => {
    const baseUrl = requireLocalUrl(t);
    if (!baseUrl) return;

    const releaseLock = await acquireDbTestLock();
    const dbName = `iap_mig_test_${Date.now()}_a`;
    let url;
    try {
      url = await createDisposableDatabase(baseUrl, dbName);
      runMigrate(url);

      const pool = makePool(url);
      const client = await pool.connect();
      try {
        await assertIapColumnsExist(client);
        const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM _migrations');
        assert.ok(rows[0].n > 10);
      } finally {
        client.release();
        await pool.end();
      }

      runMigrate(url);
    } finally {
      if (url) await dropDisposableDatabase(baseUrl, dbName);
      await releaseLock();
    }
  });

  test('B: baseline before 0016 — forward migrate preserves family + audit data', async (t) => {
    const baseUrl = requireLocalUrl(t);
    if (!baseUrl) return;

    const releaseLock = await acquireDbTestLock();
    const dbName = `iap_mig_test_${Date.now()}_b`;
    let url;
    try {
      url = await createDisposableDatabase(baseUrl, dbName);
      await runMigrationsUpTo(url, STOP_BEFORE);

      const pool = makePool(url);
      const client = await pool.connect();
      let beforeChecksum;
      let beforeCounts;
      try {
        await seedPre0016Data(client);
        beforeChecksum = await familyStableBusinessChecksum(client);
        beforeCounts = await tableRowCounts(client, await filterExistingTables(client, [
          'family', 'iap_webhook_log', 'feature_flag', 'parent', 'child', 'reward',
        ]));
      } finally {
        client.release();
        await pool.end();
      }

      runMigrate(url);

      const pool2 = makePool(url);
      const client2 = await pool2.connect();
      try {
        const afterChecksum = await familyStableBusinessChecksum(client2);
        assert.equal(afterChecksum, beforeChecksum);
        const afterCounts = await tableRowCounts(client2, Object.keys(beforeCounts));
        for (const key of Object.keys(beforeCounts)) {
          assert.equal(afterCounts[key], beforeCounts[key], `count mismatch ${key}`);
        }
        await assertIapColumnsExist(client2);
      } finally {
        client2.release();
        await pool2.end();
      }
    } finally {
      if (url) await dropDisposableDatabase(baseUrl, dbName);
      await releaseLock();
    }
  });

  test('C: restore-like fixture — migrate to HEAD without row loss; second migrate noop', async (t) => {
    const baseUrl = requireLocalUrl(t);
    if (!baseUrl) return;

    const releaseLock = await acquireDbTestLock();
    const dbName = `iap_mig_test_${Date.now()}_c`;
    let url;
    try {
      url = await createDisposableDatabase(baseUrl, dbName);
      await runMigrationsUpTo(url, STOP_BEFORE);

      const pool = makePool(url);
      const client = await pool.connect();
      let familiesBefore;
      try {
        await seedPre0016Data(client);
        const { rows: fam } = await client.query('SELECT id FROM family WHERE is_lifetime_free = false LIMIT 1');
        const familyId = fam[0].id;
        const parentRes = await client.query(
          `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
           VALUES ($1, 'hash', $2, 'Parent', true, true) RETURNING id`,
          [`p-${Date.now()}@example.com`, familyId]
        );
        await client.query(
          `INSERT INTO child (family_id, name, emoji, username) VALUES ($1, 'Barn', '⭐', $2)`,
          [familyId, `child-${Date.now()}`]
        );
        await client.query(
          `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, (SELECT id FROM child WHERE family_id = $2 LIMIT 1), 'primary')`,
          [parentRes.rows[0].id, familyId]
        );
        familiesBefore = await familyStableBusinessChecksum(client);
      } finally {
        client.release();
        await pool.end();
      }

      runMigrate(url);
      runMigrate(url);

      const pool2 = makePool(url);
      const client2 = await pool2.connect();
      try {
        const familiesAfter = await familyStableBusinessChecksum(client2);
        assert.equal(familiesAfter, familiesBefore);
        const { rows: mig } = await client2.query(
          `SELECT name FROM _migrations WHERE name IN ($1, $2)`,
          [STOP_BEFORE, '1810130000000_iap_event_ordering_tiebreak']
        );
        assert.ok(mig.length >= 1);
      } finally {
        client2.release();
        await pool2.end();
      }
    } finally {
      if (url) await dropDisposableDatabase(baseUrl, dbName);
      await releaseLock();
    }
  });
});
