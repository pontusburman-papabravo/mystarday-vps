'use strict';

/**
 * Family Device pilot hardening — P1-1/2/3 regression + contract tests.
 */

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { FLAG_KEY: TRUSTED_FLAG } = require('../src/lib/trusted-device-flags');
const { FLAG_KEY: ENTRY_FLAG } = require('../src/lib/family-device-entry-flags');
const { FLAG_KEY: DAILY_UX_FLAG } = require('../src/lib/family-device-daily-ux-flags');
const { FLAG_KEY: ADULT_PRIV_FLAG } = require('../src/lib/adult-privilege-flags');
const { injectPlatformHtml } = require('../src/middleware/platform-html');

const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
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

async function setParentPin(db, parentId, pin) {
  const pinHash = await hashPassword(pin);
  await db.query('UPDATE parent SET parent_pin_hash = $1 WHERE id = $2', [pinHash, parentId]);
}

async function sessionIdentity(http, session) {
  const me = await (await fetch(`${http.baseUrl}/api/auth/me`, {
    headers: { Cookie: cookieHeader(session.cookies) },
  })).json();
  return { parentId: me.id, familyId: me.familyId || me.family_id };
}

async function fetchCsrf(http, cookies) {
  const res = await fetch(`${http.baseUrl}/api/auth/csrf-token`, {
    headers: { Cookie: cookieHeader(cookies) },
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  let jar = { ...cookies };
  for (const header of getSetCookieHeaders(res)) {
    jar = mergeCookies(jar, [header]);
  }
  return { csrfToken: body.csrfToken, cookies: jar };
}

async function enrollShared(http, session) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/shared`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ platform: 'web', label: 'Pilot hardening shared' }),
  });
  assert.equal(enrollRes.status, 201, await enrollRes.text());
  let cookies = { ...session.cookies };
  for (const header of getSetCookieHeaders(enrollRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return cookies;
}

async function enrollChildDevice(http, session, childId) {
  const enrollRes = await fetch(`${http.baseUrl}/api/family/trusted-devices/child`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: JSON.stringify({ child_id: childId, platform: 'web', label: 'Pilot hardening child device' }),
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

describe('P1-1 — trusted entry never requires child PIN (server)', () => {
  test('shared one-child restore issues child JWT without child-login', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await enableFamilyDeviceFlags(db);
      const session = await registerAndLogin(http.baseUrl);
      const childId = await createChild(http.baseUrl, session, { name: 'Solo', emoji: '⭐' });
      const deviceCookies = trustedOnlyCookies(await enrollShared(http, session));

      const entry = await fetch(`${http.baseUrl}/api/auth/app-entry`, {
        headers: { Cookie: cookieHeader(deviceCookies) },
      });
      const entryBody = await entry.json();
      assert.equal(entryBody.decision.destination, 'child-home');
      assert.equal(entryBody.decision.serverAction, 'restore-child');

      const restore = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(deviceCookies) },
        body: JSON.stringify({}),
      });
      const restoreBody = await restore.json();
      assert.equal(restore.status, 200);
      assert.equal(restoreBody.ok, true);
      assert.equal(restoreBody.user.type, 'child');
      assert.equal(restoreBody.user.id, childId);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('child trusted device restore issues child JWT without PIN', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await enableFamilyDeviceFlags(db);
      const session = await registerAndLogin(http.baseUrl);
      const childId = await createChild(http.baseUrl, session, { name: 'Bound', emoji: '🦊' });
      const deviceCookies = trustedOnlyCookies(await enrollChildDevice(http, session, childId));

      const restore = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(deviceCookies) },
        body: JSON.stringify({}),
      });
      const body = await restore.json();
      assert.equal(restore.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.user.id, childId);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('multi-child select-child never checks child PIN', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await enableFamilyDeviceFlags(db);
      const session = await registerAndLogin(http.baseUrl);
      const childA = await createChild(http.baseUrl, session, { name: 'A', emoji: '🦊' });
      await createChild(http.baseUrl, session, { name: 'B', emoji: '🐻' });
      const deviceCookies = trustedOnlyCookies(await enrollShared(http, session));

      const select = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-child`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(deviceCookies) },
        body: JSON.stringify({ child_id: childA }),
      });
      const body = await select.json();
      assert.equal(select.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.user.id, childA);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('revoked trusted device fails closed — no child session', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await enableFamilyDeviceFlags(db);
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'Kid', emoji: '⭐' });
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
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(trustedOnlyCookies(deviceCookies)) },
        body: JSON.stringify({}),
      });
      assert.notEqual(restore.status, 200);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

describe('P1-1 — client contracts block legacy PIN on trusted paths', () => {
  it('child-login runs authoritative redirect before legacy PIN keypad', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-login.js'), 'utf8');
    const initStart = src.indexOf("document.addEventListener('DOMContentLoaded'");
    assert.ok(initStart > 0);
    const init = src.slice(initStart, initStart + 4500);
    const authIdx = init.indexOf('redirectAuthoritativeEntryOrLegacy');
    const keypadIdx = init.indexOf('buildKeypad()');
    assert.ok(authIdx > 0 && keypadIdx > authIdx, 'authoritative entry must run before PIN keypad');
    assert.match(init, /legacyChildPinFallbackPath/);
  });

  it('app-entry-orchestrator exposes redirectAuthoritativeEntryOrLegacy', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/app-entry-orchestrator.js'), 'utf8');
    assert.match(src, /redirectAuthoritativeEntryOrLegacy/);
    assert.match(src, /shouldBlockLegacyChildPinFlow/);
    assert.match(src, /legacyChildPinFallbackPath/);
  });

  it('untrusted child-login still posts to /api/auth/child-login', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-login.js'), 'utf8');
    assert.match(src, /fetch\('\/api\/auth\/child-login'/);
    assert.match(src, /clStepPin/);
  });
});

describe('P1-2 — native cold-start authority', () => {
  it('native landing redirects to /home before localStorage login heuristic', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    assert.match(src, /location\.replace\("\/home"\)/);
    assert.doesNotMatch(src, /stjarndag_user/);
  });

  it('injected /home HTML includes family-device-entry-bootstrap', () => {
    const html = '<!DOCTYPE html><html><head></head><body></body></html>';
    const out = injectPlatformHtml(html, '/home', null);
    assert.match(out, /family-device-entry-bootstrap\.js/);
    assert.match(out, /app-entry-orchestrator\.js/);
  });

  test('trusted one-child app-entry from cookie-only cold jar', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await enableFamilyDeviceFlags(db);
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'NativeSolo', emoji: '⭐' });
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

  test('no trusted enrollment resolves parent-login', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await enableFamilyDeviceFlags(db);
      const entry = await fetch(`${http.baseUrl}/api/auth/app-entry`);
      const body = await entry.json();
      assert.equal(body.orchestratorActive, false);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

describe('P1-3 — explicit parent return to child', () => {
  test('expire restores child session for one-child shared device', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await enableFamilyDeviceFlags(db);
      const session = await registerAndLogin(http.baseUrl);
      const childId = await createChild(http.baseUrl, session, { name: 'ReturnKid', emoji: '⭐' });
      const { parentId } = await sessionIdentity(http, session);
      await setParentPin(db, parentId, '8642');
      let cookies = trustedOnlyCookies(await enrollShared(http, session));

      const restore = await fetch(`${http.baseUrl}/api/auth/trusted-device/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(cookies) },
        body: JSON.stringify({}),
      });
      assert.equal(restore.status, 200);
      cookies = mergeCookies(cookies, getSetCookieHeaders(restore));
      const csrfPack = await fetchCsrf(http, cookies);
      cookies = csrfPack.cookies;

      const unlock = await fetch(`${http.baseUrl}/api/family/adult-privilege/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(cookies),
          'X-CSRF-Token': csrfPack.csrfToken,
        },
        body: JSON.stringify({ unlockMethod: 'pin', pin: '8642' }),
      });
      const unlockBody = await unlock.json();
      assert.equal(unlock.status, 200, JSON.stringify(unlockBody));
      cookies = mergeCookies(cookies, getSetCookieHeaders(unlock));
      const expireCsrf = unlockBody.csrfToken || csrfPack.csrfToken;

      const expire = await fetch(`${http.baseUrl}/api/family/adult-privilege/expire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(cookies),
          'X-CSRF-Token': expireCsrf,
        },
        body: JSON.stringify({ reason: 'explicit_return' }),
      });
      const expireBody = await expire.json();
      assert.equal(expire.status, 200, JSON.stringify(expireBody));
      assert.equal(expireBody.ok, true);
      assert.equal(expireBody.state, 'locked');
      assert.equal(expireBody.child.id, childId);

      cookies = mergeCookies(cookies, getSetCookieHeaders(expire));
      const me = await (await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(cookies) },
      })).json();
      assert.equal(me.type, 'child');
      assert.equal(me.id, childId);

      const parentApi = await fetch(`${http.baseUrl}/api/family`, {
        headers: { Cookie: cookieHeader(cookies) },
      });
      assert.equal(parentApi.status, 403);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('expire without escalation child returns profile picker on multi-child shared', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await enableFamilyDeviceFlags(db);
      const session = await registerAndLogin(http.baseUrl);
      await createChild(http.baseUrl, session, { name: 'A', emoji: '🦊' });
      await createChild(http.baseUrl, session, { name: 'B', emoji: '🐻' });
      const { parentId } = await sessionIdentity(http, session);
      await setParentPin(db, parentId, '8642');
      let cookies = trustedOnlyCookies(await enrollShared(http, session));

      const selectParent = await fetch(`${http.baseUrl}/api/auth/trusted-device/select-parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(cookies) },
        body: JSON.stringify({ parent_id: parentId, unlock_method: 'pin', pin: '8642' }),
      });
      const selectBody = await selectParent.json();
      assert.equal(selectParent.status, 200, JSON.stringify(selectBody));
      cookies = mergeCookies(cookies, getSetCookieHeaders(selectParent));
      const csrfPack = await fetchCsrf(http, cookies);
      cookies = csrfPack.cookies;

      const expire = await fetch(`${http.baseUrl}/api/family/adult-privilege/expire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(cookies),
          'X-CSRF-Token': csrfPack.csrfToken,
        },
        body: JSON.stringify({ reason: 'explicit_return' }),
      });
      const body = await expire.json();
      assert.equal(expire.status, 200, JSON.stringify(body));
      assert.equal(body.code, 'SHARED_PICKER_REQUIRED');
      assert.equal(body.redirect, '/child/profile-picker');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  it('client exposes returnToChildExperience and profile chrome button', () => {
    const priv = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege.js'), 'utf8');
    const chrome = fs.readFileSync(path.join(ROOT, 'public/js/profile-switch-chrome.js'), 'utf8');
    assert.match(priv, /returnToChildExperience/);
    assert.match(chrome, /profile-return-child-btn/);
    assert.match(chrome, /Tillbaka till barn/);
    assert.match(chrome, /returnToChildExperience/);
  });
});

describe('Accessibility contracts — Family Device pilot paths', () => {
  it('profile picker cards have focus-visible and aria-label hooks', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-profile-picker.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-picker.js'), 'utf8');
    assert.match(html, /cpp-profile-card:focus-visible/);
    assert.match(js, /aria-label/);
    assert.match(js, /TrustedDeviceBootstrap\.pickSharedChild/);
  });

  it('return-to-child control meets touch target standard in CSS', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/profile-switch-chrome.css'), 'utf8');
    assert.match(css, /\.profile-return-child-btn[\s\S]*min-height:\s*44px/);
    assert.match(css, /\.profile-return-child-btn:focus-visible/);
  });

  it('trusted daily UX redirects away from legacy child-login PIN path', () => {
    const orch = fs.readFileSync(path.join(ROOT, 'public/js/app-entry-orchestrator.js'), 'utf8');
    assert.match(orch, /legacyChildPinFallbackPath[\s\S]*\/child\/profile-picker/);
  });
});
