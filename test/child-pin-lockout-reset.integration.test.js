'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const pinLockout = require('../db/pin-lockout');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function loadCreateApp() {
  delete require.cache[require.resolve('../app')];
  return require('../app').createApp;
}

async function createChildWithPin(baseUrl, session, { name = 'Barnet', emoji = '🌟' } = {}) {
  const res = await fetch(`${baseUrl}/api/children`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ name, emoji, birthday: '2018-01-01' }),
  });
  const text = await res.text();
  assert.equal(res.status, 201, text);
  const body = JSON.parse(text);
  return { id: body.id, pin: body.pin, username: body.username, name: body.name };
}

async function putChildPin(baseUrl, session, childId, pin) {
  return fetch(`${baseUrl}/api/children/${childId}/pin`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ pin }),
  });
}

async function childLogin(baseUrl, username, pin) {
  return fetch(`${baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
}

async function failChildLoginUntilLocked(baseUrl, username, wrongPin = '0000') {
  let lastStatus = 0;
  for (let i = 0; i < 8; i++) {
    const res = await childLogin(baseUrl, username, wrongPin);
    lastStatus = res.status;
    if (lastStatus === 429) break;
  }
  assert.equal(lastStatus, 429, 'expected lockout after repeated failures');
}

describe('child PIN change clears lockout (#1024)', () => {
  test('TEST 1: active lockout cleared — new PIN works immediately', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      const child = await createChildWithPin(http.baseUrl, session);
      await failChildLoginUntilLocked(http.baseUrl, child.username);

      const lockedBefore = await pinLockout.checkLockout(child.id);
      assert.equal(lockedBefore.locked, true);

      const changeRes = await putChildPin(http.baseUrl, session, child.id, '7392');
      assert.equal(changeRes.status, 200, await changeRes.text());

      const lockedAfter = await pinLockout.checkLockout(child.id);
      assert.equal(lockedAfter.locked, false);

      const loginRes = await childLogin(http.baseUrl, child.username, '7392');
      assert.equal(loginRes.status, 200, await loginRes.text());
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('TEST 2: attempt_count > 0 but not locked resets to 0 on PIN change', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      const child = await createChildWithPin(http.baseUrl, session);

      for (let i = 0; i < 3; i++) {
        const res = await childLogin(http.baseUrl, child.username, '0000');
        assert.equal(res.status, 401);
      }
      const row = await pinLockout.getLockout(child.id);
      assert.ok(row);
      assert.equal(row.attempt_count, 3);
      assert.ok(!row.locked_until || new Date(row.locked_until) <= new Date());

      const changeRes = await putChildPin(http.baseUrl, session, child.id, '6284');
      assert.equal(changeRes.status, 200, await changeRes.text());

      const after = await pinLockout.getLockout(child.id);
      assert.equal(after.attempt_count, 0);
      assert.equal(after.locked_until, null);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('TEST 3–4: old PIN fails and new PIN authenticates after change', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      const child = await createChildWithPin(http.baseUrl, session);
      const oldPin = child.pin;

      const changeRes = await putChildPin(http.baseUrl, session, child.id, '4826');
      assert.equal(changeRes.status, 200, await changeRes.text());

      const oldLogin = await childLogin(http.baseUrl, child.username, oldPin);
      assert.equal(oldLogin.status, 401);
      const oldBody = await oldLogin.json();
      assert.equal(oldBody.code, 'CHILD_PIN_INVALID');

      const newLogin = await childLogin(http.baseUrl, child.username, '4826');
      assert.equal(newLogin.status, 200, await newLogin.text());
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('TEST 5: failed PIN update does not clear existing lockout', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      const child = await createChildWithPin(http.baseUrl, session);
      await failChildLoginUntilLocked(http.baseUrl, child.username);
      const before = await pinLockout.getLockout(child.id);

      const weakRes = await putChildPin(http.baseUrl, session, child.id, '1111');
      assert.equal(weakRes.status, 400, await weakRes.text());

      const after = await pinLockout.getLockout(child.id);
      assert.equal(after.attempt_count, before.attempt_count);
      assert.deepEqual(
        after.locked_until ? new Date(after.locked_until).toISOString() : null,
        before.locked_until ? new Date(before.locked_until).toISOString() : null
      );
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('TEST 6: rollback leaves credential and lockout exactly as before request', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }

    const pinLockoutPath = require.resolve('../db/pin-lockout');
    const childrenPath = require.resolve('../src/routes/children');
    const origClear = pinLockout.clearLockout;
    pinLockout.clearLockout = async function failingClear(childId, client) {
      return origClear.call(this, childId, client).then(() => {
        throw new Error('simulated lockout clear failure');
      });
    };
    delete require.cache[childrenPath];
    delete require.cache[require.resolve('../app')];

    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      const child = await createChildWithPin(http.baseUrl, session);
      await failChildLoginUntilLocked(http.baseUrl, child.username);

      const credBefore = await db.query(
        'SELECT pin, pin_fingerprint FROM child WHERE id = $1',
        [child.id]
      );
      const lockoutBefore = await pinLockout.getLockout(child.id);

      const changeRes = await putChildPin(http.baseUrl, session, child.id, '5937');
      assert.equal(changeRes.status, 500, await changeRes.text());

      const credAfter = await db.query(
        'SELECT pin, pin_fingerprint FROM child WHERE id = $1',
        [child.id]
      );
      const lockoutAfter = await pinLockout.getLockout(child.id);

      assert.equal(credAfter.rows[0].pin, credBefore.rows[0].pin);
      assert.equal(credAfter.rows[0].pin_fingerprint, credBefore.rows[0].pin_fingerprint);
      assert.equal(lockoutAfter.attempt_count, lockoutBefore.attempt_count);
      assert.deepEqual(
        lockoutAfter.locked_until ? new Date(lockoutAfter.locked_until).toISOString() : null,
        lockoutBefore.locked_until ? new Date(lockoutBefore.locked_until).toISOString() : null
      );

      const stillLocked = await childLogin(http.baseUrl, child.username, child.pin);
      assert.equal(stillLocked.status, 429, 'original PIN login still blocked by lockout');
    } finally {
      await http.close();
      pinLockout.clearLockout = origClear;
      delete require.cache[pinLockoutPath];
      delete require.cache[childrenPath];
      delete require.cache[require.resolve('../app')];
      await db.cleanup();
    }
  });

  test('TEST 7: unauthorized actor cannot change child PIN', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const http = await listenApp(loadCreateApp());
    try {
      const owner = await registerAndLogin(http.baseUrl);
      const child = await createChildWithPin(http.baseUrl, owner);
      const outsider = await registerAndLogin(http.baseUrl);

      const res = await putChildPin(http.baseUrl, outsider, child.id, '7392');
      assert.equal(res.status, 403, await res.text());
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('TEST 8: manual parent unlock endpoint still works', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const http = await listenApp(loadCreateApp());
    try {
      const session = await registerAndLogin(http.baseUrl);
      const child = await createChildWithPin(http.baseUrl, session);
      await failChildLoginUntilLocked(http.baseUrl, child.username);

      const unlockRes = await fetch(`${http.baseUrl}/api/children/${child.id}/unlock-pin`, {
        method: 'POST',
        headers: {
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
      });
      assert.equal(unlockRes.status, 200, await unlockRes.text());

      const loginRes = await childLogin(http.baseUrl, child.username, child.pin);
      assert.equal(loginRes.status, 200, await loginRes.text());
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
