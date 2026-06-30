'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const db = require('../src/lib/db');
const { PUSH_REMINDER_SCHEDULER_LOCK_ID } = require('../src/lib/scheduler-constants');
const { runPushReminderNow } = require('../src/lib/push-reminder-scheduler');
const { acquireDbTestLock, isMockDatabaseUrl } = require('./helpers/db-test-lock');

const SCHEDULER_SRC = path.join(__dirname, '../src/lib/push-reminder-scheduler.js');

describe('push reminder advisory lock contracts', () => {
  it('uses a dedicated DB client for advisory locks', () => {
    const src = fs.readFileSync(SCHEDULER_SRC, 'utf8');
    assert.ok(src.includes('db.getClient()'), 'must acquire advisory lock on a dedicated connection');
    assert.ok(
      src.includes("await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID])"),
      'must release advisory lock on the same dedicated connection'
    );
    assert.ok(src.includes('client.release()'), 'must return client to pool in finally');
    assert.ok(!src.includes('fail-open'), 'must not fail open on lock errors');
    assert.ok(!src.includes('lockAcquired = true; // fail-open'), 'must not bypass lock on acquisition failure');
  });
});

describe('push reminder advisory lock integration', () => {
  test('concurrent runPushReminderNow: only one instance enters job body', async (t) => {
    if (isMockDatabaseUrl(process.env.DATABASE_URL)) {
      t.skip('DATABASE_URL not set or mock');
      return;
    }

    const releaseLock = await acquireDbTestLock();
    t.after(async () => {
      await releaseLock();
    });

    const logs = [];
    const origLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
      origLog(...args);
    };
    t.after(() => {
      console.log = origLog;
    });

    await Promise.all([runPushReminderNow(), runPushReminderNow()]);

    const running = logs.filter((line) => line.includes('[PUSH-REMINDER] Running at'));
    const skipping = logs.filter((line) => line.includes('Skipping — another instance holds lock'));

    assert.equal(running.length, 1, 'exactly one instance should run job body');
    assert.equal(skipping.length, 1, 'exactly one instance should skip');
  });

  test('runPushReminderNow skips when advisory lock already held', async (t) => {
    if (isMockDatabaseUrl(process.env.DATABASE_URL)) {
      t.skip('DATABASE_URL not set or mock');
      return;
    }

    const releaseLock = await acquireDbTestLock();
    t.after(async () => {
      await releaseLock();
    });

    const holder = await db.getClient();
    await holder.query('SELECT pg_advisory_lock($1)', [PUSH_REMINDER_SCHEDULER_LOCK_ID]);

    const logs = [];
    const origLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
      origLog(...args);
    };
    t.after(() => {
      console.log = origLog;
    });

    try {
      await runPushReminderNow();
      assert.ok(
        logs.some((line) => line.includes('Skipping — another instance holds lock')),
        'scheduler must skip when another connection holds the lock'
      );
    } finally {
      await holder.query('SELECT pg_advisory_unlock($1)', [PUSH_REMINDER_SCHEDULER_LOCK_ID]);
      holder.release();
    }
  });

  test('runPushReminderNow releases advisory lock after completion', async (t) => {
    if (isMockDatabaseUrl(process.env.DATABASE_URL)) {
      t.skip('DATABASE_URL not set or mock');
      return;
    }

    const releaseLock = await acquireDbTestLock();
    t.after(async () => {
      await releaseLock();
    });

    await runPushReminderNow();

    const probe = await db.getClient();
    try {
      const { rows } = await probe.query(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [PUSH_REMINDER_SCHEDULER_LOCK_ID]
      );
      assert.equal(rows[0].acquired, true, 'lock should be free after job completes');
      await probe.query('SELECT pg_advisory_unlock($1)', [PUSH_REMINDER_SCHEDULER_LOCK_ID]);
    } finally {
      probe.release();
    }
  });

  test('runPushReminderNow releases advisory lock after job error', async (t) => {
    if (isMockDatabaseUrl(process.env.DATABASE_URL)) {
      t.skip('DATABASE_URL not set or mock');
      return;
    }

    const releaseLock = await acquireDbTestLock();
    t.after(async () => {
      await releaseLock();
    });

    let queryCalls = 0;
    const origQuery = db.query;
    db.query = async (...args) => {
      queryCalls += 1;
      if (queryCalls === 1) {
        throw new Error('simulated scheduler failure');
      }
      return origQuery(...args);
    };
    t.after(() => {
      db.query = origQuery;
    });

    const errors = [];
    const origError = console.error;
    console.error = (...args) => {
      errors.push(args.join(' '));
      origError(...args);
    };
    t.after(() => {
      console.error = origError;
    });

    await runPushReminderNow();

    assert.ok(
      errors.some((line) => line.includes('[PUSH-REMINDER] Job error:')),
      'job error must be logged without crashing scheduler'
    );

    const probe = await db.getClient();
    try {
      const { rows } = await probe.query(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [PUSH_REMINDER_SCHEDULER_LOCK_ID]
      );
      assert.equal(rows[0].acquired, true, 'lock should be free after job error');
      await probe.query('SELECT pg_advisory_unlock($1)', [PUSH_REMINDER_SCHEDULER_LOCK_ID]);
    } finally {
      probe.release();
    }
  });
});
