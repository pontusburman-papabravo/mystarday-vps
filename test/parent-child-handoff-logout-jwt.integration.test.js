'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');
const config = require('../src/lib/config');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function setup(db, tag) {
  const password = `jwt-${tag}`;
  const passwordHash = await hashPassword(password);
  const childPinHash = await hashPassword('1112');
  const email = `jwt-${tag}@example.com`;
  const username = `jwtu-${tag}`;
  const familyId = (
    await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('J','Europe/Stockholm',true) RETURNING id`
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
  return { email, password, username, familyId, parentId, childId };
}

async function loginAndChild(baseUrl, fixture) {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: fixture.email, password: fixture.password }),
  });
  let cookies = {};
  for (const h of getSetCookieHeaders(loginRes)) cookies = mergeCookies(cookies, [h]);
  const csrf = JSON.parse(await loginRes.text()).csrfToken;
  const clRes = await fetch(`${baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(cookies),
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify({ username: fixture.username, pin: '1112' }),
  });
  const clText = await clRes.text();
  let childCookies = {};
  for (const h of getSetCookieHeaders(clRes)) childCookies = mergeCookies(childCookies, [h]);
  childCookies = { ...cookies, ...childCookies };
  const childBody = JSON.parse(clText);
  assert.ok(childCookies.stjarndag_parent_session, 'handoff cookie expected after child login');
  return { childCookies, childBody };
}

test('child logout with forged JWT and handoff fails closed', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setup(db, tag);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const { childCookies, childBody } = await loginAndChild(baseUrl, fixture);
    const forged = jwt.sign(
      { id: fixture.childId, type: 'child', familyId: fixture.familyId },
      'wrong-secret-at-least-32-characters-long',
      { expiresIn: '1h' }
    );
    const jar = {
      stjarndag_parent_session: childCookies.stjarndag_parent_session,
      refresh_token: childCookies.refresh_token,
      access_token: forged,
    };
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(jar),
        'X-CSRF-Token': childBody.csrfToken,
        'Content-Type': 'application/json',
      },
    });
    const body = await res.json();
    assert.equal(res.status, 401, JSON.stringify(body));
    assert.equal(body.code, 'CHILD_SESSION_INVALID');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('child logout with expired JWT and handoff fails closed', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setup(db, tag);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const { childCookies, childBody } = await loginAndChild(baseUrl, fixture);
    const expired = jwt.sign(
      { id: fixture.childId, type: 'child', familyId: fixture.familyId },
      config.jwt.secret,
      { expiresIn: -10 }
    );
    const jar = {
      stjarndag_parent_session: childCookies.stjarndag_parent_session,
      refresh_token: childCookies.refresh_token,
      access_token: expired,
    };
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(jar),
        'X-CSRF-Token': childBody.csrfToken,
        'Content-Type': 'application/json',
      },
    });
    const body = await res.json();
    assert.equal(res.status, 401, JSON.stringify(body));
    assert.equal(body.code, 'CHILD_SESSION_INVALID');
  } finally {
    await close();
    await db.cleanup();
  }
});
