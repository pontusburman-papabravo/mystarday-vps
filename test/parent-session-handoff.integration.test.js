'use strict';

/**
 * Opaque parent_session_handoff lifecycle (child → parent restore).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
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
  const body = JSON.parse(text);
  return { cookies, csrfToken: body.csrfToken };
}

function handoffFromCookies(cookies) {
  return cookies.stjarndag_parent_session || cookies['stjarndag_parent_session'];
}

async function setupParentChildFixture(db, tag, password) {
  const passwordHash = await hashPassword(password);
  const childPinHash = await hashPassword('1112');
  const email = `handoff-flow-${tag}@example.com`;
  const username = `barn-flow-${tag}`;

  const familyId = (
    await db.query(
      `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Handoff flow', 'Europe/Stockholm', true) RETURNING id`
    )
  ).rows[0].id;

  const parentId = (
    await db.query(
      `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
       VALUES ($1, $2, $3, 'Parent', true, true) RETURNING id`,
      [email, passwordHash, familyId]
    )
  ).rows[0].id;

  const childId = (
    await db.query(
      `INSERT INTO child (family_id, name, emoji, username, pin) VALUES ($1, 'Barn', '⭐', $2, $3) RETURNING id`,
      [familyId, username, childPinHash]
    )
  ).rows[0].id;

  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
    [parentId, childId]
  );

  return { familyId, parentId, childId, email, username, password };
}

async function childLoginSession(baseUrl, parentLogin, username, pin) {
  const childLoginRes = await fetch(`${baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(parentLogin.cookies),
      'X-CSRF-Token': parentLogin.csrfToken,
    },
    body: JSON.stringify({ username, pin }),
  });
  const childLoginText = await childLoginRes.text();
  assert.equal(childLoginRes.status, 200, childLoginText);
  let childCookies = {};
  for (const header of getSetCookieHeaders(childLoginRes)) {
    childCookies = mergeCookies(childCookies, [header]);
  }
  childCookies = { ...parentLogin.cookies, ...childCookies };
  const childBody = JSON.parse(childLoginText);
  const handoffRaw = handoffFromCookies(childCookies);
  assert.ok(handoffRaw, 'handoff cookie expected after child login');
  return { childCookies, childBody, handoffRaw };
}

async function assertHandoffSessionPickerOk(baseUrl, childCookies) {
  const res = await fetch(`${baseUrl}/api/family/parent-pin-status-picker`, {
    headers: { Cookie: cookieHeader(childCookies) },
  });
  const text = await res.text();
  assert.equal(res.status, 200, text);
  const body = JSON.parse(text);
  assert.equal(body.has_session, true);
}

async function assertActivateHandoffFails(baseUrl, childCookies, csrfToken) {
  const res = await fetch(`${baseUrl}/api/family/activate-saved-parent-session`, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader(childCookies),
      'X-CSRF-Token': csrfToken,
    },
  });
  assert.equal(res.status, 401);
}

async function assertHandoffRevokedOrRemoved(db, handoffRaw, parentId) {
  const tokenHash = hashOpaque(handoffRaw);
  const byHash = await db.query(
    `SELECT revoked_at FROM parent_session_handoff WHERE token_hash = $1`,
    [tokenHash]
  );
  if (byHash.rows.length === 0) {
    return;
  }
  assert.ok(byHash.rows[0].revoked_at, 'handoff row should be revoked when still present');
  const active = await db.query(
    `SELECT COUNT(*)::int AS n FROM parent_session_handoff
     WHERE parent_id = $1 AND revoked_at IS NULL AND used_at IS NULL`,
    [parentId]
  );
  assert.equal(active.rows[0].n, 0);
}

test('opaque parent handoff: create, activate, one-time use, revoke paths', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const password = 'handoff-pass-1';
  const passwordHash = await hashPassword(password);
  const childPinHash = await hashPassword('1112');
  const email = `handoff-parent-${tag}@example.com`;

  const familyRes = await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Handoff', 'Europe/Stockholm', true) RETURNING id`
  );
  const familyId = familyRes.rows[0].id;

  const parentRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, $2, $3, 'Parent', true, true) RETURNING id`,
    [email, passwordHash, familyId]
  );
  const parentId = parentRes.rows[0].id;

  const sharedEmail = `handoff-shared-${tag}@example.com`;
  const sharedRes = await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, $2, $3, 'Shared', true, true) RETURNING id`,
    [sharedEmail, passwordHash, familyId]
  );
  const sharedId = sharedRes.rows[0].id;

  const childRes = await db.query(
    `INSERT INTO child (family_id, name, emoji, username, pin) VALUES ($1, 'Barn', '⭐', $2, $3) RETURNING id`,
    [familyId, `barn-handoff-${tag}`, childPinHash]
  );
  const childId = childRes.rows[0].id;

  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary'), ($3, $2, 'shared')`,
    [parentId, childId, sharedId]
  );

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    let parentLogin = await loginParent(baseUrl, email, password);
    const childLoginRes = await fetch(`${baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parentLogin.cookies),
        'X-CSRF-Token': parentLogin.csrfToken,
      },
      body: JSON.stringify({ username: `barn-handoff-${tag}`, pin: '1112' }),
    });
    const childLoginText = await childLoginRes.text();
    assert.equal(childLoginRes.status, 200, childLoginText);

    let childCookies = {};
    for (const header of getSetCookieHeaders(childLoginRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }
    const childBody = JSON.parse(childLoginText);
    const handoffRaw = handoffFromCookies(childCookies);
    assert.ok(handoffRaw, 'handoff cookie must exist after child login');
    assert.ok(!handoffRaw.includes('access_token'), 'cookie must not embed JWT payload');
    assert.ok(!handoffRaw.startsWith('eyJ'), 'cookie must not be a JWT');

    const row = await db.query(
      `SELECT token_hash, parent_id, family_id, used_at FROM parent_session_handoff WHERE parent_id = $1`,
      [parentId]
    );
    assert.equal(row.rows.length, 1);
    assert.equal(row.rows[0].token_hash, hashOpaque(handoffRaw));

    const activateRes = await fetch(`${baseUrl}/api/family/activate-saved-parent-session`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': childBody.csrfToken,
      },
    });
    const activateText = await activateRes.text();
    assert.equal(activateRes.status, 200, activateText);
    const activateBody = JSON.parse(activateText);
    assert.equal(activateBody.ok, true);

    const reuseRes = await fetch(`${baseUrl}/api/family/activate-saved-parent-session`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': childBody.csrfToken,
      },
    });
    assert.equal(reuseRes.status, 401);

    const sharedLogin = await loginParent(baseUrl, sharedEmail, password);
    const sharedChildLogin = await fetch(`${baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(sharedLogin.cookies),
        'X-CSRF-Token': sharedLogin.csrfToken,
      },
      body: JSON.stringify({ username: `barn-handoff-${tag}`, pin: '1112' }),
    });
    const sharedChildText = await sharedChildLogin.text();
    assert.equal(sharedChildLogin.status, 200, sharedChildText);
    let sharedChildCookies = {};
    for (const header of getSetCookieHeaders(sharedChildLogin)) {
      sharedChildCookies = mergeCookies(sharedChildCookies, [header]);
    }
    const sharedChildBody = JSON.parse(sharedChildText);

    await db.query(
      `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $1 WHERE parent_id = $2 AND child_id = $3`,
      [parentId, sharedId, childId]
    );

    const revokedActivate = await fetch(`${baseUrl}/api/family/activate-saved-parent-session`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(sharedChildCookies),
        'X-CSRF-Token': sharedChildBody.csrfToken,
      },
    });
    assert.equal(revokedActivate.status, 401);

    const tampered = crypto.randomBytes(32).toString('base64url');
    const badCookies = { ...sharedChildCookies, stjarndag_parent_session: tampered };
    const badRes = await fetch(`${baseUrl}/api/family/activate-saved-parent-session`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(badCookies),
        'X-CSRF-Token': sharedChildBody.csrfToken,
      },
    });
    assert.equal(badRes.status, 401);
  } finally {
    await close();
    await db.cleanup();
  }
});

test('concurrent handoff consume allows exactly one activation', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const passwordHash = await hashPassword('handoff-pass-2');
  const childPinHash = await hashPassword('1112');
  const email = `handoff-race-${tag}@example.com`;

  const familyId = (await db.query(
    `INSERT INTO family (name, timezone, is_lifetime_free) VALUES ('Handoff race', 'Europe/Stockholm', true) RETURNING id`
  )).rows[0].id;

  const parentId = (await db.query(
    `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
     VALUES ($1, $2, $3, 'Parent', true, true) RETURNING id`,
    [email, passwordHash, familyId]
  )).rows[0].id;

  const childId = (await db.query(
    `INSERT INTO child (family_id, name, emoji, username, pin) VALUES ($1, 'Barn', '⭐', $2, $3) RETURNING id`,
    [familyId, `barn-race-${tag}`, childPinHash]
  )).rows[0].id;

  await db.query(
    `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
    [parentId, childId]
  );

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const login = await loginParent(baseUrl, email, 'handoff-pass-2');
    const childLoginRes = await fetch(`${baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(login.cookies),
        'X-CSRF-Token': login.csrfToken,
      },
      body: JSON.stringify({ username: `barn-race-${tag}`, pin: '1112' }),
    });
    assert.equal(childLoginRes.status, 200);
    let childCookies = {};
    for (const header of getSetCookieHeaders(childLoginRes)) {
      childCookies = mergeCookies(childCookies, [header]);
    }
    const childBody = await childLoginRes.json();

    const headers = {
      Cookie: cookieHeader(childCookies),
      'X-CSRF-Token': childBody.csrfToken,
    };
    const [a, b] = await Promise.all([
      fetch(`${baseUrl}/api/family/activate-saved-parent-session`, { method: 'POST', headers }),
      fetch(`${baseUrl}/api/family/activate-saved-parent-session`, { method: 'POST', headers }),
    ]);
    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [200, 401]);
  } finally {
    await close();
    await db.cleanup();
  }
});

test('POST /api/auth/reset-password revokes opaque handoff after new password is set', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const initialPassword = 'handoff-reset-1';
  const newPassword = 'handoff-reset-2';
  const fixture = await setupParentChildFixture(db, tag, initialPassword);

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, initialPassword);
    const { childCookies, childBody, handoffRaw } = await childLoginSession(
      baseUrl,
      parentLogin,
      fixture.username,
      '1112'
    );

    await assertHandoffSessionPickerOk(baseUrl, childCookies);

    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fixture.email }),
    });
    const forgotText = await forgotRes.text();
    assert.equal(forgotRes.status, 200, forgotText);
    const forgotBody = JSON.parse(forgotText);
    assert.ok(forgotBody.resetToken, 'test env should expose resetToken');

    await assertHandoffSessionPickerOk(baseUrl, childCookies);

    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: forgotBody.resetToken, password: newPassword }),
    });
    const resetText = await resetRes.text();
    assert.equal(resetRes.status, 200, resetText);

    await assertActivateHandoffFails(baseUrl, childCookies, childBody.csrfToken);
    await assertHandoffRevokedOrRemoved(db, handoffRaw, fixture.parentId);
  } finally {
    await close();
    await db.cleanup();
  }
});

test('PUT /api/account/change-password revokes opaque handoff via real endpoint', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const initialPassword = 'handoff-chpw-1';
  const newPassword = 'handoff-chpw-2';
  const fixture = await setupParentChildFixture(db, tag, initialPassword);

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, initialPassword);
    const { childCookies, childBody, handoffRaw } = await childLoginSession(
      baseUrl,
      parentLogin,
      fixture.username,
      '1112'
    );
    await assertHandoffSessionPickerOk(baseUrl, childCookies);

    const changeRes = await fetch(`${baseUrl}/api/account/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parentLogin.cookies),
        'X-CSRF-Token': parentLogin.csrfToken,
      },
      body: JSON.stringify({ currentPassword: initialPassword, newPassword }),
    });
    const changeText = await changeRes.text();
    assert.equal(changeRes.status, 200, changeText);

    await assertActivateHandoffFails(baseUrl, childCookies, childBody.csrfToken);
    await assertHandoffRevokedOrRemoved(db, handoffRaw, fixture.parentId);
  } finally {
    await close();
    await db.cleanup();
  }
});

test('DELETE /api/family/delete-account invalidates saved handoff activation', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const password = 'handoff-del-1';
  const fixture = await setupParentChildFixture(db, tag, password);

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, password);
    const { childCookies, childBody, handoffRaw } = await childLoginSession(
      baseUrl,
      parentLogin,
      fixture.username,
      '1112'
    );
    await assertHandoffSessionPickerOk(baseUrl, childCookies);

    const delRes = await fetch(`${baseUrl}/api/family/delete-account`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader(parentLogin.cookies),
        'X-CSRF-Token': parentLogin.csrfToken,
      },
    });
    const delText = await delRes.text();
    assert.equal(delRes.status, 200, delText);

    await assertActivateHandoffFails(baseUrl, childCookies, childBody.csrfToken);

    const byHash = await db.query(
      `SELECT 1 FROM parent_session_handoff WHERE token_hash = $1`,
      [hashOpaque(handoffRaw)]
    );
    assert.equal(byHash.rows.length, 0, 'handoff row should be removed with family delete');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('expired handoff is denied for picker and activate', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const password = 'handoff-exp-1';
  const fixture = await setupParentChildFixture(db, tag, password);

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, password);
    const { childCookies, childBody } = await childLoginSession(
      baseUrl,
      parentLogin,
      fixture.username,
      '1112'
    );

    await db.query(
      `UPDATE parent_session_handoff
       SET expires_at = NOW() - INTERVAL '1 minute'
       WHERE parent_id = $1`,
      [fixture.parentId]
    );

    const pickerRes = await fetch(`${baseUrl}/api/family/parent-pin-status-picker`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal(pickerRes.status, 200);
    const pickerBody = await pickerRes.json();
    assert.equal(pickerBody.has_session, false);
    assert.equal(pickerBody.has_pin, false);

    await assertActivateHandoffFails(baseUrl, childCookies, childBody.csrfToken);
  } finally {
    await close();
    await db.cleanup();
  }
});

test('parent logout revokes handoff tied to parent refresh token', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const password = 'handoff-logout-1';
  const fixture = await setupParentChildFixture(db, tag, password);

  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, password);
    const { childCookies, childBody } = await childLoginSession(
      baseUrl,
      parentLogin,
      fixture.username,
      '1112'
    );
    await assertHandoffSessionPickerOk(baseUrl, childCookies);

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(parentLogin.cookies),
        'X-CSRF-Token': parentLogin.csrfToken,
      },
    });
    assert.equal(logoutRes.status, 200);

    await assertActivateHandoffFails(baseUrl, childCookies, childBody.csrfToken);

    const rows = await db.query(
      `SELECT revoked_at FROM parent_session_handoff WHERE parent_id = $1`,
      [fixture.parentId]
    );
    assert.ok(rows.rows.length >= 1, 'handoff row should remain for audit');
    assert.ok(
      rows.rows.every((r) => r.revoked_at !== null),
      'handoff must be revoked when parent logs out'
    );
  } finally {
    await close();
    await db.cleanup();
  }
});

test('child POST /api/auth/logout restores parent when family has no PIN', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const fixture = await setupParentChildFixture(db, tag, `clo-${tag}`);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, fixture.password);
    const { childCookies, childBody } = await childLoginSession(
      baseUrl,
      parentLogin,
      fixture.username,
      '1112'
    );

    const handoffRows = await db.query(
      `SELECT id, used_at FROM parent_session_handoff WHERE parent_id = $1`,
      [fixture.parentId]
    );
    assert.equal(handoffRows.rows.length, 1);
    assert.equal(handoffRows.rows[0].used_at, null);

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': childBody.csrfToken,
        'Content-Type': 'application/json',
      },
    });
    const logoutText = await logoutRes.text();
    assert.equal(logoutRes.status, 200, logoutText);
    const logoutBody = JSON.parse(logoutText);
    assert.equal(logoutBody.sessionRestored, true);
    assert.equal(logoutBody.needsParentPin, undefined);

    let afterCookies = { ...childCookies };
    for (const header of getSetCookieHeaders(logoutRes)) {
      afterCookies = mergeCookies(afterCookies, [header]);
    }

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(afterCookies) },
    });
    const meBody = await meRes.json();
    assert.equal(meRes.status, 200);
    assert.equal(meBody.type, 'parent');
    assert.equal(meBody.id, fixture.parentId);

    const activeHandoff = await db.query(
      `SELECT COUNT(*)::int AS n FROM parent_session_handoff
       WHERE parent_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
      [fixture.parentId]
    );
    assert.equal(activeHandoff.rows[0].n, 0, 'handoff must be consumed or removed');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('child logout with stale parent refresh cookie still restores parent (refresh confusion)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const fixture = await setupParentChildFixture(db, tag, `mis-${tag}`);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, fixture.password);
    const parentRefresh = parentLogin.cookies.refresh_token;
    const { childCookies, childBody } = await childLoginSession(
      baseUrl,
      parentLogin,
      fixture.username,
      '1112'
    );
    const confusedCookies = { ...childCookies, refresh_token: parentRefresh };

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(confusedCookies),
        'X-CSRF-Token': childBody.csrfToken,
        'Content-Type': 'application/json',
      },
    });
    const logoutBody = JSON.parse(await logoutRes.text());
    assert.equal(logoutRes.status, 200, JSON.stringify(logoutBody));
    assert.equal(logoutBody.sessionRestored, true);

    const parentRefreshRow = await db.query(
      `SELECT COUNT(*)::int AS n FROM refresh_token WHERE parent_id = $1`,
      [fixture.parentId]
    );
    assert.ok(parentRefreshRow.rows[0].n >= 1, 'parent refresh must survive identity-bound child logout');
  } finally {
    await close();
    await db.cleanup();
  }
});

test('child logout with handoff cookie but revoked handoff returns PARENT_HANDOFF_INVALID', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const tag = Date.now();
  const fixture = await setupParentChildFixture(db, tag, `inv-${tag}`);
  const { createApp } = require('../app');
  const { baseUrl, close } = await listenApp(createApp);

  try {
    const parentLogin = await loginParent(baseUrl, fixture.email, fixture.password);
    const { childCookies, childBody, handoffRaw } = await childLoginSession(
      baseUrl,
      parentLogin,
      fixture.username,
      '1112'
    );
    await db.query(
      `UPDATE parent_session_handoff SET revoked_at = NOW() WHERE parent_id = $1`,
      [fixture.parentId]
    );

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(childCookies),
        'X-CSRF-Token': childBody.csrfToken,
        'Content-Type': 'application/json',
      },
    });
    assert.equal(logoutRes.status, 409);
    const body = await logoutRes.json();
    assert.equal(body.code, 'PARENT_HANDOFF_INVALID');
    assert.equal(body.requiresParentLogin, true);
    assert.ok(handoffRaw);
  } finally {
    await close();
    await db.cleanup();
  }
});
