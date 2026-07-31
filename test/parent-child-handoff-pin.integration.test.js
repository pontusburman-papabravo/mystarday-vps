'use strict';

/**
 * PIN handoff through full Express stack (session-public before requireParent).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');
const { hashOpaque } = require('../src/lib/parent-session-handoff');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
process.env.AUTHZ_HARDENING_ENABLED = 'true';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function loginParent(baseUrl, email, password) {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await loginRes.text();
  assert.equal(loginRes.status, 200, text);
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { cookies, csrfToken: JSON.parse(text).csrfToken };
}

async function setupPinFamily(db, tag, password, pin = '1234') {
  const passwordHash = await hashPassword(password);
  const pinHash = await hashPassword(pin);
  const childPinHash = await hashPassword('1112');
  const email = `pin-handoff-${tag}@example.com`;
  const username = `pinbarn-${tag}`;
  const familyId = (
    await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('PinH', 'Europe/Stockholm', true) RETURNING id`
    )
  ).rows[0].id;
  const parentId = (
    await db.query(
      `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified, parent_pin_hash)
       VALUES ($1,$2,$3,'Parent',true,true,$4) RETURNING id`,
      [email, passwordHash, familyId, pinHash]
    )
  ).rows[0].id;
  const childId = (
    await db.query(
      `INSERT INTO child (family_id, name, emoji, username, pin) VALUES ($1,'B','⭐',$2,$3) RETURNING id`,
      [familyId, username, childPinHash]
    )
  ).rows[0].id;
  await db.query(`INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1,$2,'primary')`, [
    parentId,
    childId,
  ]);
  return { familyId, parentId, childId, email, username, password, pin };
}

function cookiesAfterResponse(prev, res) {
  let jar = { ...prev };
  for (const header of getSetCookieHeaders(res)) {
    jar = mergeCookies(jar, [header]);
  }
  return jar;
}

function handoffCookieValue(jar) {
  return jar.stjarndag_parent_session;
}

test('verify-pin-picker reachable without JWT after child logout (handoff only)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const fixture = await setupPinFamily(db, tag, `pp-${tag}`);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, fixture.password);
    const clRes = await fetch(`${baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parentLogin.cookies),
        'X-CSRF-Token': parentLogin.csrfToken,
      },
      body: JSON.stringify({ username: fixture.username, pin: '1112' }),
    });
    const clText = await clRes.text();
    assert.equal(clRes.status, 200, clText);
    let childCookies = cookiesAfterResponse(parentLogin.cookies, clRes);
    const childBody = JSON.parse(clText);
    const handoffBefore = handoffCookieValue(childCookies);
    assert.ok(handoffBefore);

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': childBody.csrfToken,
        'Content-Type': 'application/json',
      },
    });
    const logoutBody = JSON.parse(await logoutRes.text());
    assert.equal(logoutRes.status, 200, JSON.stringify(logoutBody));
    assert.equal(logoutBody.needsParentPin, true);

    let afterLogout = cookiesAfterResponse(childCookies, logoutRes);
    assert.ok(handoffCookieValue(afterLogout), 'handoff cookie must remain for PIN picker');
    const handoffDb = await db.query(
      `SELECT refresh_token_id FROM parent_session_handoff WHERE parent_id = $1 AND used_at IS NULL`,
      [fixture.parentId]
    );
    assert.equal(handoffDb.rows.length, 1);
    const parentRefresh = await db.query(
      `SELECT id FROM refresh_token WHERE id = $1`,
      [handoffDb.rows[0].refresh_token_id]
    );
    assert.equal(parentRefresh.rows.length, 1, 'parent refresh for handoff must exist before PIN consume');

    const pickerOnly = { stjarndag_parent_session: handoffCookieValue(afterLogout) };
    const pinRes = await fetch(`${baseUrl}/api/family/verify-pin-picker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(pickerOnly),
      },
      body: JSON.stringify({ pin: fixture.pin }),
    });
    const pinText = await pinRes.text();
    assert.equal(pinRes.status, 200, pinText);
    const pinBody = JSON.parse(pinText);
    assert.equal(pinBody.ok, true);
    assert.ok(pinBody.parent);
    assert.equal(pinBody.parent.type, 'parent');
    assert.equal(pinBody.parent.id, fixture.parentId);
    assert.ok(pinBody.csrfToken);

    const sessionJar = cookiesAfterResponse(pickerOnly, pinRes);
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(sessionJar) },
    });
    const me = await meRes.json();
    assert.equal(me.type, 'parent');
    assert.equal(me.id, fixture.parentId);

    const reuse = await fetch(`${baseUrl}/api/family/verify-pin-picker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(pickerOnly) },
      body: JSON.stringify({ pin: fixture.pin }),
    });
    assert.equal(reuse.status, 409);
    assert.equal((await reuse.json()).code, 'PARENT_HANDOFF_USED');

    const activeHandoffs = await db.query(
      `SELECT COUNT(*)::int AS n FROM parent_session_handoff
       WHERE parent_id = $1 AND used_at IS NULL`,
      [fixture.parentId]
    );
    assert.equal(activeHandoffs.rows[0].n, 0);
  } finally {
    await close();
    await db.cleanup();
  }
});

test('wrong PIN does not consume handoff', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setupPinFamily(db, tag, `wp-${tag}`);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, fixture.password);
    const clRes = await fetch(`${baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parentLogin.cookies),
        'X-CSRF-Token': parentLogin.csrfToken,
      },
      body: JSON.stringify({ username: fixture.username, pin: '1112' }),
    });
    let childCookies = cookiesAfterResponse(parentLogin.cookies, clRes);
    const childBody = JSON.parse(await clRes.text());
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': childBody.csrfToken,
        'Content-Type': 'application/json',
      },
    });
    assert.equal((await logoutRes.json()).needsParentPin, true);
    const afterLogout = cookiesAfterResponse(childCookies, logoutRes);
    const pickerOnly = { stjarndag_parent_session: handoffCookieValue(afterLogout) };

    const badPin = await fetch(`${baseUrl}/api/family/verify-pin-picker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(pickerOnly) },
      body: JSON.stringify({ pin: '0000' }),
    });
    assert.equal(badPin.status, 401);
    assert.equal((await badPin.json()).code, 'PARENT_PIN_INVALID');

    const row = await db.query(
      `SELECT used_at FROM parent_session_handoff WHERE parent_id = $1`,
      [fixture.parentId]
    );
    assert.equal(row.rows[0].used_at, null);
  } finally {
    await close();
    await db.cleanup();
  }
});

test('handoff consume rolls back when transaction inject fails', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const passwordHash = await hashPassword(`rb-${tag}`);
  const childPinHash = await hashPassword('1112');
  const email = `rb-${tag}@example.com`;
  const username = `rbu-${tag}`;
  const familyId = (
    await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('RB','Europe/Stockholm',true) RETURNING id`
    )
  ).rows[0].id;
  const parentId = (
    await db.query(
      `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
       VALUES ($1,$2,$3,'P',true,true) RETURNING id`,
      [email, passwordHash, familyId]
    )
  ).rows[0].id;
  const childId = (
    await db.query(
      `INSERT INTO child (family_id, name, emoji, username, pin) VALUES ($1,'B','⭐',$2,$3) RETURNING id`,
      [familyId, username, childPinHash]
    )
  ).rows[0].id;
  await db.query(`INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1,$2,'primary')`, [
    parentId,
    childId,
  ]);

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const parentLogin = await loginParent(baseUrl, email, `rb-${tag}`);
    const clRes = await fetch(`${baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parentLogin.cookies),
        'X-CSRF-Token': parentLogin.csrfToken,
      },
      body: JSON.stringify({ username, pin: '1112' }),
    });
    let childCookies = cookiesAfterResponse(parentLogin.cookies, clRes);
    const opaque = handoffCookieValue(childCookies);
    const handoffRow = await db.query(
      `SELECT id, refresh_token_id, used_at FROM parent_session_handoff WHERE parent_id = $1`,
      [parentId]
    );
    const refreshId = handoffRow.rows[0].refresh_token_id;

    const { consumeHandoffAndActivateSession } = require('../src/lib/parent-session-handoff');
    const fakeRes = { cookie() {}, clearCookie() {} };
    const fakeReq = { cookies: { stjarndag_parent_session: opaque }, id: 'test-rollback' };
    const result = await consumeHandoffAndActivateSession(fakeReq, fakeRes, {
      testInjectFailAfterHandoffLock: true,
    });
    assert.equal(result.ok, false);

    const after = await db.query(
      `SELECT used_at FROM parent_session_handoff WHERE id = $1`,
      [handoffRow.rows[0].id]
    );
    assert.equal(after.rows[0].used_at, null);
    const refreshStill = await db.query(`SELECT id FROM refresh_token WHERE id = $1`, [refreshId]);
    assert.equal(refreshStill.rows.length, 1);
  } finally {
    await close();
    await db.cleanup();
  }
});

test('child login with dead parent refresh does not create orphan child refresh', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const password = `orphan-${tag}`;
  const passwordHash = await hashPassword(password);
  const childPinHash = await hashPassword('1112');
  const email = `orphan-${tag}@example.com`;
  const username = `orphan-${tag}`;
  const familyId = (
    await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('O','Europe/Stockholm',true) RETURNING id`
    )
  ).rows[0].id;
  const parentId = (
    await db.query(
      `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
       VALUES ($1,$2,$3,'P',true,true) RETURNING id`,
      [email, passwordHash, familyId]
    )
  ).rows[0].id;
  const childId = (
    await db.query(
      `INSERT INTO child (family_id, name, emoji, username, pin) VALUES ($1,'B','⭐',$2,$3) RETURNING id`,
      [familyId, username, childPinHash]
    )
  ).rows[0].id;
  await db.query(`INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1,$2,'primary')`, [
    parentId,
    childId,
  ]);

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const parentLogin = await loginParent(baseUrl, email, password);
    await db.query('DELETE FROM refresh_token WHERE parent_id = $1', [parentId]);

    const beforeChildRefresh = await db.query(
      `SELECT COUNT(*)::int AS n FROM refresh_token WHERE child_id = $1`,
      [childId]
    );

    const clRes = await fetch(`${baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parentLogin.cookies),
        'X-CSRF-Token': parentLogin.csrfToken,
      },
      body: JSON.stringify({ username, pin: '1112' }),
    });
    assert.equal(clRes.status, 409);
    assert.equal((await clRes.json()).code, 'PARENT_HANDOFF_CREATE_FAILED');

    const afterChildRefresh = await db.query(
      `SELECT COUNT(*)::int AS n FROM refresh_token WHERE child_id = $1`,
      [childId]
    );
    assert.equal(afterChildRefresh.rows[0].n, beforeChildRefresh.rows[0].n);
  } finally {
    await close();
    await db.cleanup();
  }
});
