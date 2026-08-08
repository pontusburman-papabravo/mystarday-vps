'use strict';

/**
 * P0 — malformed refresh_token cookie must not 500; handoff must set raw hex cookie.
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
const { hashPassword } = require('../src/lib/hash');
const { isValidRawRefreshToken } = require('../src/lib/refresh-tokens');

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
  const email = `p0-handoff-${tag}@example.com`;
  const username = `p0barn-${tag}`;
  const familyId = (
    await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('P0', 'Europe/Stockholm', true) RETURNING id`
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

test('verify-pin-picker sets valid refresh_token cookie (not object serialization)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setupPinFamily(db, tag, `pp-${tag}`);
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    const parentLogin = await loginParent(http.baseUrl, fixture.email, fixture.password);
    const clRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parentLogin.cookies),
        'X-CSRF-Token': parentLogin.csrfToken,
      },
      body: JSON.stringify({ username: fixture.username, pin: '1112' }),
    });
    assert.equal(clRes.status, 200, await clRes.text());
    const childCookies = cookiesAfterResponse(parentLogin.cookies, clRes);
    const pickerOnly = { stjarndag_parent_session: handoffCookieValue(childCookies) };

    const pinRes = await fetch(`${http.baseUrl}/api/family/verify-pin-picker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(pickerOnly),
      },
      body: JSON.stringify({ pin: fixture.pin }),
    });
    assert.equal(pinRes.status, 200, await pinRes.text());

    const setCookies = getSetCookieHeaders(pinRes);
    let refreshValue = null;
    for (const header of setCookies) {
      const m = header.match(/^refresh_token=([^;]+)/);
      if (m) refreshValue = decodeURIComponent(m[1]);
    }
    assert.ok(refreshValue, 'refresh_token Set-Cookie expected');
    assert.equal(isValidRawRefreshToken(refreshValue), true);

    const sessionJar = cookiesAfterResponse(pickerOnly, pinRes);
    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(sessionJar) },
    });
    assert.equal(meRes.status, 200);
    assert.equal((await meRes.json()).type, 'parent');

    const pageRes = await fetch(`${http.baseUrl}/login`, {
      headers: { Cookie: cookieHeader(sessionJar) },
    });
    assert.ok(pageRes.status >= 200 && pageRes.status < 500);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('malformed object-form refresh cookie does not cause 500 on public routes', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const badCookie = cookieHeader({
    refresh_token: '[object Object]',
    access_token: 'not-a-jwt',
  });
  try {
    const loginPage = await fetch(`${http.baseUrl}/login`, { headers: { Cookie: badCookie } });
    assert.ok(loginPage.status >= 200 && loginPage.status < 500);

    const me = await fetch(`${http.baseUrl}/api/auth/me`, { headers: { Cookie: badCookie } });
    assert.notEqual(me.status, 500);

    const logout = await fetch(`${http.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: badCookie, 'Content-Type': 'application/json' },
    });
    assert.notEqual(logout.status, 500);

    const login = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: badCookie },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong-password-1' }),
    });
    assert.notEqual(login.status, 500);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
