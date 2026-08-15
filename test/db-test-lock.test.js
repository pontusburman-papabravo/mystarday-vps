'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { acquireDbTestLock, isMockDatabaseUrl, LOCK_KEY } = require('./helpers/db-test-lock.js');
const { REFUSED_CODE } = require('../scripts/lib/test-database-safety.cjs');

test('acquireDbTestLock refuses application DATABASE_URL fallback', async () => {
  const prev = {
    DATABASE_URL: process.env.DATABASE_URL,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    TEST_DB_DESTRUCTIVE_CONFIRM: process.env.TEST_DB_DESTRUCTIVE_CONFIRM,
    APPLICATION_DATABASE_URL: process.env.APPLICATION_DATABASE_URL,
    TEST_DATABASE_VALIDATED: process.env.TEST_DATABASE_VALIDATED,
  };

  delete process.env.TEST_DATABASE_URL;
  delete process.env.APPLICATION_DATABASE_URL;
  delete process.env.TEST_DATABASE_VALIDATED;
  process.env.DATABASE_URL = 'postgresql://app:secret@localhost:5432/mystarday';
  process.env.TEST_DB_DESTRUCTIVE_CONFIRM = '1';

  try {
    await assert.rejects(
      () => acquireDbTestLock(),
      (err) => err.code === REFUSED_CODE && err.reason === 'missing_test_database_url'
    );
  } finally {
    if (prev.DATABASE_URL === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prev.DATABASE_URL;
    if (prev.TEST_DATABASE_URL === undefined) delete process.env.TEST_DATABASE_URL;
    else process.env.TEST_DATABASE_URL = prev.TEST_DATABASE_URL;
    if (prev.TEST_DB_DESTRUCTIVE_CONFIRM === undefined) delete process.env.TEST_DB_DESTRUCTIVE_CONFIRM;
    else process.env.TEST_DB_DESTRUCTIVE_CONFIRM = prev.TEST_DB_DESTRUCTIVE_CONFIRM;
    if (prev.APPLICATION_DATABASE_URL === undefined) delete process.env.APPLICATION_DATABASE_URL;
    else process.env.APPLICATION_DATABASE_URL = prev.APPLICATION_DATABASE_URL;
    if (prev.TEST_DATABASE_VALIDATED === undefined) delete process.env.TEST_DATABASE_VALIDATED;
    else process.env.TEST_DATABASE_VALIDATED = prev.TEST_DATABASE_VALIDATED;
  }
});

test('acquireDbTestLock releases advisory lock on cleanup', async (t) => {
  const url = process.env.TEST_DATABASE_URL;
  if (isMockDatabaseUrl(url)) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }
  if (process.env.TEST_DB_DESTRUCTIVE_CONFIRM !== '1') {
    t.skip('TEST_DB_DESTRUCTIVE_CONFIRM=1 required');
    return;
  }

  const release = await acquireDbTestLock(url);
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
