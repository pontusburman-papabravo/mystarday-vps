'use strict';

/**
 * R4.5 — widget next-action + complete-action (server contract).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const { FLAG_NATIVE, FLAG_COMPLETION } = require('../src/lib/widget-flags');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function enableFlags(db) {
  for (const key of [FLAG_KEY, FLAG_NATIVE, FLAG_COMPLETION]) {
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
    [`widgetchild-${childId.slice(0, 8)}`, await require('../src/lib/hash').hashPassword(pin), childId]
  );
  const loginRes = await fetch(`${baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `widgetchild-${childId.slice(0, 8)}`, pin }),
  });
  const text = await loginRes.text();
  assert.equal(loginRes.status, 200, text);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { cookies };
}

test('R4.5: widget bind → next-action → complete with idempotency', async (t) => {
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
    const childId = await createChild(http.baseUrl, parent, { name: 'Widget Barn', emoji: '🦊' });

    const childSession = await childLogin(http.baseUrl, db, childId);

    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    const familyId = fam.rows[0].family_id;
    const { getLocalDateStr } = require('../src/lib/daily-log-generator');
    const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source)
       VALUES ($1, 'Widget steg', '🪥', 1, 0, 'user') RETURNING id`,
      [familyId]
    );
    await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
    const logRes = await db.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, dateStr]
    );
    await db.query(
      `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
       VALUES ($1, $2, 'Widget steg', '🪥', 1, 0, 'morgon')`,
      [logRes.rows[0].id, tpl.rows[0].id]
    );

    const bindRes = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(childSession.cookies),
      },
      body: JSON.stringify({
        installation_id: 'test-install-1',
        platform: 'ios',
      }),
    });
    const bindText = await bindRes.text();
    assert.equal(bindRes.status, 201, bindText);
    const { binding_token: bindingToken } = JSON.parse(bindText);
    assert.ok(bindingToken);

    const nextRes = await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${bindingToken}` },
    });
    const nextBody = JSON.parse(await nextRes.text());
    assert.equal(nextRes.status, 200, JSON.stringify(nextBody));
    assert.equal(nextBody.status, 'ready');
    assert.ok(nextBody.activity?.instance_token);
    assert.equal(nextBody.activity.capability, 'direct_complete');

    const idem = 'idem-key-001';
    const completeRes = await fetch(`${http.baseUrl}/api/widget/complete-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bindingToken}`,
      },
      body: JSON.stringify({
        instance_token: nextBody.activity.instance_token,
        idempotency_key: idem,
      }),
    });
    const completeBody = JSON.parse(await completeRes.text());
    assert.equal(completeRes.status, 200, JSON.stringify(completeBody));
    assert.equal(completeBody.status, 'completed');
    assert.ok(completeBody.reward.stars_added >= 0);

    const dupRes = await fetch(`${http.baseUrl}/api/widget/complete-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bindingToken}`,
      },
      body: JSON.stringify({
        instance_token: nextBody.activity.instance_token,
        idempotency_key: idem,
      }),
    });
    const dupBody = JSON.parse(await dupRes.text());
    assert.equal(dupRes.status, 200);
    assert.equal(dupBody.status, completeBody.status);

    const countStars = await db.query(
      `SELECT COUNT(*)::int AS n FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = $1 AND dli.completed = true`,
      [childId]
    );
    assert.ok(countStars.rows[0].n >= 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
