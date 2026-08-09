'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const PROVISION_SRC = fs.readFileSync(path.join(ROOT, 'public/js/widget-bridge-provision.js'), 'utf8');

function loadProvision(sandbox) {
  const win = {
    fetch: sandbox.fetch,
    Capacitor: { getPlatform: () => 'ios' },
    Auth: sandbox.Auth,
    WidgetInstallationId: sandbox.WidgetInstallationId,
    WidgetBridgeClient: sandbox.WidgetBridgeClient,
    console,
  };
  win.window = win;
  win.globalThis = win;
  vm.createContext(win);
  vm.runInContext(PROVISION_SRC, win);
  return win.WidgetBridgeProvision;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function bindingResponse(childId) {
  return {
    ok: true,
    json: async () => ({
      binding_token: `token-${childId}`,
      child_id: childId,
    }),
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function waitFor(condition, label) {
  for (let i = 0; i < 30; i += 1) {
    if (condition()) return;
    await flushMicrotasks();
    await new Promise((r) => setImmediate(r));
  }
  throw new Error(`waitFor timeout: ${label}`);
}

describe('WidgetBridgeProvision binding intent race', () => {
  let configureCalls;
  let fetchCalls;
  let fetchDeferreds;
  let sandbox;

  beforeEach(() => {
    configureCalls = [];
    fetchCalls = [];
    fetchDeferreds = [];

    sandbox = {
      Auth: {
        getUser: () => ({ type: 'parent', id: 'p1', familyId: 'f1' }),
        getCsrfToken: () => 'csrf',
      },
      WidgetInstallationId: {
        getOrCreate: () => Promise.resolve('install-1'),
      },
      WidgetBridgeClient: {
        isNative: () => true,
        configureBinding: async (payload) => {
          configureCalls.push(payload);
          return { ok: true };
        },
        clearBindings: async () => {},
        refreshAll: async () => {},
      },
      fetch: (url, opts) => {
        fetchCalls.push({ url, body: JSON.parse(opts.body) });
        const d = deferred();
        fetchDeferreds.push(d);
        return d.promise;
      },
    };
  });

  it('A: A starts → B starts → A finishes last — only B configures native', async () => {
    const Provision = loadProvision(sandbox);
    const pA = Provision.syncBinding({ childId: 'child-a', force: true });
    await waitFor(() => fetchDeferreds.length >= 1, 'first fetch');

    const pB = Provision.syncBinding({ childId: 'child-b', force: true });
    fetchDeferreds[0].resolve(bindingResponse('child-a'));
    await waitFor(() => fetchDeferreds.length >= 2, 'second fetch');
    fetchDeferreds[1].resolve(bindingResponse('child-b'));

    const [rA, rB] = await Promise.all([pA, pB]);
    assert.equal(rA.superseded, true);
    assert.equal(rB.ok, true);
    assert.equal(configureCalls.length, 1);
    assert.equal(configureCalls[0].activeChildId, 'child-b');
  });

  it('B: double reconnect same child — single native configure', async () => {
    const Provision = loadProvision(sandbox);
    const p1 = Provision.syncBinding({ childId: 'child-a', force: true });
    await waitFor(() => fetchDeferreds.length >= 1, 'first fetch');
    const p2 = Provision.syncBinding({ childId: 'child-a', force: true });

    fetchDeferreds[0].resolve(bindingResponse('child-a'));
    await waitFor(() => fetchDeferreds.length >= 2, 'second fetch');
    fetchDeferreds[1].resolve(bindingResponse('child-a'));

    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1.superseded, true);
    assert.equal(r2.ok, true);
    assert.equal(configureCalls.length, 1);
    assert.equal(configureCalls[0].activeChildId, 'child-a');
    assert.equal(fetchCalls.length, 2);
  });

  it('C: auth sync overlaps manual B reconnect — B wins native configure', async () => {
    const Provision = loadProvision(sandbox);
    const pAuth = Provision.syncBinding({ childId: 'child-a' });
    await waitFor(() => fetchDeferreds.length >= 1, 'first fetch');
    const pManual = Provision.syncBinding({ childId: 'child-b', force: true });

    fetchDeferreds[0].resolve(bindingResponse('child-a'));
    await waitFor(() => fetchDeferreds.length >= 2, 'second fetch');
    fetchDeferreds[1].resolve(bindingResponse('child-b'));

    const [rAuth, rManual] = await Promise.all([pAuth, pManual]);
    assert.equal(rAuth.superseded, true);
    assert.equal(rManual.ok, true);
    assert.equal(configureCalls.length, 1);
    assert.equal(configureCalls[0].activeChildId, 'child-b');
  });

  it('D: older A fails after newer B succeeded — B remains only configure', async () => {
    const Provision = loadProvision(sandbox);
    const pA = Provision.syncBinding({ childId: 'child-a', force: true });
    await waitFor(() => fetchDeferreds.length >= 1, 'first fetch');
    const pB = Provision.syncBinding({ childId: 'child-b', force: true });
    await waitFor(() => fetchDeferreds.length >= 2, 'second fetch');

    fetchDeferreds[1].resolve(bindingResponse('child-b'));
    await pB;
    assert.equal(configureCalls.length, 1);
    assert.equal(configureCalls[0].activeChildId, 'child-b');

    fetchDeferreds[0].resolve(bindingResponse('child-a'));
    const rA = await pA;
    assert.equal(rA.superseded, true);
    assert.equal(configureCalls.length, 1);
  });

  it('E: logout invalidates in-flight — stale cannot configure', async () => {
    const Provision = loadProvision(sandbox);
    const pA = Provision.syncBinding({ childId: 'child-a', force: true });
    await waitFor(() => fetchDeferreds.length >= 1, 'first fetch');
    Provision.invalidateBindingIntents();
    await sandbox.WidgetBridgeClient.clearBindings();

    fetchDeferreds[0].resolve(bindingResponse('child-a'));
    const rA = await pA;
    assert.equal(rA.superseded, true);
    assert.equal(configureCalls.length, 0);
  });

  it('F: force:true still hits server when latest intent', async () => {
    const Provision = loadProvision(sandbox);
    const p = Provision.syncBinding({ childId: 'child-z', force: true });
    await waitFor(() => fetchDeferreds.length >= 1, 'first fetch');
    fetchDeferreds[0].resolve(bindingResponse('child-z'));
    const r = await p;
    assert.equal(r.ok, true);
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].body.child_id, 'child-z');
    assert.equal(configureCalls.length, 1);
  });
});
