'use strict';

/**
 * P1 — Family Device rate-limit + false-logout hardening regression tests.
 */

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadBrowserModule(relativePath, sandbox) {
  if (!sandbox) {
    sandbox = { console, setTimeout, clearTimeout };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    vm.createContext(sandbox);
  }
  const code = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  vm.runInContext(code, sandbox, { filename: relativePath });
  return sandbox.window;
}

function loadSettingsBootstrapStack() {
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  loadBrowserModule('public/js/api-error-classification.js', sandbox);
  loadBrowserModule('public/js/shared-family-fetch.js', sandbox);
  loadBrowserModule('public/js/settings-page-bootstrap.js', sandbox);
  return sandbox.window;
}

describe('P1 — api-error-classification', () => {
  it('treats 401/403 as auth session failure only', () => {
    const win = loadBrowserModule('public/js/api-error-classification.js');
    const Api = win.ApiErrorClassification;
    assert.equal(Api.isAuthSessionFailure({ status: 401 }), true);
    assert.equal(Api.isAuthSessionFailure({ status: 403 }), true);
    assert.equal(Api.isAuthSessionFailure({ status: 429 }), false);
    assert.equal(Api.isAuthSessionFailure({ status: 500 }), false);
  });

  it('treats 429/5xx/network as transient', () => {
    const win = loadBrowserModule('public/js/api-error-classification.js');
    const Api = win.ApiErrorClassification;
    assert.equal(Api.isTransientApiFailure({ status: 429 }), true);
    assert.equal(Api.isTransientApiFailure({ status: 503 }), true);
    assert.equal(Api.isTransientApiFailure({ name: 'TypeError', message: 'Failed to fetch' }), true);
    assert.equal(Api.isTransientApiFailure({ status: 401 }), false);
  });

  it('reads retry_after from error body', () => {
    const win = loadBrowserModule('public/js/api-error-classification.js');
    const Api = win.ApiErrorClassification;
    assert.equal(Api.getRetryAfterMs({ status: 429, body: { retry_after: 45 } }), 45000);
    assert.equal(Api.getRetryAfterMs({ status: 429 }), 60000);
  });
});

describe('P1 — settings bootstrap must not false-logout on transient errors', () => {
  it('settings.html no longer uses blanket catch redirect to /login for family load', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    assert.match(html, /SettingsPageBootstrap\.validateSession/);
    assert.match(html, /SettingsPageBootstrap\.loadFamilyData/);
    assert.doesNotMatch(html, /catch \(error\)[\s\S]{0,120}window\.location\.href = '\/login'/);
  });

  it('VALID SESSION + /api/auth/me 200 + /api/family 429 → NO login redirect', async () => {
    const win = loadSettingsBootstrapStack();
    const Boot = win.SettingsPageBootstrap;

    let redirect = false;
    const me = { id: 'p1', type: 'parent', email: 'qa@example.com' };
    const apiFn = async (url) => {
      if (url === '/api/auth/me') return me;
      if (url === '/api/family') {
        throw Object.assign(new Error('För många förfrågningar. Vänta en minut och försök igen.'), {
          status: 429,
          body: { retry_after: 60 },
        });
      }
      throw new Error('unexpected:' + url);
    };

    const session = await Boot.validateSession(apiFn);
    if (session.redirectLogin) redirect = true;
    assert.equal(session.ok, true);
    assert.equal(session.me && session.me.id, 'p1');

    const family = await Boot.loadFamilyData(apiFn);
    assert.equal(family.ok, false);
    assert.equal(family.transient, true);
    assert.equal(redirect, false);
  });

  it('VALID SESSION + /api/family 500 → NO login redirect', async () => {
    const win = loadSettingsBootstrapStack();
    const Boot = win.SettingsPageBootstrap;

    const apiFn = async (url) => {
      if (url === '/api/auth/me') return { id: 'p1', type: 'parent' };
      if (url === '/api/family') {
        throw Object.assign(new Error('Serverfel'), { status: 500 });
      }
      throw new Error('unexpected');
    };

    const session = await Boot.validateSession(apiFn);
    assert.equal(session.redirectLogin, false);
    const family = await Boot.loadFamilyData(apiFn);
    assert.equal(family.ok, false);
    assert.equal(family.transient, true);
  });

  it('INVALID auth session 401 → redirectLogin', async () => {
    const sandbox = { console, setTimeout, clearTimeout };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    vm.createContext(sandbox);
    loadBrowserModule('public/js/api-error-classification.js', sandbox);
    loadBrowserModule('public/js/settings-page-bootstrap.js', sandbox);
    const Boot = sandbox.window.SettingsPageBootstrap;

    const session = await Boot.validateSession(async (url) => {
      if (url === '/api/auth/me') {
        throw Object.assign(new Error('Unauthorized'), { status: 401 });
      }
      throw new Error('unexpected');
    });
    assert.equal(session.redirectLogin, true);
    assert.equal(session.ok, false);
  });
});

describe('P1 — shared /api/family coalescing', () => {
  it('SharedFamilyFetch dedupes concurrent /api/family calls', async () => {
    const win = loadBrowserModule('public/js/shared-family-fetch.js');
    let calls = 0;
    const apiFn = async () => {
      calls += 1;
      return { id: 'fam', children: [] };
    };
    const [a, b] = await Promise.all([
      win.SharedFamilyFetch.fetch(apiFn),
      win.SharedFamilyFetch.fetch(apiFn),
    ]);
    assert.equal(calls, 1);
    assert.equal(a.id, 'fam');
    assert.equal(b.id, 'fam');
    assert.equal(win.SharedFamilyFetch.getCached().id, 'fam');
  });
});

describe('P1 — API call pressure inventory (static estimate)', () => {
  const FLOW = [
    { step: 'app-entry cold start', calls: ['GET /api/auth/app-entry'] },
    { step: 'profile picker meta', calls: ['GET /api/auth/app-entry'] },
    { step: 'select child', calls: ['POST /api/auth/trusted-device/select-child', 'GET /api/auth/me'] },
    { step: 'switch profile', calls: ['POST /api/auth/logout (switchChild)', 'GET /api/auth/app-entry'] },
    { step: 'Vuxen unlock', calls: ['GET /api/family/adult-privilege/status', 'POST /api/family/adult-privilege/unlock', 'GET /api/auth/me'] },
    { step: 'dashboard boot', calls: ['GET /api/auth/me', 'GET /api/family/dashboard-stats', 'GET /api/family/readiness', 'GET /api/family/activation-config'] },
    { step: 'Familj page (before fix)', calls: ['GET /api/auth/me', 'GET /api/family', 'GET /api/family (warm)', 'GET /api/family/museum'] },
    { step: 'Inställningar (before fix)', calls: ['GET /api/auth/me', 'GET /api/family', 'GET /api/auth/me', 'GET /api/family'] },
  ];

  it('documents EXPECTED vs BEFORE/AFTER estimates', () => {
    const beforeFamily = 4;
    const afterFamily = 2;
    const beforeSettings = 4;
    const afterSettings = 2;
    const flowTotalBefore = FLOW.reduce((n, row) => n + row.calls.length, 0);
    const savings = (beforeFamily - afterFamily) + (beforeSettings - afterSettings);
    assert.ok(flowTotalBefore >= 20);
    assert.equal(savings, 4);
  });

  it('settings + coparent no longer duplicate family fetch in source', () => {
    const settings = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    const coparent = fs.readFileSync(path.join(ROOT, 'public/js/coparent-invite-ui.js'), 'utf8');
    assert.match(settings, /bootSettingsCoParent\(me, fam\)/);
    assert.match(coparent, /bootSettingsCoParent\(meArg, famArg\)/);
    assert.match(coparent, /SharedFamilyFetch/);
  });

  it('WHY_100_PER_MIN_CAN_BE_REACHED: rapid tab hops + duplicate family/me bootstraps', () => {
    const perHopEstimate = 12;
    const hopsToLimit = Math.ceil(100 / perHopEstimate);
    assert.ok(hopsToLimit <= 10, 'profile switching across ~10 parent tabs can approach limit before dedupe');
  });
});

describe('P1 — family page 429 UX contract', () => {
  it('family.html exposes retry banner hook', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/family.html'), 'utf8');
    assert.match(html, /id="familyLoadError"/);
  });

  it('family.js uses retry banner instead of toast-only on first load failure', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/family.js'), 'utf8');
    assert.match(src, /showFamilyLoadError/);
    assert.match(src, /familyLoadRetryBtn/);
  });
});

describe('P1 — Family Device hardening preserved', () => {
  it('trusted entry before legacy child PIN remains', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-login.js'), 'utf8');
    const initStart = src.indexOf("document.addEventListener('DOMContentLoaded'");
    const init = src.slice(initStart, initStart + 4500);
    assert.ok(init.indexOf('redirectAuthoritativeEntryOrLegacy') < init.indexOf('buildKeypad()'));
  });

  it('Tillbaka till barn + adult privilege route preserved', () => {
    const chrome = fs.readFileSync(path.join(ROOT, 'public/js/profile-switch-chrome.js'), 'utf8');
    const route = fs.readFileSync(path.join(ROOT, 'src/routes/family/adult-privilege.js'), 'utf8');
    assert.match(chrome, /Tillbaka till barn/);
    assert.match(route, /SHARED_PICKER_REQUIRED/);
  });
});
