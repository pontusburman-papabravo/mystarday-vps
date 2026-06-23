'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');

test('setupTestDb connects and can SELECT 1', async (t) => {
  const db = await setupTestDb({ truncate: false });
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  try {
    const result = await db.query('SELECT 1 AS ok');
    assert.equal(result.rows[0].ok, 1);
  } finally {
    await db.cleanup();
  }
});
