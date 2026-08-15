'use strict';

/**
 * Runtime integration harness — loads actual client modules (not reimplemented models).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '../..');

function createDomElement(id, opts) {
  opts = opts || {};
  const el = {
    id: id,
    tagName: opts.tagName || 'div',
    value: opts.value || '',
    textContent: opts.textContent || '',
    innerHTML: opts.innerHTML || '',
    _attrs: Object.assign({}, opts.attrs || {}),
    _classes: new Set(opts.hidden ? ['hidden'] : []),
    _children: [],
    classList: null,
    style: {},
    disabled: false,
    onclick: null,
  };
  el.classList = {
    add: function (c) { el._classes.add(c); },
    remove: function (c) { el._classes.delete(c); },
    contains: function (c) { return el._classes.has(c); },
    toggle: function (c, on) {
      if (on === undefined) {
        if (el._classes.has(c)) el._classes.delete(c);
        else el._classes.add(c);
      } else if (on) el._classes.add(c);
      else el._classes.delete(c);
    },
  };
  el.appendChild = function (node) { el._children.push(node); };
  el.removeChild = function (node) {
    const idx = el._children.indexOf(node);
    if (idx >= 0) el._children.splice(idx, 1);
  };
  Object.defineProperty(el, 'firstChild', {
    get: function () { return el._children[0] || null; },
  });
  el.setAttribute = function (k, v) { el._attrs[k] = String(v); };
  el.getAttribute = function (k) { return el._attrs[k] || null; };
  el.querySelector = function () { return null; };
  el.querySelectorAll = function () { return []; };
  el.addEventListener = function () {};
  el.closest = function () { return null; };
  return el;
}

function createFamilyDom() {
  const ids = [
    'userEmail', 'logoutBtn', 'inviteBtn', 'familyLoadingSkeleton', 'familyDataSections',
    'familyHubSummary', 'familyLoadError', 'familyChestSection', 'familyNameSection',
    'familyNameInput', 'todayLabel', 'drawerEditBirthdayYear', 'drawerEditBirthdayMonth',
    'drawerEditBirthdayDay', 'drawerEditBirthday', 'noChildrenState', 'childrenGrid',
    'noAdultsState', 'adultsGrid', 'pendingInvitesSection', 'pendingInvitesList', 'childDrawer',
  ];
  const elements = {};
  ids.forEach(function (id) {
    elements[id] = createDomElement(id, {
      tagName: id.indexOf('Input') >= 0 ? 'input' : 'div',
      hidden: id === 'familyLoadError' || id === 'inviteBtn',
    });
  });
  elements.logoutBtn = createDomElement('logoutBtn', { tagName: 'button' });
  const body = createDomElement('body', { tagName: 'body' });
  body.querySelectorAll = function () { return []; };
  return { elements: elements, body: body };
}

function loadModule(sandbox, relativePath) {
  const code = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  vm.runInContext(code, sandbox, { filename: relativePath });
}

function createApiTracker(initialPayload) {
  const log = [];
  let payload = initialPayload;
  const apiFn = async function (url) {
    log.push(url);
    if (url === '/api/auth/me') return { id: 'p1', type: 'parent', email: 'qa@example.com' };
    if (url === '/api/family') {
      if (typeof payload === 'function') {
        return payload(log.filter(function (u) { return u === '/api/family'; }).length);
      }
      if (payload && payload.error) throw payload.error;
      return payload;
    }
    throw new Error('unexpected:' + url);
  };
  return {
    log: log,
    apiFn: apiFn,
    setPayload: function (next) { payload = next; },
    count: function (url) { return log.filter(function (u) { return u === url; }).length; },
  };
}

function createSharedFetchSandbox(payload) {
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  const tracker = createApiTracker(payload);
  sandbox.Auth = { api: tracker.apiFn };
  loadModule(sandbox, 'public/js/api-error-classification.js');
  loadModule(sandbox, 'public/js/shared-family-fetch.js');
  return { sandbox: sandbox, tracker: tracker };
}

function loadFamilyRuntime(sandbox, tracker) {
  const dom = createFamilyDom();
  sandbox.document = {
    body: dom.body,
    getElementById: function (id) { return dom.elements[id] || null; },
    createElement: function (tag) { return createDomElement('dyn-' + tag, { tagName: tag }); },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
  };
  sandbox.Auth = {
    requireAuth: function () { return true; },
    getUser: function () { return { email: 'qa@example.com', isAdmin: false }; },
    api: tracker.apiFn,
    logout: async function () {},
  };
  sandbox.pt = function (key) { return key; };
  sandbox.showToast = function () {};
  sandbox.escHtml = function (s) { return String(s); };
  sandbox.renderChildAvatar = function () { return ''; };
  sandbox.initBirthdayPicker = function () {};
  sandbox.I18n = { init: async function () {} };
  sandbox.ParentMagicPageBoot = { register: function () {} };
  sandbox.ParentMagicShell = { init: function () {} };
  sandbox.addEventListener = function () {};
  sandbox.dispatchEvent = function () {};
  sandbox.setTimeout = function (fn, ms) {
    return setTimeout(fn, ms > 1000 ? 0 : ms);
  };
  sandbox.__exposeFamilyRuntimeForTests = true;
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  loadModule(sandbox, 'public/js/api-error-classification.js');
  loadModule(sandbox, 'public/js/shared-family-fetch.js');
  loadModule(sandbox, 'public/js/family.js');
  return dom;
}

async function runSharedFetchConcurrent(payload) {
  const { sandbox, tracker } = createSharedFetchSandbox(payload);
  const bind = sandbox.Auth.api.bind(sandbox.Auth);
  const [a, b] = await Promise.all([
    sandbox.SharedFamilyFetch.fetch(bind),
    sandbox.SharedFamilyFetch.fetch(bind),
  ]);
  return { a: a, b: b, tracker: tracker };
}

async function runSharedFetchSequentialRefresh(payloadA, payloadB) {
  const { sandbox, tracker } = createSharedFetchSandbox(payloadA);
  const bind = sandbox.Auth.api.bind(sandbox.Auth);
  const first = await sandbox.SharedFamilyFetch.fetch(bind);
  tracker.setPayload(payloadB);
  const second = await sandbox.SharedFamilyFetch.fetch(bind);
  return { first: first, second: second, tracker: tracker };
}

async function runFamilyInit(payload) {
  const tracker = createApiTracker(payload);
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  const dom = loadFamilyRuntime(sandbox, tracker);
  sandbox.authGuard = async function () { return null; };
  const hooks = sandbox.__FamilyRuntimeTestHooks;
  await hooks.init();
  return { hooks: hooks, tracker: tracker, dom: dom, sandbox: sandbox };
}

async function runFamilyInitFailure(err) {
  const tracker = createApiTracker({ error: err });
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  const dom = loadFamilyRuntime(sandbox, tracker);
  sandbox.authGuard = async function () { return null; };
  sandbox.location = { href: '/family', replace: function () {} };
  const hooks = sandbox.__FamilyRuntimeTestHooks;
  await hooks.init();
  return { hooks: hooks, tracker: tracker, banner: dom.elements.familyLoadError, sandbox: sandbox };
}

async function runFamilyInit429ThenRetry() {
  const err429 = Object.assign(new Error('För många förfrågningar'), {
    status: 429,
    body: { retry_after: 1 },
  });
  const fail = await runFamilyInitFailure(err429);
  fail.tracker.setPayload({ id: 'fam-1', name: 'After retry', children: [] });
  await fail.hooks.init();
  return {
    fail: fail,
    retryCalls: fail.tracker.count('/api/family'),
    state: fail.hooks.getState(),
  };
}

async function runFamilyPostMutationRefresh() {
  const tracker = createApiTracker({ id: 'fam-1', name: 'Before', children: [] });
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  loadFamilyRuntime(sandbox, tracker);
  sandbox.authGuard = async function () { return null; };
  const hooks = sandbox.__FamilyRuntimeTestHooks;
  await hooks.init();
  tracker.setPayload({ id: 'fam-1', name: 'After mutation', children: [] });
  await hooks.init();
  return { hooks: hooks, tracker: tracker };
}

function loadParentMagicRouterSandbox() {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    fetch: async function () { throw new Error('not used in this harness'); },
    DOMParser: function () {
      return { parseFromString: function () { return { head: { querySelectorAll: function () { return []; } }, body: { innerHTML: '' } }; } };
    },
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
    history: { pushState: function () {}, replaceState: function () {} },
    location: { pathname: '/dashboard', origin: 'http://localhost', href: '/dashboard' },
    document: {
      readyState: 'complete',
      addEventListener: function () {},
      body: { classList: { contains: function () { return false; }, add: function () {}, remove: function () {} }, querySelectorAll: function () { return []; } },
      scripts: [],
      createElement: function () { return { setAttribute: function () {}, appendChild: function () {} }; },
      querySelector: function () { return null; },
    },
    AppViewMode: { isAllowed: function () { return true; }, isMagic: function () { return true; } },
    matchMedia: function () { return { matches: false }; },
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  loadModule(sandbox, 'public/js/parent-magic-page-boot.js');
  loadModule(sandbox, 'public/js/parent-magic-router.js');
  return sandbox;
}

module.exports = {
  runSharedFetchConcurrent,
  runSharedFetchSequentialRefresh,
  runFamilyInit,
  runFamilyInitFailure,
  runFamilyInit429ThenRetry,
  runFamilyPostMutationRefresh,
  loadParentMagicRouterSandbox,
  createApiTracker,
};
