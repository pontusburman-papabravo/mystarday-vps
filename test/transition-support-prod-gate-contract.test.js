'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('transition prod gate script exists and documents QA grant core', () => {
  const gate = fs.readFileSync(
    path.join(ROOT, 'scripts/transition-support-prod-acceptance-gate.mjs'),
    'utf8'
  );
  assert.match(gate, /qa-extra-stod-grant-core/);
  assert.match(gate, /restorePackageSnapshot/);
  assert.match(gate, /transition_support/);

  const core = fs.readFileSync(
    path.join(ROOT, 'scripts/lib/qa-extra-stod-grant-core.cjs'),
    'utf8'
  );
  assert.match(core, /applyTemporaryGrant/);
  assert.match(core, /features\.addFamily/);
  assert.match(core, /grantComponent/);
});

test('parent and child still gate transition_support via package access', () => {
  const settings = fs.readFileSync(path.join(ROOT, 'public/js/child-settings.js'), 'utf8');
  const dashboard = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard.js'), 'utf8');
  const subscription = fs.readFileSync(path.join(ROOT, 'src/routes/subscription.js'), 'utf8');
  assert.match(settings, /features\.transition_support/);
  assert.match(dashboard, /features\?\.transition_support/);
  assert.match(subscription, /toChildPackageAccess/);
  const { childParentApiBlock } = require('../src/middleware/child-parent-api-block');
  let allowed = false;
  childParentApiBlock(
    { user: { type: 'child', id: 'c1' }, path: '/subscription/access' },
    { status() { return this; }, json() {} },
    () => { allowed = true; }
  );
  assert.equal(allowed, true);
});

test('child subscription access response strips parent-only rollout and interest fields', () => {
  const subscription = fs.readFileSync(path.join(ROOT, 'src/routes/subscription.js'), 'utf8');
  assert.match(subscription, /req\.user\.type === 'child'/);
  const { CHILD_SUBSCRIPTION_ACCESS_FORBIDDEN_KEYS, toChildPackageAccess } = require('../src/lib/package-access');
  const sample = toChildPackageAccess({
    rollout_mode: 'interest',
    purchase_enabled: false,
    show_prices: true,
    view_mode: 'child',
    components: { basic_app: { has: true, state: 'active' } },
    features: { transition_support: true },
    preview: { teacch: true },
    archive: { teacch: 2 },
    interest: { teacch: true },
  });
  for (const key of CHILD_SUBSCRIPTION_ACCESS_FORBIDDEN_KEYS) {
    assert.equal(key in sample, false, `child payload must not include ${key}`);
  }
  assert.equal(sample.features.transition_support, true);
  assert.deepEqual(Object.keys(sample).sort(), ['components', 'features', 'view_mode']);
});

test('transition NU card prefers transition_support chrome over seven-questions takeover', () => {
  const activities = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-activities.js'), 'utf8');
  assert.match(activities, /useTransitionNu/);
  assert.match(activities, /transition-inline/);
});

test('prod gate requires child subscription access and real browser (no http fallback)', () => {
  const gate = fs.readFileSync(
    path.join(ROOT, 'scripts/transition-support-prod-acceptance-gate.mjs'),
    'utf8'
  );
  assert.doesNotMatch(gate, /mode:\s*'http_fallback'/);
  assert.doesNotMatch(gate, /api_parent_verified/);
  assert.match(gate, /features_transition_support === true/);
  assert.match(gate, /child_pin_required_for_post_grant_session/);
});

test('browser acceptance gate does not blanket-ignore all HTTP 403 console errors', () => {
  const gate = fs.readFileSync(
    path.join(ROOT, 'scripts/transition-support-browser-acceptance-gate.mjs'),
    'utf8'
  );
  assert.match(gate, /CONSOLE_403_URL_ALLOWLIST/);
  assert.doesNotMatch(
    gate,
    /analytics\|favicon\|ResizeObserver\|client-log\|Failed to load resource: the server responded with a status of 403/
  );
});
