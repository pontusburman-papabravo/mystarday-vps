'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'public/js/app-consent.js'), 'utf8');

function makeAuth(loggedIn) {
  return {
    isLoggedIn: () => loggedIn,
    getUser: () => ({ type: 'parent' }),
    api: async () => ({ consent: null }),
  };
}

function runInSandbox({ isNative }) {
  const scripts = [];
  const localStorageStore = {};
  // `window` must be the context's own global object (as in a real browser),
  // so that `window.fbq = ...` inside app-consent.js also defines the bare
  // global `fbq` that the script itself later calls by its short name.
  const sandbox = {
    dataLayer: [],
    localStorage: {
      getItem: (k) => (k in localStorageStore ? localStorageStore[k] : null),
      setItem: (k, v) => { localStorageStore[k] = String(v); },
      removeItem: (k) => { delete localStorageStore[k]; },
    },
    location: { hostname: 'app.example.com' },
    Capacitor: {
      isNativePlatform: () => isNative,
      Plugins: {},
    },
    document: {
      readyState: 'complete',
      createElement: () => ({ setAttribute() {}, style: {} }),
      getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }],
      addEventListener: () => {},
      head: { appendChild: (el) => scripts.push(el) },
      body: { appendChild() {} },
      querySelector: () => null,
      getElementById: () => null,
    },
    console,
    setTimeout,
    Auth: makeAuth(false),
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(SRC, sandbox, { context: sandbox });
  return sandbox;
}

test('native Capacitor: fbq is a permanently inert no-op, never loads fbevents.js', () => {
  const sandbox = runInSandbox({ isNative: true });
  assert.equal(typeof sandbox.fbq, 'function');
  // Calling fbq must never throw on native, and it must not enqueue/track anything real.
  assert.doesNotThrow(() => sandbox.fbq('init', 'anything'));
  assert.doesNotThrow(() => sandbox.fbq('track', 'PageView'));
  assert.equal(sandbox.fbq.loaded, undefined, 'native fbq must not be the real Pixel stub');
});

test('web (non-native): fbq stub loads fbevents.js from connect.facebook.net', () => {
  const sandbox = runInSandbox({ isNative: false });
  assert.equal(typeof sandbox.fbq, 'function');
  assert.equal(sandbox.fbq.loaded, true, 'web fbq must be the real Meta Pixel queue stub');
  assert.equal(sandbox._fbq, sandbox.fbq);
});

test('source never references connect.facebook.net outside the non-native branch', () => {
  const nativeBranch = SRC.slice(SRC.indexOf('if (isNativeApp())'), SRC.indexOf('// ─── Internal state'));
  assert.doesNotMatch(nativeBranch.slice(0, nativeBranch.indexOf('} else if')), /connect\.facebook\.net/);
  assert.match(SRC, /connect\.facebook\.net\/en_US\/fbevents\.js/, 'web Pixel loader must still exist for browser visitors');
});
