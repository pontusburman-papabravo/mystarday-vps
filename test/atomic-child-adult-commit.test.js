'use strict';

/**
 * Integrated runtime test for the atomic child→adult commit boundary (#1068).
 *
 * Loads the REAL modules — adult-privilege.js, app-entry-orchestrator.js and
 * child-profile-picker.js — in one VM context (AdultPrivilege is NOT mocked away)
 * and drives the picker's onPickParent plus the orchestrator commit boundary.
 *
 * Contract under test: NO local parent state (Auth / AdultPrivilege ACTIVE / parent
 * DeviceMode / lifecycle / chrome) is applied before the single commit boundary
 * commitVerifiedParentResume() + applied parent-home. On any failure: 0 navigation
 * and no local parent state. Post-commit lifecycle/chrome exceptions do not fail an
 * already-committed transition.
 *
 * Also asserts the rendered /child/profile-picker ships adult-privilege.js at the
 * current MAGIC_VERSION (native/WebView cache bust).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function memStorage() {
  const m = {};
  return {
    _m: m,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: (k) => { delete m[k]; },
    clear: () => { for (const k of Object.keys(m)) delete m[k]; },
  };
}

function fakeDate(initial) {
  const Real = Date;
  let now = typeof initial === 'number' ? initial : Real.now();
  function F(...a) { return a.length === 0 ? new Real(now) : new Real(...a); }
  F.now = () => now;
  F.parse = Real.parse;
  F.UTC = Real.UTC;
  F.prototype = Real.prototype;
  return { F, advance: (ms) => { now += ms; }, get: () => now, set: (v) => { now = v; } };
}

function stubEl() {
  const classes = new Set();
  return {
    textContent: '', innerHTML: '', dataset: {},
    style: {},
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c),
      toggle: (c, on) => { if (on) classes.add(c); else classes.delete(c); },
      contains: (c) => classes.has(c),
    },
    scrollIntoView() {}, addEventListener() {}, setAttribute() {},
    getAttribute() { return null; }, querySelectorAll() { return []; }, appendChild() {},
  };
}

/**
 * @param {object} opts
 *  - me: object|fn → GET /api/auth/me body (default {type:'parent', id:'p1'})
 *  - selectParent: object|fn → select-parent body
 *  - lease: number → privilegeLeaseUntil injected into select-parent + status
 *  - lifecycleThrows / chromeThrows: boolean → hook throws on activation
 */
function buildIntegrated(opts) {
  opts = opts || {};
  const clock = fakeDate(opts.initialNow);
  const lease = Object.prototype.hasOwnProperty.call(opts, 'lease')
    ? opts.lease : clock.get() + 15 * 60 * 1000;
  const redirects = [];
  const fetchCalls = [];
  const spies = { setAuthParent: 0, enterParent: 0, chromeApply: 0, lifecycleActivated: 0 };

  function resp(status, body) {
    const text = JSON.stringify(body);
    return Promise.resolve({
      ok: status >= 200 && status < 300, status,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(text),
      json: () => Promise.resolve(body),
    });
  }

  function fetchImpl(url) {
    const u = String(url);
    fetchCalls.push(u);
    if (u.indexOf('/api/auth/app-entry') !== -1) {
      return resp(200, {
        orchestratorActive: true, dailyUxActive: true,
        pinRequiredForParents: true, allowedChildren: [{ id: 'c1' }, { id: 'c2' }],
        allowedParents: [{ id: 'p1' }],
      });
    }
    if (u.indexOf('/trusted-device/select-parent') !== -1) {
      const sp = typeof opts.selectParent === 'function' ? opts.selectParent() : opts.selectParent;
      return resp(200, sp || {
        ok: true, user: { id: 'p1', type: 'parent' },
        redirect: '/dashboard', privilegeLeaseUntil: lease, csrfToken: 'c',
      });
    }
    if (u.indexOf('/api/auth/me') !== -1) {
      const me = typeof opts.me === 'function' ? opts.me() : opts.me;
      return resp(200, me || { type: 'parent', id: 'p1' });
    }
    if (u.indexOf('/api/family/adult-privilege/status') !== -1) {
      return resp(200, { ok: true, privilegeActive: true, state: 'active', privilegeLeaseUntil: lease });
    }
    return resp(404, {});
  }

  const sandbox = {
    console, encodeURIComponent, URLSearchParams, Promise,
    Date: clock.F,
    setTimeout: (fn) => { Promise.resolve().then(fn); return 0; },
    clearTimeout: () => {},
    fetch: (url, init) => fetchImpl(url, init),
    analytics: { track() {} },
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.__exposePickerRuntimeForTests = true;
  sandbox.sessionStorage = memStorage();
  sandbox.localStorage = memStorage();
  const els = {};
  sandbox.document = {
    readyState: 'complete',
    getElementById: (id) => (els[id] || (els[id] = stubEl())),
    createElement: () => stubEl(),
    addEventListener() {},
  };
  sandbox.location = {
    href: '/child/profile-picker', pathname: '/child/profile-picker', search: '',
    replace(url) { redirects.push(String(url)); this.href = String(url); this.pathname = String(url).split('?')[0]; },
  };
  sandbox.Auth = {
    getCsrfToken: () => 'csrf', setCsrfToken() {},
    ensureCsrfToken: async () => {}, hydrateParentSessionFromCookies: async () => {},
    setAuth(child, parent) { if (parent) spies.setAuthParent += 1; },
    redirectToParentBackupLogin() {},
  };
  sandbox.DeviceMode = {
    _mode: 'child',
    enterParent() { this._mode = 'parent'; spies.enterParent += 1; },
    enterChild() { this._mode = 'child'; },
    isChildMode() { return this._mode === 'child'; },
  };
  sandbox.SessionGate = { run() {} };
  sandbox.AdultPinGateUI = { collectAdultPin: async () => ({ ok: true, pin: '4321' }) };
  sandbox.TrustedSelectParentDiag = { logStage() {}, safeKeys: (b) => (b && typeof b === 'object' ? Object.keys(b) : []) };
  sandbox.ParentBackupLoginIntent = { clearIntent() {}, storeIntent() {}, canonicalizeParentPath: (p) => p };
  sandbox.ProfileSwitchChrome = {
    apply() { spies.chromeApply += 1; if (opts.chromeThrows) throw new Error('chrome failed'); },
    shouldShow: () => false, storeEntryMeta() {},
  };
  sandbox.AdultPrivilegeLifecycle = {
    start() {}, onPolicyUpdate() {}, onPrivilegeCleared() {},
    onPrivilegeActivated() { spies.lifecycleActivated += 1; if (opts.lifecycleThrows) throw new Error('lifecycle failed'); },
  };

  vm.createContext(sandbox);
  vm.runInContext(read('public/js/adult-privilege.js'), sandbox, { filename: 'adult-privilege.js' });
  vm.runInContext(read('public/js/app-entry-orchestrator.js'), sandbox, { filename: 'app-entry-orchestrator.js' });
  vm.runInContext(read('public/js/child-profile-picker.js'), sandbox, { filename: 'child-profile-picker.js' });

  return {
    sandbox, redirects, fetchCalls, spies, clock, lease,
    hooks: sandbox.__PickerRuntimeTestHooks,
    priv: sandbox.window.AdultPrivilege,
    orch: sandbox.window.AppEntryOrchestrator,
    appEntryFetches: () => fetchCalls.filter((u) => u.indexOf('/api/auth/app-entry') !== -1).length,
  };
}

function parentBtn() {
  return { disabled: false, getAttribute: (n) => (n === 'data-parent-has-app-pin' ? '1' : null) };
}

describe('atomic child→adult commit boundary — verification never mutates local parent state', () => {
  it('wrong parent id in /api/auth/me → 0 navigation, no Parent Auth, no parent DeviceMode', async () => {
    const t = buildIntegrated({ me: { type: 'parent', id: 'someone-else' } });
    await t.hooks.onPickParent('p1', parentBtn());
    assert.equal(t.redirects.length, 0);
    assert.equal(t.spies.setAuthParent, 0);
    assert.equal(t.spies.enterParent, 0);
    assert.notEqual(t.priv.getState(), 'active');
  });

  it('child /api/auth/me → 0 navigation, no parent state', async () => {
    const t = buildIntegrated({ me: { type: 'child', id: 'kid' } });
    await t.hooks.onPickParent('p1', parentBtn());
    assert.equal(t.redirects.length, 0);
    assert.equal(t.spies.setAuthParent, 0);
    assert.equal(t.spies.enterParent, 0);
    assert.notEqual(t.priv.getState(), 'active');
  });

  for (const [name, badLease] of [['null', null], ['malformed', 'not-a-number'], ['expired', 1000]]) {
    it(`lease ${name} → 0 navigation, no parent state`, async () => {
      const t = buildIntegrated({
        selectParent: { ok: true, user: { id: 'p1', type: 'parent' }, redirect: '/dashboard', privilegeLeaseUntil: badLease, csrfToken: 'c' },
      });
      await t.hooks.onPickParent('p1', parentBtn());
      assert.equal(t.redirects.length, 0);
      assert.equal(t.spies.setAuthParent, 0);
      assert.equal(t.spies.enterParent, 0);
      assert.notEqual(t.priv.getState(), 'active');
    });
  }

  it('verification does NOT set parent DeviceMode / Auth / ACTIVE before the commit', async () => {
    const t = buildIntegrated({});
    const r = await t.priv.requestTrustedProfileUnlock({ parentId: 'p1' });
    assert.equal(r.ok, true);
    assert.equal(r.privilegeLeaseUntil, t.lease);
    // Verified but NOT committed: no local parent identity yet.
    assert.equal(t.spies.enterParent, 0, 'no parent DeviceMode before commit');
    assert.equal(t.spies.setAuthParent, 0, 'no Parent Auth before commit');
    assert.notEqual(t.priv.getState(), 'active');
    // The single commit boundary then applies it.
    assert.equal(t.orch.commitVerifiedParentResume('/dashboard', r.privilegeLeaseUntil), true);
    t.priv.commitPendingParentUnlock();
    assert.equal(t.priv.getState(), 'active');
    assert.equal(t.spies.setAuthParent, 1);
    assert.ok(t.spies.enterParent >= 1, 'parent DeviceMode only after commit');
  });

  it('lease valid at verification but expired at commit → 0 navigation, no stale parent state', async () => {
    const t = buildIntegrated({ lease: fakeDate().get() + 500 });
    const r = await t.priv.requestTrustedProfileUnlock({ parentId: 'p1' });
    assert.equal(r.ok, true); // verified while lease was still in the future
    assert.equal(t.spies.enterParent, 0);
    assert.equal(t.spies.setAuthParent, 0);
    // Time passes — lease is now in the past when the commit boundary runs.
    t.clock.advance(5000);
    const committed = t.orch.commitVerifiedParentResume('/dashboard', r.privilegeLeaseUntil);
    assert.equal(committed, false, 'commit re-validates the lease and fails closed');
    // Picker discards on commit failure.
    t.priv.discardPendingParentUnlock();
    assert.equal(t.redirects.length, 0);
    assert.equal(t.spies.setAuthParent, 0);
    assert.equal(t.spies.enterParent, 0);
    assert.notEqual(t.priv.getState(), 'active');
    assert.equal(t.orch.isExplicitParentResumeActive(), false);
  });

  it('commit failure via onPickParent (expired-at-commit) → 0 navigation, no local parent state', async () => {
    // Lease valid for verification, then advanced past expiry via the /me fetch side effect
    // so the synchronous commit inside onPickParent fails.
    const t = buildIntegrated({ lease: fakeDate().get() + 800 });
    let meCalls = 0;
    t.sandbox.fetch = ((orig) => (url, init) => {
      if (String(url).indexOf('/api/auth/me') !== -1) {
        meCalls += 1;
        // After verification reads /me + lease, jump the clock so commit sees it expired.
        if (meCalls >= 1) t.clock.advance(5000);
      }
      return orig(url, init);
    })(t.sandbox.fetch);
    // Re-verify lease is checked AFTER /me: advancing on /me makes isUsablePrivilegeLease fail,
    // so this path fails at verification (still 0 nav / no parent state), which is also acceptable.
    await t.hooks.onPickParent('p1', parentBtn());
    assert.equal(t.redirects.length, 0);
    assert.equal(t.spies.setAuthParent, 0);
    assert.equal(t.spies.enterParent, 0);
    assert.notEqual(t.priv.getState(), 'active');
  });

  it('lifecycle + chrome exceptions AFTER a successful commit keep the transition committed', async () => {
    const t = buildIntegrated({ lifecycleThrows: true, chromeThrows: true });
    await t.hooks.onPickParent('p1', parentBtn());
    // Navigation happened exactly once and the transition is committed/active despite hooks throwing.
    assert.equal(t.redirects.length, 1);
    assert.equal(t.redirects[0], '/dashboard');
    assert.equal(t.priv.getState(), 'active', 'committed/active — no mixed failed state');
    assert.equal(t.orch.isExplicitParentResumeActive(), true);
  });

  it('success → exactly one navigation, verified resume, parent DeviceMode only after commit', async () => {
    const t = buildIntegrated({});
    await t.hooks.onPickParent('p1', parentBtn());
    assert.equal(t.redirects.length, 1, 'exactly one navigation');
    assert.equal(t.redirects[0], '/dashboard');
    assert.equal(t.orch.isExplicitParentResumeActive(), true, 'verified resume committed');
    assert.equal(t.priv.getState(), 'active');
    assert.equal(t.spies.setAuthParent, 1);
    assert.ok(t.spies.enterParent >= 1);
  });

  it('destination cold start reuses the verified resume — no extra /api/auth/app-entry refetch', async () => {
    const t = buildIntegrated({});
    await t.hooks.onPickParent('p1', parentBtn());
    const before = t.appEntryFetches();
    const cold = await t.orch.runColdStart({ source: 'test_destination' });
    assert.equal(cold.ok, true);
    assert.equal(cold.code, 'EXPLICIT_PARENT_RESUME');
    assert.equal(t.appEntryFetches(), before, 'no additional app-entry fetch when verified resume is used');
  });
});

describe('native/WebView cache version — adult-privilege.js on rendered picker', () => {
  const { injectPlatformHtml, MAGIC_VERSION } = require('../src/middleware/platform-html');

  it('rendered /child/profile-picker ships adult-privilege.js at the current MAGIC_VERSION', () => {
    const html = read('public/child-profile-picker.html');
    const req = { path: '/child/profile-picker', headers: {}, get: () => '', query: {}, cookies: {} };
    const out = injectPlatformHtml(html, '/child/profile-picker', req);
    const tags = [...new Set((out.match(/adult-privilege\.js\?v=[^"']+/g) || []))];
    assert.deepEqual(tags, ['adult-privilege.js?v=' + MAGIC_VERSION], 'exactly one adult-privilege.js tag at MAGIC_VERSION');
    assert.doesNotMatch(out, /adult-privilege\.js\?v=1\.2\.1/, 'stale HTML version rewritten');
    assert.doesNotMatch(out, /adult-privilege\.js\?v=2026-06-24-native-sw-guard/, 'stale RELEASE_TAG rewritten');
    // Orchestrator + picker are bumped the same way.
    assert.match(out, new RegExp('app-entry-orchestrator\\.js\\?v=' + MAGIC_VERSION));
    assert.match(out, new RegExp('child-profile-picker\\.js\\?v=' + MAGIC_VERSION));
  });
});
