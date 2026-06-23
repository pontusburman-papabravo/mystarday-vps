'use strict';

const { cookieHeader, getSetCookieHeaders, mergeCookies } = require('./http.js');

/**
 * Register + login, return cookies and csrfToken for authenticated API calls.
 */
async function registerAndLogin(baseUrl, { name = 'Integration Test' } = {}) {
  const email = `integration-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = 'integration-test-pass-1';

  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  const registerText = await registerRes.text();
  if (registerRes.status !== 201) {
    throw new Error(`register failed ${registerRes.status}: ${registerText}`);
  }

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginText = await loginRes.text();
  if (loginRes.status !== 200) {
    throw new Error(`login failed ${loginRes.status}: ${loginText}`);
  }
  const loginBody = JSON.parse(loginText);

  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }

  return { email, password, cookies, csrfToken: loginBody.csrfToken };
}

async function createChild(baseUrl, session, child = {}) {
  const payload = {
    name: child.name || 'Barnet',
    emoji: child.emoji || '🌟',
    birthday: child.birthday || '2018-01-01',
    ...child,
  };
  const res = await fetch(`${baseUrl}/api/children`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (res.status !== 201) {
    throw new Error(`create child failed ${res.status}: ${text}`);
  }
  const body = JSON.parse(text);
  return body.id;
}

module.exports = { registerAndLogin, createChild };
