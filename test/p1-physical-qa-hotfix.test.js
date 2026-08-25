'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P1 physical QA hotfix — rate limit bootstrap', () => {
  const limiter = read('src/middleware/rateLimiter.js');

  it('app-entry is exempt from authenticated apiLimiter burst', () => {
    assert.match(limiter, /\/auth\/app-entry/);
    assert.match(limiter, /API_BOOTSTRAP_PREFIXES/);
  });
});

describe('P1 physical QA hotfix — journey context dedup', () => {
  const client = read('public/js/journey-context-client.js');

  it('shares in-flight fetch between isJourneyApiEnabled and fetchContext', () => {
    assert.match(client, /inflightFetch/);
    assert.match(client, /if \(!force && inflightFetch\)/);
    assert.match(client, /if \(inflightFetch\)/);
  });
});

describe('P1 physical QA hotfix — profile picker resilience', () => {
  const picker = read('public/js/child-profile-picker.js');

  it('checks app-entry HTTP status before using body', () => {
    assert.match(picker, /fetchAppEntry/);
    assert.match(picker, /if \(!res\.ok\)/);
    assert.match(picker, /body\.orchestratorActive === false/);
    assert.match(picker, /body\.orchestratorActive !== true/);
  });

  it('429 shows recoverable error instead of silent empty state', () => {
    assert.match(picker, /err\.status === 429/);
    assert.match(picker, /För många förfrågningar/);
    assert.match(picker, /cppRetryBtn/);
  });

  it('switch=1 does not auto-select only child', () => {
    assert.match(picker, /totalProfiles === 1 && children\.length === 1 && !isSwitch/);
  });

  it('renders both profile kinds from allowedChildren and allowedParents', () => {
    assert.match(picker, /renderCards\(children, parents\)/);
    assert.match(picker, /data-profile-kind="child"/);
    assert.match(picker, /data-profile-kind="parent"/);
  });
});

function makeDomEl() {
  return {
    textContent: '',
    innerHTML: '',
    classList: { toggle() {}, remove() {} },
    dataset: {},
    addEventListener() {},
    scrollIntoView() {},
    querySelector(sel) {
      if (sel === '#cppRetryBtn' && this.innerHTML.indexOf('cppRetryBtn') !== -1) {
        return { addEventListener() {} };
      }
      return null;
    },
    querySelectorAll(sel) {
      const results = [];
      if (sel === '[data-profile-kind="child"]') {
        const re = /data-child-id="([^"]+)"/g;
        let match;
        while ((match = re.exec(this.innerHTML)) !== null) {
          const childId = match[1];
          results.push({
            getAttribute: function (name) {
              return name === 'data-child-id' ? childId : null;
            },
            addEventListener() {},
          });
        }
      }
      if (sel === '[data-profile-kind="parent"]') {
        const re = /data-parent-id="([^"]+)"/g;
        let match;
        while ((match = re.exec(this.innerHTML)) !== null) {
          const parentId = match[1];
          results.push({
            getAttribute: function (name) {
              if (name === 'data-parent-id') return parentId;
              if (name === 'data-parent-has-app-pin') return '1';
              return null;
            },
            addEventListener() {},
          });
        }
      }
      return results;
    },
  };
}

function createBootstrapEnv(appEntryResponse) {
  const redirects = [];
  const grid = makeDomEl();
  const errorEl = makeDomEl();
  const sub = makeDomEl();
  const title = makeDomEl();
  const legacy = { classList: { toggle() {} } };

  const sandbox = { console, setTimeout, clearTimeout, URLSearchParams };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);

  sandbox.location = {
    href: '/child/profile-picker?switch=1',
    search: '?switch=1',
    replace: function (url) { redirects.push(String(url)); },
  };

  sandbox.document = {
    readyState: 'complete',
    createElement: function () {
      const el = makeDomEl();
      let text = '';
      Object.defineProperty(el, 'textContent', {
        enumerable: true,
        configurable: true,
        get: function () { return text; },
        set: function (v) {
          text = v == null ? '' : String(v);
          el.innerHTML = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        },
      });
      return el;
    },
    getElementById: function (id) {
      if (id === 'cppGrid') return grid;
      if (id === 'cppError') return errorEl;
      if (id === 'cppSub') return sub;
      if (id === 'cppTitle') return title;
      if (id === 'cppLegacyLink') return legacy;
      return null;
    },
    addEventListener: function () {},
  };

  sandbox.sessionStorage = {
    _m: {},
    getItem: function (k) { return this._m[k] || null; },
    setItem: function (k, v) { this._m[k] = String(v); },
    removeItem: function (k) { delete this._m[k]; },
  };
  sandbox.localStorage = sandbox.sessionStorage;

  sandbox.fetch = async function (url) {
    if (String(url).indexOf('/api/auth/app-entry') !== -1) {
      if (typeof appEntryResponse === 'function') return appEntryResponse();
      return appEntryResponse;
    }
    throw new Error('unexpected fetch ' + url);
  };

  sandbox.__exposePickerRuntimeForTests = true;
  vm.runInContext(read('public/js/child-profile-picker.js'), sandbox, { filename: 'child-profile-picker.js' });

  return {
    hooks: sandbox.__PickerRuntimeTestHooks,
    redirects,
    grid,
    errorEl,
    sub,
  };
}

describe('P1 physical QA hotfix — profile picker bootstrap contract', () => {
  it('HTTP 429 shows retry UI and does not redirect to legacy child-login', async () => {
    const env = createBootstrapEnv({
      ok: false,
      status: 429,
      headers: { get: function () { return '60'; } },
      json: async function () { return { error: 'Too many requests' }; },
    });

    await env.hooks.bootstrap();

    assert.equal(env.redirects.length, 0);
    assert.match(env.errorEl.textContent, /För många förfrågningar/);
    assert.match(env.grid.innerHTML, /cppRetryBtn/);
    assert.match(env.sub.textContent, /60/);
  });

  it('200 + orchestratorActive=false redirects to legacy child-login', async () => {
    const env = createBootstrapEnv({
      ok: true,
      status: 200,
      headers: { get: function () { return null; } },
      json: async function () { return { orchestratorActive: false }; },
    });

    await env.hooks.bootstrap();

    assert.equal(env.redirects.length, 1);
    assert.equal(env.redirects[0], '/child-login?shared_device=1');
  });

  it('200 + orchestratorActive=true renders profile cards', async () => {
    const env = createBootstrapEnv({
      ok: true,
      status: 200,
      headers: { get: function () { return null; } },
      json: async function () {
        return {
          orchestratorActive: true,
          allowedChildren: [{ id: 'child-1', name: 'Astrid', emoji: '👧' }],
          allowedParents: [{ id: 'parent-1', name: 'Vuxen', hasAppPin: true }],
        };
      },
    });

    await env.hooks.bootstrap();

    assert.equal(env.redirects.length, 0);
    assert.match(env.grid.innerHTML, /data-profile-kind="child"/);
    assert.match(env.grid.innerHTML, /data-profile-kind="parent"/);
    assert.match(env.grid.innerHTML, /Astrid/);
  });

  it('200 + missing orchestratorActive shows recoverable error without redirect', async () => {
    const env = createBootstrapEnv({
      ok: true,
      status: 200,
      headers: { get: function () { return null; } },
      json: async function () {
        return {
          allowedChildren: [{ id: 'child-1', name: 'Astrid', emoji: '👧' }],
          allowedParents: [{ id: 'parent-1', name: 'Vuxen', hasAppPin: true }],
        };
      },
    });

    await env.hooks.bootstrap();

    assert.equal(env.redirects.length, 0);
    assert.match(env.errorEl.textContent, /kunde inte laddas/i);
    assert.match(env.grid.innerHTML, /cppRetryBtn/);
  });
});

describe('P1 physical QA hotfix — settings UX copy and chrome', () => {
  const hubs = read('public/js/parent-magic-page-hubs.js');
  const nativeNav = read('public/js/settings-native-nav.js');
  const sv = read('config/i18n/settings-sv-SE.json');
  const en = read('config/i18n/settings-en-GB.json');

  it('removes mockupen from settings hub copy', () => {
    assert.doesNotMatch(hubs, /mockupen/i);
    assert.doesNotMatch(sv, /mockup/i);
    assert.doesNotMatch(en, /mockup/i);
    assert.match(sv, /Profil, familj och app/);
  });

  it('hides duplicate settings switch card when top chrome button exists', () => {
    assert.match(hubs, /hasTopProfileSwitch/);
    assert.match(hubs, /data-profile-switch-parent/);
  });

  it('subscription group keeps only contextual back in-group', () => {
    assert.match(nativeNav, /magic-settings-in-group/);
    assert.match(hubs, /backToSettings/);
    assert.match(nativeNav, /if \(inGroup\)/);
  });
});

describe('P1 physical QA hotfix — trofe icon runtime path', () => {
  const icon = read('public/js/icon-system.js');
  const hubs = read('public/js/parent-magic-page-hubs.js');

  it('IconSystem hub assets include cache-busted trofe URL', () => {
    assert.match(icon, /trofe: true/);
    assert.match(icon, /HUB_ASSET_VERSION/);
    assert.match(icon, /hub\/' \+ name \+ '\.svg\?v='/);
  });

  it('pageIcon never returns raw icon key string', () => {
    const fn = hubs.slice(hubs.indexOf('function pageIcon'), hubs.indexOf('function renderGenericHero'));
    assert.doesNotMatch(fn, /return iconKey;/);
    assert.match(fn, /return '';/);
  });

  it('trofe.svg is precached in service worker', () => {
    const sw = read('public/sw.js');
    assert.match(sw, /hub\/trofe\.svg/);
    assert.match(sw, /stjarndag-v\d+/);
  });
});

describe('P1 physical QA hotfix — app-entry fetch coalescing', () => {
  const orch = read('public/js/app-entry-orchestrator.js');

  it('dedupes parallel fetchEntryDecision calls', () => {
    assert.match(orch, /_entryFetchPromise/);
    assert.match(orch, /_entryFetchPromise\.key === cacheKey/);
  });
});
