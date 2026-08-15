'use strict';

/**
 * Runtime integration harness — loads actual client modules (not reimplemented models).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '../..');

const FAMILY_ELEMENT_IDS = [
  'userEmail', 'logoutBtn', 'inviteBtn', 'familyLoadingSkeleton', 'familyDataSections',
  'familyHubSummary', 'familyLoadError', 'familyChestSection', 'familyNameSection',
  'familyNameInput', 'todayLabel', 'drawerEditBirthdayYear', 'drawerEditBirthdayMonth',
  'drawerEditBirthdayDay', 'drawerEditBirthday', 'noChildrenState', 'childrenGrid',
  'noAdultsState', 'adultsGrid', 'pendingInvitesSection', 'pendingInvitesList', 'childDrawer',
];

const ROUTER_SCRIPT_MAP = {
  '/js/dom-utils.js': null,
  '/js/api-error-classification.js': 'public/js/api-error-classification.js',
  '/js/shared-family-fetch.js': 'public/js/shared-family-fetch.js',
  '/js/family-invite-scan.js': null,
  '/js/settings-account.js': null,
  '/js/family-museum.js': null,
  '/js/family-chest-setting.js': null,
  '/js/custody-settings.js': null,
  '/js/family-hub.js': null,
  '/js/family.js': 'public/js/family.js',
  '/js/coparent-invite-ui.js': null,
  '/js/planning-back-nav.js': null,
  '/js/planning-hub.js': null,
};

function createDomElement(id, opts) {
  opts = opts || {};
  const el = {
    id: id,
    tagName: (opts.tagName || 'div').toUpperCase(),
    value: opts.value || '',
    textContent: opts.textContent || '',
    innerHTML: opts.innerHTML || '',
    _attrs: Object.assign({}, opts.attrs || {}),
    _classes: new Set(opts.hidden ? ['hidden'] : []),
    _children: [],
    className: opts.className || '',
    classList: null,
    style: {},
    disabled: false,
    onclick: null,
    matches: function () { return false; },
    remove: function () {
      if (el.parentNode && el.parentNode._children) {
        const idx = el.parentNode._children.indexOf(el);
        if (idx >= 0) el.parentNode._children.splice(idx, 1);
      }
    },
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
    forEach: function (fn) { el._classes.forEach(fn); },
  };
  el.appendChild = function (node) {
    node.parentNode = el;
    el._children.push(node);
  };
  el.removeChild = function (node) {
    const idx = el._children.indexOf(node);
    if (idx >= 0) el._children.splice(idx, 1);
  };
  el.cloneNode = function () {
    const copy = createDomElement(el.id, {
      tagName: el.tagName.toLowerCase(),
      hidden: el.classList.contains('hidden'),
      className: el.className,
      value: el.value,
      textContent: el.textContent,
    });
    el._children.forEach(function (child) {
      if (child.id) copy.appendChild(createDomElement(child.id, { tagName: child.tagName.toLowerCase() }));
    });
    return copy;
  };
  Object.defineProperty(el, 'firstChild', {
    get: function () { return el._children[0] || null; },
  });
  Object.defineProperty(el, 'children', {
    get: function () { return el._children; },
  });
  el.setAttribute = function (k, v) { el._attrs[k] = String(v); };
  el.getAttribute = function (k) { return el._attrs[k] || null; };
  el.querySelector = function () { return null; };
  el.querySelectorAll = function () { return []; };
  el.addEventListener = function () {};
  el.closest = function () { return null; };
  return el;
}

function createFamilyElements() {
  const elements = {};
  FAMILY_ELEMENT_IDS.forEach(function (id) {
    elements[id] = createDomElement(id, {
      tagName: id.indexOf('Input') >= 0 ? 'input' : 'div',
      hidden: id === 'familyLoadError' || id === 'inviteBtn',
    });
  });
  elements.logoutBtn = createDomElement('logoutBtn', { tagName: 'button' });
  return elements;
}

function mountFamilyMain(main) {
  const elements = createFamilyElements();
  Object.keys(elements).forEach(function (id) {
    main.appendChild(elements[id]);
  });
  return elements;
}

function createFamilyDom() {
  const body = createDomElement('body', { tagName: 'body' });
  body.querySelectorAll = function () { return []; };
  const main = createDomElement('main', { tagName: 'main' });
  body.appendChild(main);
  const elements = mountFamilyMain(main);
  return { elements: elements, body: body, main: main };
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
    countSince: function (url, startIdx) {
      return log.slice(startIdx).filter(function (u) { return u === url; }).length;
    },
    resetLog: function () {
      log.length = 0;
    },
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

function installFamilyRuntimeMocks(sandbox, tracker) {
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
  sandbox.ParentMagicShell = { init: function () {}, isMagic: function () { return true; }, navigateToPage: function () {} };
  sandbox.ParentMagicPageHub = { refresh: function () {}, resetSettingsState: function () {} };
  sandbox.authGuard = async function () { return null; };
  sandbox.setTimeout = function (fn, ms) {
    return setTimeout(fn, ms > 1000 ? 0 : ms);
  };
  sandbox.__exposeFamilyRuntimeForTests = true;
}

function loadFamilyRuntime(sandbox, tracker, dom) {
  if (!dom) dom = createFamilyDom();
  sandbox.document = {
    body: dom.body,
    head: {
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      appendChild: function () {},
    },
    scripts: [],
    getElementById: function (id) { return dom.elements[id] || null; },
    createElement: function (tag) { return createDomElement('dyn-' + tag, { tagName: tag }); },
    querySelector: function (sel) {
      if (sel === 'main') return dom.main;
      return null;
    },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
  };
  installFamilyRuntimeMocks(sandbox, tracker);
  sandbox.ParentMagicPageBoot = { register: function () {} };
  loadModule(sandbox, 'public/js/api-error-classification.js');
  loadModule(sandbox, 'public/js/shared-family-fetch.js');
  loadModule(sandbox, 'public/js/family.js');
  return dom;
}

function scriptPath(src) {
  return String(src || '').split('?')[0];
}

function buildSoftNavHtml(pageId) {
  const body = createDomElement('body', { tagName: 'body' });
  body.classList.add('parent-magic-view');
  body.setAttribute('data-magic-page', pageId);
  const main = createDomElement('main', { tagName: 'main' });
  body.appendChild(main);
  if (pageId === 'family') mountFamilyMain(main);
  if (pageId === 'planning') {
    const mount = createDomElement('planningHubMount', { tagName: 'div' });
    main.appendChild(mount);
  }
  return {
    head: { querySelectorAll: function () { return []; } },
    body: body,
    querySelector: function (sel) { return sel === 'main' ? main : null; },
    querySelectorAll: function () { return []; },
    title: pageId,
  };
}

function createRouterSoftNavHarness(initialPayload) {
  const tracker = createApiTracker(initialPayload);
  const dom = createFamilyDom();
  const loadedScripts = new Set();
  const eventListeners = { 'stjarndag-magic-navigated': [] };

  const sandbox = {
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    URL: URL,
    CustomEvent: function (type, init) {
      this.type = type;
      this.detail = init && init.detail;
    },
    history: { pushState: function () {}, replaceState: function () {} },
    location: { pathname: '/dashboard', origin: 'http://localhost', href: '/dashboard' },
    matchMedia: function () { return { matches: false }; },
    AppViewMode: { isAllowed: function () { return true; }, isMagic: function () { return true; } },
    ParentMagicAuto: { prepareDom: function () {}, ensureTopChrome: function () {} },
    NativeTabBar: { updateActiveTabs: function () {} },
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);

  let locationHref = '/dashboard';
  sandbox.location = {
    pathname: '/dashboard',
    origin: 'http://localhost',
    replace: function () {},
  };
  Object.defineProperty(sandbox.location, 'href', {
    get: function () { return locationHref; },
    set: function (v) { locationHref = v; },
  });

  sandbox.addEventListener = function (type, fn) {
    if (!eventListeners[type]) eventListeners[type] = [];
    eventListeners[type].push(fn);
  };
  sandbox.dispatchEvent = function (evt) {
    (eventListeners[evt.type] || []).slice().forEach(function (fn) { fn(evt); });
    return true;
  };

  installFamilyRuntimeMocks(sandbox, tracker);

  const dashboardMain = createDomElement('main', { tagName: 'main', className: 'dashboard-main' });
  dom.body.appendChild(dashboardMain);
  dom.main = dashboardMain;

  sandbox.document = {
    readyState: 'complete',
    body: dom.body,
    head: {
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      appendChild: function () {},
    },
    scripts: [],
    getElementById: function (id) { return dom.elements[id] || null; },
    createElement: function (tag) {
      const el = createDomElement('dyn-' + tag, { tagName: tag });
      if (tag === 'script') {
        el.setAttribute = function (k, v) { el._attrs[k] = String(v); };
        el.onload = null;
        el.onerror = null;
      }
      if (tag === 'link') {
        el.setAttribute = function (k, v) { el._attrs[k] = String(v); };
      }
      return el;
    },
    querySelector: function (sel) {
      if (sel === 'main') return dom.main;
      return null;
    },
    querySelectorAll: function (sel) {
      if (sel === 'body > nav') return [];
      return [];
    },
    addEventListener: function () {},
  };

  sandbox.fetch = async function (href) {
    const url = new URL(href, sandbox.location.origin);
    const pagePath = url.pathname.replace(/\/$/, '') || '/';
    const pageId = pagePath === '/family' ? 'family' : (pagePath === '/planning' ? 'planning' : null);
    if (!pageId) throw new Error('unexpected fetch href: ' + href);
    return {
      ok: true,
      url: sandbox.location.origin + pagePath,
      text: async function () { return '<html><body><main></main></body></html>'; },
      _doc: buildSoftNavHtml(pageId),
    };
  };

  sandbox.DOMParser = function () {
    return {
      parseFromString: function () {
        return sandbox.__lastFetchDoc || buildSoftNavHtml('family');
      },
    };
  };

  loadModule(sandbox, 'public/js/parent-magic-page-boot.js');

  const realEnsureScripts = sandbox.ParentMagicPageBoot.ensureScripts;
  sandbox.ParentMagicPageBoot.ensureScripts = function (list) {
    let chain = Promise.resolve();
    (list || []).forEach(function (src) {
      chain = chain.then(function () {
        const pathKey = scriptPath(src);
        if (loadedScripts.has(pathKey)) return Promise.resolve();
        const rel = ROUTER_SCRIPT_MAP[pathKey];
        if (rel) loadModule(sandbox, rel);
        loadedScripts.add(pathKey);
        sandbox.document.scripts.push({ src: src });
        return Promise.resolve();
      });
    });
    return chain.then(function () { return realEnsureScripts.call(sandbox.ParentMagicPageBoot, []); });
  };

  loadModule(sandbox, 'public/js/parent-magic-router.js');

  const originalFetch = sandbox.fetch;
  sandbox.fetch = async function (href) {
    const res = await originalFetch(href);
    sandbox.__lastFetchDoc = res._doc;
    return res;
  };

  async function navigateTo(path) {
    const startIdx = tracker.log.length;
    const ok = await sandbox.ParentMagicRouter.navigateTo(path);
    return {
      ok: ok,
      startIdx: startIdx,
      familyCalls: tracker.countSince('/api/family', startIdx),
      hooks: sandbox.__FamilyRuntimeTestHooks,
      banner: dom.elements.familyLoadError,
      sandbox: sandbox,
      tracker: tracker,
      dom: dom,
    };
  }

  return { navigateTo: navigateTo, tracker: tracker, sandbox: sandbox, dom: dom };
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
  const hooks = sandbox.__FamilyRuntimeTestHooks;
  await hooks.init();
  tracker.setPayload({ id: 'fam-1', name: 'After mutation', children: [] });
  await hooks.init();
  return { hooks: hooks, tracker: tracker };
}

async function runRouterFirstFamilySoftNav(payload) {
  const harness = createRouterSoftNavHarness(payload || { id: 'fam-1', name: 'Loaded', children: [] });
  const result = await harness.navigateTo('/family');
  return result;
}

async function runRouterRevisitFamily() {
  const harness = createRouterSoftNavHarness({ id: 'fam-1', name: 'First visit', children: [] });
  await harness.navigateTo('/family');
  harness.tracker.setPayload({ id: 'fam-1', name: 'Fresh revisit', children: [] });
  sandboxLocation(harness.sandbox, '/planning');
  await harness.navigateTo('/planning');
  const result = await harness.navigateTo('/family');
  return result;
}

function sandboxLocation(sandbox, path) {
  sandbox.location.pathname = path;
  sandbox.location.href = path;
}

async function runRouterFamilySoftNav429ThenRetry() {
  const err429 = Object.assign(new Error('För många förfrågningar'), {
    status: 429,
    body: { retry_after: 1 },
  });
  const harness = createRouterSoftNavHarness({ error: err429 });
  sandboxLocation(harness.sandbox, '/dashboard');
  const fail = await harness.navigateTo('/family');
  harness.tracker.setPayload({ id: 'fam-1', name: 'After retry', children: [] });
  const retryStart = harness.tracker.log.length;
  await fail.hooks.init();
  return {
    fail: fail,
    retryCalls: harness.tracker.countSince('/api/family', retryStart),
    state: fail.hooks.getState(),
  };
}

async function runRouterPostMutationRefresh() {
  const harness = createRouterSoftNavHarness({ id: 'fam-1', name: 'Before', children: [] });
  const load = await harness.navigateTo('/family');
  harness.tracker.setPayload({ id: 'fam-1', name: 'After mutation', children: [] });
  const refreshStart = harness.tracker.log.length;
  await load.hooks.init();
  return {
    hooks: load.hooks,
    refreshCalls: harness.tracker.countSince('/api/family', refreshStart),
    state: load.hooks.getState(),
  };
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
  runRouterFirstFamilySoftNav,
  runRouterRevisitFamily,
  runRouterFamilySoftNav429ThenRetry,
  runRouterPostMutationRefresh,
  loadParentMagicRouterSandbox,
  createApiTracker,
  createRouterSoftNavHarness,
};
