'use strict';

/**
 * SHARED_ONE_CHILD_SERVER regression — exact prod cold-start chain:
 * disposable parent, 1 allowed child, shared trusted device, per-family flags only.
 * Cold trusted-device-only cookie jar → app-entry → trusted-device/restore → /me.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
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
    body: JSON.stringify({ platform: 'web', label: 'SHARED_ONE_CHILD regression' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

function trustedOnlyCookies(cookies) {
  if (cookies && cookies.trusted_device) {
    return { trusted_device: cookies.trusted_device };
  }
  return cookies;
}

test('SHARED_ONE_CHILD: cold shared device with one child routes child-home and restores child session', async (t) => {
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
    const childId = await createChild(http.baseUrl, parent, { name: 'Solo', emoji: '⭐' });

    const deviceCookies = await enrollShared(http, parent);
    const coldJar = trustedOnlyCookies(deviceCookies);

    const entryRes = await fetch(`${http.baseUrl}/api/auth/app-entry`, {
      headers: { Cookie: cookieHeader(coldJar) },
    });
    const entryStatus = entryRes.status;
    const entryBody = await entryRes.json();

    assert.equal(entryStatus, 200);
    assert.equal(entryBody.orchestratorActive, true);
    assert.equal(entryBody.dailyUxActive, true);
    assert.equal(entryBody.decision.destination, 'child-home');
    assert.equal(entryBody.decision.serverAction, 'restore-child');
    assert.equal(entryBody.decision.childId, childId);
    assert.notEqual(entryBody.decision.path, '/child-login');
    assert.ok(Array.isArray(entryBody.allowedChildren) && entryBody.allowedChildren.length === 1);
    assert.ok(Array.isArray(entryBody.allowedParents) && entryBody.allowedParents.length >= 1);

    const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(coldJar),
      },
      body: JSON.stringify({}),
    });
    const restoreStatus = restoreRes.status;
    const restoreBody = await restoreRes.json();

    assert.equal(restoreStatus, 200);
    assert.equal(restoreBody.ok, true);
    assert.equal(restoreBody.user?.type, 'child');
    assert.equal(restoreBody.user?.id, childId);

    let meCookies = { ...coldJar };
    for (const header of getSetCookieHeaders(restoreRes)) {
      meCookies = mergeCookies(meCookies, [header]);
    }
    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(meCookies) },
    });
    const meBody = await meRes.json();

    assert.equal(meRes.status, 200);
    assert.equal(meBody.type, 'child');
    assert.equal(meBody.id, childId);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
