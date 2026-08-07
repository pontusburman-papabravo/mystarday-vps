'use strict';

/**
 * R4.5b — canonical next-action, completion core, context, switch-child.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const { FLAG_NATIVE, FLAG_COMPLETION } = require('../src/lib/widget-flags');
const { FLAG_KEYS } = require('../src/lib/activation-flags');
const { hashPassword } = require('../src/lib/hash');
const { getLocalDateStr } = require('../src/lib/daily-log-generator');
const { pickIdagPrimaryNowItem, sortItemsLikeChildIdag } = require('../src/lib/canonical-child-next-activity');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

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

async function childLogin(baseUrl, db, childId) {
  const pin = '4821';
  await db.query(
    `UPDATE child SET username = $1, pin = $2 WHERE id = $3`,
    [`wchild-${childId.slice(0, 8)}`, await hashPassword(pin), childId]
  );
  const loginRes = await fetch(`${baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `wchild-${childId.slice(0, 8)}`, pin }),
  });
  const text = await loginRes.text();
  assert.equal(loginRes.status, 200, text);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { cookies };
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
  return { dateStr, itemAId: itemA.rows[0].id, tplA: tplA.rows[0].id, tplB: tplB.rows[0].id };
}

async function bindChildWidget(baseUrl, childCookies, installationId = 'inst-1') {
  const bindRes = await fetch(`${baseUrl}/api/widget/bindings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(childCookies),
    },
    body: JSON.stringify({ installation_id: installationId, platform: 'ios' }),
  });
  const bindText = await bindRes.text();
  assert.equal(bindRes.status, 201, bindText);
  return JSON.parse(bindText).binding_token;
}

test('R4.5b: pickIdagPrimaryNowItem matches first-star and NNL rules', () => {
  const items = [
    { id: '1', section: 'morgon', completed: false, sort_order: 0 },
    { id: '2', section: 'morgon', completed: false, sort_order: 1 },
  ];
  const sorted = sortItemsLikeChildIdag(items);
  const fsm = pickIdagPrimaryNowItem(sorted, {
    firstStarMode: true,
    isToday: true,
    viewType: 'day_sections',
    showNowNext: false,
  });
  assert.equal(fsm.id, '1');

  const nnl = pickIdagPrimaryNowItem(sorted, {
    firstStarMode: false,
    isToday: true,
    viewType: 'now_next_later',
    showNowNext: true,
  });
  assert.equal(nnl.id, '1');
});

test('R4.5b: substeps all done → direct_complete (not open_app)', async (t) => {
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
    const childId = await createChild(http.baseUrl, parent, { name: 'Sub', emoji: '🐻' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    const familyId = fam.rows[0].family_id;
    const { tplA } = await seedTwoStepLog(db, childId, familyId);

    const sub = await db.query(
      `INSERT INTO activity_sub_step (activity_template_id, name, sort_order)
       VALUES ($1, 'Del 1', 0) RETURNING id`,
      [tplA]
    );
    const itemRow = await db.query(
      `SELECT dli.id FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = $1 LIMIT 1`,
      [childId]
    );
    const itemId = itemRow.rows[0].id;
    await db.query(
      `INSERT INTO daily_log_item_sub_step (daily_log_item_id, activity_sub_step_id, completed)
       VALUES ($1, $2, true)`,
      [itemId, sub.rows[0].id]
    );

    const childSession = await childLogin(http.baseUrl, db, childId);
    const token = await bindChildWidget(http.baseUrl, childSession.cookies);

    const nextRes = await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const nextBody = JSON.parse(await nextRes.text());
    assert.equal(nextRes.status, 200, JSON.stringify(nextBody));
    assert.equal(nextBody.activity.capability, 'direct_complete');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('R4.5b: timer activity → open_app', async (t) => {
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
    const childId = await createChild(http.baseUrl, parent, { name: 'Timer', emoji: '⏱️' });
    await db.query('UPDATE child SET activity_timers_enabled = true WHERE id = $1', [childId]);
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    const familyId = fam.rows[0].family_id;
    const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
       VALUES ($1, 'Timed', '⏱️', 1, 0, 'user') RETURNING id`,
      [familyId]
    );
    await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
    const logRes = await db.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, dateStr]
    );
    await db.query(
      `UPDATE activity_template SET duration_seconds = 60 WHERE id = $1`,
      [tpl.rows[0].id]
    );
    await db.query(
      `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
       VALUES ($1, $2, 'Timed', '⏱️', 1, 0, 'morgon')`,
      [logRes.rows[0].id, tpl.rows[0].id]
    );

    const childSession = await childLogin(http.baseUrl, db, childId);
    const token = await bindChildWidget(http.baseUrl, childSession.cookies);
    const nextBody = JSON.parse(await (await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${token}` },
    })).text());
    assert.equal(nextBody.activity.capability, 'open_app');
    assert.equal(nextBody.activity.open_app_reason, 'timer');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('R4.5b: parent bind sets completed_by parent + widget_ios', async (t) => {
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
    const childId = await createChild(http.baseUrl, parent, { name: 'ParentW', emoji: '👪' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    await seedTwoStepLog(db, childId, fam.rows[0].family_id);

    const bindRes = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parent.cookies),
        'X-CSRF-Token': parent.csrfToken,
      },
      body: JSON.stringify({
        installation_id: 'parent-inst',
        platform: 'ios',
        child_id: childId,
      }),
    });
    assert.equal(bindRes.status, 201);
    const { binding_token: token } = await bindRes.json();

    const nextBody = JSON.parse(await (await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${token}` },
    })).text());
    const completeRes = await fetch(`${http.baseUrl}/api/widget/complete-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        instance_token: nextBody.activity.instance_token,
        idempotency_key: 'parent-complete-1',
      }),
    });
    assert.equal(completeRes.status, 200);
    const completeBody = await completeRes.json();
    assert.equal(completeBody.viewer_mode, 'parent');
    assert.ok(completeBody.completed.title);

    const row = await db.query(
      `SELECT completed_by, completion_source, completed_by_parent_id
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = $1 AND dli.completed = true`,
      [childId]
    );
    assert.equal(row.rows[0].completed_by, 'parent');
    assert.equal(row.rows[0].completion_source, 'widget_ios');
    assert.ok(row.rows[0].completed_by_parent_id);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('R4.5b: context + switch-child (parent)', async (t) => {
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
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childA]);
    const familyId = fam.rows[0].family_id;
    await seedTwoStepLog(db, childA, familyId);
    await seedTwoStepLog(db, childB, familyId);

    const bindRes = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parent.cookies),
        'X-CSRF-Token': parent.csrfToken,
      },
      body: JSON.stringify({
        installation_id: 'switch-inst',
        platform: 'ios',
        child_id: childA,
      }),
    });
    const { binding_token: tokenA } = await bindRes.json();

    const ctxRes = await fetch(`${http.baseUrl}/api/widget/context`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const ctx = await ctxRes.json();
    assert.equal(ctx.viewer_mode, 'parent');
    assert.equal(ctx.allowed_children.length, 2);
    assert.equal(ctx.active_child.id, childA);

    const switchRes = await fetch(`${http.baseUrl}/api/widget/switch-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ child_id: childB }),
    });
    assert.equal(switchRes.status, 200);
    const switched = await switchRes.json();
    assert.ok(switched.binding_token);
    assert.equal(switched.child_id, childB);
    assert.equal(switched.next.status, 'ready');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('R4.5b: child_session cannot switch-child', async (t) => {
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
    await seedTwoStepLog(db, childA, fam.rows[0].family_id);

    const childSession = await childLogin(http.baseUrl, db, childA);
    const token = await bindChildWidget(http.baseUrl, childSession.cookies);

    const ctx = await (await fetch(`${http.baseUrl}/api/widget/context`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    assert.equal(ctx.allowed_children.length, 1);

    const switchRes = await fetch(`${http.baseUrl}/api/widget/switch-child`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ child_id: childB }),
    });
    assert.equal(switchRes.status, 403);
    const body = await switchRes.json();
    assert.equal(body.status, 'child_switch_forbidden');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('R4.5b: stale instance_token rejected when another item is now', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const { signInstanceToken } = require('../src/lib/widget-instance-token');
  const http = await listenApp(createApp);
  try {
    await enableFlags(db);
    const parent = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, parent, { name: 'Stale', emoji: '⚡' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    const { itemAId, tplB } = await seedTwoStepLog(db, childId, fam.rows[0].family_id);
    const itemBRow = await db.query(
      `SELECT dli.id FROM daily_log_item dli
       JOIN activity_template at ON at.id = dli.activity_template_id
       WHERE dli.activity_template_id = $1`,
      [tplB]
    );
    const itemBId = itemBRow.rows[0].id;

    const childSession = await childLogin(http.baseUrl, db, childId);
    const token = await bindChildWidget(http.baseUrl, childSession.cookies);

    const wrongToken = signInstanceToken(childId, itemBId);

    const completeRes = await fetch(`${http.baseUrl}/api/widget/complete-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        instance_token: wrongToken,
        idempotency_key: 'stale-1',
      }),
    });
    assert.equal(completeRes.status, 409);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
