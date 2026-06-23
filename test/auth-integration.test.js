'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, getSetCookieHeaders, listenApp, mergeCookies } = require('./helpers/http.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

test('POST /api/auth/register + /login + /refresh (integration)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL (mock_test or unset)');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const email = `integration-${Date.now()}@example.com`;
    const password = 'integration-test-pass-1';

    const registerRes = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Integration Test' }),
    });
    const registerText = await registerRes.text();
    assert.equal(registerRes.status, 201, registerText);

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginText = await loginRes.text();
    assert.equal(loginRes.status, 200, loginText);
    const loginBody = JSON.parse(loginText);
    assert.equal(loginBody.user.email, email.toLowerCase());
    assert.ok(loginBody.csrfToken, 'login should return csrfToken');

    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }
    assert.ok(cookies.refresh_token, 'login should set refresh_token cookie');
    assert.ok(cookies.access_token, 'login should set access_token cookie');

    const refreshRes = await fetch(`${http.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: cookieHeader(cookies) },
    });
    const refreshText = await refreshRes.text();
    assert.equal(refreshRes.status, 200, refreshText);
    const refreshBody = JSON.parse(refreshText);
    assert.ok(refreshBody.csrfToken, 'refresh should return csrfToken');

    for (const header of getSetCookieHeaders(refreshRes)) {
      cookies = mergeCookies(cookies, [header]);
    }
    assert.ok(cookies.refresh_token, 'refresh should rotate refresh_token cookie');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
