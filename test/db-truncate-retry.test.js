'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { truncatePublicTablesWithRetry, DEADLOCK_SQLSTATE } = require('./helpers/db-truncate-retry.js');

function makePool({ truncateAttempts }) {
  let truncateCalls = 0;
  const pool = {
    query: async (sql) => {
      if (sql.includes('pg_tables')) {
        return { rows: [{ tablename: 'family' }] };
      }
      return { rows: [] };
    },
    connect: async () => ({
      query: async (sql) => {
        if (!sql.startsWith('TRUNCATE')) return { rows: [] };
        truncateCalls++;
        if (truncateCalls < truncateAttempts) {
          const err = new Error('deadlock');
          err.code = DEADLOCK_SQLSTATE;
          throw err;
        }
        return { rows: [] };
      },
      release: () => {},
    }),
  };
  return { pool, getTruncateCalls: () => truncateCalls };
}

test('truncatePublicTablesWithRetry: 40P01 then success', async () => {
  const { pool, getTruncateCalls } = makePool({ truncateAttempts: 2 });
  const logs = [];
  await truncatePublicTablesWithRetry(pool, { log: (m) => logs.push(m), maxAttempts: 3 });
  assert.equal(getTruncateCalls(), 2);
  assert.match(logs[0], /attempt 1 SQLSTATE 40P01/);
});

test('truncatePublicTablesWithRetry: three 40P01 fails', async () => {
  const { pool } = makePool({ truncateAttempts: 99 });
  await assert.rejects(
    () => truncatePublicTablesWithRetry(pool, { maxAttempts: 3, log: () => {} }),
    (err) => err.code === DEADLOCK_SQLSTATE
  );
});

test('truncatePublicTablesWithRetry: 23505 not retried', async () => {
  const pool = {
    query: async (sql) => {
      if (sql.includes('pg_tables')) return { rows: [{ tablename: 'family' }] };
      return { rows: [] };
    },
    connect: async () => ({
      query: async () => {
        const err = new Error('unique');
        err.code = '23505';
        throw err;
      },
      release: () => {},
    }),
  };
  await assert.rejects(
    () => truncatePublicTablesWithRetry(pool, { log: () => {} }),
    (err) => err.code === '23505'
  );
});

test('truncatePublicTablesWithRetry: generic error not retried', async () => {
  const pool = {
    query: async (sql) => {
      if (sql.includes('pg_tables')) return { rows: [{ tablename: 'family' }] };
      return { rows: [] };
    },
    connect: async () => ({
      query: async () => {
        throw new Error('boom');
      },
      release: () => {},
    }),
  };
  await assert.rejects(() => truncatePublicTablesWithRetry(pool, { log: () => {} }));
});
