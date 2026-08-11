'use strict';

/**
 * Trusted device child session must create parent handoff for adult unlock.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const { HANDOFF_COOKIE, hashOpaque } = require('../src/lib/parent-session-handoff');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const ADULT_FLAG = 'adult_privilege_v1';

async function enableFlags(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, true, 'test'), ($2, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG_KEY, ADULT_FLAG]
  );
}

function handoffFromCookies(cookies) {
  return cookies[HANDOFF_COOKIE] || cookies['stjarndag_parent_session'];
}

test('select-child on shared device creates handoff without parent session cookies', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFlags(db);
    const session = await registerAndLogin(http.baseUrl);
    const childA = await createChild(http.baseUrl, session, { name: 'Alma', emoji: '🦊' });
    await createChild(http.baseUrl, session, { name: 'Bo', emoji: '🐻' });

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
    delete deviceCookies.access_token;
    delete deviceCookies.refresh_token;

    const selectRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(deviceCookies),
      },
      body: JSON.stringify({ child_id: childA }),
    });
    const selectText = await selectRes.text();
    assert.equal(selectRes.status, 200, selectText);

    let childCookies = { ...deviceCookies };
    for (const header of getSetCookieHeaders(selectRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }

    const handoffRaw = handoffFromCookies(childCookies);
    assert.ok(handoffRaw, 'handoff cookie must be set after select-child');

    const handoffHash = hashOpaque(handoffRaw);
    const handoffRow = await db.query(
      `SELECT parent_id, used_at, revoked_at FROM parent_session_handoff WHERE token_hash = $1`,
      [handoffHash]
    );
    assert.equal(handoffRow.rows.length, 1);
    assert.equal(handoffRow.rows[0].used_at, null);
    assert.equal(handoffRow.rows[0].revoked_at, null);

    const statusRes = await fetch(`${http.baseUrl}/api/family/adult-privilege/status`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    const statusBody = await statusRes.json();
    assert.equal(statusRes.status, 200);
    assert.equal(statusBody.handoffAvailable, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('select-parent on shared device issues parent session with privilege lease', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await enableFlags(db);
    const session = await registerAndLogin(http.baseUrl);
    await createChild(http.baseUrl, session, { name: 'Alma', emoji: '🦊' });

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
    delete deviceCookies.access_token;
    delete deviceCookies.refresh_token;

    const parentRow = await db.query(
      'SELECT id FROM parent WHERE email = $1',
      [session.email]
    );
    const parentId = parentRow.rows[0].id;

    const selectRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-parent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(deviceCookies),
      },
      body: JSON.stringify({ parent_id: parentId }),
    });
    const selectText = await selectRes.text();
    assert.equal(selectRes.status, 200, selectText);
    const selectBody = JSON.parse(selectText);
    assert.equal(selectBody.ok, true);
    assert.equal(selectBody.redirect, '/home');
    assert.ok(selectBody.privilegeLeaseUntil);

    let parentCookies = { ...deviceCookies };
    for (const header of getSetCookieHeaders(selectRes)) {
      parentCookies = mergeCookies(parentCookies, [header]);
    }

    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(parentCookies) },
    });
    const meBody = await meRes.json();
    assert.equal(meRes.status, 200);
    assert.equal(meBody.type, 'parent');
    assert.equal(meBody.id, parentId);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
