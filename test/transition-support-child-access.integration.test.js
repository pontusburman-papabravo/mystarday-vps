'use strict';

/**
 * Child session must see the same transition_support signal as getFamilyAccess
 * on GET /api/subscription/access (canonical client gate in child-dashboard.js).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { seedBildstodPr3Features } = require('./helpers/bildstod-pr3-features.js');
const familySubscriptions = require('../db/family-subscriptions');
const features = require('../db/features');
const { getFamilyAccess } = require('../src/lib/package-access');
const grantCore = require('../scripts/lib/qa-extra-stod-grant-core.cjs');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function childLogin(http, username, pin) {
  const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
  assert.equal(loginRes.status, 200, 'child-login should succeed');
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

test('new child session: subscription/access matches getFamilyAccess after Extra stöd grant', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    await seedBildstodPr3Features(db);
    const session = await registerAndLogin(http.baseUrl);
    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    const me = await meRes.json();
    const familyId = me.family_id;
    const childId = await createChild(http.baseUrl, session);
    const existingSub = await familySubscriptions.getByFamilyId(familyId);
    if (!existingSub) {
      await familySubscriptions.createForNewFamily(familyId);
    }
    const pin = '5678';
    const username = `tschild${Date.now()}`;
    await db.query(
      `UPDATE child SET username = $1, pin = $2 WHERE id = $3`,
      [username, await hashPassword(pin), childId]
    );

    const childIds = [childId];
    const snap = await grantCore.readPackageSnapshot(db, familyId, childIds);
    await grantCore.applyTemporaryGrant(db, familyId);

    const serverAccess = await getFamilyAccess(familyId);
    assert.equal(serverAccess.features.transition_support, true);

    const childCookies = await childLogin(http, username, pin);
    const accessRes = await fetch(`${http.baseUrl}/api/subscription/access`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal(accessRes.status, 200);
    const accessBody = await accessRes.json();
    assert.equal(
      accessBody.features?.transition_support,
      true,
      'child /api/subscription/access must expose features.transition_support'
    );

    const tsRes = await fetch(`${http.baseUrl}/api/me/transition-support`, {
      headers: { Cookie: cookieHeader(childCookies) },
    });
    assert.equal(tsRes.status, 200);

    await grantCore.restorePackageSnapshot(db, familyId, snap);
    const afterAccess = await getFamilyAccess(familyId);
    assert.equal(afterAccess.features.transition_support, false);

    const childCookies2 = await childLogin(http, username, pin);
    const accessRes2 = await fetch(`${http.baseUrl}/api/subscription/access`, {
      headers: { Cookie: cookieHeader(childCookies2) },
    });
    const accessBody2 = await accessRes2.json();
    assert.equal(accessBody2.features?.transition_support, false);
    const tsRes2 = await fetch(`${http.baseUrl}/api/me/transition-support`, {
      headers: { Cookie: cookieHeader(childCookies2) },
    });
    assert.equal(tsRes2.status, 403);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
