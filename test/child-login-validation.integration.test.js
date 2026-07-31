'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const SWEDISH_LEAK = /Ogiltiga värden|Användarnamn krävs|PIN-koden måste|Namn krävs/i;

async function postChildLogin(baseUrl, body) {
  const res = await fetch(`${baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json, text };
}

test('child-login validation returns stable codes without Swedish user text', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const cases = [
      [{ pin: '1234' }, 400, 'CHILD_NAME_REQUIRED'],
      [{ username: '', pin: '1234' }, 400, 'CHILD_NAME_REQUIRED'],
      [{ username: 'Anna' }, 400, 'CHILD_PIN_REQUIRED'],
      [{ username: 'Anna', pin: '12' }, 400, 'CHILD_PIN_INVALID_FORMAT'],
      [{ username: 'Anna', pin: 'abcd' }, 400, 'CHILD_PIN_INVALID_FORMAT'],
      [{ username: 'x'.repeat(51), pin: '1234' }, 400, 'CHILD_NAME_INVALID'],
    ];

    for (const [payload, expectStatus, expectCode] of cases) {
      const { status, body, text } = await postChildLogin(http.baseUrl, payload);
      assert.equal(status, expectStatus, JSON.stringify(payload));
      assert.equal(body.code, expectCode, JSON.stringify(payload));
      assert.equal(body.error, undefined, 'must not expose Swedish error string');
      assert.equal(body.details, undefined, 'must not expose validation details to client');
      assert.doesNotMatch(text, SWEDISH_LEAK, JSON.stringify(payload));
    }

    const email = `child-login-val-${Date.now()}@example.com`;
    const passwordHash = await hashPassword('parent-pass-1');
    const familyRes = await db.query(
      `INSERT INTO family (name, timezone, preferred_locale, is_lifetime_free)
       VALUES ('Login val', 'Europe/Stockholm', 'en-GB', true) RETURNING id`
    );
    const familyId = familyRes.rows[0].id;
    await db.query(
      `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
       VALUES ($1, $2, $3, 'Parent', true, true)`,
      [email, passwordHash, familyId]
    );
    await db.query(
      `INSERT INTO child (family_id, name, emoji, username, sort_order, pin)
       VALUES ($1, 'Kid', '🌟', 'kidpin', 0, $2)`,
      [familyId, await hashPassword('5678')]
    );

    const wrongPin = await postChildLogin(http.baseUrl, { username: 'kidpin', pin: '0000' });
    assert.equal(wrongPin.status, 401);
    assert.equal(wrongPin.body.code, 'CHILD_PIN_INVALID');
    assert.equal(wrongPin.body.attempts_remaining != null || wrongPin.body.attempts_remaining === null, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
