'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, getSetCookieHeaders, listenApp, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function setMaintenanceMode(db, enabled) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ('maintenance_mode', $1, 'integration test')
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [enabled]
  );
}

test('maintenance middleware order: API 503, health OK, IAP exempt, admin bypass', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  await setMaintenanceMode(db, false);
  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl, { name: 'Admin Test' });
    await db.query('UPDATE parent SET is_admin = true WHERE LOWER(email) = $1', [
      session.email.toLowerCase(),
    ]);

    await setMaintenanceMode(db, true);

    const apiRes = await fetch(`${http.baseUrl}/api/children`);
    const apiText = await apiRes.text();
    assert.equal(apiRes.status, 503, 'API should be blocked during maintenance');
    assert.match(apiText, /underhåll/i);

    const healthRes = await fetch(`${http.baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const healthBody = await healthRes.json();
    assert.equal(healthBody.status, 'healthy');

    const iapRes = await fetch(`${http.baseUrl}/api/iap/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.notEqual(iapRes.status, 503, 'IAP webhook must not be blocked by maintenance');
    const iapText = await iapRes.text();
    assert.doesNotMatch(iapText, /underhåll/i);

    const adminLogin = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: session.email, password: session.password }),
    });
    const adminLoginText = await adminLogin.text();
    assert.equal(adminLogin.status, 200, adminLoginText);
    let adminCookies = {};
    for (const header of getSetCookieHeaders(adminLogin)) {
      adminCookies = mergeCookies(adminCookies, [header]);
    }

    const adminApiRes = await fetch(`${http.baseUrl}/api/children`, {
      headers: { Cookie: cookieHeader(adminCookies) },
    });
    const adminApiText = await adminApiRes.text();
    assert.equal(adminApiRes.status, 200, 'admin should bypass maintenance');
    const adminBody = JSON.parse(adminApiText);
    assert.ok(Array.isArray(adminBody));
  } finally {
    await setMaintenanceMode(db, false);
    await http.close();
    await db.cleanup();
  }
});
