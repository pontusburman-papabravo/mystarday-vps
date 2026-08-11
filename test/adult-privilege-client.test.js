'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadAdultPrivilege(sandbox) {
  const bio = fs.readFileSync(path.join(ROOT, 'public/js/adult-biometric-client.js'), 'utf8');
  const priv = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege.js'), 'utf8');
  sandbox.window.Capacitor = sandbox.window.Capacitor || sandbox.Capacitor;
  sandbox.window.fetch = sandbox.fetch;
  vm.runInNewContext(bio, sandbox, { context: sandbox });
  vm.runInNewContext(priv, sandbox, { context: sandbox });
  return sandbox.window.AdultPrivilege;
}

describe('adult-privilege client state machine', () => {
  it('biometric unavailable falls back to PIN gate without unlock until PIN entered', async () => {
    let unlockCalls = 0;
    const sandbox = {
      window: {
        analytics: { track: () => {} },
        Auth: { getCsrfToken: () => 'csrf' },
        AdultPinGateUI: {
          collectAdultPin: () => Promise.resolve({ ok: false, code: 'PIN_CANCEL' }),
        },
        sessionStorage: {
          _m: {},
          getItem(k) {
            return this._m[k] || null;
          },
          setItem(k, v) {
            this._m[k] = v;
          },
          removeItem(k) {
            delete this._m[k];
          },
        },
        Capacitor: { isNativePlatform: () => false, Plugins: {} },
      },
      Capacitor: { isNativePlatform: () => false, Plugins: {} },
      fetch: (url) => {
        if (String(url).includes('/status')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () =>
              Promise.resolve(
                JSON.stringify({
                  ok: true,
                  state: 'locked',
                  privilegeActive: false,
                  handoffAvailable: true,
                })
              ),
          });
        }
        if (String(url).includes('/unlock')) {
          unlockCalls += 1;
        }
        return Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('{}') });
      },
    };
    sandbox.globalThis = sandbox.window;
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    await AdultPrivilege.refreshStatus();
    const result = await AdultPrivilege.requestEscalation();
    assert.equal(result.ok, false);
    assert.equal(result.code, 'PIN_CANCEL');
    assert.equal(unlockCalls, 0);
    assert.equal(AdultPrivilege.getState(), 'locked');
  });

  it('biometric cancel does not call unlock API', async () => {
    let unlockCalls = 0;
    const sandbox = {
      window: {
        analytics: { track: () => {} },
        Auth: { getCsrfToken: () => 'csrf' },
        sessionStorage: {
          _m: { stjarndag_adult_privilege_v1: '1' },
          getItem(k) {
            return this._m[k] || null;
          },
          setItem(k, v) {
            this._m[k] = v;
          },
        },
        Capacitor: {
          isNativePlatform: () => true,
          Plugins: {
            AdultBiometric: {
              isAvailable: () => Promise.resolve({ available: true }),
              authenticate: () => Promise.reject(new Error('BIOMETRIC_CANCEL')),
            },
          },
        },
      },
      fetch: (url) => {
        if (String(url).includes('/status')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () =>
              Promise.resolve(JSON.stringify({ ok: true, state: 'locked', privilegeActive: false })),
          });
        }
        if (String(url).includes('/unlock')) unlockCalls += 1;
        return Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('{}') });
      },
    };
    sandbox.globalThis = sandbox.window;
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    await AdultPrivilege.refreshStatus();
    const result = await AdultPrivilege.requestEscalation();
    assert.equal(result.ok, false);
    assert.equal(result.code, 'BIOMETRIC_CANCEL');
    assert.equal(unlockCalls, 0);
  });

  it('single escalation in flight', async () => {
    let inflight = 0;
    const sandbox = {
      window: {
        analytics: { track: () => {} },
        Auth: { getCsrfToken: () => 'csrf' },
        sessionStorage: {
          _m: { stjarndag_adult_privilege_v1: '1' },
          getItem(k) {
            return this._m[k] || null;
          },
          setItem(k, v) {
            this._m[k] = v;
          },
        },
        Capacitor: {
          isNativePlatform: () => true,
          Plugins: {
            AdultBiometric: {
              isAvailable: () => Promise.resolve({ available: true }),
              authenticate: () => Promise.resolve({ ok: true }),
            },
          },
        },
        DeviceMode: { enterParent: () => {} },
      },
      fetch: (url) => {
          if (String(url).includes('/status')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              text: () =>
                Promise.resolve(JSON.stringify({ ok: true, state: 'locked', privilegeActive: false })),
            });
          }
          if (String(url).includes('/unlock')) {
            inflight += 1;
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve({
                  ok: true,
                  status: 200,
                  text: () =>
                    Promise.resolve(
                      JSON.stringify({ ok: true, parent: { id: 'p1' }, csrfToken: 'c' })
                    ),
                });
              }, 50);
            });
          }
          if (String(url).includes('/me')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              text: () => Promise.resolve(JSON.stringify({ type: 'parent' })),
            });
          }
          return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('{}') });
      },
    };
    sandbox.globalThis = sandbox.window;
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    await AdultPrivilege.refreshStatus();
    const p1 = AdultPrivilege.requestEscalation();
    const p2 = AdultPrivilege.requestEscalation();
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.ok(r1.ok || r2.code === 'ADULT_PRIVILEGE_IN_FLIGHT');
    assert.ok(inflight <= 1);
  });

  it('resetToLocked clears active UI state', () => {
    const sandbox = {
      window: {
        analytics: { track: () => {} },
        sessionStorage: { _m: {}, getItem: () => null, setItem: () => {}, removeItem: () => {} },
        Capacitor: { isNativePlatform: () => false, Plugins: {} },
      },
    };
    sandbox.globalThis = sandbox.window;
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    AdultPrivilege.resetToLocked();
    assert.equal(AdultPrivilege.getState(), 'locked');
  });
});
