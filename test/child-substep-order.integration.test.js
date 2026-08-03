'use strict';

/**
 * Child GET sub-steps returns activity_sub_step rows in sort_order order.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function assertSafeIntegrationDatabase() {
  const url = process.env.DATABASE_URL || '';
  assert.ok(url.length > 0, 'DATABASE_URL required');
  assert.ok(!/mock_test/i.test(url), 'mock DATABASE_URL cannot run integration order tests');
  const parsed = new URL(url.replace(/^postgres(ql)?:\/\//, 'http://'));
  const host = parsed.hostname || '';
  assert.ok(host === 'localhost' || host === '127.0.0.1', `localhost DB required, got ${host}`);
  const blockedHost = 'mys' + 'tarday.se';
  assert.ok(!url.includes(blockedHost), 'live site DATABASE_URL forbidden');
}

const DATE = '2026-08-12';

test('child sub-steps API preserves activity_sub_step sort_order', async (t) => {
  assertSafeIntegrationDatabase();
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    t.after(async () => {
      await http.close().catch(() => {});
      await db.cleanup();
    });

    const session = await registerAndLogin(http.baseUrl);
    const pin = '5284';
    const childId = await createChild(http.baseUrl, session, {
      name: 'DelstegOrdning',
      pin,
      birthday: '2017-03-01',
    });
    const pinHash = await hashPassword(pin);
    const username = `subord_${Date.now().toString(36)}`;
    await db.query('UPDATE child SET pin = $1, username = $2 WHERE id = $3', [pinHash, username, childId]);

    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
       SELECT family_id, 'Morgonrutin', '🌅', 1, 0, 'user' FROM child WHERE id = $1 RETURNING id`,
      [childId]
    );
    const templateId = tpl.rows[0].id;

    const stepNames = ['Steg C', 'Steg A', 'Steg B'];
    const sortOrders = [2, 0, 1];
    const stepIds = [];
    for (let i = 0; i < stepNames.length; i++) {
      const ins = await db.query(
        `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
         VALUES ($1, $2, '⭐', $3) RETURNING id`,
        [templateId, stepNames[i], sortOrders[i]]
      );
      stepIds.push(ins.rows[0].id);
    }

    await db.query(
      'DELETE FROM daily_log_item WHERE daily_log_id IN (SELECT id FROM daily_log WHERE child_id = $1 AND date = $2)',
      [childId, DATE]
    );
    await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, DATE]);
    const logRes = await db.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, DATE]
    );
    const itemRes = await db.query(
      `INSERT INTO daily_log_item
         (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
       VALUES ($1, $2, 'Morgonrutin', '🌅', 1, 0, 'morgon')
       RETURNING id`,
      [logRes.rows[0].id, templateId]
    );
    const itemId = itemRes.rows[0].id;

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin }),
    });
    assert.equal(loginRes.status, 200, await loginRes.text());
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const subRes = await fetch(`${http.baseUrl}/api/me/daily-log-items/${itemId}/sub-steps`, {
      headers: { Cookie: cookieHeader(cookies) },
    });
    const body = JSON.parse(await subRes.text());
    assert.equal(subRes.status, 200, JSON.stringify(body));
    assert.ok(Array.isArray(body.sub_steps));
    assert.equal(body.sub_steps.length, 3);
    const namesInResponse = body.sub_steps.map((s) => s.name);
    assert.deepEqual(namesInResponse, ['Steg A', 'Steg B', 'Steg C']);
    assert.deepEqual(
      body.sub_steps.map((s) => s.id),
      [stepIds[1], stepIds[2], stepIds[0]]
    );
  } finally {
    await http.close();
    await db.cleanup();
  }
});
