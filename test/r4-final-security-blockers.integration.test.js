'use strict';

/**
 * R4 final — trusted device revoke lineage, widget provenance, multi-adult, SSE scope.
 */

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const { FLAG_NATIVE } = require('../src/lib/widget-flags');

async function enableFlags(db) {
  for (const key of [FLAG_KEY, FLAG_NATIVE]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

async function enrollChildDevice(http, session, childId) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/child`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ child_id: childId, platform: 'web', label: 'Tablet' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

test('A1: dedicated child device restore denied after creator loses child access', async (t) => {
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
    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const me = await meRes.json();
    const parentId = me.id;
    const childA = await createChild(http.baseUrl, session, { name: 'Alma', emoji: '🅰️' });
    const childB = await createChild(http.baseUrl, session, { name: 'Bertil', emoji: '🅱️' });
    const deviceCookies = await enrollChildDevice(http, session, childB);

    await db.query(
      `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $1
       WHERE parent_id = $2 AND child_id = $3`,
      [parentId, parentId, childB]
    );

    const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }),
      },
    });
    assert.ok(restoreRes.status === 401 || restoreRes.status === 403, await restoreRes.text());
    assert.ok(childA);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('A2: refresh rotation then device revoke invalidates rotated refresh token', async (t) => {
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
    const childId = await createChild(http.baseUrl, session, { name: 'Elsa', emoji: '🦊' });
    const deviceCookies = await enrollChildDevice(http, session, childId);

    const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }),
      },
    });
    assert.equal(restoreRes.status, 200, await restoreRes.text());
    let childCookies = { trusted_device: deviceCookies.trusted_device };
    for (const header of getSetCookieHeaders(restoreRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }

    const refresh1 = await fetch(`${http.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal(refresh1.status, 200, await refresh1.text());
    for (const header of getSetCookieHeaders(refresh1)) {
      childCookies = mergeCookies(childCookies, [header]);
    }

    const listRes = await fetch(`${http.baseUrl}/api/family/trusted-devices`, {
      headers: { Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken },
    });
    const listBody = await listRes.json();
    const deviceId = listBody.devices[0].id;

    await fetch(`${http.baseUrl}/api/family/trusted-devices/${deviceId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken },
    });

    const refresh2 = await fetch(`${http.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal(refresh2.status, 401);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('A3/A4: trusted-derived widget binding revoked with device or creator access', async (t) => {
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
    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const parentId = (await meRes.json()).id;
    const childB = await createChild(http.baseUrl, session, { name: 'Bertil', emoji: '🅱️' });
    const deviceCookies = await enrollChildDevice(http, session, childB);

    const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }),
      },
    });
    assert.equal(restoreRes.status, 200);
    let childCookies = { trusted_device: deviceCookies.trusted_device };
    for (const header of getSetCookieHeaders(restoreRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }

    const bindRes = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(childCookies),
      },
      body: JSON.stringify({ installation_id: 'inst-a3', platform: 'ios' }),
    });
    const bindBody = JSON.parse(await bindRes.text());
    assert.equal(bindRes.status, 201, JSON.stringify(bindBody));
    assert.ok(bindBody.binding_token);

    const listRes = await fetch(`${http.baseUrl}/api/family/trusted-devices`, {
      headers: { Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken },
    });
    const deviceId = (await listRes.json()).devices[0].id;

    await fetch(`${http.baseUrl}/api/family/trusted-devices/${deviceId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken },
    });

    const nextRes = await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${bindBody.binding_token}` },
    });
    assert.ok(nextRes.status === 401 || nextRes.status === 403, await nextRes.text());

    // A4 — new device session, revoke creator access
    const deviceCookies2 = await enrollChildDevice(http, session, childB);
    const restore2 = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader({ trusted_device: deviceCookies2.trusted_device }),
      },
    });
    let childCookies2 = { trusted_device: deviceCookies2.trusted_device };
    for (const header of getSetCookieHeaders(restore2)) {
      childCookies2 = mergeCookies(childCookies2, [header]);
    }
    const bind2 = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(childCookies2) },
      body: JSON.stringify({ installation_id: 'inst-a4', platform: 'ios' }),
    });
    const bind2Body = JSON.parse(await bind2.text());
    assert.equal(bind2.status, 201);

    await db.query(
      `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $1
       WHERE parent_id = $2 AND child_id = $3`,
      [parentId, parentId, childB]
    );

    const next2 = await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${bind2Body.binding_token}` },
    });
    assert.ok(next2.status === 401 || next2.status === 403, await next2.text());
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('B1: personal child trusted device cannot bind sibling widget', async (t) => {
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
    const childA = await createChild(http.baseUrl, session, { name: 'Alma', emoji: '🅰️' });
    const childB = await createChild(http.baseUrl, session, { name: 'Bertil', emoji: '🅱️' });
    const deviceCookies = await enrollChildDevice(http, session, childA);

    const bindRes = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }),
      },
      body: JSON.stringify({
        installation_id: 'inst-b1',
        platform: 'ios',
        child_id: childB,
      }),
    });
    assert.equal(bindRes.status, 403, await bindRes.text());
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('C1: shared co-parent cannot rewrite primary parent child links', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
    const primaryMe = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(primary.cookies) },
    });
    const primaryId = (await primaryMe.json()).id;
    const childA = await createChild(http.baseUrl, primary, { name: 'A', emoji: '🅰️' });
    const childB = await createChild(http.baseUrl, primary, { name: 'B', emoji: '🅱️' });

    const coparentEmail = `coparent-r4final-${Date.now()}@example.com`;
    const inviteRes = await fetch(`${http.baseUrl}/api/family/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
      body: JSON.stringify({ name: 'Co', email: coparentEmail, child_ids: [childA] }),
    });
    assert.equal(inviteRes.status, 201);
    const tokenRow = await db.query(
      `SELECT token FROM family_invite WHERE LOWER(email) = $1 ORDER BY created_at DESC LIMIT 1`,
      [coparentEmail.toLowerCase()]
    );
    await fetch(`${http.baseUrl}/api/family/invite/accept-new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenRow.rows[0].token, password: 'coparent-pass-12' }),
    });
    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: coparentEmail, password: 'coparent-pass-12' }),
    });
    let coparentCookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      coparentCookies = mergeCookies(coparentCookies, [header]);
    }
    const coparentBody = JSON.parse(await loginRes.text());

    const attack = await fetch(`${http.baseUrl}/api/family/members/${primaryId}/children`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(coparentCookies),
        'X-CSRF-Token': coparentBody.csrfToken,
      },
      body: JSON.stringify({ child_ids: [childA] }),
    });
    assert.equal(attack.status, 403, await attack.text());

    const famRes = await fetch(`${http.baseUrl}/api/family`, {
      headers: { Cookie: cookieHeader(primary.cookies) },
    });
    const fam = await famRes.json();
    const ids = fam.children.map((c) => c.id);
    assert.ok(ids.includes(childA));
    assert.ok(ids.includes(childB));
  } finally {
    await http.close();
    await db.cleanup();
  }
});
