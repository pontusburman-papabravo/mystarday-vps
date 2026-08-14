'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { getLocalDateStr } = require('../src/lib/daily-log-generator');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function childLog(http, username, pin, dateStr) {
  const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
  assert.equal(loginRes.status, 200);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  const logRes = await fetch(`${http.baseUrl}/api/me/daily-log?date=${dateStr}`, {
    headers: { Cookie: cookieHeader(cookies) },
  });
  return { status: logRes.status, body: await logRes.json() };
}

test('new child defaults activity_timers_enabled OFF', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session);
    const row = await db.query('SELECT activity_timers_enabled FROM child WHERE id = $1', [childId]);
    assert.equal(row.rows[0].activity_timers_enabled, false);

    const childrenRes = await fetch(`${http.baseUrl}/api/children`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const children = await childrenRes.json();
    const child = (Array.isArray(children) ? children : children.children || []).find((c) => c.id === childId);
    assert.equal(child.activity_timers_enabled, false);
    assert.equal(child.activity_timer_v2_rollout_available, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('master OFF + duration → activity_timer_v2 false', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');

  try {
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session);
    const pin = '4821';
    await db.query(
      `UPDATE child SET username = 'atoff', pin = $1, activity_timers_enabled = false WHERE id = $2`,
      [await hashPassword(pin), childId]
    );

    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, duration_seconds, source)
       VALUES ($1, 'Timed off', '⏱️', 1, 0, 90, 'user') RETURNING id`,
      [fam.rows[0].family_id]
    );
    await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
    const log = await db.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, dateStr]
    );
    await db.query(
      `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
       VALUES ($1, $2, 'Timed off', '⏱️', 1, 0, 'morgon')`,
      [log.rows[0].id, tpl.rows[0].id]
    );

    const { status, body } = await childLog(http, 'atoff', pin, dateStr);
    assert.equal(status, 200);
    assert.equal(body.activity_timers_enabled, false);
    assert.equal(body.activity_timer_v2, false);
    const item = body.items.find((i) => i.name === 'Timed off');
    assert.equal(item.duration_seconds, 90);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('master ON + duration → activity_timer_v2 true', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');

  try {
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session);
    const pin = '4822';
    await db.query(
      `UPDATE child SET username = 'aton', pin = $1, activity_timers_enabled = true WHERE id = $2`,
      [await hashPassword(pin), childId]
    );

    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, duration_seconds, source)
       VALUES ($1, 'Timed on', '⏱️', 1, 0, 60, 'user') RETURNING id`,
      [fam.rows[0].family_id]
    );
    await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
    const log = await db.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, dateStr]
    );
    await db.query(
      `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
       VALUES ($1, $2, 'Timed on', '⏱️', 1, 0, 'morgon')`,
      [log.rows[0].id, tpl.rows[0].id]
    );

    const { status, body } = await childLog(http, 'aton', pin, dateStr);
    assert.equal(status, 200);
    assert.equal(body.activity_timers_enabled, true);
    assert.equal(body.activity_timer_v2, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('ACTIVITY_TIMER_V2_DISABLED kill switch disables v2 even when master ON', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const prev = process.env.ACTIVITY_TIMER_V2_DISABLED;
  process.env.ACTIVITY_TIMER_V2_DISABLED = 'true';
  delete require.cache[require.resolve('../src/lib/activity-timer-rollout')];
  delete require.cache[require.resolve('../src/routes/daily-logs/child-self')];

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');

  try {
    const session = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, session);
    const pin = '4823';
    await db.query(
      `UPDATE child SET username = 'atkill', pin = $1, activity_timers_enabled = true WHERE id = $2`,
      [await hashPassword(pin), childId]
    );

    const { status, body } = await childLog(http, 'atkill', pin, dateStr);
    assert.equal(status, 200);
    assert.equal(body.activity_timers_enabled, true);
    assert.equal(body.activity_timer_v2, false);
  } finally {
    process.env.ACTIVITY_TIMER_V2_DISABLED = prev;
    delete require.cache[require.resolve('../src/lib/activity-timer-rollout')];
    delete require.cache[require.resolve('../src/routes/daily-logs/child-self')];
    await http.close();
    await db.cleanup();
  }
});

test('sibling isolation: master ON for child A does not enable child B', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');

  try {
    const session = await registerAndLogin(http.baseUrl);
    const childA = await createChild(http.baseUrl, session, { name: 'SyskonA' });
    const childB = await createChild(http.baseUrl, session, { name: 'SyskonB' });
    const pinA = '4831';
    const pinB = '4832';
    await db.query(
      `UPDATE child SET username = 'sibA', pin = $1, activity_timers_enabled = true WHERE id = $2`,
      [await hashPassword(pinA), childA]
    );
    await db.query(
      `UPDATE child SET username = 'sibB', pin = $1, activity_timers_enabled = false WHERE id = $2`,
      [await hashPassword(pinB), childB]
    );

    const logA = await childLog(http, 'sibA', pinA, dateStr);
    const logB = await childLog(http, 'sibB', pinB, dateStr);
    assert.equal(logA.body.activity_timer_v2, true);
    assert.equal(logB.body.activity_timer_v2, false);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
