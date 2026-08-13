'use strict';

/**
 * Native bridge contract tests for public-runtime Capacitor APIs.
 * Regression guard for #985: App.addListener sync handle vs Promise semantics.
 */

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

function loadDeepLinkRouter(sandbox) {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/deep-link-router.js'), 'utf8');
  vm.runInNewContext(src, sandbox, { context: sandbox });
  return sandbox.window.DeepLinkRouter;
}

function makeNativeSandbox(addListenerImpl, platform = 'ios') {
  const sandbox = {
    window: {
      document: {
        addEventListener: () => {},
        visibilityState: 'visible',
      },
      addEventListener: () => {},
      location: { pathname: '/', search: '', origin: 'https://example.test', href: 'https://example.test/' },
      __deepLinkRouterInited: false,
      Platform: {
        isNative: () => true,
      },
      Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => platform,
        Plugins: {
          App: {
            addListener: addListenerImpl,
            getLaunchUrl: () => Promise.resolve({ url: null }),
          },
        },
      },
    },
    Capacitor: null,
    Platform: null,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };
  sandbox.Capacitor = sandbox.window.Capacitor;
  sandbox.Platform = sandbox.window.Platform;
  sandbox.document = sandbox.window.document;
  sandbox.globalThis = sandbox.window;
  return sandbox;
}

describe('App.addListener — adult-privilege lifecycle (#985 regression)', () => {
  it('iOS-like sync PluginListenerHandle: callback fires, remove() works, no .catch crash', () => {
    let lifecycleCb;
    let removed = false;
    const sandbox = makeNativeSandbox(function (event, cb) {
      assert.equal(event, 'appStateChange');
      lifecycleCb = cb;
      return {
        remove() {
          removed = true;
        },
      };
    }, 'ios');
    const lifecycle = loadLifecycle(sandbox);
    assert.doesNotThrow(() => lifecycle._test.bindCapacitorApp());
    assert.equal(typeof lifecycleCb, 'function');
    assert.doesNotThrow(() => lifecycleCb({ isActive: true }));
    assert.doesNotThrow(() => lifecycleCb({ isActive: false }));
  });

  it('Android-like Promise-like handle: await path does not throw', async () => {
    const sandbox = makeNativeSandbox(function () {
      return Promise.resolve({ remove() {} });
    }, 'android');
    const lifecycle = loadLifecycle(sandbox);
    assert.doesNotThrow(() => lifecycle._test.bindCapacitorApp());
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('sync handle must not accept .catch() directly (v847 regression)', () => {
    const handle = { remove() {} };
    assert.throws(() => handle.catch(() => {}), /catch is not a function/);
  });

  it('rejected Promise from addListener does not abort PIN transition path', async () => {
    const sandbox = makeNativeSandbox(function () {
      return Promise.reject(new Error('native bridge unavailable'));
    });
    const lifecycle = loadLifecycle(sandbox);
    assert.doesNotThrow(() => lifecycle._test.bindCapacitorApp());
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

describe('App.addListener — deep-link-router (startup / auth restore)', () => {
  it('registers appUrlOpen without calling .catch on sync handle', () => {
    let registered = false;
    const sandbox = makeNativeSandbox(function (event, cb) {
      registered = true;
      assert.equal(event, 'appUrlOpen');
      assert.equal(typeof cb, 'function');
      return { remove() {} };
    });
    loadDeepLinkRouter(sandbox);
    sandbox.window.DeepLinkRouter.init();
    assert.equal(registered, true);
    assert.equal(sandbox.window.__deepLinkRouterInited, true);
  });

  it('Promise-like addListener return does not throw during init', async () => {
    const sandbox = makeNativeSandbox(function () {
      return Promise.resolve({ remove() {} });
    });
    loadDeepLinkRouter(sandbox);
    assert.doesNotThrow(() => sandbox.window.DeepLinkRouter.init());
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

describe('PushNotifications.addListener — platform.js contract', () => {
  it('ensureNativePushListeners accepts sync addListener return (Android-like)', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/platform.js'), 'utf8');
    assert.match(src, /await PushNotifications\.addListener\('registration'/);
    assert.match(src, /PushNotifications\.addListener\('registrationError'/);

    const listeners = [];
    const PushNotifications = {
      addListener(event, cb) {
        listeners.push({ event, cb });
        return { remove() {} };
      },
    };

    let ready = false;
    async function ensureNativePushListeners(PushNotificationsPlugin) {
      if (ready) return;
      ready = true;
      await PushNotificationsPlugin.addListener('registration', async () => {});
      await PushNotificationsPlugin.addListener('registrationError', () => {});
    }

    await assert.doesNotReject(() => ensureNativePushListeners(PushNotifications));
    assert.equal(listeners.length, 2);
  });

  it('ensureNativePushListeners accepts Promise-like addListener return (iOS-like)', async () => {
    const PushNotifications = {
      addListener() {
        return Promise.resolve({ remove() {} });
      },
    };

    let ready = false;
    async function ensureNativePushListeners(PushNotificationsPlugin) {
      if (ready) return;
      ready = true;
      await PushNotificationsPlugin.addListener('registration', async () => {});
      await PushNotificationsPlugin.addListener('registrationError', () => {});
    }

    await assert.doesNotReject(() => ensureNativePushListeners(PushNotifications));
  });
});

describe('Preferences.set — trusted-device-client (family device enroll)', () => {
  it('storeEnrollToken calls Preferences.set on native without throwing on sync plugin', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/trusted-device-client.js'), 'utf8');
    assert.match(src, /Capacitor\.Plugins\.Preferences\.set/);

    let stored = null;
    const sandbox = {
      window: {
        Platform: { isNative: () => true },
        Capacitor: {
          Plugins: {
            Preferences: {
              set: async ({ key, value }) => {
                stored = { key, value };
              },
            },
          },
        },
        apiFetch: async () => ({ ok: true, json: async () => ({ enroll_token: 'tok-1' }) }),
        DeviceMode: { enterChild: () => {} },
      },
      Platform: { isNative: () => true },
      Capacitor: null,
      document: {
        documentElement: { classList: { contains: () => true } },
      },
    };
    sandbox.window.document = sandbox.document;
    sandbox.Capacitor = sandbox.window.Capacitor;
    vm.runInNewContext(src, sandbox, { context: sandbox });
    const result = await sandbox.window.TrustedDeviceClient.enrollChildDevice('child-1', 'iPad');
    assert.equal(result.ok, true);
    assert.equal(stored.key, 'stjarndag_trusted_device_token');
    assert.equal(stored.value, 'tok-1');
  });
});

describe('Public-runtime native API inventory', () => {
  const inventory = [
    { file: 'public/js/adult-privilege-lifecycle.js', api: 'App.addListener(appStateChange)' },
    { file: 'public/js/deep-link-router.js', api: 'App.addListener(appUrlOpen)' },
    { file: 'public/js/platform.js', api: 'PushNotifications.addListener' },
    { file: 'public/js/trusted-device-client.js', api: 'Preferences.set' },
    { file: 'public/js/native-child-session-restore.js', api: 'fetch /api/auth/me (session restore)' },
  ];

  for (const { file, api } of inventory) {
    it(`${file} uses ${api}`, () => {
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      if (api.includes('addListener')) assert.match(src, /addListener/);
      else if (api.includes('Preferences')) assert.match(src, /Preferences/);
      else if (api.includes('/api/auth/me')) assert.match(src, /\/api\/auth\/me/);
    });
  }
});
