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

async function familyIdForSession(db, email) {
  const { rows } = await db.query(
    'SELECT family_id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase()]
  );
  return rows[0].family_id;
}

test('pedagog-day-comments POST: cross-family childId returns 403 and creates no row', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const familyA = await registerAndLogin(http.baseUrl, { name: 'Pedagog A' });
    const familyB = await registerAndLogin(http.baseUrl, { name: 'Pedagog B' });
    const familyAId = await familyIdForSession(db, familyA.email);
    const familyBId = await familyIdForSession(db, familyB.email);

    const familySubscriptions = require('../db/family-subscriptions');
    await familySubscriptions.grantComponent(familyAId, 'pedagog');
    await familySubscriptions.grantComponent(familyBId, 'pedagog');

    const childB = await createChild(http.baseUrl, familyB, { name: 'Barn B' });

    const before = await db.query('SELECT COUNT(*)::int AS n FROM pedagog_day_comment');
    const res = await fetch(`${http.baseUrl}/api/pedagog/day-comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(familyA.cookies),
        'X-CSRF-Token': familyA.csrfToken,
      },
      body: JSON.stringify({
        childId: childB,
        date: '2026-06-15',
        content: 'Cross-family intrusion attempt',
      }),
    });
    const text = await res.text();
    assert.equal(res.status, 403, text);
    const body = JSON.parse(text);
    assert.match(body.error, /åtkomst/i);

    const after = await db.query('SELECT COUNT(*)::int AS n FROM pedagog_day_comment');
    assert.equal(after.rows[0].n, before.rows[0].n, 'no comment row should be created');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('pedagog-day-comments POST: same-family child succeeds', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const familyId = await familyIdForSession(db, session.email);
    const familySubscriptions = require('../db/family-subscriptions');
    await familySubscriptions.grantComponent(familyId, 'pedagog');

    const childId = await createChild(http.baseUrl, session, { name: 'Eget barn' });

    const res = await fetch(`${http.baseUrl}/api/pedagog/day-comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({
        childId,
        date: '2026-06-15',
        content: 'Legit comment',
      }),
    });
    const text = await res.text();
    assert.equal(res.status, 200, text);
    const body = JSON.parse(text);
    assert.equal(body.child_id, childId);
    assert.equal(body.content, 'Legit comment');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
