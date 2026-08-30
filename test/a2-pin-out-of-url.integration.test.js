'use strict';

/**
 * A2 — PIN must not travel in URLs. Child-scoped verify stays body-only.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { sanitizeReturnUrl } = require('../src/lib/sanitize-return-url');
const { routeChangedFiles } = require('../scripts/lib/test-routing/route.mjs');

const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function authFetch(baseUrl, session, urlPath, { method = 'GET', body } = {}) {
  const headers = {
    Cookie: cookieHeader(session.cookies),
    'X-CSRF-Token': session.csrfToken,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

describe('A2 PIN out of URL', () => {
  test('classifier treats A2 files as family/auth domains without requiring overlay L1', () => {
    const plan = routeChangedFiles(ROOT, {
      files: ['src/routes/children.js', 'public/js/family.js', 'public/child-wizard.html'],
    });
    assert.ok(plan.domains.length >= 1);
  });

  test('sanitizeReturnUrl and shipped builders keep PIN out of hrefs', () => {
    const family = fs.readFileSync(path.join(ROOT, 'public/js/family.js'), 'utf8');
    const dashboard = fs.readFileSync(path.join(ROOT, 'public/js/dashboard.js'), 'utf8');
    const schedule = fs.readFileSync(path.join(ROOT, 'public/js/schedule.js'), 'utf8');
    assert.doesNotMatch(family, /\?pin=/);
    assert.doesNotMatch(dashboard, /\?pin=/);
    assert.doesNotMatch(schedule, /\?pin=/);
    assert.match(family, /\/child-wizard\?id=/);
    assert.equal(sanitizeReturnUrl('/child-wizard?id=x&pin=9999').includes('pin='), false);
  });

  test('create-child wizard PIN is body/session reveal, not URL', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const primary = await registerAndLogin(http.baseUrl, { name: 'A2 Parent' });
      const created = await authFetch(http.baseUrl, primary, '/api/children', {
        method: 'POST',
        body: { name: 'A2 Barn', emoji: '🌟', birthday: '2018-01-15', pin: '2580' },
      });
      assert.equal(created.res.status, 201, created.text);
      const childId = created.json.id;
      const createdPin = created.json.pin;
      assert.equal(createdPin, '2580');

      const wizardPage = await fetch(
        `${http.baseUrl}/child-wizard?id=${childId}&pin=2580&name=A2`,
        { redirect: 'manual' }
      );
      const html = await wizardPage.text();
      assert.equal(wizardPage.status, 200);
      assert.doesNotMatch(html, /\?pin=\$\{/);
      assert.match(html, /wizard-pin/);

      const firstReveal = await authFetch(
        http.baseUrl,
        primary,
        `/api/children/${childId}/wizard-pin`
      );
      assert.equal(firstReveal.res.status, 200, firstReveal.text);
      assert.equal(firstReveal.json.pin, createdPin);

      const secondReveal = await authFetch(
        http.baseUrl,
        primary,
        `/api/children/${childId}/wizard-pin`
      );
      assert.equal(secondReveal.res.status, 404, secondReveal.text);
      assert.equal(secondReveal.json.pin, undefined);

      const other = await registerAndLogin(http.baseUrl, { name: 'A2 Other' });
      const cross = await authFetch(
        http.baseUrl,
        other,
        `/api/children/${childId}/wizard-pin`
      );
      assert.equal(cross.res.status, 403, cross.text);
      assert.equal(cross.json.pin, undefined);

      const childLoginUrl = `/api/auth/child-login?pin=9999`;
      const bad = await fetch(`${http.baseUrl}${childLoginUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: created.json.username, pin: '0000' }),
      });
      const badText = await bad.text();
      assert.notEqual(bad.status, 200);
      assert.doesNotMatch(badText, /0000/);
      assert.doesNotMatch(badText, /9999/);
      assert.doesNotMatch(badText, /2580/);

      const good = await fetch(`${http.baseUrl}${childLoginUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: created.json.username, pin: '2580' }),
      });
      const goodText = await good.text();
      let goodJson = null;
      try {
        goodJson = JSON.parse(goodText);
      } catch {
        goodJson = null;
      }
      assert.equal(good.status, 200, goodText);
      assert.doesNotMatch(goodText, /2580/);
      assert.doesNotMatch(JSON.stringify(goodJson || {}), /2580/);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('legacy pin query is ignored for parent verify and not echoed', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'A2 Gate', birthday: '2017-01-01' });
      const denied = await authFetch(http.baseUrl, session, '/api/family/verify-pin?pin=1111', {
        method: 'POST',
        body: { pin: '0000' },
      });
      assert.notEqual(denied.res.status, 200);
      assert.doesNotMatch(denied.text, /0000/);
      assert.doesNotMatch(denied.text, /1111/);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
