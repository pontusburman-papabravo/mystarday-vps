'use strict';

/**
 * R4.5f — family widget context, switch-child context payload, access boundaries.
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
const { FLAG_NATIVE, FLAG_COMPLETION } = require('../src/lib/widget-flags');
const { FLAG_KEYS } = require('../src/lib/activation-flags');
const { getLocalDateStr } = require('../src/lib/daily-log-generator');
const { signInstanceToken } = require('../src/lib/widget-instance-token');

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
  const tplA = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
     VALUES ($1, 'Steg A', '🅰️', 1, 0, 'user') RETURNING id`,
    [familyId]
  );
  const tplB = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
     VALUES ($1, 'Steg B', '🅱️', 1, 1, 'user') RETURNING id`,
    [familyId]
  );
  await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
  const logRes = await db.query(
    'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
    [childId, dateStr]
  );
  const logId = logRes.rows[0].id;
  const itemA = await db.query(
    `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
     VALUES ($1, $2, 'Steg A', '🅰️', 1, 0, 'morgon') RETURNING id`,
    [logId, tplA.rows[0].id]
  );
  await db.query(
    `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
     VALUES ($1, $2, 'Steg B', '🅱️', 1, 1, 'morgon')`,
    [logId, tplB.rows[0].id]
  );
  return { itemAId: itemA.rows[0].id, tplB: tplB.rows[0].id };
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
      platform: 'android',
      child_id: childId,
    }),
  });
  assert.equal(bindRes.status, 201);
  return bindRes.json();
}

test('R4.5f: single child → personal profile, no switch', async (t) => {
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
    const childA = await createChild(http.baseUrl, parent, { name: 'Solo', emoji: '⭐' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childA]);
    await seedTwoStepLog(db, childA, fam.rows[0].family_id);
    const { binding_token: token } = await bindParentWidget(http.baseUrl, parent, childA, 'solo-inst');

    const ctx = await (await fetch(`${http.baseUrl}/api/widget/context`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    assert.equal(ctx.widget_profile, 'personal');
    assert.equal(ctx.can_switch_children, false);
    assert.equal(ctx.allowed_children.length, 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('R4.5f: two children → family profile + switch returns context', async (t) => {
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
    const childA = await createChild(http.baseUrl, parent, { name: 'Astrid', emoji: '🦊' });
    const childB = await createChild(http.baseUrl, parent, { name: 'Belle', emoji: '🐻' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childA]);
    const familyId = fam.rows[0].family_id;
    await seedTwoStepLog(db, childA, familyId);
    await seedTwoStepLog(db, childB, familyId);
    const { binding_token: token } = await bindParentWidget(http.baseUrl, parent, childA, 'family-inst');

    const ctx = await (await fetch(`${http.baseUrl}/api/widget/context`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    assert.equal(ctx.widget_profile, 'family');
    assert.equal(ctx.can_switch_children, true);
    assert.equal(ctx.allowed_children.length, 2);

    const switchRes = await fetch(`${http.baseUrl}/api/widget/switch-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ child_id: childB }),
    });
    assert.equal(switchRes.status, 200);
    const body = await switchRes.json();
    assert.ok(body.context);
    assert.equal(body.context.active_child.id, childB);
    assert.equal(body.context.allowed_children.length, 2);
    assert.equal(body.child_id, childB);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('R4.5f: complete with stale token after switch-child → 409', async (t) => {
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
    const childA = await createChild(http.baseUrl, parent, { name: 'A', emoji: '1' });
    const childB = await createChild(http.baseUrl, parent, { name: 'B', emoji: '2' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childA]);
    const familyId = fam.rows[0].family_id;
    const { itemAId } = await seedTwoStepLog(db, childA, familyId);
    await seedTwoStepLog(db, childB, familyId);

    let { binding_token: token } = await bindParentWidget(http.baseUrl, parent, childA, 'race-inst');
    const nextA = await (await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    assert.equal(nextA.status, 'ready');
    const instanceA = nextA.activity.instance_token;

    const switched = await (await fetch(`${http.baseUrl}/api/widget/switch-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ child_id: childB }),
    })).json();
    token = switched.binding_token;

    const completeRes = await fetch(`${http.baseUrl}/api/widget/complete-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        instance_token: instanceA,
        idempotency_key: 'race-after-switch',
      }),
    });
    assert.ok([400, 409].includes(completeRes.status), `expected 400 or 409 got ${completeRes.status}`);

    const staleWrongChild = signInstanceToken(childA, itemAId);
    const completeWrong = await fetch(`${http.baseUrl}/api/widget/complete-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        instance_token: staleWrongChild,
        idempotency_key: 'race-wrong-child',
      }),
    });
    assert.equal(completeWrong.status, 400);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('R4.5f: limited co-parent sees only linked child in context', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableFlags(db);
    const primary = await registerAndLogin(http.baseUrl, { name: 'Primary' });
    const childA = await createChild(http.baseUrl, primary, { name: 'Astrid', emoji: '🦊' });
    const childB = await createChild(http.baseUrl, primary, { name: 'Belle', emoji: '🐻' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childA]);
    await seedTwoStepLog(db, childA, fam.rows[0].family_id);

    const coparentEmail = `coparent-r45f-${Date.now()}@example.com`;
    const inviteRes = await fetch(`${http.baseUrl}/api/family/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(primary.cookies),
        'X-CSRF-Token': primary.csrfToken,
      },
      body: JSON.stringify({
        name: 'Co Parent',
        email: coparentEmail,
        child_ids: [childA],
      }),
    });
    assert.equal(inviteRes.status, 201, await inviteRes.text());

    const tokenRow = await db.query(
      `SELECT token FROM family_invite WHERE LOWER(email) = $1 AND accepted = false ORDER BY created_at DESC LIMIT 1`,
      [coparentEmail.toLowerCase()]
    );
    const inviteToken = tokenRow.rows[0].token;

    const acceptRes = await fetch(`${http.baseUrl}/api/family/invite/accept-new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: inviteToken, password: 'coparent-pass-12' }),
    });
    assert.equal(acceptRes.status, 201, await acceptRes.text());

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: coparentEmail, password: 'coparent-pass-12' }),
    });
    let coparentCookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      coparentCookies = mergeCookies(coparentCookies, [header]);
    }
    const loginBody = JSON.parse(await loginRes.text());
    const coparentCsrf = loginBody.csrfToken;

    const bindRes = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(coparentCookies),
        'X-CSRF-Token': coparentCsrf,
      },
      body: JSON.stringify({
        installation_id: 'limited-inst',
        platform: 'ios',
        child_id: childA,
      }),
    });
    assert.equal(bindRes.status, 201);
    const { binding_token: token } = await bindRes.json();

    const ctx = await (await fetch(`${http.baseUrl}/api/widget/context`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    assert.equal(ctx.allowed_children.length, 1);
    assert.equal(ctx.allowed_children[0].id, childA);
    assert.equal(ctx.can_switch_children, false);
    assert.equal(ctx.widget_profile, 'personal');

    const switchRes = await fetch(`${http.baseUrl}/api/widget/switch-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ child_id: childB }),
    });
    assert.equal(switchRes.status, 403);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
