'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { loadLocales, t } = require('../src/lib/i18n');
const { authApiMessage } = require('../src/lib/auth-api-messages');

const ROOT = path.join(__dirname, '..');
const SWEDISH_RE = /[åäöÅÄÖ]/;
const AUTH_HTML = [
  'public/login.html',
  'public/register.html',
  'public/forgot-password.html',
  'public/reset-password.html',
  'public/verify-email.html',
  'public/child-login.html',
];

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function uniqueEmail() {
  return `auth-i18n-${crypto.randomBytes(6).toString('hex')}@example.com`;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function swedishHits(rel, extraAllow = []) {
  const allow = [/pragma:/, /console\./, /\/\//, /data-i18n/, /<!--/, /auth-entry-noscript|auth-entry-fallback/, ...extraAllow];
  const hits = [];
  read(rel).split('\n').forEach((line, idx) => {
    if (!SWEDISH_RE.test(line)) return;
    if (allow.some((re) => re.test(line))) return;
    hits.push({ line: idx + 1, text: line.trim() });
  });
  return hits;
}

describe('auth i18n — static surfaces', () => {
  test('auth HTML pages load locale bootstrap and gate', () => {
    for (const file of AUTH_HTML) {
      const html = read(file);
      assert.match(html, /auth-entry-failsafe\.js/, `${file} missing auth-entry-failsafe.js`);
      assert.match(html, /auth-entry-i18n\.js/, `${file} missing auth-entry-i18n.js`);
      assert.match(html, /auth-entry-fallback/, `${file} missing auth-entry-fallback`);
      assert.match(html, /data-i18n-manual-init="true"/, `${file} missing data-i18n-manual-init`);
      assert.match(html, /<noscript>/, `${file} missing noscript fallback`);
      assert.match(html, /i18n\.js/, `${file} missing i18n.js`);
      if (file !== 'public/login.html') {
        assert.match(html, /data-i18n-title=/, `${file} missing data-i18n-title`);
      }
    }
    const entry = read('public/js/auth-entry-i18n.js');
    const failsafe = read('public/js/auth-entry-failsafe.js');
    assert.match(entry, /auth-entry-pending/);
    assert.match(entry, /authEntryI18nBootstrapped/);
    assert.match(failsafe, /auth-entry-pending/);
    assert.match(failsafe, /authEntryI18nBootstrapped/);
    assert.match(failsafe, /__dismissAuthEntryFallback/);
  });

  test('post-logout auth guards avoid login reload loop', () => {
    const authJs = read('public/js/auth.js');
    const i18nJs = read('public/js/i18n.js');
    assert.match(authJs, /if \(path === target\) return;/);
    assert.match(authJs, /if \(!Auth\.isLoggedIn\(\)\) return;/);
    assert.match(i18nJs, /Auth\.isLoggedIn\(\)/);
  });

  test('auth HTML has no hardcoded Swedish placeholders', () => {
    for (const file of AUTH_HTML) {
      const html = read(file);
      const placeholders = [...html.matchAll(/placeholder="([^"]+)"/g)];
      for (const m of placeholders) {
        if (!m[1]) continue;
        assert.equal(SWEDISH_RE.test(m[1]), false, `${file} placeholder: ${m[1]}`);
      }
    }
  });

  test('strict-tier auth files have zero Swedish hits', () => {
    const files = [
      'public/js/auth.js',
      'public/js/child-login.js',
      'public/login.html',
      'public/register.html',
      'public/child-login.html',
      'public/forgot-password.html',
      'public/reset-password.html',
      'public/verify-email.html',
      'src/routes/auth/login.js',
      'src/routes/auth/register.js',
      'src/routes/auth/email.js',
      'src/lib/auth-api-messages.js',
      'public/js/auth-entry-failsafe.js',
    ];
    for (const file of files) {
      const hits = swedishHits(file);
      assert.equal(hits.length, 0, `${file}: ${JSON.stringify(hits.slice(0, 3))}`);
    }
  });

  test('register terms and success copy use data-i18n keys', () => {
    const html = read('public/register.html');
    assert.match(html, /data-i18n="auth\.register\.termsPrefix"/);
    assert.match(html, /data-i18n="auth\.register\.successTitle"/);
    assert.match(html, /t\('auth\.login\.apple\./);
  });

  test('reset-password uses INVALID_RESET_LINK code not Swedish string match', () => {
    const html = read('public/reset-password.html');
    assert.match(html, /INVALID_RESET_LINK/);
    assert.doesNotMatch(html, /ogiltig|utgången/);
  });

  test('verify-email welcome uses brand helper', () => {
    const html = read('public/verify-email.html');
    assert.match(html, /auth\.verify\.welcomeMessage/);
    assert.match(html, /authBrandName/);
    assert.doesNotMatch(html, /Välkommen till/);
  });

  test('child-login handoff preserves locale when parent session ends', () => {
    const authJs = read('public/js/auth.js');
    const childLoginJs = read('public/js/child-login.js');
    const childAppI18n = read('public/js/child-app-i18n.js');
    const i18nJs = read('public/js/i18n.js');
    assert.match(authJs, /_persistAuthEntryLocaleContext/);
    assert.match(authJs, /localStorage\.setItem\(storageKey/);
    assert.match(authJs, /sd_english_child_experience/);
    assert.match(i18nJs, /_readStoredLocale/);
    assert.match(i18nJs, /localStorage\.getItem\(this\.STORAGE_KEY\)/);
    assert.match(childLoginJs, /readPersistedChildLocaleHints/);
    assert.match(childLoginJs, /\/api\/auth\/me/);
    assert.match(childAppI18n, /sd_english_child_experience/);
    assert.match(childAppI18n, /sd_child_ui_locale/);
  });
});

describe('auth i18n — locale bundles', () => {
  test('auth parentGate and register keys exist in both locales', () => {
    loadLocales();
    const keys = [
      'auth.parentGate.title',
      'auth.register.termsPrefix',
      'auth.register.successTitle',
      'auth.api.errors.userNotFound',
      'auth.api.errors.invalidResetLink',
    ];
    for (const key of keys) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.notEqual(sv, key, `sv missing ${key}`);
      assert.notEqual(en, key, `en missing ${key}`);
      assert.ok(sv.length > 0 && en.length > 0);
    }
  });

  test('auth API messages localize login errors', () => {
    loadLocales();
    const sv = authApiMessage('sv-SE', 'errors.invalidCredentials');
    const en = authApiMessage('en-GB', 'errors.invalidCredentials');
    assert.match(sv, /Felaktig|lösenord/i);
    assert.match(en, /Incorrect|password/i);
  });
});

describe('auth i18n — API integration', () => {
  test('login wrong password returns localized error', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    loadLocales();
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    const email = uniqueEmail();

    try {
      const reg = await fetch(`${http.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Auth I18n',
          email,
          password: 'testpass123',
          preferred_locale: 'en-GB',
        }),
      });
      assert.equal(reg.status, 201);

      const badSv = await fetch(`${http.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'wrong-password',
          preferred_locale: 'sv-SE',
        }),
      });
      const bodySv = await badSv.json();
      assert.equal(badSv.status, 401);
      assert.equal(bodySv.code, 'INVALID_CREDENTIALS');
      assert.match(bodySv.error, /Felaktig|lösenord/i);

      const badEn = await fetch(`${http.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'en-GB',
        },
        body: JSON.stringify({
          email,
          password: 'wrong-password',
          preferred_locale: 'en-GB',
        }),
      });
      const bodyEn = await badEn.json();
      assert.equal(badEn.status, 401);
      assert.match(bodyEn.error, /Incorrect|password/i);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('reset-password invalid token returns INVALID_RESET_LINK code', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    loadLocales();
    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const res = await fetch(`${http.baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'en-GB',
        },
        body: JSON.stringify({
          token: 'not-a-real-token',
          password: 'newpass123',
          preferred_locale: 'en-GB',
        }),
      });
      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.code, 'INVALID_RESET_LINK');
      assert.match(body.error, /invalid|expired|reset/i);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('register validation errors are localized', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    loadLocales();
    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const res = await fetch(`${http.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'X',
          email: 'not-an-email',
          password: 'short',
          preferred_locale: 'en-GB',
        }),
      });
      assert.ok(res.status >= 400);
      const body = await res.json();
      assert.ok(body.error || body.message);
      assert.match(String(body.error || body.message), /email|password|8|värden|invalid|values/i);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

test('audit:i18n:baseline auth tier is zero', () => {
  const out = execSync('npm run audit:i18n:baseline', {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, PATH: process.env.PATH },
  });
  assert.match(out, /BASELINE: 0 hit/);
});
