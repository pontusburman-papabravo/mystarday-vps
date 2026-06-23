'use strict';

/**
 * G3c — migration/rollback gate for destructive schema phase (A5c/B1 prep).
 * Verifies npm run migrate + down rollback on empty and dev-like DBs.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  isMockDatabaseUrl,
  makePool,
  runMigrate,
  listMigrationsWithDown,
  wipePublicSchema,
  tableExists,
  rollbackLastApplied,
} = require('./helpers/migration-gate.js');

const CORE_TABLE = 'family';

async function appliedMigrationCount(client) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM _migrations');
  return rows[0].n;
}

test('migration inventory: latest folder migration exposes down()', () => {
  const withDown = listMigrationsWithDown();
  assert.ok(withDown.length >= 5, 'expected several migrations with down()');
  const latestFile = fs.readdirSync(path.join(__dirname, '../migrations'))
    .filter((f) => f.endsWith('.js'))
    .sort()
    .pop();
  const latest = withDown.find((m) => m.file === latestFile);
  assert.ok(latest, `latest migration ${latestFile} must define down() for G3c gate`);
});

test('G3c dev-like DB: migrate, rollback latest, re-migrate', async (t) => {
  const url = process.env.DATABASE_URL;
  if (isMockDatabaseUrl(url)) {
    t.skip('DATABASE_URL not set or mock');
    return;
  }

  const pool = makePool(url);
  const client = await pool.connect();
  try {
    runMigrate(url);

    const countBefore = await appliedMigrationCount(client);
    assert.ok(countBefore > 0, 'expected applied migrations');
    assert.equal(await tableExists(client, CORE_TABLE), true, 'family table missing');

    const rolled = await rollbackLastApplied(pool, 1);
    assert.equal(rolled.length, 1);

    const countAfterRollback = await appliedMigrationCount(client);
    assert.equal(countAfterRollback, countBefore - 1);

    runMigrate(url);
    assert.equal(await tableExists(client, CORE_TABLE), true, 'family table missing after re-migrate');

    const countAfterRemigrate = await appliedMigrationCount(client);
    assert.equal(countAfterRemigrate, countBefore, 'migration count should match after rollback + re-migrate');
  } finally {
    client.release();
    await pool.end();
  }
});

test('G3c empty DB: wipe, migrate, rollback latest, re-migrate', async (t) => {
  const url = process.env.DATABASE_URL;
  if (isMockDatabaseUrl(url)) {
    t.skip('DATABASE_URL not set or mock');
    return;
  }

  const pool = makePool(url);
  const client = await pool.connect();
  try {
    await wipePublicSchema(client);
    runMigrate(url);

    const countBefore = await appliedMigrationCount(client);
    assert.ok(countBefore > 0, 'migrate on empty DB should apply folder migrations');
    assert.equal(await tableExists(client, CORE_TABLE), true);

    await rollbackLastApplied(pool, 1);
    assert.equal(await appliedMigrationCount(client), countBefore - 1);

    runMigrate(url);
    assert.equal(await tableExists(client, CORE_TABLE), true);
    assert.equal(await appliedMigrationCount(client), countBefore);
  } finally {
    client.release();
    await pool.end();
  }
});
