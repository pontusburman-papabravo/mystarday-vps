'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

test('GET /api/iap/config returns contract without secrets', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const prevSandbox = process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
  const prevIos = process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY;

  const { createApp } = require('../app');
  const http = await listenApp(createApp());

  try {
    const session = await registerAndLogin(http.baseUrl);
    const { rows } = await db.query(
      `SELECT p.family_id FROM parent p WHERE LOWER(p.email) = $1`,
      [session.email.toLowerCase()]
    );
    const familyId = rows[0].family_id;
    process.env.REVENUECAT_SANDBOX_FAMILY_IDS = String(familyId);
    process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY = 'appl_test_public_key';

    const res = await fetch(`${http.baseUrl}/api/iap/config?platform=ios`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.entitlementId, 'basic');
    assert.equal(body.nativePurchasesEnabled, true);
    assert.equal(body.apiKey, 'appl_test_public_key');
    assert.equal(body.webPurchaseSupported, false);
    assert.ok(body.packages.monthly.storeProductId.includes('subscription.monthly'));
    assert.ok(!JSON.stringify(body).includes('sk_'));
  } finally {
    if (prevSandbox === undefined) delete process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
    else process.env.REVENUECAT_SANDBOX_FAMILY_IDS = prevSandbox;
    if (prevIos === undefined) delete process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY;
    else process.env.REVENUECAT_IOS_PUBLIC_SDK_KEY = prevIos;
    await http.close();
  }
});
