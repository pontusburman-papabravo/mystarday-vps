'use strict';

/**
 * Fas 3A — adult privilege escalation (server + child-parent-api-block).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { hashPassword } = require('../src/lib/hash');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
process.env.AUTHZ_HARDENING_ENABLED = 'true';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const FLAG = 'adult_privilege_v1';

async function enableAdultPrivilegeFlag(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG]
  );
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

async function setupFamily(db, tag, password, options) {
  const opts = options || {};
  const passwordHash = await hashPassword(password);
  const childPinHash = await hashPassword('1112');
  const pinHash = opts.parentPin ? await hashPassword(opts.parentPin) : null;
  const email = `apriv-${tag}@example.com`;
  const username = `apbarn-${tag}`;
  const familyId = (
    await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('AP', 'Europe/Stockholm', true) RETURNING id`
    )
  ).rows[0].id;
  const parentId = (
    await db.query(
      pinHash
        ? `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified, parent_pin_hash)
           VALUES ($1,$2,$3,'Parent',true,true,$4) RETURNING id`
        : `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
           VALUES ($1,$2,$3,'Parent',true,true) RETURNING id`,
      pinHash ? [email, passwordHash, familyId, pinHash] : [email, passwordHash, familyId]
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
  return { familyId, parentId, childId, email, username, password };
}

function cookiesAfterResponse(prev, res) {
  let jar = { ...prev };
  for (const header of getSetCookieHeaders(res)) {
    jar = mergeCookies(jar, [header]);
  }
  return jar;
}

async function childSessionWithHandoff(baseUrl, fixture, parentLogin) {
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
  const childBody = JSON.parse(clText);
  const childCookies = cookiesAfterResponse(parentLogin.cookies, clRes);
  return { childCookies, csrfToken: childBody.csrfToken };
}

test('adult privilege flag off → status 403', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setupFamily(db, tag, `pw-${tag}`);
  await db.query(`UPDATE feature_flag SET enabled = false WHERE key = $1`, [FLAG]);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, fixture.password);
    const { childCookies } = await childSessionWithHandoff(baseUrl, fixture, parentLogin);
    const res = await fetch(`${baseUrl}/api/family/adult-privilege/status`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).code, 'ADULT_PRIVILEGE_DISABLED');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('child JWT cannot call parent API when adult_privilege_v1 ON', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setupFamily(db, tag, `block-${tag}`);
  await enableAdultPrivilegeFlag(db);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, fixture.password);
    const { childCookies } = await childSessionWithHandoff(baseUrl, fixture, parentLogin);
    const blocked = await fetch(`${baseUrl}/api/family`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal(blocked.status, 403);
    const body = await blocked.json();
    assert.equal(body.code, 'CHILD_PARENT_API_BLOCKED');
    assert.equal(body.adultPrivilegeRequired, true);
    const me = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    const meBody = await me.json();
    assert.equal(meBody.type, 'child');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('unlock activates parent session and allows parent API (one consume)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setupFamily(db, tag, `unlock-${tag}`, { parentPin: '4321' });
  await enableAdultPrivilegeFlag(db);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, fixture.password);
    const { childCookies, csrfToken } = await childSessionWithHandoff(baseUrl, fixture, parentLogin);

    const unlockRes = await fetch(`${baseUrl}/api/family/adult-privilege/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ unlockMethod: 'pin', pin: '4321' }),
    });
    const unlockText = await unlockRes.text();
    assert.equal(unlockRes.status, 200, unlockText);
    const unlockBody = JSON.parse(unlockText);
    assert.equal(unlockBody.ok, true);
    assert.equal(unlockBody.state, 'active');
    assert.equal(unlockBody.parent.id, fixture.parentId);
    assert.ok(unlockBody.privilegeLeaseUntil || unlockBody.policy);

    const parentJar = cookiesAfterResponse(childCookies, unlockRes);
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(parentJar) },
    });
    const me = await meRes.json();
    assert.equal(me.type, 'parent');

    const familyRes = await fetch(`${baseUrl}/api/family`, {
      headers: { Cookie: cookieHeader(parentJar) },
    });
    assert.equal(familyRes.status, 200);

    const secondUnlock = await fetch(`${baseUrl}/api/family/adult-privilege/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parentJar),
        'X-CSRF-Token': unlockBody.csrfToken,
      },
      body: JSON.stringify({ unlockMethod: 'pin', pin: '4321' }),
    });
    assert.equal(secondUnlock.status, 200);
    assert.equal((await secondUnlock.json()).alreadyParent, true);

    const handoffs = await db.query(
      `SELECT COUNT(*)::int AS n FROM parent_session_handoff WHERE parent_id = $1 AND used_at IS NULL`,
      [fixture.parentId]
    );
    assert.equal(handoffs.rows[0].n, 0);
  } finally {
    await close();
    await db.cleanup();
  }
});

test('failed unlock leaves child session intact', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setupFamily(db, tag, `fail-${tag}`, { parentPin: '4321' });
  await enableAdultPrivilegeFlag(db);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, fixture.password);
    const { childCookies, csrfToken } = await childSessionWithHandoff(baseUrl, fixture, parentLogin);

    await db.query(
      `UPDATE parent_session_handoff SET revoked_at = NOW() WHERE parent_id = $1`,
      [fixture.parentId]
    );

    const unlockRes = await fetch(`${baseUrl}/api/family/adult-privilege/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ unlockMethod: 'pin', pin: '4321' }),
    });
    assert.equal(unlockRes.status, 401);
    const me = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal((await me.json()).type, 'child');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('biometric unlockMethod rejected without server-verifiable proof', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setupFamily(db, tag, `bio-${tag}`, { parentPin: '4321' });
  await enableAdultPrivilegeFlag(db);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, fixture.password);
    const { childCookies, csrfToken } = await childSessionWithHandoff(baseUrl, fixture, parentLogin);

    const unlockRes = await fetch(`${baseUrl}/api/family/adult-privilege/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ unlockMethod: 'biometric' }),
    });
    assert.equal(unlockRes.status, 401);
    assert.equal((await unlockRes.json()).code, 'ADULT_VERIFICATION_REQUIRED');
    const me = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal((await me.json()).type, 'child');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('unlock without family PIN returns ADULT_PIN_SETUP_REQUIRED', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setupFamily(db, tag, `nopin-${tag}`);
  await enableAdultPrivilegeFlag(db);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, fixture.password);
    const { childCookies, csrfToken } = await childSessionWithHandoff(baseUrl, fixture, parentLogin);

    const unlockRes = await fetch(`${baseUrl}/api/family/adult-privilege/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ unlockMethod: 'pin', pin: '4321' }),
    });
    assert.equal(unlockRes.status, 403);
    assert.equal((await unlockRes.json()).code, 'ADULT_PIN_SETUP_REQUIRED');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('revoked parent refresh blocks unlock after handoff still present', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const tag = Date.now();
  const fixture = await setupFamily(db, tag, `rev-${tag}`, { parentPin: '4321' });
  await enableAdultPrivilegeFlag(db);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);
  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, fixture.password);
    const { childCookies, csrfToken } = await childSessionWithHandoff(baseUrl, fixture, parentLogin);

    const handoffRow = await db.query(
      `SELECT refresh_token_id FROM parent_session_handoff WHERE parent_id = $1 AND used_at IS NULL`,
      [fixture.parentId]
    );
    await db.query(`DELETE FROM refresh_token WHERE id = $1`, [handoffRow.rows[0].refresh_token_id]);

    const unlockRes = await fetch(`${baseUrl}/api/family/adult-privilege/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ unlockMethod: 'pin', pin: '4321' }),
    });
    assert.equal(unlockRes.status, 401);
    const me = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal((await me.json()).type, 'child');
  } finally {
    await close();
    await db.cleanup();
  }
});
