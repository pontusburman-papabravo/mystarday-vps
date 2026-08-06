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
  assert.match(settings, /features\.transition_support/);
  assert.match(dashboard, /features\?\.transition_support/);
});
