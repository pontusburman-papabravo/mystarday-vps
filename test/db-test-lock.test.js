'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { acquireDbTestLock, isMockDatabaseUrl, LOCK_KEY } = require('./helpers/db-test-lock.js');

test('acquireDbTestLock releases advisory lock on cleanup', async (t) => {
  const url = process.env.DATABASE_URL;
  if (isMockDatabaseUrl(url)) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const release = await acquireDbTestLock();
  const probe = new Client({
    connectionString: url,
    ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  await probe.connect();
  try {
    const held = await probe.query('SELECT pg_try_advisory_lock($1) AS ok', [LOCK_KEY]);
    assert.equal(held.rows[0].ok, false, 'lock should be held by first acquirer');
  } finally {
    await probe.end();
  }

  await release();

  const probe2 = new Client({
    connectionString: url,
    ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  await probe2.connect();
  try {
    const free = await probe2.query('SELECT pg_try_advisory_lock($1) AS ok', [LOCK_KEY]);
    assert.equal(free.rows[0].ok, true, 'lock should be free after release');
    await probe2.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
  } finally {
    await probe2.end();
  }
});
