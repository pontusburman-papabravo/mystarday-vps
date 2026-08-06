'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function enableTrustedDeviceFlag(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG_KEY]
  );
}

test('shared trusted device: picker then select-child sessions', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableTrustedDeviceFlag(db);
    const session = await registerAndLogin(http.baseUrl);
    const childA = await createChild(http.baseUrl, session, { name: 'Alma', emoji: '🦊' });
    const childB = await createChild(http.baseUrl, session, { name: 'Bo', emoji: '🐻' });

    const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({ platform: 'web', label: 'Shared tablet' }),
    });
    assert.equal(enrollRes.status, 201);
    let deviceCookies = { ...session.cookies };
    for (const header of getSetCookieHeaders(enrollRes)) {
      deviceCookies = mergeCookies(deviceCookies, [header]);
    }

    const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(deviceCookies),
      },
      body: JSON.stringify({}),
    });
    const restoreBody = JSON.parse(await restoreRes.text());
    assert.equal(restoreRes.status, 200);
    assert.equal(restoreBody.ok, false);
    assert.equal(restoreBody.code, 'SHARED_PICKER_REQUIRED');
    assert.equal(restoreBody.allowed_children.length, 2);

    const selectRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(deviceCookies),
      },
      body: JSON.stringify({ child_id: childA }),
    });
    assert.equal(selectRes.status, 200);
    let childCookies = { ...deviceCookies };
    for (const header of getSetCookieHeaders(selectRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }
    const meA = await fetch(`${http.baseUrl}/api/auth/me`, { headers: { Cookie: cookieHeader(childCookies) } });
    assert.equal((await meA.json()).id, childA);

    const selectB = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(deviceCookies),
      },
      body: JSON.stringify({ child_id: childB }),
    });
    assert.equal(selectB.status, 200);
    childCookies = { ...deviceCookies };
    for (const header of getSetCookieHeaders(selectB)) {
      childCookies = mergeCookies(childCookies, [header]);
    }
    const meB = await fetch(`${http.baseUrl}/api/auth/me`, { headers: { Cookie: cookieHeader(childCookies) } });
    assert.equal((await meB.json()).id, childB);

    const denyRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(deviceCookies),
      },
      body: JSON.stringify({ child_id: '00000000-0000-4000-8000-000000000099' }),
    });
    assert.equal(denyRes.status, 403);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('shared device with one child auto-restores without picker', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableTrustedDeviceFlag(db);
    const session = await registerAndLogin(http.baseUrl);
    const onlyChild = await createChild(http.baseUrl, session, { name: 'Solo', emoji: '⭐' });

    const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({ platform: 'web' }),
    });
    assert.equal(enrollRes.status, 201);
    let deviceCookies = { ...session.cookies };
    for (const header of getSetCookieHeaders(enrollRes)) {
      deviceCookies = mergeCookies(deviceCookies, [header]);
    }

    const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(deviceCookies),
      },
      body: JSON.stringify({}),
    });
    const body = JSON.parse(await restoreRes.text());
    assert.equal(restoreRes.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.user.id, onlyChild);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
