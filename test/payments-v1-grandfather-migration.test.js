'use strict';

/**
 * Proves payments_v1 grandfather migration backfill is SE-scoped (not global).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');

const DEFAULT_PAYMENT_START_AT = '2026-10-01T00:00:00+02:00';
const PRE_CUTOFF = '2026-09-01T00:00:00+02:00';
const POST_CUTOFF = '2026-11-01T00:00:00+02:00';

async function runGrandfatherBackfill(client) {
  const { rows } = await client.query(`
    INSERT INTO family_entitlements (
      family_id, entitlement_key, source, source_reference, status,
      starts_at, expires_at, granted_at, metadata
    )
    SELECT
      f.id,
      'basic',
      'grandfathered',
      'payment_start_cutoff',
      'grandfathered',
      f.created_at,
      NULL,
      NOW(),
      jsonb_build_object(
        'backfill', true,
        'payment_start_at', $1::text,
        'country_code', COALESCE(f.country_code, 'SE')
      )
    FROM family f
    WHERE f.created_at < $2::timestamptz
      AND COALESCE(f.country_code, 'SE') = 'SE'
      AND NOT EXISTS (
        SELECT 1 FROM family_entitlements fe
        WHERE fe.family_id = f.id
          AND fe.entitlement_key = 'basic'
          AND fe.source = 'grandfathered'
          AND fe.revoked_at IS NULL
      )
    RETURNING family_id
  `, [DEFAULT_PAYMENT_START_AT, DEFAULT_PAYMENT_START_AT]);
  return rows.map((r) => r.family_id);
}

async function insertFamily(client, { countryCode, createdAt, nameSuffix }) {
  const id = crypto.randomUUID();
  const marketRegion = countryCode === 'GB' ? 'UK' : (countryCode === 'US' ? 'US' : 'EU');
  await client.query(
    `INSERT INTO family (id, name, subscription_status, is_lifetime_free, created_at, country_code, market_region)
     VALUES ($1, $2, 'none', false, $3::timestamptz, $4, $5)`,
    [id, `MigTest ${nameSuffix}`, createdAt, countryCode, marketRegion]
  );
  return id;
}

test('payments v1 migration grandfather backfill is SE-scoped', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const sePre = await insertFamily(client, { countryCode: 'SE', createdAt: PRE_CUTOFF, nameSuffix: 'SE-pre' });
    const iePre = await insertFamily(client, { countryCode: 'IE', createdAt: PRE_CUTOFF, nameSuffix: 'IE-pre' });
    const noPre = await insertFamily(client, { countryCode: 'NO', createdAt: PRE_CUTOFF, nameSuffix: 'NO-pre' });
    const dkPre = await insertFamily(client, { countryCode: 'DK', createdAt: PRE_CUTOFF, nameSuffix: 'DK-pre' });
    const gbPre = await insertFamily(client, { countryCode: 'GB', createdAt: PRE_CUTOFF, nameSuffix: 'GB-pre' });
    const sePost = await insertFamily(client, { countryCode: 'SE', createdAt: POST_CUTOFF, nameSuffix: 'SE-post' });

    await client.query(
      `INSERT INTO family_entitlements (
         family_id, entitlement_key, source, source_reference, status, granted_at, metadata
       ) VALUES ($1, 'basic', 'grandfathered', 'manual', 'grandfathered', NOW(), '{"manual_migration":true}'::jsonb)`,
      [iePre]
    );

    const backfilled = await runGrandfatherBackfill(client);

    assert.ok(backfilled.includes(sePre), 'SE pre-cutoff grandfathered');
    assert.ok(!backfilled.includes(iePre), 'IE pre-cutoff excluded');
    assert.ok(!backfilled.includes(noPre), 'NO pre-cutoff excluded');
    assert.ok(!backfilled.includes(dkPre), 'DK pre-cutoff excluded');
    assert.ok(!backfilled.includes(gbPre), 'GB pre-cutoff excluded');
    assert.ok(!backfilled.includes(sePost), 'SE post-cutoff excluded');

    const ieEnt = await client.query(
      `SELECT COUNT(*)::int AS c FROM family_entitlements
       WHERE family_id = $1 AND source = 'grandfathered' AND revoked_at IS NULL`,
      [iePre]
    );
    assert.equal(ieEnt.rows[0].c, 1, 'existing IE grandfather row preserved');

    // Legacy NULL country_code rows cannot be inserted post schema migration 1810000000007
    // (NOT NULL DEFAULT 'SE'), but the backfill SQL still COALESCEs for safety at deploy time.
    const nullLegacy = await client.query(`
      SELECT f.id
      FROM (SELECT gen_random_uuid() AS id, $1::timestamptz AS created_at, NULL::char(2) AS country_code) f
      WHERE f.created_at < $2::timestamptz
        AND COALESCE(f.country_code, 'SE') = 'SE'
    `, [PRE_CUTOFF, DEFAULT_PAYMENT_START_AT]);
    assert.equal(nullLegacy.rowCount, 1, 'NULL country legacy semantics treat missing as SE');

    await client.query('ROLLBACK');
  } finally {
    client.release();
    await db.cleanup();
  }
});
