'use strict';

/**
 * N9 — markSent must guard on status (same pattern as reject/markFailed).
 * A second call for the same record must be a no-op, not re-stamp sent_at —
 * a re-stamp would shift the win-back attribution window (N7).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');

test('markSent: second call for an already-sent record is a no-op', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }
  // Required after the DB check — db/win-back-email-log.js loads src/lib/db.js,
  // which exits the process immediately if DATABASE_URL is unset.
  const winBackLog = require('../db/win-back-email-log');

  try {
    const pending = await winBackLog.insertPending({
      familyId: null,
      parentId: null,
      parentEmail: 'marksent-test@example.com',
      parentName: 'Test Parent',
      childName: 'Testbarn',
    });
    await winBackLog.approve(pending.id);

    const first = await winBackLog.markSent(pending.id);
    assert.ok(first, 'first markSent call should succeed on an approved record');
    assert.equal(first.status, 'sent');
    const firstSentAt = first.sent_at;

    const second = await winBackLog.markSent(pending.id);
    assert.equal(second, null, 'second markSent call must be a no-op (null)');

    const { rows } = await db.query('SELECT status, sent_at FROM win_back_email_log WHERE id = $1', [pending.id]);
    assert.equal(rows[0].status, 'sent');
    assert.equal(
      new Date(rows[0].sent_at).getTime(),
      new Date(firstSentAt).getTime(),
      'sent_at must not be re-stamped by the second call'
    );
  } finally {
    await db.cleanup();
  }
});

test('markSent: refuses a record that is not in approved status', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }
  const winBackLog = require('../db/win-back-email-log');

  try {
    const pending = await winBackLog.insertPending({
      familyId: null,
      parentId: null,
      parentEmail: 'marksent-pending-test@example.com',
      parentName: 'Test Parent',
      childName: 'Testbarn',
    });

    const result = await winBackLog.markSent(pending.id);
    assert.equal(result, null, 'a pending_approval record must not transition directly to sent');

    const { rows } = await db.query('SELECT status, sent_at FROM win_back_email_log WHERE id = $1', [pending.id]);
    assert.equal(rows[0].status, 'pending_approval');
    assert.equal(rows[0].sent_at, null);
  } finally {
    await db.cleanup();
  }
});
