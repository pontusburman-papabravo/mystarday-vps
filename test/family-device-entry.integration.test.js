'use strict';

/**
 * Fas 2B — GET /api/auth/app-entry + resolveAppEntry integration matrix (A–K).
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

async function enableFlags(db) {
  for (const key of [TRUSTED_FLAG, ENTRY_FLAG, DAILY_UX_FLAG]) {
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
    body: JSON.stringify({ platform: 'web', label: 'Entry test shared' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

async function enrollParent(http, session) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/parent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: 'Entry parent device' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

async function enrollChildDevice(http, session, childId) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/child`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ child_id: childId, platform: 'web', label: 'Entry child device' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

async function fetchAppEntry(baseUrl, cookies, query) {
  const q = query ? `?${query}` : '';
  const res = await fetch(`${baseUrl}/api/auth/app-entry${q}`, {
    headers: { Cookie: cookieHeader(cookies) },
  });
  const body = await res.json();
  return { status: res.status, body };
}

/** Cold-start simulation: trusted device identity without active parent access JWT. */
function trustedOnlyCookies(cookies) {
  if (cookies && cookies.trusted_device) {
    return { trusted_device: cookies.trusted_device };
  }
  return cookies;
}

async function setChildPin(db, childId) {
  const pinHash = await hashPassword('1234');
  await db.query('UPDATE child SET pin = $1 WHERE id = $2', [pinHash, childId]);
}

async function childLoginFromParent(http, parentSession, username) {
  const res = await fetch(`${http.baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(parentSession.cookies),
      'X-CSRF-Token': parentSession.csrfToken,
    },
    body: JSON.stringify({ username, pin: '1234' }),
  });
  assert.equal(res.status, 200, await res.text());
  let cookies = { ...parentSession.cookies };
  for (const header of getSetCookieHeaders(res)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

test('family device entry matrix A–K', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFlags(db);
    const parent = await registerAndLogin(http.baseUrl);
    const childA = await createChild(http.baseUrl, parent, { name: 'Alma', emoji: '🦊' });
    const childB = await createChild(http.baseUrl, parent, { name: 'Bo', emoji: '🐻' });
    await setChildPin(db, childA);
    await setChildPin(db, childB);

    const usernameA = (await db.query('SELECT username FROM child WHERE id = $1', [childA])).rows[0].username;

    await t.test('A: shared + 1 child + 1 parent → profile-picker (Netflix)', async () => {
      const onlyParent = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, onlyParent, { name: 'Solo', emoji: '⭐' });
      const deviceCookies = await enrollShared(http, onlyParent);
      const { status, body } = await fetchAppEntry(http.baseUrl, trustedOnlyCookies(deviceCookies));
      assert.equal(status, 200);
      assert.equal(body.orchestratorActive, true);
      assert.equal(body.decision.destination, 'profile-picker');
      assert.equal(body.decision.path, '/child/profile-picker');
      assert.ok(Array.isArray(body.allowedParents) && body.allowedParents.length >= 1);
      assert.notEqual(body.decision.path, '/child-login');
    });

    await t.test('B: shared + parent handoff + child JWT → child-home not parent-home', async () => {
      const pB = await registerAndLogin(http.baseUrl);
      const soloB = await createChild(http.baseUrl, pB, { name: 'SoloB', emoji: '🦊' });
      await setChildPin(db, soloB);
      const uB = (await db.query('SELECT username FROM child WHERE id = $1', [soloB])).rows[0].username;
      const deviceCookies = await enrollShared(http, pB);
      const childCookies = await childLoginFromParent(http, { ...pB, cookies: deviceCookies }, uB);
      const { body } = await fetchAppEntry(http.baseUrl, childCookies, 'launch_context=foreground_resume');
      assert.equal(body.decision.destination, 'child-home');
      assert.notEqual(body.decision.destination, 'parent-home');
      assert.equal(body.decision.credentialContext, 'child');
    });

    await t.test('C: shared + multiple children without default → picker', async () => {
      const deviceCookies = await enrollShared(http, parent);
      const { body } = await fetchAppEntry(http.baseUrl, trustedOnlyCookies(deviceCookies));
      assert.equal(body.decision.destination, 'profile-picker');
      assert.equal(body.decision.credentialContext, 'none');
    });

    await t.test('C2: shared multi-child picker path uses profile-picker page when daily UX on', async () => {
      const deviceCookies = await enrollShared(http, parent);
      const { body } = await fetchAppEntry(http.baseUrl, trustedOnlyCookies(deviceCookies));
      assert.equal(body.dailyUxActive, true);
      assert.equal(body.decision.destination, 'profile-picker');
      assert.equal(body.decision.path, '/child/profile-picker');
    });

    await t.test('D: shared + default child + parent → profile-picker (default not auto-skipped)', async () => {
      const deviceCookies = await enrollShared(http, parent);
      await db.query(
        `UPDATE family_trusted_device SET default_child_id = $1
         WHERE revoked_at IS NULL AND device_mode = 'shared'
         AND family_id = (SELECT family_id FROM parent WHERE email = $2 LIMIT 1)`,
        [childB, parent.email]
      );
      const { body } = await fetchAppEntry(http.baseUrl, trustedOnlyCookies(deviceCookies));
      assert.equal(body.decision.destination, 'profile-picker');
      assert.equal(body.decision.path, '/child/profile-picker');
    });

    await t.test('F: child device → bound child', async () => {
      const p2 = await registerAndLogin(http.baseUrl);
      const solo = await createChild(http.baseUrl, p2, { name: 'Bound', emoji: '🌟' });
      const deviceCookies = await enrollChildDevice(http, p2, solo);
      const { body } = await fetchAppEntry(http.baseUrl, trustedOnlyCookies(deviceCookies));
      assert.equal(body.decision.destination, 'child-home');
      assert.equal(body.decision.childId, solo);
      assert.equal(body.decision.deviceMode, 'child');
    });

    await t.test('G: parent device + parent JWT → parent-home', async () => {
      const p3 = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, p3, { name: 'X', emoji: '⭐' });
      const deviceCookies = await enrollParent(http, p3);
      const { body } = await fetchAppEntry(http.baseUrl, deviceCookies);
      assert.equal(body.decision.destination, 'parent-home');
      assert.equal(body.decision.credentialContext, 'parent');
    });

    await t.test('H: revoked device → no authenticated destination', async () => {
      const p4 = await registerAndLogin(http.baseUrl);
      const c4 = await createChild(http.baseUrl, p4, { name: 'R', emoji: '⭐' });
      const deviceCookies = await enrollChildDevice(http, p4, c4);
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(deviceCookies.trusted_device).digest('hex');
      const row = await db.query(
        `SELECT id FROM family_trusted_device WHERE token_hash = $1`,
        [hash]
      );
      const deviceId = row.rows[0].id;
      const revokeRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          Cookie: cookieHeader(p4.cookies),
          'X-CSRF-Token': p4.csrfToken,
        },
      });
      assert.equal(revokeRes.status, 200, await revokeRes.text());
      const { body } = await fetchAppEntry(http.baseUrl, trustedOnlyCookies(deviceCookies));
      assert.equal(body.decision.destination, 'parent-login');
      assert.equal(body.decision.credentialContext, 'none');
      assert.equal(body.decision.failClosed, true);
      assert.notEqual(body.decision.destination, 'child-home');
    });

    await t.test('I: cold_start + child JWT on multi-profile → profile-picker', async () => {
      const p5 = await registerAndLogin(http.baseUrl);
      const ca = await createChild(http.baseUrl, p5, { name: 'CA', emoji: 'A' });
      await createChild(http.baseUrl, p5, { name: 'CB', emoji: 'B' });
      await setChildPin(db, ca);
      const uA = (await db.query('SELECT username FROM child WHERE id = $1', [ca])).rows[0].username;
      const deviceCookies = await enrollShared(http, p5);
      const childCookies = await childLoginFromParent(http, { ...p5, cookies: deviceCookies }, uA);
      const { body } = await fetchAppEntry(
        http.baseUrl,
        childCookies,
        'launch_context=cold_start'
      );
      assert.equal(body.decision.failClosed, false);
      assert.equal(body.decision.destination, 'profile-picker');
      assert.equal(body.decision.path, '/child/profile-picker');
    });

    await t.test('I2: foreground_resume + child JWT on multi-profile → child-home', async () => {
      const p5b = await registerAndLogin(http.baseUrl);
      const ca = await createChild(http.baseUrl, p5b, { name: 'CA2', emoji: 'A' });
      await createChild(http.baseUrl, p5b, { name: 'CB2', emoji: 'B' });
      await setChildPin(db, ca);
      const uA = (await db.query('SELECT username FROM child WHERE id = $1', [ca])).rows[0].username;
      const deviceCookies = await enrollShared(http, p5b);
      const childCookies = await childLoginFromParent(http, { ...p5b, cookies: deviceCookies }, uA);
      const { body } = await fetchAppEntry(
        http.baseUrl,
        childCookies,
        'launch_context=foreground_resume'
      );
      assert.equal(body.decision.destination, 'child-home');
      assert.equal(body.decision.childId, ca);
      assert.equal(body.decision.credentialContext, 'child');
    });

    await t.test('K: deep-link child out of scope → fail closed', async () => {
      const p6 = await registerAndLogin(http.baseUrl);
      const solo6 = await createChild(http.baseUrl, p6, { name: 'S6', emoji: '⭐' });
      const deviceCookies = await enrollShared(http, p6);
      const { body } = await fetchAppEntry(
        http.baseUrl,
        trustedOnlyCookies(deviceCookies),
        `intent_child_id=${encodeURIComponent('00000000-0000-4000-8000-00000000abcd')}`
      );
      assert.equal(body.decision.failClosed, true);
      assert.equal(body.decision.reason, 'deep_link_child_out_of_scope');
    });
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('entry flag off → orchestratorActive false', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await db.query(
      `INSERT INTO feature_flag (key, enabled) VALUES ($1, false) ON CONFLICT (key) DO UPDATE SET enabled = false`,
      [ENTRY_FLAG]
    );
    const parent = await registerAndLogin(http.baseUrl);
    const { body } = await fetchAppEntry(http.baseUrl, parent.cookies);
    assert.equal(body.orchestratorActive, false);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
