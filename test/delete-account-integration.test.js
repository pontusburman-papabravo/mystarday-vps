'use strict';

/**
 * Integration: DELETE /api/family/delete-account must permanently remove the family.
 * Regression for support ticket — RADERA confirmation returned generic 500.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

test('delete-account SQL does not reference waitlist.family_id', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/family/account.js'), 'utf8');
  assert.doesNotMatch(src, /DELETE FROM waitlist WHERE family_id/);
  assert.match(src, /DELETE FROM pin_notification_log/);
  assert.match(src, /DELETE FROM analytics_events WHERE family_id/);
});

test('DELETE /api/family/delete-account removes family and parent session', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl, { name: 'Delete Account Test' });
    const childId = await createChild(http.baseUrl, session, { name: 'DeleteChild' });

    const parentBefore = await db.query(
      'SELECT id, family_id FROM parent WHERE LOWER(email) = $1',
      [session.email.toLowerCase()]
    );
    assert.equal(parentBefore.rows.length, 1);
    const { id: parentId, family_id: familyId } = parentBefore.rows[0];

    await db.query(
      `INSERT INTO pin_notification_log (child_id, family_id, channel)
       VALUES ($1, $2, 'email')`,
      [childId, familyId]
    );
    await db.query(
      `INSERT INTO analytics_events (family_id, event_type, metadata)
       VALUES ($1, 'test_delete_account', '{}'::jsonb)`,
      [familyId]
    );

    const deleteRes = await fetch(`${http.baseUrl}/api/family/delete-account`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
        'Content-Type': 'application/json',
      },
    });
    const deleteText = await deleteRes.text();
    assert.equal(deleteRes.status, 200, deleteText);
    const deleteBody = JSON.parse(deleteText);
    assert.equal(deleteBody.success, true);

    const parentAfter = await db.query('SELECT id FROM parent WHERE id = $1', [parentId]);
    const familyAfter = await db.query('SELECT id FROM family WHERE id = $1', [familyId]);
    const childAfter = await db.query('SELECT id FROM child WHERE id = $1', [childId]);
    const pinLogAfter = await db.query(
      'SELECT id FROM pin_notification_log WHERE family_id = $1',
      [familyId]
    );
    const analyticsAfter = await db.query(
      'SELECT id FROM analytics_events WHERE family_id = $1',
      [familyId]
    );

    assert.equal(parentAfter.rows.length, 0, 'parent row must be deleted');
    assert.equal(familyAfter.rows.length, 0, 'family row must be deleted');
    assert.equal(childAfter.rows.length, 0, 'child row must be deleted');
    assert.equal(pinLogAfter.rows.length, 0, 'pin notification log must be deleted');
    assert.equal(analyticsAfter.rows.length, 0, 'analytics events must be deleted');

    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    assert.ok(meRes.status === 401 || meRes.status === 403, `expected unauth after delete, got ${meRes.status}`);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
