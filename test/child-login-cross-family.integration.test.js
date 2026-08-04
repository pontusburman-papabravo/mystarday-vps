'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');
const jwt = require('jsonwebtoken');
const config = require('../src/lib/config');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

test('anonymous child login cannot cross families via display name', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const pinHash = await hashPassword('1234');
  const name = `samma-namn-${Date.now()}`;

  const f1 = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('F1', 'Europe/Stockholm', true) RETURNING id`
  );
  const f2 = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('F2', 'Europe/Stockholm', true) RETURNING id`
  );

  await db.query(
    `INSERT INTO child (family_id, name, username, pin, emoji) VALUES ($1, $2, 'user_a', $3, '⭐'), ($4, $2, 'user_b', $3, '⭐')`,
    [f1.rows[0].id, name, pinHash, f2.rows[0].id]
  );

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const res = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, pin: '1234' }),
    });
    assert.equal(res.status, 401);

    const okA = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user_a', pin: '1234' }),
    });
    assert.equal(okA.status, 200);

    const okB = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user_b', pin: '1234' }),
    });
    assert.equal(okB.status, 200);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('anonymous child login works by unique display name without parent session', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const pinHash = await hashPassword('4321');
  const displayName = `unikt-barn-${Date.now()}`;
  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Fam', 'Europe/Stockholm', true) RETURNING id`
  );
  await db.query(
    `INSERT INTO child (family_id, name, username, pin, emoji) VALUES ($1, $2, 'login_user_x', $3, '⭐')`,
    [familyRes.rows[0].id, displayName, pinHash]
  );

  const { createApp } = require('../app');
  const http = await listenApp(createApp());

  try {
    const res = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: displayName, pin: '4321' }),
    });
    assert.equal(res.status, 200);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('display name login works only within parent session family', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const pinHash = await hashPassword('5678');
  const displayName = `picker-barn-${Date.now()}`;
  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Fam', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;
  const parentRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, 'P', true, true) RETURNING id`,
    [`picker-${Date.now()}@example.com`, await hashPassword('parent-pass-1'), familyId]
  );
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, username, pin, emoji) VALUES ($1, $2, 'unique_child', $3, '⭐') RETURNING id`,
    [familyId, displayName, pinHash]
  );
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
    [parentRes.rows[0].id, childRes.rows[0].id]
  );

  const parentToken = jwt.sign(
    { type: 'parent', id: parentRes.rows[0].id, familyId },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
  const session = Buffer.from(JSON.stringify({ access_token: parentToken })).toString('base64');

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const res = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${parentToken}; stjarndag_parent_session=${session}`,
      },
      body: JSON.stringify({ username: displayName, pin: '5678' }),
    });
    assert.equal(res.status, 200);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
