'use strict';

/**
 * M3 — requireComponent must fail-closed on DB errors (503), not fail-open (next()).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runMiddleware } = require('./helpers/setup.js');

function loadRequireComponent(getByFamilyIdImpl, hasPremiumAccessImpl = async () => false) {
  const subsPath = require.resolve('../db/family-subscriptions');
  const entitlementsPath = require.resolve('../src/lib/family-entitlements');
  const mwPath = require.resolve('../src/middleware/require-component');
  require.cache[subsPath] = {
    id: subsPath,
    filename: subsPath,
    loaded: true,
    exports: { getByFamilyId: getByFamilyIdImpl },
  };
  require.cache[entitlementsPath] = {
    id: entitlementsPath,
    filename: entitlementsPath,
    loaded: true,
    exports: { hasPremiumAccess: hasPremiumAccessImpl },
  };
  delete require.cache[mwPath];
  return require('../src/middleware/require-component').requireComponent;
}

function clearRequireComponentMocks() {
  delete require.cache[require.resolve('../db/family-subscriptions')];
  delete require.cache[require.resolve('../src/lib/family-entitlements')];
  delete require.cache[require.resolve('../src/middleware/require-component')];
}

test('requireComponent returns 503 when subscription lookup throws', async () => {
  const requireComponent = loadRequireComponent(async () => {
    throw new Error('db unavailable');
  });

  const result = await runMiddleware(requireComponent('reporting'), {
    user: { familyId: 'family-1', type: 'parent' },
  });

  assert.equal(result.next, false);
  assert.equal(result.status, 503);
  assert.match(result.body.error, /Tillfälligt fel/i);

  clearRequireComponentMocks();
});

test('requireComponent still allows basic_app when grandfathered via entitlements', async () => {
  const requireComponent = loadRequireComponent(async () => null, async () => true);

  const result = await runMiddleware(requireComponent('basic_app'), {
    user: { familyId: 'family-1', type: 'parent' },
  });

  assert.equal(result.next, true);

  clearRequireComponentMocks();
});

test('requireComponent returns 403 when premium component is missing', async () => {
  const requireComponent = loadRequireComponent(async () => ({
    tier: 'trial',
    components: [{ component: 'basic_app', state: 'active' }],
  }));

  const result = await runMiddleware(requireComponent('reporting'), {
    user: { familyId: 'family-1', type: 'parent' },
  });

  assert.equal(result.next, false);
  assert.equal(result.status, 403);
  assert.equal(result.body.code, 'COMPONENT_MISSING');

  clearRequireComponentMocks();
});
