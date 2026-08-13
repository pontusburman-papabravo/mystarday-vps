'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadLifecycle(sandbox) {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege-lifecycle.js'), 'utf8');
  vm.runInNewContext(src, sandbox, { context: sandbox });
  return sandbox.window.AdultPrivilegeLifecycle;
}

function makeNativeSandbox(addListenerImpl) {
  const sandbox = {
    window: {
      document: {
        addEventListener: () => {},
        visibilityState: 'visible',
      },
      addEventListener: () => {},
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          App: {
            addListener: addListenerImpl,
          },
        },
      },
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };
  sandbox.Capacitor = sandbox.window.Capacitor;
  sandbox.document = sandbox.window.document;
  sandbox.globalThis = sandbox.window;
  return sandbox;
}

describe('adult-privilege lifecycle Capacitor listener compatibility', () => {
  it('bindCapacitorApp accepts synchronous PluginListenerHandle without throwing', () => {
    let registered = false;
    const sandbox = makeNativeSandbox(function (event, cb) {
      registered = true;
      assert.equal(event, 'appStateChange');
      return { remove() {} };
    });
    const lifecycle = loadLifecycle(sandbox);
    assert.doesNotThrow(() => lifecycle._test.bindCapacitorApp());
    assert.equal(registered, true);
  });

  it('bindCapacitorApp handles Promise-like addListener return', async () => {
    let registered = false;
    const sandbox = makeNativeSandbox(function (event, cb) {
      registered = true;
      return Promise.resolve({ remove() {} });
    });
    const lifecycle = loadLifecycle(sandbox);
    lifecycle._test.bindCapacitorApp();
    assert.equal(registered, true);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('bindCapacitorApp survives rejected Promise from addListener', async () => {
    const sandbox = makeNativeSandbox(function () {
      return Promise.reject(new Error('native bridge unavailable'));
    });
    const lifecycle = loadLifecycle(sandbox);
    assert.doesNotThrow(() => lifecycle._test.bindCapacitorApp());
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('bindCapacitorApp survives synchronous throw from addListener', () => {
    const sandbox = makeNativeSandbox(function () {
      throw new Error('addListener unavailable');
    });
    const lifecycle = loadLifecycle(sandbox);
    assert.doesNotThrow(() => lifecycle._test.bindCapacitorApp());
  });

  it('v847 pattern App.addListener(...).catch throws on synchronous handle', () => {
    const handle = { remove() {} };
    assert.throws(() => handle.catch(() => {}), /catch is not a function/);
  });
});
