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
  const block = fs.readFileSync(path.join(ROOT, 'src/middleware/child-parent-api-block.js'), 'utf8');
  assert.match(settings, /features\.transition_support/);
  assert.match(dashboard, /features\?\.transition_support/);
  assert.match(block, /\/subscription\/access/);
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
