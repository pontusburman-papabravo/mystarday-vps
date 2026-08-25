'use strict';

/**
 * Runtime test (not just source-string) for the legacy /child-login adult escape.
 * Loads public/js/child-login-adult-escape.js in a VM against a hand-rolled DOM
 * mirroring child-login.html (persistent escape as a sibling of the step sections)
 * and drives real click behaviour + the security contract.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function makeNode(id, classes) {
  const listeners = {};
  const classSet = new Set(classes || []);
  const node = {
    id: id || null,
    dataset: {},
    parentNode: null,
    children: [],
    classList: {
      add: (c) => classSet.add(c),
      remove: (c) => classSet.delete(c),
      contains: (c) => classSet.has(c),
    },
    setAttribute() {},
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatch(type, ev) { (listeners[type] || []).forEach((fn) => fn(ev || { preventDefault() {} })); },
    appendChild(child) { child.parentNode = node; node.children.push(child); return child; },
  };
  return node;
}

/**
 * DOM mirroring child-login.html: two step sections inside a layout, and the adult
 * escape button as a PERSISTENT sibling (in a footer) outside both steps.
 * @param {'profiles'|'pin'|'direct-pin'} activeStep
 */
function buildDom(activeStep) {
  const layout = makeNode('layout', ['child-login-layout']);
  const stepProfiles = makeNode(
    'clStepProfiles',
    activeStep === 'profiles' ? ['cl-step', 'active'] : ['cl-step']
  );
  const stepPin = makeNode(
    'clStepPin',
    activeStep === 'pin' || activeStep === 'direct-pin' ? ['cl-step', 'active'] : ['cl-step']
  );
  layout.appendChild(stepProfiles);
  layout.appendChild(stepPin);

  const footer = makeNode('adultEscapeFooter');
  const btn = makeNode('clAdultEscapeBtn');
  footer.appendChild(btn);

  return { byId: { clStepProfiles: stepProfiles, clStepPin: stepPin, clAdultEscapeBtn: btn }, btn };
}

/** Reachable unless an ancestor is a hidden step (.cl-step without .active). */
function isReachable(node) {
  let n = node;
  while (n) {
    if (n.classList && n.classList.contains('cl-step') && !n.classList.contains('active')) {
      return false;
    }
    n = n.parentNode;
  }
  return true;
}

function loadModule(dom, spies) {
  const sandbox = {
    console,
    encodeURIComponent,
    document: {
      readyState: 'complete',
      getElementById: (id) => dom.byId[id] || null,
      addEventListener() {},
    },
    location: spies.location,
  };
  sandbox.window = sandbox;
  sandbox.Auth = spies.Auth;
  sandbox.DeviceMode = spies.DeviceMode;
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(ROOT, 'public/js/child-login-adult-escape.js'), 'utf8');
  vm.runInContext(code, sandbox, { filename: 'child-login-adult-escape.js' });
  return sandbox;
}

function makeSpies(withAuth) {
  const calls = { redirect: [], setAuth: [], enterParent: 0 };
  const location = {};
  let _href = null;
  Object.defineProperty(location, 'href', {
    get() { return _href; },
    set(v) { _href = v; },
  });
  const spies = {
    calls,
    location,
    DeviceMode: { enterParent() { calls.enterParent += 1; } },
    Auth: withAuth
      ? {
        redirectToParentBackupLogin(next) { calls.redirect.push(next); },
        setAuth() { calls.setAuth.push(Array.from(arguments)); },
      }
      : undefined,
  };
  return spies;
}

describe('legacy /child-login adult escape — runtime', () => {
  for (const step of ['profiles', 'pin', 'direct-pin']) {
    it(`escape control is reachable on the ${step} step`, () => {
      const dom = buildDom(step);
      assert.equal(isReachable(dom.btn), true, `escape must be reachable on ${step}`);
    });
  }

  it('click invokes exactly one Auth.redirectToParentBackupLogin("/dashboard") and no parent authorization', () => {
    const dom = buildDom('pin');
    const spies = makeSpies(true);
    loadModule(dom, spies);
    dom.btn.dispatch('click', { preventDefault() {} });

    assert.deepEqual(spies.calls.redirect, ['/dashboard'], 'exactly one backup-login redirect to /dashboard');
    assert.equal(spies.calls.setAuth.length, 0, 'must NOT set Parent Auth');
    assert.equal(spies.calls.enterParent, 0, 'must NOT set parent DeviceMode as authorization');
    assert.equal(spies.location.href, null, 'must NOT navigate directly to the dashboard');
  });

  it('does not open the dashboard or set parent state even via the defensive fallback (no Auth)', () => {
    const dom = buildDom('direct-pin');
    const spies = makeSpies(false); // Auth unavailable → defensive fallback
    loadModule(dom, spies);
    dom.btn.dispatch('click', { preventDefault() {} });

    assert.equal(spies.calls.redirect.length, 0);
    assert.equal(spies.calls.setAuth.length, 0);
    assert.equal(spies.calls.enterParent, 0);
    // Fallback goes to the EXISTING adult login route, never straight to the dashboard.
    assert.equal(spies.location.href, '/login?parent=1&next=%2Fdashboard');
    assert.doesNotMatch(String(spies.location.href), /^\/dashboard/);
  });

  it('a second init does not double-wire the click (idempotent)', () => {
    const dom = buildDom('profiles');
    const spies = makeSpies(true);
    const sandbox = loadModule(dom, spies);
    sandbox.window.ChildLoginAdultEscape.init(); // re-init
    dom.btn.dispatch('click', { preventDefault() {} });
    assert.equal(spies.calls.redirect.length, 1, 'single handler despite double init');
  });

  it('markup: escape button is a persistent sibling outside both step sections', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/child-login.html'), 'utf8');
    const pinClose = html.indexOf('<!-- end step-pin -->');
    const btnIdx = html.indexOf('id="clAdultEscapeBtn"');
    assert.ok(pinClose !== -1, 'step-pin section present');
    assert.ok(btnIdx !== -1, 'adult escape button present');
    assert.ok(btnIdx > pinClose, 'escape button must live outside (after) both step sections');
    assert.match(html, /child-login-adult-escape\.js/);
    assert.match(html, /data-i18n="auth\.childLogin\.adultLogin"/);
  });

  it('module never hardcodes parent authorization or a direct dashboard navigation', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-login-adult-escape.js'), 'utf8');
    assert.match(src, /redirectToParentBackupLogin\('\/dashboard'\)/);
    assert.doesNotMatch(src, /setAuth/);
    assert.doesNotMatch(src, /enterParent/);
    assert.doesNotMatch(src, /location\.href\s*=\s*'\/dashboard'/);
  });
});
