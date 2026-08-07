'use strict';

/**
 * R4 final authority — trusted lineage, revoke isolation, multi-adult, SSE.
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

async function enrollChildDevice(http, session, childId, label = 'Tablet') {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/child`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ child_id: childId, platform: 'web', label }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

async function restoreTrusted(http, deviceCookies) {
  const restoreRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }),
    },
  });
  assert.equal(restoreRes.status, 200, await restoreRes.text());
  let cookies = { trusted_device: deviceCookies.trusted_device };
  for (const header of getSetCookieHeaders(restoreRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

async function refreshSession(http, cookies) {
  const res = await fetch(`${http.baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { Cookie: cookieHeader(cookies) },
  });
  let next = { ...cookies };
  for (const header of getSetCookieHeaders(res)) {
    next = mergeCookies(next, [header]);
  }
  return { status: res.status, cookies: next, body: res.status === 200 ? await res.json() : null };
}

async function childPinLogin(http, username, pin) {
  const res = await fetch(`${http.baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
  let cookies = {};
  for (const header of getSetCookieHeaders(res)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { status: res.status, cookies };
}

test('T1: concurrent same-token refresh yields one successor with trusted_device_id', async (t) => {
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
    const childCookies = await restoreTrusted(http, deviceCookies);

    const [a, b] = await Promise.all([
      refreshSession(http, childCookies),
      refreshSession(http, childCookies),
    ]);
    const okCount = [a, b].filter((r) => r.status === 200).length;
    const failCount = [a, b].filter((r) => r.status === 401).length;
    assert.equal(okCount, 1);
    assert.equal(failCount, 1);

    const winner = a.status === 200 ? a : b;
    const hashRow = await db.query(
      `SELECT trusted_device_id FROM refresh_token rt
       INNER JOIN family_trusted_device d ON d.id = rt.trusted_device_id
       WHERE rt.trusted_device_id IS NOT NULL AND d.default_child_id = $1`,
      [childId]
    );
    assert.equal(hashRow.rows.length, 1);
    const deviceId = hashRow.rows[0].trusted_device_id;

    await fetch(`${http.baseUrl}/api/family/trusted-devices/${deviceId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken },
    });
    const afterRevoke = await refreshSession(http, winner.cookies);
    assert.equal(afterRevoke.status, 401);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('T2: revoke one trusted device leaves sibling device and PIN session alive', async (t) => {
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
    const childId = await createChild(http.baseUrl, session, { name: 'Kid', emoji: '🧒', pin: '2580' });
    const childRow = await db.query('SELECT username FROM child WHERE id = $1', [childId]);
    const pin = '2580';

    const d1Cookies = await enrollChildDevice(http, session, childId, 'D1');
    const d2Cookies = await enrollChildDevice(http, session, childId, 'D2');
    const c1 = await restoreTrusted(http, d1Cookies);
    const c2 = await restoreTrusted(http, d2Cookies);
    const pinSession = await childPinLogin(http, childRow.rows[0].username, pin);
    assert.equal(pinSession.status, 200);

    const listRes = await fetch(`${http.baseUrl}/api/family/trusted-devices`, {
      headers: { Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken },
    });
    const devices = (await listRes.json()).devices;
    const d1 = devices.find((d) => d.label === 'D1');

    await fetch(`${http.baseUrl}/api/family/trusted-devices/${d1.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken },
    });

    assert.equal((await refreshSession(http, c1)).status, 401);
    assert.equal((await refreshSession(http, c2)).status, 200);
    assert.equal((await refreshSession(http, pinSession.cookies)).status, 200);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('T5: dedicated child device context exposes only bound child', async (t) => {
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

    const ctxRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/context`, {
      headers: { Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }) },
    });
    const ctx = await ctxRes.json();
    assert.equal(ctx.ok, true);
    assert.equal(ctx.can_switch_children, false);
    assert.equal(ctx.allowed_children.length, 1);
    assert.equal(ctx.allowed_children[0].id, childA);
    assert.ok(!ctx.allowed_children.some((c) => c.id === childB));

    const selectRes = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }),
      },
      body: JSON.stringify({ child_id: childB }),
    });
    assert.ok(selectRes.status === 401 || selectRes.status === 403);

    const bindRes = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader({ trusted_device: deviceCookies.trusted_device }),
      },
      body: JSON.stringify({ installation_id: 'inst-t5', platform: 'ios', child_id: childB }),
    });
    assert.equal(bindRes.status, 403);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('T6: primary on A cannot strip target co-parent link to B', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
    const me = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(primary.cookies) },
    });
    const primaryId = (await me.json()).id;
    const childA = await createChild(http.baseUrl, primary, { name: 'A', emoji: '🅰️' });
    const childB = await createChild(http.baseUrl, primary, { name: 'B', emoji: '🅱️' });

    const coparentEmail = `coparent-authz-${Date.now()}@example.com`;
    await fetch(`${http.baseUrl}/api/family/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
      body: JSON.stringify({ name: 'Co', email: coparentEmail, child_ids: [childA, childB] }),
    });
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
    const coparentBody = JSON.parse(await loginRes.text());
    let coparentCookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      coparentCookies = mergeCookies(coparentCookies, [header]);
    }
    const coparentId = coparentBody.user?.id || coparentBody.id;

    await db.query(
      `UPDATE parent_child SET role = 'shared', revoked_at = NULL
       WHERE parent_id = $1 AND child_id = $2`,
      [coparentId, childA]
    );
    await db.query(
      `UPDATE parent_child SET role = 'shared', revoked_at = NULL
       WHERE parent_id = $1 AND child_id = $2`,
      [coparentId, childB]
    );

    await db.query(
      `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $1
       WHERE parent_id = $2 AND child_id = $3`,
      [primaryId, primaryId, childB]
    );

    const attack = await fetch(`${http.baseUrl}/api/family/members/${coparentId}/children`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
      body: JSON.stringify({ child_ids: [childA] }),
    });
    assert.equal(attack.status, 403, await attack.text());

    const links = await db.query(
      `SELECT child_id FROM parent_child WHERE parent_id = $1 AND revoked_at IS NULL`,
      [coparentId]
    );
    const ids = links.rows.map((r) => r.child_id);
    assert.ok(ids.includes(childB));
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('T7: concurrent last-admin removal cannot orphan child', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const p1 = await registerAndLogin(http.baseUrl, { name: 'P1' });
    const me1 = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(p1.cookies) },
    });
    const p1Id = (await me1.json()).id;
    const childB = await createChild(http.baseUrl, p1, { name: 'B', emoji: '🅱️' });

    const email2 = `p2-${Date.now()}@example.com`;
    await fetch(`${http.baseUrl}/api/family/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(p1.cookies),
        'X-CSRF-Token': p1.csrfToken,
      },
      body: JSON.stringify({ name: 'P2', email: email2, child_ids: [childB] }),
    });
    const tok = await db.query(
      `SELECT token FROM family_invite WHERE LOWER(email) = $1 ORDER BY created_at DESC LIMIT 1`,
      [email2.toLowerCase()]
    );
    await fetch(`${http.baseUrl}/api/family/invite/accept-new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tok.rows[0].token, password: 'coparent-pass-12' }),
    });
    const login2 = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email2, password: 'coparent-pass-12' }),
    });
    const p2Body = JSON.parse(await login2.text());
    const p2Id = p2Body.user?.id || p2Body.id;

    const childA = await createChild(http.baseUrl, p1, { name: 'A', emoji: '🅰️' });

    const stripB = (parentId, cookies, csrf) => fetch(`${http.baseUrl}/api/family/members/${parentId}/children`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify({ child_ids: [childA] }),
    });

    const p2Cookies = mergeCookies({}, getSetCookieHeaders(login2));
    const [r1, r2] = await Promise.all([
      stripB(p1Id, p1.cookies, p1.csrfToken),
      stripB(p2Id, p2Cookies, p2Body.csrfToken),
    ]);
    const statuses = [r1.status, r2.status].sort();
    assert.ok(statuses.includes(403), `expected one 403 got ${statuses.join(',')}`);

    const admins = await db.query(
      `SELECT parent_id FROM parent_child
       WHERE child_id = $1 AND revoked_at IS NULL AND role IN ('primary', 'shared')`,
      [childB]
    );
    assert.ok(admins.rows.length >= 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('T8/T9: SSE child scope and open-connection revoke', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { broadcast, addClient, removeClient } = require('../src/lib/sse-broadcast');
  assert.throws(() => {
    broadcast('fam-x', 'SCHEDULE_UPDATED', { once_task: true });
  }, /blocked/);

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const primary = await registerAndLogin(http.baseUrl);
    const childA = await createChild(http.baseUrl, primary, { name: 'A', emoji: '🅰️' });
    const childB = await createChild(http.baseUrl, primary, { name: 'B', emoji: '🅱️' });

    const coparentEmail = `sse-coparent-${Date.now()}@example.com`;
    await fetch(`${http.baseUrl}/api/family/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
      body: JSON.stringify({ name: 'Co', email: coparentEmail, child_ids: [childB] }),
    });
    const tokenRow = await db.query(
      `SELECT token FROM family_invite WHERE LOWER(email) = $1 ORDER BY created_at DESC LIMIT 1`,
      [coparentEmail.toLowerCase()]
    );
    await fetch(`${http.baseUrl}/api/family/invite/accept-new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenRow.rows[0].token, password: 'coparent-pass-12' }),
    });

    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(primary.cookies) },
    });
    const meBody = await meRes.json();
    const familyId = meBody.family_id || meBody.familyId;
    const parentId = meBody.id;

    const writes = [];
    const res = { write: (chunk) => writes.push(chunk), end: () => {} };
    const { getChildrenForParent } = require('../db/parent-access');
    const children = await getChildrenForParent(parentId, { allowedRoles: ['primary', 'shared', 'pedagog'] });
    const allowed = new Set(children.map((c) => c.id));
    const { getEventScope } = require('../src/lib/sse-event-scope');
    addClient(familyId, res, {
      parentId,
      shouldDeliver: (type, data) => {
        if (getEventScope(type) === 'child') {
          return data.childId && allowed.has(data.childId);
        }
        return true;
      },
    });

    broadcast(familyId, 'DAILY_LOG_ITEM_COMPLETED', { childId: childB, itemId: 'x' });
    assert.equal(writes.length, 1);

    const putRes = await fetch(`${http.baseUrl}/api/family/members/${parentId}/children`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
      body: JSON.stringify({ child_ids: [childA] }),
    });
    assert.equal(putRes.status, 200, await putRes.text());

    const afterRevokeWrites = writes.length;
    broadcast(familyId, 'DAILY_LOG_ITEM_COMPLETED', { childId: childB, itemId: 'y' });
    assert.equal(writes.length, afterRevokeWrites);

    const res2 = { write: (chunk) => writes.push(chunk), end: () => {} };
    const children2 = await getChildrenForParent(parentId, { allowedRoles: ['primary', 'shared', 'pedagog'] });
    const allowed2 = new Set(children2.map((c) => c.id));
    addClient(familyId, res2, {
      parentId,
      shouldDeliver: (type, data) => {
        if (getEventScope(type) === 'child') {
          return data.childId && allowed2.has(data.childId);
        }
        return true;
      },
    });

    broadcast(familyId, 'SYSTEM_ALERT', { message: 'family ok' });
    assert.ok(writes.some((w) => String(w).includes('SYSTEM_ALERT')));
    broadcast(familyId, 'DAILY_LOG_ITEM_COMPLETED', { childId: childB, itemId: 'z' });
    assert.equal(writes.filter((w) => String(w).includes('itemId')).length, 1);

    removeClient(familyId, res2);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
