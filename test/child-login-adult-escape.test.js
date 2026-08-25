'use strict';

/**
 * Runtime + layout-contract test for the legacy /child-login adult escape.
 *
 * Two things this guards:
 *  1. Viewport reachability. The page body (.child-login-magic-bg) is
 *     overflow:hidden and .child-login-layout is min-height:100vh, so any in-flow
 *     footer falls below the fold and cannot be scrolled to. The escape must be
 *     position:fixed + safe-area so it is ALWAYS within the viewport. We assert the
 *     real HTML/CSS structure that provides this, not merely "not inside a hidden
 *     step".
 *  2. Click behaviour + security: exactly one Auth.redirectToParentBackupLogin(
 *     '/dashboard'), single-flight on double-tap, no Parent Auth, no parent
 *     DeviceMode, never a direct dashboard navigation.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function cssBlock(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open, close === -1 ? undefined : close);
}

function makeNode(id) {
  const listeners = {};
  const node = {
    id: id || null,
    dataset: {},
    disabled: false,
    setAttribute() {},
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatch(type, ev) { (listeners[type] || []).forEach((fn) => fn(ev || { preventDefault() {} })); },
  };
  return node;
}

function loadModule(btn, spies) {
  const sandbox = {
    console,
    encodeURIComponent,
    document: {
      readyState: 'complete',
      getElementById: (id) => (id === 'clAdultEscapeBtn' ? btn : null),
      addEventListener() {},
    },
    location: spies.location,
  };
  sandbox.window = sandbox;
  sandbox.Auth = spies.Auth;
  sandbox.DeviceMode = spies.DeviceMode;
  vm.createContext(sandbox);
  vm.runInContext(read('public/js/child-login-adult-escape.js'), sandbox, {
    filename: 'child-login-adult-escape.js',
  });
  return sandbox;
}

function makeSpies(opts) {
  opts = opts || {};
  const calls = { redirect: [], setAuth: [], enterParent: 0 };
  const location = {};
  let _href = null;
  Object.defineProperty(location, 'href', { get() { return _href; }, set(v) { _href = v; } });
  return {
    calls,
    location,
    DeviceMode: { enterParent() { calls.enterParent += 1; } },
    Auth: opts.withAuth === false ? undefined : {
      redirectToParentBackupLogin(next) {
        calls.redirect.push(next);
        return opts.reject ? Promise.reject(new Error('backup-login failed')) : undefined;
      },
      setAuth() { calls.setAuth.push(Array.from(arguments)); },
    },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('legacy /child-login adult escape — viewport reachability contract', () => {
  it('the page really has the 100vh + overflow:hidden trap that hides an in-flow footer', () => {
    const css = read('public/css/child-login-magic.css');
    const bg = cssBlock(css, '.child-login-magic-bg');
    const layout = cssBlock(css, '.child-login-layout');
    assert.match(bg, /overflow:\s*hidden/, 'body must be overflow:hidden (documents the trap)');
    assert.match(bg, /min-height:\s*100vh/);
    assert.match(layout, /min-height:\s*100vh/, 'layout fills the viewport, pushing footers below the fold');
  });

  it('escape control is position:fixed + safe-area, so it stays inside the viewport regardless of layout height', () => {
    const html = read('public/child-login.html');
    const start = html.indexOf('cl-adult-escape');
    const block = html.slice(start, html.indexOf('</div>', html.indexOf('id="clAdultEscapeBtn"')) + 6);
    assert.match(block, /position:\s*fixed/, 'must be viewport-fixed, not in normal flow');
    assert.match(block, /env\(safe-area-inset-top/, 'safe-area top inset (notch)');
    assert.match(block, /env\(safe-area-inset-right/, 'safe-area right inset');
    assert.match(block, /min-height:\s*44px/, '44pt touch target');
    assert.match(block, /data-i18n="auth\.childLogin\.adultLoginShort"/);
    assert.match(block, /data-i18n-aria-label="auth\.childLogin\.adultLogin"/);
    // Fixed placement means it does NOT depend on body scroll (which is disabled).
    assert.doesNotMatch(block, /position:\s*relative/);
  });

  it('module + html are loaded on the child-login page', () => {
    assert.match(read('public/child-login.html'), /child-login-adult-escape\.js/);
  });
});

describe('legacy /child-login adult escape — click + single-flight', () => {
  it('click invokes exactly one Auth.redirectToParentBackupLogin("/dashboard") and no parent authorization', () => {
    const btn = makeNode('clAdultEscapeBtn');
    const spies = makeSpies();
    loadModule(btn, spies);
    btn.dispatch('click');
    assert.deepEqual(spies.calls.redirect, ['/dashboard']);
    assert.equal(spies.calls.setAuth.length, 0, 'no Parent Auth');
    assert.equal(spies.calls.enterParent, 0, 'no parent DeviceMode');
    assert.equal(spies.location.href, null, 'no direct dashboard navigation');
    assert.equal(btn.disabled, true, 'button disabled while in flight');
  });

  it('single-flight: a fast double-tap still triggers exactly one redirect', () => {
    const btn = makeNode('clAdultEscapeBtn');
    const spies = makeSpies();
    loadModule(btn, spies);
    btn.dispatch('click');
    btn.dispatch('click'); // immediate second tap, still in flight
    assert.equal(spies.calls.redirect.length, 1, 'exactly one redirect on double-tap');
  });

  it('guard releases after an actual failure so the adult can retry', async () => {
    const btn = makeNode('clAdultEscapeBtn');
    const spies = makeSpies({ reject: true });
    loadModule(btn, spies);
    btn.dispatch('click'); // 1st: fails (rejected promise) → guard releases
    await flush();
    assert.equal(btn.disabled, false, 're-enabled after failure');
    btn.dispatch('click'); // retry allowed
    assert.equal(spies.calls.redirect.length, 2, 'retry after failure invokes redirect again');
  });

  it('defensive fallback (no Auth) routes to the existing adult login, never the dashboard', () => {
    const btn = makeNode('clAdultEscapeBtn');
    const spies = makeSpies({ withAuth: false });
    loadModule(btn, spies);
    btn.dispatch('click');
    assert.equal(spies.calls.redirect.length, 0);
    assert.equal(spies.calls.setAuth.length, 0);
    assert.equal(spies.calls.enterParent, 0);
    assert.equal(spies.location.href, '/login?parent=1&next=%2Fdashboard');
    assert.doesNotMatch(String(spies.location.href), /^\/dashboard/);
  });

  it('module never hardcodes parent authorization or a direct dashboard navigation', () => {
    const src = read('public/js/child-login-adult-escape.js');
    assert.match(src, /redirectToParentBackupLogin\(ADULT_LOGIN_NEXT\)/);
    assert.match(src, /inFlight/, 'single-flight guard present');
    assert.doesNotMatch(src, /setAuth/);
    assert.doesNotMatch(src, /enterParent/);
    assert.doesNotMatch(src, /location\.href\s*=\s*'\/dashboard'/);
  });
});
