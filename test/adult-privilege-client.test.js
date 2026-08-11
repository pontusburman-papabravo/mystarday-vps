'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadAdultPrivilege(sandbox) {
  const priv = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege.js'), 'utf8');
  vm.runInNewContext(priv, sandbox, { context: sandbox });
  return sandbox.window.AdultPrivilege;
}

describe('adult-privilege client state machine', () => {
  it('PIN cancel does not call unlock API', async () => {
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
      },
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
                  pinRequiredForUnlock: true,
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

  it('no family PIN configured rejects before unlock API', async () => {
    let unlockCalls = 0;
    const sandbox = {
      window: {
        analytics: { track: () => {} },
        Auth: { getCsrfToken: () => 'csrf' },
        AdultPinGateUI: {
          collectAdultPin: () => Promise.resolve({ ok: true, pin: '4321' }),
        },
        sessionStorage: {
          _m: { stjarndag_adult_privilege_v1: '1' },
          getItem(k) {
            return this._m[k] || null;
          },
          setItem(k, v) {
            this._m[k] = v;
          },
        },
      },
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
                  pinRequiredForUnlock: false,
                })
              ),
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
    assert.equal(result.code, 'ADULT_PIN_SETUP_REQUIRED');
    assert.equal(unlockCalls, 0);
  });

  it('single escalation in flight', async () => {
    let inflight = 0;
    const sandbox = {
      window: {
        analytics: { track: () => {} },
        Auth: { getCsrfToken: () => 'csrf' },
        AdultPinGateUI: {
          collectAdultPin: () => Promise.resolve({ ok: true, pin: '4321' }),
        },
        sessionStorage: {
          _m: { stjarndag_adult_privilege_v1: '1' },
          getItem(k) {
            return this._m[k] || null;
          },
          setItem(k, v) {
            this._m[k] = v;
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
              Promise.resolve(
                JSON.stringify({
                  ok: true,
                  state: 'locked',
                  privilegeActive: false,
                  handoffAvailable: true,
                  pinRequiredForUnlock: true,
                })
              ),
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

  it('trusted profile picker unlock does not require adult-privilege status auth', async () => {
    let statusCalls = 0;
    let selectCalls = 0;
    const sandbox = {
      window: {
        analytics: { track: () => {} },
        Auth: {
          getCsrfToken: () => 'csrf',
          setCsrfToken: () => {},
        },
        AdultPinGateUI: {
          collectAdultPin: () => Promise.resolve({ ok: true, pin: '4321' }),
        },
        DeviceMode: { enterParent: () => {} },
        sessionStorage: {
          _m: { stjarndag_entry_pin_required_for_parents: '1' },
          getItem(k) {
            return this._m[k] || null;
          },
          setItem(k, v) {
            this._m[k] = v;
          },
        },
      },
      fetch: (url) => {
        if (String(url).includes('/adult-privilege/status')) {
          statusCalls += 1;
          return Promise.resolve({
            ok: false,
            status: 401,
            text: () => Promise.resolve(JSON.stringify({ ok: false })),
          });
        }
        if (String(url).includes('/trusted-device/select-parent')) {
          selectCalls += 1;
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () =>
              Promise.resolve(
                JSON.stringify({
                  ok: true,
                  user: { id: 'p1', type: 'parent' },
                  redirect: '/home',
                  csrfToken: 'c',
                })
              ),
          });
        }
        if (String(url).includes('/auth/me')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(JSON.stringify({ type: 'parent' })),
          });
        }
        return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('{}') });
      },
    };
    sandbox.sessionStorage = sandbox.window.sessionStorage;
    sandbox.DeviceMode = sandbox.window.DeviceMode;
    sandbox.globalThis = sandbox.window;
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    const result = await AdultPrivilege.requestTrustedProfileUnlock({ parentId: 'p1' });
    assert.equal(result.ok, true);
    assert.equal(statusCalls, 0, 'picker unlock must not call adult-privilege status');
    assert.equal(selectCalls, 1);
  });

  it('resetToLocked clears active UI state', () => {
    const sandbox = {
      window: {
        analytics: { track: () => {} },
        sessionStorage: { _m: {}, getItem: () => null, setItem: () => {}, removeItem: () => {} },
      },
    };
    sandbox.globalThis = sandbox.window;
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    AdultPrivilege.resetToLocked();
    assert.equal(AdultPrivilege.getState(), 'locked');
  });
});
