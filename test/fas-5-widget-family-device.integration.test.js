'use strict';

/**
 * Fas 5 — widget installation ↔ child binding is stable; app profile drift must not rebind widgets.
 */

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const jwt = require('jsonwebtoken');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const { FLAG_NATIVE, FLAG_COMPLETION } = require('../src/lib/widget-flags');
const { FLAG_KEYS } = require('../src/lib/activation-flags');
const { getLocalDateStr } = require('../src/lib/daily-log-generator');
const { signInstanceToken } = require('../src/lib/widget-instance-token');
const config = require('../src/lib/config');

async function enableFlags(db) {
  for (const key of [FLAG_KEY, FLAG_NATIVE, FLAG_COMPLETION, FLAG_KEYS.firstStarMode]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

async function seedTwoStepLog(db, childId, familyId) {
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
  const tpl = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
     VALUES ($1, 'Steg', '⭐', 1, 0, 'user') RETURNING id`,
    [familyId]
  );
  await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
  const logRes = await db.query(
    'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
    [childId, dateStr]
  );
  const item = await db.query(
    `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
     VALUES ($1, $2, 'Steg', '⭐', 1, 0, 'morgon') RETURNING id`,
    [logRes.rows[0].id, tpl.rows[0].id]
  );
  return { itemId: item.rows[0].id };
}

async function bindParentWidget(baseUrl, parent, childId, installationId) {
  const bindRes = await fetch(`${baseUrl}/api/widget/bindings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(parent.cookies),
      'X-CSRF-Token': parent.csrfToken,
    },
    body: JSON.stringify({
      installation_id: installationId,
      platform: 'ios',
      child_id: childId,
    }),
  });
  const text = await bindRes.text();
  assert.equal(bindRes.status, 201, text);
  return JSON.parse(text);
}

function decodeBindingChildId(bindingToken) {
  const decoded = jwt.verify(bindingToken, config.jwt.secret);
  assert.equal(decoded.type, 'widget_binding');
  return decoded.child_id;
}

async function enrollSharedDevice(http, session) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: 'Shared' }),
  });
  assert.equal(enrollRes.status, 201);
  let cookies = {};
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

test('Fas5: Astrid widget unchanged when device last_active_child_id switches to Leo', async (t) => {
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
    const astrid = await createChild(http.baseUrl, parent, { name: 'Astrid', emoji: '🦊' });
    const leo = await createChild(http.baseUrl, parent, { name: 'Leo', emoji: '🦁' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [astrid]);
    const familyId = fam.rows[0].family_id;
    await seedTwoStepLog(db, astrid, familyId);
    await seedTwoStepLog(db, leo, familyId);

    const deviceCookies = await enrollSharedDevice(http, parent);
    const bindRes = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(deviceCookies),
      },
      body: JSON.stringify({
        installation_id: 'widget-astrid-inst',
        platform: 'ios',
        child_id: astrid,
      }),
    });
    assert.equal(bindRes.status, 201);
    const { binding_token: token } = await bindRes.json();
    assert.equal(decodeBindingChildId(token), astrid);

    await db.query(
      `UPDATE family_trusted_device
       SET last_active_child_id = $1, default_child_id = $1
       WHERE family_id = $2 AND revoked_at IS NULL`,
      [leo, familyId]
    );

    const ctx = await (await fetch(`${http.baseUrl}/api/widget/context`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    assert.equal(ctx.active_child.id, astrid);
    assert.equal(ctx.active_child.display_name, 'Astrid');
    assert.equal(decodeBindingChildId(token), astrid);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas5: Astrid + Leo widgets on same phone keep distinct child scope', async (t) => {
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
    const astrid = await createChild(http.baseUrl, parent, { name: 'Astrid', emoji: '🦊' });
    const leo = await createChild(http.baseUrl, parent, { name: 'Leo', emoji: '🦁' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [astrid]);
    const familyId = fam.rows[0].family_id;
    await seedTwoStepLog(db, astrid, familyId);
    await seedTwoStepLog(db, leo, familyId);

    const { binding_token: tokenA } = await bindParentWidget(http.baseUrl, parent, astrid, 'inst-astrid');
    const { binding_token: tokenB } = await bindParentWidget(http.baseUrl, parent, leo, 'inst-leo');

    const ctxA = await (await fetch(`${http.baseUrl}/api/widget/context`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    const ctxB = await (await fetch(`${http.baseUrl}/api/widget/context`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert.equal(ctxA.active_child.id, astrid);
    assert.equal(ctxB.active_child.id, leo);
    assert.equal(ctxA.installation_id, 'inst-astrid');
    assert.equal(ctxB.installation_id, 'inst-leo');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas5: removed child → child_removed (no sibling fallback)', async (t) => {
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
    const astrid = await createChild(http.baseUrl, parent, { name: 'Astrid', emoji: '🦊' });
    await createChild(http.baseUrl, parent, { name: 'Leo', emoji: '🦁' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [astrid]);
    await seedTwoStepLog(db, astrid, fam.rows[0].family_id);

    const { binding_token: token } = await bindParentWidget(http.baseUrl, parent, astrid, 'inst-remove');

    const delRes = await fetch(`${http.baseUrl}/api/family/children/${astrid}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader(parent.cookies),
        'X-CSRF-Token': parent.csrfToken,
      },
    });
    assert.equal(delRes.status, 200, await delRes.text());

    const ctxRes = await fetch(`${http.baseUrl}/api/widget/context`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(ctxRes.status, 403);
    const body = await ctxRes.json();
    assert.equal(body.status, 'child_removed');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas5: shared trusted bind without child_id → needs_child_selection', async (t) => {
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
    await createChild(http.baseUrl, parent, { name: 'Astrid', emoji: '🦊' });
    const deviceCookies = await enrollSharedDevice(http, parent);

    const bindRes = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(deviceCookies),
      },
      body: JSON.stringify({
        installation_id: 'inst-no-child',
        platform: 'android',
      }),
    });
    assert.equal(bindRes.status, 409);
    const body = await bindRes.json();
    assert.equal(body.status, 'needs_child_selection');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas5: wrong-child instance token fails closed', async (t) => {
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
    const astrid = await createChild(http.baseUrl, parent, { name: 'Astrid', emoji: '🦊' });
    const leo = await createChild(http.baseUrl, parent, { name: 'Leo', emoji: '🦁' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [astrid]);
    const familyId = fam.rows[0].family_id;
    const { itemId: leoItem } = await seedTwoStepLog(db, leo, familyId);
    await seedTwoStepLog(db, astrid, familyId);

    const { binding_token: token } = await bindParentWidget(http.baseUrl, parent, astrid, 'inst-wrong');
    const wrongInstance = signInstanceToken(leo, leoItem);

    const completeRes = await fetch(`${http.baseUrl}/api/widget/complete-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        instance_token: wrongInstance,
        idempotency_key: 'fas5-wrong-child',
      }),
    });
    assert.equal(completeRes.status, 400);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas5: revoked device stops widget writes', async (t) => {
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
    const childId = await createChild(http.baseUrl, parent, { name: 'Astrid', emoji: '🦊' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    await seedTwoStepLog(db, childId, fam.rows[0].family_id);

    const deviceCookies = await enrollSharedDevice(http, parent);
    const bindRes = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(deviceCookies),
      },
      body: JSON.stringify({
        installation_id: 'inst-revoke',
        platform: 'ios',
        child_id: childId,
      }),
    });
    const { binding_token: token } = await bindRes.json();

    const listRes = await fetch(`${http.baseUrl}/api/family/trusted-devices`, {
      headers: { Cookie: cookieHeader(parent.cookies), 'X-CSRF-Token': parent.csrfToken },
    });
    const deviceId = (await listRes.json()).devices[0].id;
    await fetch(`${http.baseUrl}/api/family/trusted-devices/${deviceId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieHeader(parent.cookies), 'X-CSRF-Token': parent.csrfToken },
    });

    const nextRes = await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const nextText = await nextRes.text();
    assert.ok([401, 403].includes(nextRes.status), nextText);
    const errBody = JSON.parse(nextText);
    assert.equal(errBody.status, 'device_revoked');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('Fas5: bootstrap onChildChanged does not rebind widgets', async (t) => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '../public/js/widget-bridge-bootstrap.js'), 'utf8');
  assert.ok(!src.includes('switchBinding'), 'onChildChanged must not call switchBinding');
  assert.ok(src.includes('refreshAll'), 'onChildChanged should refresh widget data only');
});
