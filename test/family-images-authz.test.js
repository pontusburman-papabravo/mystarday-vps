'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');

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

test('family-images /source: cross-family /uploads/ URL returns 403', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const familyA = await registerAndLogin(http.baseUrl, { name: 'Family A' });
    const familyB = await registerAndLogin(http.baseUrl, { name: 'Family B' });
    const familyAId = await familyIdForSession(db, familyA.email);

    const imageUrl = '/uploads/family-a-secret/photo.jpg';
    await db.query(
      `INSERT INTO activity_template (family_id, name, image_url, source)
       VALUES ($1, $2, $3, 'user')`,
      [familyAId, 'Test activity', imageUrl]
    );

    const res = await fetch(
      `${http.baseUrl}/api/family/images/source?url=${encodeURIComponent(imageUrl)}`,
      { headers: { Cookie: cookieHeader(familyB.cookies) } }
    );
    const text = await res.text();
    assert.equal(res.status, 403, text);
    const body = JSON.parse(text);
    assert.match(body.error, /familjen/i);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('family-images /source: same-family activity image_url returns 200 or 404 (not 403)', async (t) => {
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
    const imageUrl = '/uploads/own-family/photo.jpg';

    await db.query(
      `INSERT INTO activity_template (family_id, name, image_url, source)
       VALUES ($1, $2, $3, 'user')`,
      [familyId, 'Own activity', imageUrl]
    );

    const res = await fetch(
      `${http.baseUrl}/api/family/images/source?url=${encodeURIComponent(imageUrl)}`,
      { headers: { Cookie: cookieHeader(session.cookies) } }
    );
    assert.notEqual(res.status, 403, 'own-family image should pass authz');
    assert.ok(res.status === 200 || res.status === 404 || res.status === 502, `status ${res.status}`);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
