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

function loadOrchestratorSandbox(options) {
  const opts = options || {};
  const redirects = [];
  const fetchCalls = [];
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    URLSearchParams,
    fetch: async function (url, init) {
      fetchCalls.push({ url: String(url), init: init || {} });
      if (typeof opts.fetch === 'function') {
        return opts.fetch(url, init, fetchCalls);
      }
      throw new Error('unexpected fetch ' + url);
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
  return { sandbox, redirects, fetchCalls };
}

module.exports = {
  createMemoryStorage,
  loadOrchestratorSandbox,
};
