'use strict';

/**
 * Regression matrix for profile picker adult return (Bug A).
 * pragma: allowlist secret
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { FLAG_KEY: TRUSTED_FLAG } = require('../src/lib/trusted-device-flags');
const { FLAG_KEY: ENTRY_FLAG } = require('../src/lib/family-device-entry-flags');
const { FLAG_KEY: DAILY_UX_FLAG } = require('../src/lib/family-device-daily-ux-flags');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const ADULT_FLAG = 'adult_privilege_v1';

async function enableFlags(db) {
  for (const key of [TRUSTED_FLAG, ENTRY_FLAG, DAILY_UX_FLAG, ADULT_FLAG]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

async function enrollShared(http, session) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: 'repro shared' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

async function setParentPin(db, parentId, pin) {
  const pinHash = await hashPassword(pin);
  await db.query('UPDATE parent SET parent_pin_hash = $1 WHERE id = $2', [pinHash, parentId]);
}

async function postSelectParent(baseUrl, cookies, parentId, body) {
  const res = await fetch(`${baseUrl}/api/auth/trusted-device/select-parent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(cookies),
    },
    body: JSON.stringify({ parent_id: parentId, ...body }),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch (_) {
    json = { raw: text };
  }
  return { status: res.status, body: json, headers: getSetCookieHeaders(res) };
}

async function childLogin(http, parentSession, username, pin) {
  const res = await fetch(`${http.baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(parentSession.cookies),
      'X-CSRF-Token': parentSession.csrfToken,
    },
    body: JSON.stringify({ username, pin }),
  });
  assert.equal(res.status, 200, await res.text());
  let cookies = { ...parentSession.cookies };
  for (const header of getSetCookieHeaders(res)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

test('profile switch repro: parent session + select-parent', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFlags(db);

    await t.test('variant 1: parent JWT retained + select-parent', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const childUsername = `kid-${Date.now()}`;
      await createChild(http.baseUrl, session, { name: 'Astrid', emoji: '⭐', username: childUsername });
      const deviceCookies = await enrollShared(http, session);

      const parentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        session.email.toLowerCase(),
      ]);
      const parentId = parentRow.rows[0].id;
      await setParentPin(db, parentId, '4321');

      // Parent still logged in (switchChildMember daily UX path keeps JWT)
      const cookiesWithParentJwt = { ...deviceCookies, ...session.cookies };

      const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(cookiesWithParentJwt) },
      });
      const me = await meRes.json();
      assert.equal(me.type, 'parent');

      const out = await postSelectParent(http.baseUrl, cookiesWithParentJwt, parentId, {
        unlock_method: 'pin',
        pin: '4321',
      });
      assert.equal(out.status, 200, JSON.stringify(out.body));
      assert.equal(out.body.ok, true);
    });

    await t.test('variant 2: parent changes PIN then select-parent with new PIN', async () => {
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'Anna', emoji: '⭐' });
      const deviceCookies = await enrollShared(http, session);

      const parentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        session.email.toLowerCase(),
      ]);
      const parentId = parentRow.rows[0].id;
      await setParentPin(db, parentId, '1111');

      const setPinRes = await fetch(`${http.baseUrl}/api/family/set-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ pin: '9999', confirmPin: '9999', currentPin: '1111' }),
      });
      assert.equal(setPinRes.status, 200, await setPinRes.text());

      const cookiesWithParentJwt = { ...deviceCookies, ...session.cookies };
      const out = await postSelectParent(http.baseUrl, cookiesWithParentJwt, parentId, {
        unlock_method: 'pin',
        pin: '9999',
      });
      assert.equal(out.status, 200, JSON.stringify(out.body));
      assert.equal(out.body.ok, true);
    });

    await t.test('variant 2b: wrong PIN after change returns PARENT_PIN_INVALID', async () => {
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'Kid', emoji: '⭐' });
      const deviceCookies = await enrollShared(http, session);
      const parentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        session.email.toLowerCase(),
      ]);
      const parentId = parentRow.rows[0].id;
      await setParentPin(db, parentId, '1111');
      await fetch(`${http.baseUrl}/api/family/set-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ pin: '9999', confirmPin: '9999', currentPin: '1111' }),
      });

      const cookiesWithParentJwt = { ...deviceCookies, ...session.cookies };
      const out = await postSelectParent(http.baseUrl, cookiesWithParentJwt, parentId, {
        unlock_method: 'pin',
        pin: '1111',
      });
      assert.equal(out.status, 401);
      assert.equal(out.body.code, 'PARENT_PIN_INVALID');
    });

    await t.test('variant 3: child session then select-parent', async () => {
      const session = await registerAndLogin(http.baseUrl);
      const childUsername = `kid3-${Date.now()}`;
      const childId = await createChild(http.baseUrl, session, {
        name: 'Astrid',
        emoji: '⭐',
        username: childUsername,
        pin: '2580',
      });
      const deviceCookies = await enrollShared(http, session);
      const parentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        session.email.toLowerCase(),
      ]);
      const parentId = parentRow.rows[0].id;
      await setParentPin(db, parentId, '4321');

      const childRow = await db.query('SELECT username FROM child WHERE id = $1', [childId]);
      const childCookies = await childLogin(http, session, childRow.rows[0].username, '2580');
      const cookies = { ...deviceCookies, ...childCookies };

      const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(cookies) },
      });
      const me = await meRes.json();
      assert.equal(me.type, 'child');

      const out = await postSelectParent(http.baseUrl, cookies, parentId, {
        unlock_method: 'pin',
        pin: '4321',
      });
      assert.equal(out.status, 200, JSON.stringify(out.body));
      assert.equal(out.body.ok, true);
    });

    await t.test('app-entry with parent JWT on shared device exposes parents + pinRequired', async () => {
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'Kid', emoji: '⭐' });
      const deviceCookies = await enrollShared(http, session);
      const parentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        session.email.toLowerCase(),
      ]);
      await setParentPin(db, parentRow.rows[0].id, '4321');

      const cookies = { ...deviceCookies, ...session.cookies };
      const res = await fetch(`${http.baseUrl}/api/auth/app-entry`, {
        headers: { Cookie: cookieHeader(cookies) },
      });
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.pinRequiredForParents, true);
      assert.ok((body.allowedParents || []).length >= 1);
      assert.ok((body.allowedChildren || []).length >= 1);
    });

    await t.test('parent-mode device: select-parent succeeds with PIN', async () => {
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'Kid', emoji: '⭐' });

      const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(session.cookies),
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({ platform: 'ios', label: 'iPhone parent' }),
      });
      assert.equal(enrollRes.status, 201, await enrollRes.text());

      let deviceCookies = { ...session.cookies };
      for (const header of getSetCookieHeaders(enrollRes)) {
        deviceCookies = mergeCookies(deviceCookies, [header]);
      }

      const parentRow = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
        session.email.toLowerCase(),
      ]);
      const parentId = parentRow.rows[0].id;
      await setParentPin(db, parentId, '4321');

      const out = await postSelectParent(http.baseUrl, deviceCookies, parentId, {
        unlock_method: 'pin',
        pin: '4321',
      });
      assert.equal(out.status, 200, JSON.stringify(out.body));
      assert.equal(out.body.ok, true);
    });
  } finally {
    await http.close();
    await db.cleanup();
  }
});
