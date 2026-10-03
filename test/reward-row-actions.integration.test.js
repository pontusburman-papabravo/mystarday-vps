'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function sessionCookies(res) {
  let cookies = {};
  for (const header of getSetCookieHeaders(res)) cookies = mergeCookies(cookies, [header]);
  const body = JSON.parse(await res.text());
  return { cookies: cookies, csrfToken: body.csrfToken, body: body };
}

test('inactive rewards stay in Hantera and leave the child treasure', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const stamp = Date.now();
  const email = `row-${stamp}@example.com`;
  const username = `b${stamp}`;
  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('H', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;
  const parentRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, 'P', true, true) RETURNING id`,
    [email, await hashPassword('row-pass-1'), familyId]
  );
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, username, pin, emoji) VALUES ($1, 'Bo', $2, $3, '⭐') RETURNING id`,
    [familyId, username, await hashPassword('1111')]
  );
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
    [parentRes.rows[0].id, childRes.rows[0].id]
  );

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: 'row-pass-1' }),
    });
    const parent = await sessionCookies(loginRes);
    const parentHeaders = {
      Cookie: cookieHeader(parent.cookies),
      'X-CSRF-Token': parent.csrfToken,
      'Content-Type': 'application/json',
    };

    const created = await fetch(`${http.baseUrl}/api/rewards`, {
      method: 'POST',
      headers: parentHeaders,
      body: JSON.stringify({ name: 'Bio', icon: '🎬', star_cost: 4, requires_approval: false }),
    });
    assert.equal(created.status, 201);
    const reward = await created.json();

    const childLogin = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, pin: '1111' }),
    });
    const child = await sessionCookies(childLogin);

    const off = await fetch(`${http.baseUrl}/api/rewards/${reward.id}`, {
      method: 'PUT',
      headers: parentHeaders,
      body: JSON.stringify({ is_active: false }),
    });
    assert.equal(off.status, 200);
    const offBody = await off.json();
    assert.equal(offBody.is_active, false);

    const parentList = await fetch(`${http.baseUrl}/api/rewards`, {
      headers: { Cookie: cookieHeader(parent.cookies) },
    });
    const parentBody = await parentList.json();
    const listed = parentBody.rewards.find(function (row) { return row.id === reward.id; });
    assert.equal(listed.is_active, false);

    const childList = await fetch(`${http.baseUrl}/api/me/rewards`, {
      headers: { Cookie: cookieHeader(child.cookies) },
    });
    const childBody = await childList.json();
    assert.equal(childBody.rewards.some(function (row) { return row.id === reward.id; }), false);

    const redeem = await fetch(`${http.baseUrl}/api/me/rewards/${reward.id}/redeem`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(child.cookies),
        'X-CSRF-Token': child.csrfToken,
      },
    });
    assert.equal(redeem.status, 400);
    assert.equal((await redeem.json()).code, 'reward_inactive');

    const on = await fetch(`${http.baseUrl}/api/rewards/${reward.id}`, {
      method: 'PUT',
      headers: parentHeaders,
      body: JSON.stringify({ is_active: true }),
    });
    assert.equal(on.status, 200);
    assert.equal((await on.json()).is_active, true);
    const childAgain = await fetch(`${http.baseUrl}/api/me/rewards`, {
      headers: { Cookie: cookieHeader(child.cookies) },
    });
    const againBody = await childAgain.json();
    assert.equal(againBody.rewards.some(function (row) { return row.id === reward.id; }), true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('confirmed delete removes an unused reward and its goal', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const stamp = Date.now();
  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('H', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;
  const parentRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, 'P', true, true) RETURNING id`,
    [`del-${stamp}@example.com`, await hashPassword('row-pass-1'), familyId]
  );
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, username, pin, emoji) VALUES ($1, 'Bo', $2, $3, '⭐') RETURNING id`,
    [familyId, `d${stamp}`, await hashPassword('1111')]
  );
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
    [parentRes.rows[0].id, childRes.rows[0].id]
  );

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `del-${stamp}@example.com`, password: 'row-pass-1' }),
    });
    const parent = await sessionCookies(loginRes);
    const headers = {
      Cookie: cookieHeader(parent.cookies),
      'X-CSRF-Token': parent.csrfToken,
      'Content-Type': 'application/json',
    };
    const created = await fetch(`${http.baseUrl}/api/rewards`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ name: 'Glass', icon: '🍦', star_cost: 2, requires_approval: true }),
    });
    const reward = await created.json();
    await db.query(
      `INSERT INTO child_reward_goal (child_id, reward_id, status, set_by) VALUES ($1, $2, 'active', $3)`,
      [childRes.rows[0].id, reward.id, parentRes.rows[0].id]
    );

    const listed = await fetch(`${http.baseUrl}/api/rewards`, { headers: { Cookie: cookieHeader(parent.cookies) } });
    const row = (await listed.json()).rewards.find(function (item) { return item.id === reward.id; });
    assert.equal(row.goal_count, 1);
    assert.equal(row.redemption_count, 0);

    const del = await fetch(`${http.baseUrl}/api/rewards/${reward.id}`, { method: 'DELETE', headers: headers });
    assert.equal(del.status, 200);
    const delBody = await del.json();
    assert.equal(delBody.reward_deleted, true);
    assert.equal(delBody.goals_removed, 1);

    const after = await fetch(`${http.baseUrl}/api/rewards`, { headers: { Cookie: cookieHeader(parent.cookies) } });
    assert.equal((await after.json()).rewards.some(function (item) { return item.id === reward.id; }), false);
    const goal = await db.query('SELECT id FROM child_reward_goal WHERE reward_id = $1', [reward.id]);
    assert.equal(goal.rows.length, 0);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('delete keeps a redeemed reward inactive so spent stars stay', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const stamp = Date.now();
  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('H', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;
  const parentRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, verified, onboarding_completed)
     VALUES ($1, $2, $3, 'P', true, true) RETURNING id`,
    [`hist-${stamp}@example.com`, await hashPassword('row-pass-1'), familyId]
  );
  const childRes = await db.query(
    `INSERT INTO child (family_id, name, username, pin, emoji) VALUES ($1, 'Bo', $2, $3, '⭐') RETURNING id`,
    [familyId, `h${stamp}`, await hashPassword('1111')]
  );
  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
    [parentRes.rows[0].id, childRes.rows[0].id]
  );

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `hist-${stamp}@example.com`, password: 'row-pass-1' }),
    });
    const parent = await sessionCookies(loginRes);
    const headers = {
      Cookie: cookieHeader(parent.cookies),
      'X-CSRF-Token': parent.csrfToken,
      'Content-Type': 'application/json',
    };
    const created = await fetch(`${http.baseUrl}/api/rewards`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ name: 'Bio', icon: '🎬', star_cost: 3, requires_approval: false }),
    });
    const reward = await created.json();
    await db.query(
      `INSERT INTO reward_redemption (reward_id, child_id, status, star_cost, reward_name, reward_icon)
       VALUES ($1, $2, 'auto', 3, 'Bio', '🎬')`,
      [reward.id, childRes.rows[0].id]
    );

    const del = await fetch(`${http.baseUrl}/api/rewards/${reward.id}`, { method: 'DELETE', headers: headers });
    assert.equal(del.status, 200);
    const delBody = await del.json();
    assert.equal(delBody.reward_deleted, false);
    assert.equal(delBody.redemption_count, 1);

    const stored = await db.query('SELECT is_active FROM reward WHERE id = $1', [reward.id]);
    assert.equal(stored.rows[0].is_active, false);
    const hist = await db.query('SELECT star_cost FROM reward_redemption WHERE reward_id = $1', [reward.id]);
    assert.equal(hist.rows.length, 1);
    assert.equal(hist.rows[0].star_cost, 3);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
