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
const harness = require('./helpers/family-bootstrap-call-harness');

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

describe('P1 — executable API call measurement', () => {
  it('FAMILY_HARD_LOAD: legacy burst vs coalesced current path', async () => {
    const before = await harness.simulateLegacyFamilyHardLoad();
    const after = await harness.simulateFamilyHardLoad();
    assert.equal(before.family, 2, 'legacy hard load duplicated concurrent /api/family');
    assert.equal(after.family, 1, 'SharedFamilyFetch coalesces concurrent hard-load consumers');
  });

  it('FAMILY_SOFT_NAV: warm + prefetch + init coalesce with helpers', async () => {
    const before = await harness.simulateFamilySoftNav(false);
    const after = await harness.simulateFamilySoftNav(true);
    assert.equal(before.family, 1, 'legacy soft-nav warm path still single inflight promise');
    assert.equal(after.family, 1, 'soft-nav with SharedFamilyFetch stays at one /api/family');
  });

  it('SETTINGS_BOOT: duplicate coparent refetch removed when preloaded', async () => {
    const before = await harness.simulateSettingsBoot(false, true);
    const after = await harness.simulateSettingsBoot(true, false);
    assert.equal(before.me, 2, 'legacy settings+coparent duplicated /api/auth/me');
    assert.equal(before.family, 2, 'legacy settings+coparent duplicated /api/family');
    assert.equal(after.me, 1, 'settings bootstrap keeps single /api/auth/me');
    assert.equal(after.family, 1, 'coparent reuses preloaded family payload');
  });
});

describe('P1 — family soft-nav helper loading contract', () => {
  it('parent-magic-router PAGE_SCRIPTS.family loads helpers before family.js', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    const familyBlock = router.match(/family:\s*\[([\s\S]*?)\]/);
    assert.ok(familyBlock, 'family PAGE_SCRIPTS block');
    const block = familyBlock[0];
    const apiIdx = block.indexOf('api-error-classification.js');
    const sharedIdx = block.indexOf('shared-family-fetch.js');
    const familyJsIdx = block.indexOf('family.js');
    assert.ok(apiIdx >= 0 && sharedIdx > apiIdx, 'ApiErrorClassification before SharedFamilyFetch');
    assert.ok(sharedIdx >= 0 && familyJsIdx > sharedIdx, 'SharedFamilyFetch before family.js');
  });

  it('soft-nav family path has Retry-After classification available', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    assert.match(router, /api-error-classification\.js/);
    assert.match(router, /SharedFamilyFetch\.fetch/);
    const win = loadBrowserModule('public/js/api-error-classification.js');
    assert.equal(win.ApiErrorClassification.getRetryAfterMs({ status: 429, body: { retry_after: 30 } }), 30000);
  });
});

describe('P1 — dynamic error text XSS safety', () => {
  it('settings retry UI renders API error message as text, not HTML', () => {
    const sandbox = { console, setTimeout, clearTimeout };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    vm.createContext(sandbox);
    const banner = {
      className: 'hidden',
      classList: { add: function () {}, remove: function () {} },
      setAttribute: function () {},
      appendChild: function (node) { this.children = (this.children || []).concat(node); },
      removeChild: function () {},
      firstChild: null,
      children: [],
    };
    sandbox.document = {
      getElementById: function (id) { return id === 'settingsFamilyLoadError' ? banner : null; },
      createElement: function (tag) {
        return { tagName: tag, className: '', id: '', textContent: '', classList: { add: function () {} } };
      },
      querySelector: function () { return { insertBefore: function () {} }; },
      body: { insertBefore: function () {} },
    };
    loadBrowserModule('public/js/api-error-classification.js', sandbox);
    loadBrowserModule('public/js/settings-page-bootstrap.js', sandbox);
    const payload = '<img src=x onerror=alert(1)>';
    sandbox.SettingsPageBootstrap.showFamilyLoadError({ message: payload, status: 500 }, function () {});
    const messageNode = banner.children[1];
    assert.equal(messageNode.textContent, payload);
    assert.equal(banner.innerHTML || '', '', 'dynamic message must not be assigned via innerHTML');
  });

  it('family.js showFamilyLoadError uses textContent for dynamic message', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/family.js'), 'utf8');
    assert.match(src, /body\.textContent = message/);
    assert.doesNotMatch(src, /showFamilyLoadError[\s\S]{0,400}innerHTML[\s\S]{0,120}message/);
  });
});

describe('P1 — settings + coparent wiring contract', () => {
  it('settings passes preloaded me/fam into bootSettingsCoParent', () => {
    const settings = fs.readFileSync(path.join(ROOT, 'public/settings.html'), 'utf8');
    const coparent = fs.readFileSync(path.join(ROOT, 'public/js/coparent-invite-ui.js'), 'utf8');
    assert.match(settings, /bootSettingsCoParent\(me, fam\)/);
    assert.match(coparent, /bootSettingsCoParent\(meArg, famArg\)/);
    assert.match(coparent, /SharedFamilyFetch/);
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
