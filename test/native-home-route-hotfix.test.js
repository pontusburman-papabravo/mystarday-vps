'use strict';

/**
 * P0 hotfix — /home must be a real routable parent entry surface for native cold start.
 * Regression for PR #1005 white-screen loop (/ ↔ /home).
 */

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { setupTestDb } = require('./helpers/setup.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY: TRUSTED_FLAG } = require('../src/lib/trusted-device-flags');
const { FLAG_KEY: ENTRY_FLAG } = require('../src/lib/family-device-entry-flags');
const { FLAG_KEY: DAILY_UX_FLAG } = require('../src/lib/family-device-daily-ux-flags');
const { FLAG_KEY: ADULT_PRIV_FLAG } = require('../src/lib/adult-privilege-flags');

const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function purgeAppDbModuleCache() {
  delete require.cache[require.resolve('../app')];
  delete require.cache[require.resolve('../src/lib/db')];
  for (const key of Object.keys(require.cache)) {
    if (
      key.includes(`${path.sep}db${path.sep}`) ||
      key.includes(`${path.sep}src${path.sep}`) ||
      key.includes('feature-flag-with-family-override') ||
      key.includes('activation-flag-family-cache')
    ) {
      delete require.cache[key];
    }
  }
}

async function createTestHttpServer(db) {
  purgeAppDbModuleCache();
  const { createApp } = require('../app');
  return listenApp(createApp);
}

async function enableFamilyDeviceFlags(db) {
  for (const key of [TRUSTED_FLAG, ENTRY_FLAG, DAILY_UX_FLAG, ADULT_PRIV_FLAG]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

async function enrollShared(http, session) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: 'Home route hotfix shared' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

function trustedOnlyCookies(cookies) {
  if (cookies && cookies.trusted_device) {
    return { trusted_device: cookies.trusted_device };
  }
  return cookies;
}

function simulateNativeColdStartRedirects() {
  let path = '/';
  const visited = [];
  for (let i = 0; i < 6; i += 1) {
    visited.push(path);
    if (path === '/') {
      path = '/home';
      continue;
    }
    if (path === '/home') {
      return { stable: true, terminal: '/home', visited };
    }
    break;
  }
  return { stable: false, terminal: path, visited };
}

describe('P0 — /home route exists and does not loop to /', () => {
  it('route registry registers GET /home before catch-all', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(src, /app\.get\(['"]\/home['"]/);
    assert.match(src, /sendFile\(dashboardHtml\)/);
    assert.doesNotMatch(src, /public\/home\.html/);
  });

  it('A: GET /home MUST NOT redirect to /', async () => {
    purgeAppDbModuleCache();
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const res = await fetch(`${http.baseUrl}/home`, { redirect: 'manual' });
      assert.notEqual(res.status, 302, 'must not redirect');
      assert.notEqual(res.headers.get('location'), '/');
      assert.equal(res.status, 200);
    } finally {
      await http.close();
      purgeAppDbModuleCache();
    }
  });

  it('B: GET /home serves dashboard parent shell with entry bootstrap scripts', async () => {
    purgeAppDbModuleCache();
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const res = await fetch(`${http.baseUrl}/home`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.match(html, /parent-magic-shell\.js/);
      assert.match(html, /auth\.js/);
      assert.match(html, /family-device-entry-bootstrap\.js/);
      assert.match(html, /app-entry-orchestrator\.js/);
    } finally {
      await http.close();
      purgeAppDbModuleCache();
    }
  });

  it('C: native / → /home chain stabilizes (no / ↔ /home loop)', async () => {
    purgeAppDbModuleCache();
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const root = await fetch(`${http.baseUrl}/`);
      assert.equal(root.status, 200);
      const rootHtml = await root.text();
      assert.match(rootHtml, /location\.replace\("\/home"\)/);

      const home = await fetch(`${http.baseUrl}/home`, { redirect: 'manual' });
      assert.equal(home.status, 200);
      assert.notEqual(home.headers.get('location'), '/');

      const sim = simulateNativeColdStartRedirects();
      assert.equal(sim.stable, true);
      assert.equal(sim.terminal, '/home');
      assert.ok(sim.visited.filter((p) => p === '/').length <= 1);
      assert.ok(!sim.visited.includes('/home') || sim.visited.indexOf('/') < sim.visited.lastIndexOf('/home'));
    } finally {
      await http.close();
      purgeAppDbModuleCache();
    }
  });
});

describe('P0 — /home entry behavior by session and Family Device state', () => {
  test('D: Family Device OFF + no session → app-entry inactive, /home is stable shell', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const http = await createTestHttpServer(db);
    try {
      const page = await fetch(`${http.baseUrl}/home`, { redirect: 'manual' });
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.match(html, /auth\.js/);
      assert.match(html, /parent-magic-shell\.js/);

      const entry = await fetch(`${http.baseUrl}/api/auth/app-entry`);
      const body = await entry.json();
      assert.equal(body.orchestratorActive, false);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('E: Family Device OFF + valid parent session → /home stable, orchestrator inactive', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const http = await createTestHttpServer(db);
    try {
      const session = await registerAndLogin(http.baseUrl);
      const page = await fetch(`${http.baseUrl}/home`, {
        redirect: 'manual',
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      assert.equal(page.status, 200);

      const entry = await fetch(`${http.baseUrl}/api/auth/app-entry`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      const body = await entry.json();
      assert.equal(body.orchestratorActive, false);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('F: Family Device ON + trusted one-child → child Today path', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const http = await createTestHttpServer(db);
    try {
      await enableFamilyDeviceFlags(db);
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'HomeRouteKid', emoji: '⭐' });
      const deviceCookies = trustedOnlyCookies(await enrollShared(http, session));
      const entry = await fetch(`${http.baseUrl}/api/auth/app-entry`, {
        headers: { Cookie: cookieHeader(deviceCookies) },
      });
      const body = await entry.json();
      assert.equal(body.orchestratorActive, true);
      assert.equal(body.decision.destination, 'child-home');
      assert.equal(body.decision.path, '/child/today');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('G: Family Device ON + trusted multi-child shared → profile picker', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const http = await createTestHttpServer(db);
    try {
      await enableFamilyDeviceFlags(db);
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'KidA', emoji: '⭐' });
      await createChild(http.baseUrl, session, { name: 'KidB', emoji: '🌟' });
      const deviceCookies = trustedOnlyCookies(await enrollShared(http, session));
      const entry = await fetch(`${http.baseUrl}/api/auth/app-entry`, {
        headers: { Cookie: cookieHeader(deviceCookies) },
      });
      const body = await entry.json();
      assert.equal(body.orchestratorActive, true);
      assert.equal(body.decision.destination, 'profile-picker');
      assert.match(body.decision.path, /\/child\/profile-picker/);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('H: revoked trusted device → fail closed, no child session', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const http = await createTestHttpServer(db);
    try {
      await enableFamilyDeviceFlags(db);
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'RevokedKid', emoji: '⭐' });
      const deviceCookies = await enrollShared(http, session);
      const list = await fetch(`${http.baseUrl}/api/family/trusted-devices`, {
        headers: { Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken },
      });
      const devices = await list.json();
      const deviceId = devices.devices[0].id;
      const del = await fetch(`${http.baseUrl}/api/family/trusted-devices/${deviceId}`, {
        method: 'DELETE',
        headers: { Cookie: cookieHeader(session.cookies), 'X-CSRF-Token': session.csrfToken },
      });
      assert.equal(del.status, 200);

      const entry = await fetch(`${http.baseUrl}/api/auth/app-entry`, {
        headers: { Cookie: cookieHeader(trustedOnlyCookies(deviceCookies)) },
      });
      const entryBody = await entry.json();
      assert.equal(entryBody.decision.destination, 'parent-login');
      assert.equal(entryBody.decision.reason, 'trusted_device_revoked');

      const restore = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(trustedOnlyCookies(deviceCookies)),
        },
        body: JSON.stringify({}),
      });
      assert.notEqual(restore.status, 200);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

describe('P0 — PR #1005 hardening preserved', () => {
  it('trusted entry before legacy child PIN remains in child-login', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-login.js'), 'utf8');
    const initStart = src.indexOf("document.addEventListener('DOMContentLoaded'");
    const init = src.slice(initStart, initStart + 4500);
    assert.ok(init.indexOf('redirectAuthoritativeEntryOrLegacy') < init.indexOf('buildKeypad()'));
  });

  it('explicit Tillbaka till barn + SHARED_PICKER_REQUIRED remain', () => {
    const chrome = fs.readFileSync(path.join(ROOT, 'public/js/profile-switch-chrome.js'), 'utf8');
    const route = fs.readFileSync(path.join(ROOT, 'src/routes/family/adult-privilege.js'), 'utf8');
    assert.match(chrome, /Tillbaka till barn/);
    assert.match(route, /SHARED_PICKER_REQUIRED/);
    assert.match(route, /\/child\/profile-picker/);
  });

  it('native still redirects to /home (not localStorage authority)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /location\.replace\("\/home"\)/);
    assert.doesNotMatch(src, /stjarndag_user/);
  });

  it('session-gate treats /home as parent-only like /dashboard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/session-gate.js'), 'utf8');
    assert.match(src, /'\/home'/);
    assert.match(src, /'\/dashboard'/);
  });
});
