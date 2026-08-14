'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');

test('setupTestDb connects and can SELECT 1', async (t) => {
  if (process.env.TEST_DB_DESTRUCTIVE_CONFIRM !== '1' || !process.env.TEST_DATABASE_URL) {
    t.skip('TEST_DATABASE_URL + TEST_DB_DESTRUCTIVE_CONFIRM=1 required');
    return;
  }
  const db = await setupTestDb({ truncate: false });
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL (mock_test or unset)');
    return;
  }

  try {
    const result = await db.query('SELECT 1 AS ok');
    assert.equal(result.rows[0].ok, 1);
  } finally {
    await db.cleanup();
  }
});
