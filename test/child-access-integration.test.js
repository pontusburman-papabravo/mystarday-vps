'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

test('child daily-log access: valid parent 200, revoked parent 403', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session);

    const validRes = await fetch(
      `${http.baseUrl}/api/children/${childId}/daily-log?date=2026-06-01`,
      { headers: { Cookie: cookieHeader(session.cookies) } }
    );
    const validText = await validRes.text();
    assert.equal(validRes.status, 200, validText);
    const validBody = JSON.parse(validText);
    assert.ok(validBody.log, 'daily-log should include log payload');
    assert.ok(Array.isArray(validBody.items), 'daily-log should include items array');

    const parent = await db.query(
      'SELECT id FROM parent WHERE LOWER(email) = $1',
      [session.email.toLowerCase()]
    );
    await db.query(
      'UPDATE parent_child SET revoked_at = NOW() WHERE parent_id = $1 AND child_id = $2',
      [parent.rows[0].id, childId]
    );

    const revokedRes = await fetch(
      `${http.baseUrl}/api/children/${childId}/daily-log?date=2026-06-01`,
      { headers: { Cookie: cookieHeader(session.cookies) } }
    );
    const revokedText = await revokedRes.text();
    assert.equal(revokedRes.status, 403, revokedText);
    const revokedBody = JSON.parse(revokedText);
    assert.match(revokedBody.error, /åtkomst/i);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
