'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');
const jwt = require('jsonwebtoken');
const config = require('../src/lib/config');
const { isEscalatedParentExpired } = require('../src/lib/adult-privilege-escalation');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';

const FLAG = 'adult_privilege_v1';

async function enableFlags(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG]
  );
}

async function setupPinFamily(db, tag) {
  const password = `pw-${tag}`;
  const passwordHash = await hashPassword(password);
  const pinHash = await hashPassword('4321');
  const childPinHash = await hashPassword('1112');
  const email = `lock-${tag}@example.com`;
  const username = `lockbarn-${tag}`;
  const familyId = (
    await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('L', 'Europe/Stockholm', true) RETURNING id`
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
  return { familyId, parentId, childId, email, username, password, pin: '4321' };
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

function mergeResCookies(prev, res) {
  let jar = { ...prev };
  for (const header of getSetCookieHeaders(res)) {
    jar = mergeCookies(jar, [header]);
  }
  return jar;
}

test('PIN unlock activates leased parent session', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setupPinFamily(db, tag);
  await enableFlags(db);
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
    assert.equal(clRes.status, 200);
    const childBody = await clRes.json();
    const childCookies = mergeResCookies(parentLogin.cookies, clRes);

    const unlockRes = await fetch(`${baseUrl}/api/family/adult-privilege/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': childBody.csrfToken,
      },
      body: JSON.stringify({ unlockMethod: 'pin', pin: fixture.pin }),
    });
    const unlockBody = await unlockRes.json();
    assert.equal(unlockRes.status, 200, JSON.stringify(unlockBody));
    assert.equal(unlockBody.ok, true);
    assert.ok(unlockBody.privilegeLeaseUntil);
    assert.equal(unlockBody.policy.deviceMode, 'shared');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('wrong PIN does not activate parent session', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setupPinFamily(db, tag);
  await enableFlags(db);
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
    const childBody = await clRes.json();
    const childCookies = mergeResCookies(parentLogin.cookies, clRes);
    const unlockRes = await fetch(`${baseUrl}/api/family/adult-privilege/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': childBody.csrfToken,
      },
      body: JSON.stringify({ unlockMethod: 'pin', pin: '9999' }),
    });
    assert.equal(unlockRes.status, 401);
    const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookieHeader(childCookies) } });
    assert.equal((await me.json()).type, 'child');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('expired escalated lease is rejected by requireParent', () => {
  const decoded = {
    type: 'parent',
    privilegeEscalation: true,
    privilegeLeaseUntil: Date.now() - 5000,
  };
  assert.equal(isEscalatedParentExpired(decoded), true);
  const token = jwt.sign(decoded, config.jwt.secret, { expiresIn: '1h' });
  const verified = jwt.verify(token, config.jwt.secret);
  assert.equal(isEscalatedParentExpired(verified), true);
});
