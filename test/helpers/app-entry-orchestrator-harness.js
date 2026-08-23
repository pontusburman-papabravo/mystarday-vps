'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '../..');

function createMemoryStorage() {
  const map = {};
  return {
    _m: map,
    getItem(k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
    setItem(k, v) { map[k] = String(v); },
    removeItem(k) { delete map[k]; },
  };
}

function createFakeDate(initialNow) {
  const RealDate = Date;
  let fakeNow = typeof initialNow === 'number' ? initialNow : RealDate.now();
  function FakeDate(...args) {
    if (args.length === 0) {
      return new RealDate(fakeNow);
    }
    return new RealDate(...args);
  }
  FakeDate.now = function () { return fakeNow; };
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  FakeDate.prototype = RealDate.prototype;
  return {
    FakeDate,
    advanceTime(ms) { fakeNow += ms; },
    getNow() { return fakeNow; },
    setNow(ms) { fakeNow = ms; },
  };
}

function parentAuthorityFetchMock(options) {
  const opts = options || {};
  const meType = opts.meType || 'parent';
  const privilegeActive = opts.privilegeActive !== false;
  const privilegeState = opts.privilegeState || (privilegeActive ? 'active' : 'locked');
  const leaseUntil = Object.prototype.hasOwnProperty.call(opts, 'leaseUntil')
    ? opts.leaseUntil
    : Date.now() + 15 * 60 * 1000;
  const appEntryBody = opts.appEntryBody || null;

  return async function fetchMock(url, init, fetchCalls) {
    const u = String(url);
    if (u.indexOf('/api/auth/me') !== -1) {
      if (meType === 'unauthorized') {
        return { ok: false, status: 401, json: async () => ({ error: 'unauthorized' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ type: meType, id: opts.parentId || 'parent-1' }),
      };
    }
    if (u.indexOf('/api/family/adult-privilege/status') !== -1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          privilegeActive: privilegeActive,
          state: privilegeState,
          privilegeLeaseUntil: privilegeActive ? leaseUntil : null,
        }),
      };
    }
    if (u.indexOf('/api/auth/app-entry') !== -1) {
      if (typeof opts.appEntryFetch === 'function') {
        return opts.appEntryFetch(url, init, fetchCalls);
      }
      if (appEntryBody) {
        return { ok: true, status: 200, json: async () => appEntryBody };
      }
    }
    if (u.indexOf('/api/auth/trusted-device/restore') !== -1) {
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    throw new Error('unexpected fetch ' + url);
  };
}

function loadOrchestratorSandbox(options) {
  const opts = options || {};
  const redirects = [];
  const fetchCalls = [];
  const clock = createFakeDate(opts.initialNow);
  const fetchImpl = typeof opts.fetch === 'function'
    ? opts.fetch
    : parentAuthorityFetchMock(opts);
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    URLSearchParams,
    Date: clock.FakeDate,
    fetch: async function (url, init) {
      fetchCalls.push({ url: String(url), init: init || {} });
      return fetchImpl(url, init, fetchCalls);
    },
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.document = {
    readyState: 'complete',
    addEventListener() {},
  };
  sandbox.location = {
    href: opts.pathname || '/dashboard',
    pathname: opts.pathname || '/dashboard',
    search: '',
    replace(url) {
      redirects.push(String(url));
      sandbox.location.href = url;
      const nextPath = String(url).split('?')[0];
      sandbox.location.pathname = nextPath || '/';
    },
  };
  sandbox.sessionStorage = createMemoryStorage();
  sandbox.localStorage = createMemoryStorage();
  sandbox.DeviceMode = {
    _mode: opts.deviceMode || 'child',
    enterChild() { this._mode = 'child'; sandbox.localStorage.setItem('stjarndag_device_mode', 'child'); },
    enterParent() { this._mode = 'parent'; sandbox.localStorage.setItem('stjarndag_device_mode', 'parent'); },
    isChildMode() { return this._mode === 'child'; },
  };
  sandbox.SessionGate = {
    run() { sandbox.__sessionGateRuns = (sandbox.__sessionGateRuns || 0) + 1; },
  };
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(ROOT, 'public/js/app-entry-orchestrator.js'), 'utf8');
  vm.runInContext(code, sandbox, { filename: 'app-entry-orchestrator.js' });
  return {
    sandbox,
    redirects,
    fetchCalls,
    advanceTime: clock.advanceTime,
    getNow: clock.getNow,
    setNow: clock.setNow,
  };
}

function childHomeAppEntryBody(childId) {
  const id = childId || '00000000-0000-4000-8000-0000000000c1';
  return {
    orchestratorActive: true,
    dailyUxActive: true,
    allowedChildren: [{ id, name: 'Astrid' }, { id: 'child-2', name: 'Anna' }],
    allowedParents: [{ id: 'parent-1', name: 'Parent' }],
    pinRequiredForParents: true,
    decision: {
      destination: 'child-home',
      viewContext: 'child',
      credentialContext: 'child',
      deviceMode: 'shared',
      childId: id,
      reason: 'trusted_device_child_home',
      serverAction: 'restore-child',
      path: '/child/today',
    },
  };
}

module.exports = {
  createMemoryStorage,
  createFakeDate,
  loadOrchestratorSandbox,
  parentAuthorityFetchMock,
  childHomeAppEntryBody,
};
