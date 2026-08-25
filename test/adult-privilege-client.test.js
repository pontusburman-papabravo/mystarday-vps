'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function mockJsonResponse(status, body, textOverride) {
  const text = textOverride != null ? textOverride : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status: status,
    headers: { get: () => 'application/json' },
    text: () => Promise.resolve(text),
  };
}

function loadAdultPrivilege(sandbox, options) {
  const opts = options || {};
  const diag = fs.readFileSync(path.join(ROOT, 'public/js/trusted-select-parent-diag.js'), 'utf8');
  if (opts.withLifecycle) {
    const lifecycle = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege-lifecycle.js'), 'utf8');
    vm.runInNewContext(lifecycle, sandbox, { context: sandbox });
  }
  const priv = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege.js'), 'utf8');
  vm.runInNewContext(diag, sandbox, { context: sandbox });
  vm.runInNewContext(priv, sandbox, { context: sandbox });
  return sandbox.window.AdultPrivilege;
}

function makeTrustedUnlockSandbox(fetchImpl, extraWindow) {
  const sandbox = {
    window: Object.assign({
      analytics: { track: () => {} },
      Auth: {
        getCsrfToken: () => 'csrf',
        setCsrfToken: () => {},
        setAuth: () => {},
      },
      AdultPinGateUI: {
        collectAdultPin: () => Promise.resolve({ ok: true, pin: '4321' }),
      },
      DeviceMode: { enterParent: () => {} },
      document: {
        visibilityState: 'visible',
        addEventListener: () => {},
      },
      addEventListener: () => {},
      sessionStorage: {
        _m: { stjarndag_entry_pin_required_for_parents: '1' },
        getItem(k) { return this._m[k] || null; },
        setItem(k, v) { this._m[k] = v; },
      },
      TrustedSelectParentDiag: {
        logStage: () => {},
        safeKeys: (body) => (body && typeof body === 'object' ? Object.keys(body) : []),
      },
    }, extraWindow || {}),
    fetch: fetchImpl,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };
  if (sandbox.window.Capacitor) {
    sandbox.Capacitor = sandbox.window.Capacitor;
  }
  if (sandbox.window.document) {
    sandbox.document = sandbox.window.document;
  }
  sandbox.sessionStorage = sandbox.window.sessionStorage;
  sandbox.DeviceMode = sandbox.window.DeviceMode;
  sandbox.globalThis = sandbox.window;
  return sandbox;
}

function defaultTrustedFetch(overrides) {
  const impl = overrides || {};
  return (url) => {
    if (String(url).includes('/auth/app-entry')) {
      return Promise.resolve(mockJsonResponse(200, {
        pinRequiredForParents: true,
        orchestratorActive: true,
      }));
    }
    if (String(url).includes('/trusted-device/select-parent')) {
      if (impl.selectParent) return impl.selectParent(url);
      return Promise.resolve(mockJsonResponse(200, {
        ok: true,
        user: { id: 'p1', type: 'parent' },
        redirect: '/dashboard',
        csrfToken: 'c',
      }));
    }
    if (String(url).includes('/auth/me')) {
      if (impl.me) return impl.me(url);
      return Promise.resolve(mockJsonResponse(200, { type: 'parent', id: 'p1' }));
    }
    return Promise.resolve(mockJsonResponse(404, {}));
  };
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
    const sandbox = makeTrustedUnlockSandbox((url) => {
      if (String(url).includes('/adult-privilege/status')) {
        statusCalls += 1;
        return Promise.resolve(mockJsonResponse(401, { ok: false }));
      }
      if (String(url).includes('/trusted-device/select-parent')) {
        selectCalls += 1;
      }
      return defaultTrustedFetch()(url);
    });
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

  it('picker pin meta always refreshes from app-entry', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/adult-privilege.js'), 'utf8');
    assert.match(src, /function ensurePickerPinMeta/);
    assert.doesNotMatch(src, /sessionStorage\.getItem\(PIN_REQUIRED_KEY\) !== null/);
  });

  it('trusted profile unlock succeeds with canonical ok:true contract and /me verify', async () => {
    let meCalls = 0;
    const sandbox = makeTrustedUnlockSandbox((url) => {
      if (String(url).includes('/auth/me')) {
        meCalls += 1;
      }
      return defaultTrustedFetch()(url);
    });
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    const result = await AdultPrivilege.requestTrustedProfileUnlock({ parentId: 'p1' });
    assert.equal(result.ok, true);
    assert.equal(result.redirect, '/dashboard');
    assert.ok(meCalls >= 1, 'verify gate must call /api/auth/me');
  });

  it('HTTP 200 without body.ok is a contract failure, not success', async () => {
    let meCalls = 0;
    const sandbox = makeTrustedUnlockSandbox((url) => {
      if (String(url).includes('/trusted-device/select-parent')) {
        return Promise.resolve(mockJsonResponse(200, {
          user: { id: 'p1', type: 'parent' },
          csrfToken: 'c',
        }));
      }
      if (String(url).includes('/auth/me')) {
        meCalls += 1;
      }
      return defaultTrustedFetch()(url);
    });
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    const result = await AdultPrivilege.requestTrustedProfileUnlock({ parentId: 'p1' });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'TRUSTED_SELECT_PARENT_FAILED');
    assert.equal(meCalls, 0);
  });

  it('real iPhone flow: select-parent 200 + lifecycle sync handle unlocks successfully', async () => {
    const sandbox = makeTrustedUnlockSandbox(defaultTrustedFetch(), {
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          App: {
            addListener() {
              return { remove() {} };
            },
          },
        },
      },
    });
    const AdultPrivilege = loadAdultPrivilege(sandbox, { withLifecycle: true });
    const result = await AdultPrivilege.requestTrustedProfileUnlock({ parentId: 'p1' });
    assert.equal(result.ok, true);
    assert.equal(result.redirect, '/dashboard');
    assert.equal(AdultPrivilege.getState(), 'active');
  });

  it('post-success lifecycle failure is not classified as ADULT_PRIVILEGE_NETWORK', async () => {
    const sandbox = makeTrustedUnlockSandbox(defaultTrustedFetch(), {
      AdultPrivilegeLifecycle: {
        start() {},
        onPrivilegeActivated() {
          throw new Error('lifecycle activation failed');
        },
      },
    });
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    const result = await AdultPrivilege.requestTrustedProfileUnlock({ parentId: 'p1' });
    assert.equal(result.ok, false);
    assert.notEqual(result.code, 'ADULT_PRIVILEGE_NETWORK');
    assert.equal(result.code, 'ADULT_PRIVILEGE_POST_SUCCESS_FAILED');
  });

  it('genuine fetch failure maps to ADULT_PRIVILEGE_NETWORK', async () => {
    const sandbox = makeTrustedUnlockSandbox((url) => {
      if (String(url).includes('/trusted-device/select-parent')) {
        return Promise.reject(new Error('NetworkError when attempting to fetch resource'));
      }
      return defaultTrustedFetch()(url);
    });
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    const result = await AdultPrivilege.requestTrustedProfileUnlock({ parentId: 'p1' });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'ADULT_PRIVILEGE_NETWORK');
  });

  it('genuine 401 PIN failure is not recovered', async () => {
    let meCalls = 0;
    const sandbox = makeTrustedUnlockSandbox((url) => {
      if (String(url).includes('/trusted-device/select-parent')) {
        return Promise.resolve(mockJsonResponse(401, { code: 'PARENT_PIN_INVALID' }));
      }
      if (String(url).includes('/auth/me')) {
        meCalls += 1;
      }
      return defaultTrustedFetch()(url);
    });
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    const result = await AdultPrivilege.requestTrustedProfileUnlock({ parentId: 'p1' });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'PARENT_PIN_INVALID');
    assert.equal(meCalls, 0);
  });

  it('atomic: select-parent ok but /me returns a DIFFERENT parent → verify fails, no success', async () => {
    let meCalls = 0;
    const sandbox = makeTrustedUnlockSandbox((url) => {
      if (String(url).includes('/auth/me')) {
        meCalls += 1;
        return Promise.resolve(mockJsonResponse(200, { type: 'parent', id: 'other-parent' }));
      }
      return defaultTrustedFetch()(url);
    });
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    const result = await AdultPrivilege.requestTrustedProfileUnlock({ parentId: 'p1' });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'ADULT_PRIVILEGE_VERIFY_FAILED');
    assert.ok(meCalls >= 1, 'strict picker path must verify /api/auth/me');
  });

  it('atomic: select-parent ok but /me never confirms parent → verify fails (no client-only success)', async () => {
    const sandbox = makeTrustedUnlockSandbox((url) => {
      if (String(url).includes('/auth/me')) {
        return Promise.resolve(mockJsonResponse(200, { type: 'child', id: 'kid' }));
      }
      return defaultTrustedFetch()(url);
    });
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    const result = await AdultPrivilege.requestTrustedProfileUnlock({ parentId: 'p1' });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'ADULT_PRIVILEGE_VERIFY_FAILED');
    assert.equal(AdultPrivilege.getState(), 'locked');
  });

  it('atomic: successful unlock returns the authoritative lease for the verified resume', async () => {
    const lease = Date.now() + 15 * 60 * 1000;
    const sandbox = makeTrustedUnlockSandbox((url) => {
      if (String(url).includes('/trusted-device/select-parent')) {
        return Promise.resolve(mockJsonResponse(200, {
          ok: true,
          user: { id: 'p1', type: 'parent' },
          redirect: '/dashboard',
          privilegeLeaseUntil: lease,
          csrfToken: 'c',
        }));
      }
      return defaultTrustedFetch()(url);
    });
    const AdultPrivilege = loadAdultPrivilege(sandbox);
    const result = await AdultPrivilege.requestTrustedProfileUnlock({ parentId: 'p1' });
    assert.equal(result.ok, true);
    assert.equal(result.privilegeLeaseUntil, lease);
  });

  it('picker lists all eligible parents; PIN unlock stays server-gated', () => {
    const access = fs.readFileSync(path.join(ROOT, 'db/parent-access.js'), 'utf8');
    const picker = fs.readFileSync(path.join(ROOT, 'public/js/child-profile-picker.js'), 'utf8');
    const trusted = fs.readFileSync(path.join(ROOT, 'src/lib/trusted-device.js'), 'utf8');
    const getParentsFn = access.match(/async function getAllowedParentsForFamilyDevice[\s\S]*?^}/m);
    assert.ok(getParentsFn, 'getAllowedParentsForFamilyDevice present');
    assert.doesNotMatch(getParentsFn[0], /WHERE[\s\S]*parent_pin_hash IS NOT NULL/);
    assert.match(access, /has_app_pin/);
    assert.match(picker, /data-parent-has-app-pin/);
    assert.match(picker, /redirectToParentBackupLogin/);
    assert.match(trusted, /PARENT_PIN_NOT_SET/);
    assert.match(picker, /TRUSTED_SELECT_PARENT_FAILED/);
    assert.match(picker, /ADULT_PRIVILEGE_NETWORK/);
    assert.match(picker, /ADULT_PRIVILEGE_POST_SUCCESS_FAILED/);
  });
});
