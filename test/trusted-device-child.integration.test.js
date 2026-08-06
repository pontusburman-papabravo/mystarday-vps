'use strict';

/**
 * R4.2 — child trusted device enroll, silent restore, revoke.
 */

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

test('trusted device: enroll → restore child session → revoke blocks restore and refresh', async (t) => {
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
    const childId = await createChild(http.baseUrl, session, { name: 'Elsa', emoji: '🦊' });

    const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({ child_id: childId, platform: 'web', label: 'Test tablet' }),
    });
    const enrollText = await enrollRes.text();
    assert.equal(enrollRes.status, 201, enrollText);
    const enrollBody = JSON.parse(enrollText);
    assert.equal(enrollBody.device.device_mode, 'child');
    assert.equal(enrollBody.device.default_child_id, childId);

    let deviceCookies = { ...session.cookies };
    for (const header of getSetCookieHeaders(enrollRes)) {
      deviceCookies = mergeCookies(deviceCookies, [header]);
    }
    assert.ok(deviceCookies.trusted_device, 'trusted_device cookie set on enroll');

    const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }) },
    });
    const restoreText = await restoreRes.text();
    assert.equal(restoreRes.status, 200, restoreText);
    const restoreBody = JSON.parse(restoreText);
    assert.equal(restoreBody.ok, true);
    assert.equal(restoreBody.user.type, 'child');
    assert.equal(restoreBody.user.id, childId);
    assert.equal(restoreBody.session_mode, 'resume');

    let childCookies = { trusted_device: deviceCookies.trusted_device };
    for (const header of getSetCookieHeaders(restoreRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }

    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal(meRes.status, 200);
    const me = await meRes.json();
    assert.equal(me.type, 'child');
    assert.equal(me.id, childId);

    const listRes = await fetch(`${http.baseUrl}/api/family/trusted-devices`, {
      headers: {
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.enabled, true);
    assert.equal(listBody.devices.length, 1);
    const deviceId = listBody.devices[0].id;

    const revokeRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/${deviceId}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
    });
    assert.equal(revokeRes.status, 200);

    const restoreAfterRevoke = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(childCookies),
      },
    });
    assert.equal(restoreAfterRevoke.status, 401);

    const refreshRes = await fetch(`${http.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(childCookies),
      },
    });
    assert.equal(refreshRes.status, 401);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('trusted device enroll denied when feature flag off', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = false`,
      [FLAG_KEY]
    );
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session, { name: 'Kim', emoji: '⭐' });

    const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({ child_id: childId }),
    });
    assert.equal(enrollRes.status, 403);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
