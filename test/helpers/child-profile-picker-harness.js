'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '../..');

function loadModule(sandbox, relativePath) {
  const code = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  vm.runInContext(code, sandbox, { filename: relativePath });
}

function createPickerSandbox(options) {
  const opts = options || {};
  const redirects = [];
  const unlockCalls = [];
  const childPicks = [];
  const sandbox = {
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);

  sandbox.location = {
    href: '/child/profile-picker',
    pathname: '/child/profile-picker',
    search: '',
    replace: function (url) { redirects.push(String(url)); sandbox.location.href = url; },
  };
  sandbox.document = {
    readyState: 'complete',
    getElementById: function () { return null; },
    addEventListener: function () {},
  };
  sandbox.sessionStorage = {
    _m: {},
    getItem: function (k) { return this._m[k] || null; },
    setItem: function (k, v) { this._m[k] = String(v); },
    removeItem: function (k) { delete this._m[k]; },
  };
  sandbox.localStorage = sandbox.sessionStorage;
  sandbox.Auth = {
    hydrateParentSessionFromCookies: async function () {},
    ensureCsrfToken: async function () {},
    getCsrfToken: function () { return 'csrf'; },
    setAuth: function () {},
    redirectToParentBackupLogin: function (next) {
      redirects.push('/login?parent=1&next=' + encodeURIComponent(next || '/home'));
    },
  };
  sandbox.DeviceMode = {
    enterParent: function () { sandbox.__enteredParent = true; },
  };
  sandbox.AppEntryOrchestrator = {
    markDecisionApplied: function (d) { sandbox.__decision = d; },
  };
  sandbox.AdultPrivilege = {
    isPrivilegeActive: function () { return opts.privilegeActive === true; },
    requestTrustedProfileUnlock: async function (args) {
      unlockCalls.push(args);
      if (opts.unlockResult) return opts.unlockResult;
      return { ok: true, redirect: '/dashboard' };
    },
  };
  sandbox.TrustedDeviceBootstrap = {
    pickSharedChild: async function (childId) {
      childPicks.push(childId);
      return { ok: true };
    },
  };
  sandbox.fetch = async function (url) {
    if (String(url).indexOf('/api/auth/me') !== -1) {
      return {
        ok: true,
        json: async function () {
          return { type: 'parent', id: opts.meParentId || 'parent-1' };
        },
      };
    }
    throw new Error('unexpected fetch ' + url);
  };
  sandbox.__exposePickerRuntimeForTests = true;
  loadModule(sandbox, 'public/js/child-profile-picker.js');
  return {
    sandbox: sandbox,
    hooks: sandbox.__PickerRuntimeTestHooks,
    unlockCalls: unlockCalls,
    redirects: redirects,
    childPicks: childPicks,
  };
}

async function pickParent(options) {
  const env = createPickerSandbox(options);
  const btn = {
    disabled: false,
    getAttribute: function (name) {
      if (name === 'data-parent-has-app-pin') return options && options.hasAppPin === false ? '0' : '1';
      return null;
    },
  };
  await env.hooks.onPickParent(options && options.parentId || 'parent-1', btn);
  return {
    unlockCalls: env.unlockCalls,
    redirects: env.redirects,
    enteredParent: env.sandbox.__enteredParent === true,
    decision: env.sandbox.__decision || null,
    btnDisabled: btn.disabled,
  };
}

async function pickChild(childId) {
  const env = createPickerSandbox({});
  await env.hooks.onPickChild(childId || 'child-1', { disabled: false });
  return { childPicks: env.childPicks, unlockCalls: env.unlockCalls, redirects: env.redirects };
}

module.exports = {
  createPickerSandbox,
  pickParent,
  pickChild,
};
