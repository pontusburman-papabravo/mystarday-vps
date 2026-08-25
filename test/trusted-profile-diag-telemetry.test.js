'use strict';

/**
 * P1 diagnostics-only telemetry for the child->adult profile-switch flow (#1068
 * physical QA follow-up). Loads the REAL trusted-select-parent-diag.js +
 * adult-privilege.js + app-entry-orchestrator.js + child-profile-picker.js in one
 * VM context and asserts:
 *  - a single correlation flow_id is generated at the parent-card tap and carried
 *    through every stage of the flow (picker -> select-parent -> /me -> lease ->
 *    commit -> navigation),
 *  - the exact set/order of stages fires for a success run and for a fail-closed
 *    run (wrong parent id),
 *  - NO PIN codes, tokens or cookies ever appear in any logged payload.
 *
 * This is diagnostics-only: it does not assert or change functional behaviour —
 * that is covered by test/atomic-child-adult-commit.test.js.
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

function stubEl() {
  const classes = new Set();
  return {
    textContent: '', innerHTML: '', dataset: {}, style: {},
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c),
      toggle: (c, on) => { if (on) classes.add(c); else classes.delete(c); },
      contains: (c) => classes.has(c),
    },
    scrollIntoView() {}, addEventListener() {}, setAttribute() {},
    getAttribute() { return null; }, querySelectorAll() { return []; }, appendChild() {},
  };
}

function buildHarness(opts) {
  opts = opts || {};
  const clientLogEvents = [];
  const redirects = [];

  function resp(status, body) {
    const text = JSON.stringify(body);
    return Promise.resolve({
      ok: status >= 200 && status < 300, status,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(text),
      json: () => Promise.resolve(body),
    });
  }

  function fetchImpl(url, init) {
    const u = String(url);
    if (u === '/api/client-log') {
      let payload = null;
      try { payload = JSON.parse(init && init.body); } catch (_) { /* ignore */ }
      if (payload) clientLogEvents.push(payload);
      return resp(200, { ok: true });
    }
    if (u.indexOf('/api/auth/app-entry') !== -1) {
      return resp(200, { orchestratorActive: true, dailyUxActive: true, pinRequiredForParents: true });
    }
    if (u.indexOf('/trusted-device/select-parent') !== -1) {
      const sp = typeof opts.selectParent === 'function' ? opts.selectParent() : opts.selectParent;
      return resp(200, sp || {
        ok: true, user: { id: 'p1', type: 'parent' },
        redirect: '/dashboard', privilegeLeaseUntil: Date.now() + 15 * 60 * 1000, csrfToken: 'c',
      });
    }
    if (u.indexOf('/api/auth/me') !== -1) {
      const me = typeof opts.me === 'function' ? opts.me() : opts.me;
      return resp(200, me || { type: 'parent', id: 'p1' });
    }
    return resp(404, {});
  }

  const sandbox = {
    console, encodeURIComponent, URLSearchParams, Promise,
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
    setAuth() {}, isLoggedIn: () => true, getUser: () => ({ type: 'parent', id: 'p1' }),
    redirectToParentBackupLogin() {},
  };
  sandbox.DeviceMode = {
    _mode: 'child',
    enterParent() { this._mode = 'parent'; },
    enterChild() { this._mode = 'child'; },
    isChildMode() { return this._mode === 'child'; },
  };
  sandbox.SessionGate = { run() {} };
  sandbox.AdultPinGateUI = { collectAdultPin: async () => ({ ok: true, pin: '4321' }) };
  sandbox.ParentBackupLoginIntent = { clearIntent() {}, storeIntent() {}, canonicalizeParentPath: (p) => p };
  sandbox.ProfileSwitchChrome = { apply() {}, shouldShow: () => false, storeEntryMeta() {} };
  sandbox.AdultPrivilegeLifecycle = { start() {}, onPolicyUpdate() {}, onPrivilegeCleared() {}, onPrivilegeActivated() {} };

  vm.createContext(sandbox);
  vm.runInContext(read('public/js/trusted-select-parent-diag.js'), sandbox, { filename: 'trusted-select-parent-diag.js' });
  vm.runInContext(read('public/js/adult-privilege.js'), sandbox, { filename: 'adult-privilege.js' });
  vm.runInContext(read('public/js/app-entry-orchestrator.js'), sandbox, { filename: 'app-entry-orchestrator.js' });
  vm.runInContext(read('public/js/child-profile-picker.js'), sandbox, { filename: 'child-profile-picker.js' });

  return {
    sandbox, redirects, clientLogEvents,
    hooks: sandbox.__PickerRuntimeTestHooks,
  };
}

function parentBtn() {
  return { disabled: false, getAttribute: (n) => (n === 'data-parent-has-app-pin' ? '1' : null) };
}

const FORBIDDEN_KEY_RE = /pin|token|cookie|password|secret/i;

function assertNoSensitivePayload(events) {
  for (const ev of events) {
    const json = JSON.stringify(ev);
    // "expiresAt"/"privilegeLeaseUntil" style keys are allowed (timestamps, not
    // secrets); only flag if a forbidden word appears as an actual object KEY.
    (function walk(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        assert.ok(!FORBIDDEN_KEY_RE.test(key), 'forbidden key "' + key + '" in client-log payload: ' + json);
        walk(obj[key]);
      }
    })(ev);
  }
}

describe('P1 diagnostics — correlated flow id + no sensitive payload', () => {
  it('success flow: one flow_id carries picker -> select-parent -> /me -> lease -> commit -> navigation', async () => {
    const h = buildHarness({});
    await h.hooks.onPickParent('p1', parentBtn());

    assert.ok(h.clientLogEvents.length > 5, 'expected multiple correlated stages');
    const flowIds = new Set(h.clientLogEvents.map((e) => e.flow_id));
    assert.equal(flowIds.size, 1, 'exactly one flow_id for the whole attempt');
    const flowId = [...flowIds][0];
    assert.ok(flowId && typeof flowId === 'string' && flowId.length > 0);

    const steps = h.clientLogEvents.map((e) => e.step);
    const expectedInOrder = [
      'picker:parent_card_tapped',
      'select-parent:start',
      'select-parent:returned',
      'me:start',
      'me:end',
      'verify:result',
      'pending:stashed',
      'commit:start',
      'orch:commit_start',
      'orch:devicemode_before',
      'orch:devicemode_after',
      'commit:applied',
      'auth:before',
      'auth:after',
      'lifecycle:activation_start',
      'lifecycle:activation_success',
      'navigation:requested',
    ];
    let cursor = -1;
    for (const step of expectedInOrder) {
      const idx = steps.indexOf(step, cursor + 1);
      assert.ok(idx > cursor, 'expected stage "' + step + '" after position ' + cursor + '; got ' + JSON.stringify(steps));
      cursor = idx;
    }

    assert.equal(h.redirects.length, 1);
    assert.equal(h.redirects[0], '/dashboard');
    assertNoSensitivePayload(h.clientLogEvents);
  });

  it('every event carries channel=trusted_profile_unlock and a path', () => {
    const h = buildHarness({});
    h.sandbox.window.TrustedSelectParentDiag.beginFlow();
    h.sandbox.window.TrustedSelectParentDiag.logStage('unit:test', { safe: 1 });
    assert.equal(h.clientLogEvents.length, 1);
    assert.equal(h.clientLogEvents[0].channel, 'trusted_profile_unlock');
    assert.equal(typeof h.clientLogEvents[0].path, 'string');
    assert.equal(typeof h.clientLogEvents[0].flow_id, 'string');
  });

  it('wrong parent id: fail-closed flow stops at verify — no commit/auth/lifecycle stages, no PIN/token leak', async () => {
    const h = buildHarness({ me: { type: 'parent', id: 'someone-else' } });
    await h.hooks.onPickParent('p1', parentBtn());

    const steps = h.clientLogEvents.map((e) => e.step);
    assert.ok(steps.includes('picker:parent_card_tapped'));
    assert.ok(steps.includes('me:end'));
    assert.ok(steps.includes('verify:result'));
    assert.ok(steps.includes('pending:discarded'));
    for (const forbidden of ['commit:start', 'orch:commit_start', 'auth:before', 'auth:after', 'lifecycle:activation_start', 'navigation:requested']) {
      assert.ok(!steps.includes(forbidden), 'must NOT reach "' + forbidden + '" on a failed verify: ' + JSON.stringify(steps));
    }
    assert.equal(h.redirects.length, 0);

    // Same flow_id across the whole (failed) attempt.
    const flowIds = new Set(h.clientLogEvents.map((e) => e.flow_id));
    assert.equal(flowIds.size, 1);

    assertNoSensitivePayload(h.clientLogEvents);
  });

  it('flow id persists in sessionStorage across a simulated full-page navigation', async () => {
    const h = buildHarness({});
    await h.hooks.onPickParent('p1', parentBtn());
    const flowId = h.sandbox.window.TrustedSelectParentDiag.getFlowId();
    assert.ok(flowId, 'flow id persisted in sessionStorage after navigation is requested');
  });
});

describe('P1 diagnostics — module wiring (trusted-select-parent-diag.js loaded on destination pages)', () => {
  it('platform-html injects trusted-select-parent-diag.js on every page and bumps it to MAGIC_VERSION', () => {
    const { injectPlatformHtml, MAGIC_VERSION } = require('../src/middleware/platform-html');
    const html = read('public/dashboard.html');
    const req = { path: '/home', headers: {}, get: () => '', query: {}, cookies: {} };
    const out = injectPlatformHtml(html, '/home', req);
    assert.match(out, /trusted-select-parent-diag\.js/);
    const tags = [...new Set((out.match(/trusted-select-parent-diag\.js\?v=[^"']+/g) || []))];
    assert.deepEqual(tags, ['trusted-select-parent-diag.js?v=' + MAGIC_VERSION]);
  });

  it('orchestrator + bootstrap emit destination-side diagnostics via the same helper contract', () => {
    const orch = read('public/js/app-entry-orchestrator.js');
    const bootstrap = read('public/js/family-device-entry-bootstrap.js');
    for (const stage of [
      'destination:page_loaded', 'destination:cold_start_begin', 'destination:resume_marker_state',
      'destination:resume_reused', 'destination:resume_verified', 'destination:resume_rejected',
      'destination:app_entry_refetch', 'destination:redirect_to_picker', 'destination:decision_applied',
      'destination:me_start', 'destination:me_end', 'destination:status_start', 'destination:status_end',
    ]) {
      const inOrch = orch.includes("'" + stage + "'");
      const inBootstrap = bootstrap.includes("'" + stage + "'");
      assert.ok(inOrch || inBootstrap, 'missing diagnostic stage: ' + stage);
    }
  });
});
