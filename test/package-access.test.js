/**
 * package-access unit tests (§16.3 Fas 0).
 * Run: node --test test/package-access.test.js
 */

'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'REDACTED/mock_test';

let queryStack = [];
let appConfigValue = null;

function pushRows(rows) {
  queryStack.push({ rows });
}

const mockDb = {
  query: async (text, params) => {
    const entry = queryStack.shift();
    return entry || { rows: [] };
  },
  getClient: async () => { throw new Error('getClient not mocked'); },
  pool: {},
};

const dbPath = require.resolve(path.join(__dirname, '../src/lib/db'));
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: mockDb, children: [], parent: null, paths: [],
};

const appConfigPath = require.resolve(path.join(__dirname, '../db/app-config'));
require.cache[appConfigPath] = {
  id: appConfigPath, filename: appConfigPath, loaded: true,
  exports: {
    get: async () => appConfigValue,
    set: async () => ({}),
    getAll: async () => [],
  },
  children: [], parent: null, paths: [],
};

function loadPackageAccess() {
  const modPath = path.join(__dirname, '../src/lib/package-access');
  delete require.cache[require.resolve(modPath)];
  delete require.cache[require.resolve(path.join(__dirname, '../db/family-subscriptions'))];
  delete require.cache[require.resolve(path.join(__dirname, '../db/features'))];
  return require(modPath);
}

beforeEach(() => {
  queryStack = [];
  appConfigValue = null;
  process.env.PACKAGES_ROLLOUT_MODE = 'off';
});

test('getRolloutMode defaults to off', async () => {
  const pa = loadPackageAccess();
  assert.equal(await pa.getRolloutMode(), 'off');
});

test('getRolloutMode reads app_config', async () => {
  appConfigValue = 'interest';
  const pa = loadPackageAccess();
  assert.equal(await pa.getRolloutMode(), 'interest');
});

test('getRolloutFlags derives purchase from rollout mode', () => {
  const pa = loadPackageAccess();
  assert.deepEqual(pa.getRolloutFlags('off'), { purchase_enabled: false, show_prices: false });
  assert.deepEqual(pa.getRolloutFlags('interest'), { purchase_enabled: false, show_prices: false });
  assert.deepEqual(pa.getRolloutFlags('purchase'), { purchase_enabled: true, show_prices: true });
});

test('resolveViewMode prioritizes pedagog then child', () => {
  const pa = loadPackageAccess();
  assert.equal(pa.resolveViewMode({ type: 'parent', preferred_view_mode: 'pedagog' }).mode, 'pedagog');
  assert.equal(pa.resolveViewMode({ type: 'child' }).mode, 'child');
  assert.equal(
    pa.resolveViewMode({ type: 'child' }, { hasActiveTeacchActivity: true }).mode,
    'child_teacch'
  );
  assert.equal(pa.resolveViewMode({ type: 'parent' }).mode, 'parent');
});

test('resolveComponentEntry handles active, archived, disabled', () => {
  const pa = loadPackageAccess();
  const components = [
    { component: 'reporting', state: 'active' },
    { component: 'pedagog', state: 'archived' },
  ];
  assert.deepEqual(pa.resolveComponentEntry('reporting', components), { has: true, state: 'active' });
  assert.deepEqual(pa.resolveComponentEntry('pedagog', components), { has: true, state: 'archived' });
  assert.deepEqual(pa.resolveComponentEntry('teacch', components), { has: false, state: 'disabled' });
});

test('getFamilyAccess: rollout off hides preview', async () => {
  appConfigValue = 'off';
  pushRows([{
    family_id: 'fam-1',
    tier: 'lifetime_free',
    components: [{ component: 'basic_app', state: 'active' }],
  }]);
  pushRows([{ reporting: 0, pedagog: 0, teacch: 0 }]);

  const pa = loadPackageAccess();
  const access = await pa.getFamilyAccess('fam-1', { type: 'parent' });

  assert.equal(access.rollout_mode, 'off');
  assert.equal(access.preview.reporting, false);
  assert.equal(access.preview.pedagog, false);
  assert.equal(access.components.basic_app.has, true);
  assert.equal(access.components.reporting.has, false);
});

test('normalizeRolloutMode trims and unwraps JSON values', () => {
  const pa = loadPackageAccess();
  assert.equal(pa.normalizeRolloutMode('interest'), 'interest');
  assert.equal(pa.normalizeRolloutMode(' interest '), 'interest');
  assert.equal(pa.normalizeRolloutMode('"interest"'), 'interest');
  assert.equal(pa.normalizeRolloutMode('bogus'), 'off');
  assert.equal(pa.normalizeRolloutMode(null), 'off');
});

test('getFamilyAccess: interest shows preview for unpurchased packages', async () => {
  appConfigValue = 'interest';
  pushRows([{
    family_id: 'fam-2',
    tier: 'trial',
    components: [{ component: 'basic_app', state: 'active' }],
  }]);
  pushRows([{ reporting: 2, pedagog: 0, teacch: 0 }]);

  const pa = loadPackageAccess();
  const access = await pa.getFamilyAccess('fam-2', { type: 'parent' });

  assert.equal(access.rollout_mode, 'interest');
  assert.equal(access.preview.reporting, true);
  assert.equal(access.preview.pedagog, true);
  assert.equal(access.archive.reporting, 2);
});

test('getFamilyAccess: grandfathered reporting never gets preview', async () => {
  appConfigValue = 'interest';
  pushRows([{
    family_id: 'fam-3',
    tier: 'lifetime_free',
    components: [
      { component: 'basic_app', state: 'active' },
      { component: 'reporting', state: 'active', source: 'grandfather' },
    ],
  }]);
  pushRows([{ reporting: 5, pedagog: 0, teacch: 0 }]);

  const pa = loadPackageAccess();
  const access = await pa.getFamilyAccess('fam-3', { type: 'parent' });

  assert.equal(access.components.reporting.has, true);
  assert.equal(access.preview.reporting, false);
});

test('legacy family without subscription row gets basic_app only', async () => {
  pushRows([]);
  pushRows([{ reporting: 0, pedagog: 0, teacch: 0 }]);

  const pa = loadPackageAccess();
  const access = await pa.getFamilyAccess('legacy-fam', { type: 'parent' });

  assert.equal(access.components.basic_app.has, true);
  assert.equal(access.components.reporting.has, false);
});
