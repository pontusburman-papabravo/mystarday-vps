'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const settingsSrc = fs.readFileSync(
  path.join(__dirname, '../public/js/child-settings.js'),
  'utf8'
);
const dashboardSrc = fs.readFileSync(
  path.join(__dirname, '../public/js/child-dashboard.js'),
  'utf8'
);

const setupSrc = fs.readFileSync(
  path.join(__dirname, '../public/js/child-profile-setup.js'),
  'utf8'
);
const gateSrc = fs.readFileSync(
  path.join(__dirname, '../scripts/transition-support-prod-acceptance-gate.mjs'),
  'utf8'
);

describe('transition support parent/child gate alignment', () => {
  test('barnprofil setup tab exposes övergångsstöd when transition_support is on', () => {
    assert.match(setupSrc, /transition-lead-cb/);
    assert.match(setupSrc, /features\.transition_support/);
    assert.match(setupSrc, /Övergångsstöd/);
  });

  test('prod acceptance gate opens canonical barnprofil setup route', () => {
    assert.match(gateSrc, /\/family\/child\/\$\{encodeURIComponent\(qaChildId\)\}\?tab=setup/);
  });

  test('parent övergångsstöd UI uses subscription feature flag not teacch alone', () => {
    assert.match(settingsSrc, /hasTransitionSupportAccess/);
    assert.match(settingsSrc, /features\.transition_support/);
    assert.doesNotMatch(
      settingsSrc,
      /\$\{hasTeacchAccess \? `\s*\n\s*<!-- 4b\. Övergångsstöd/
    );
  });

  test('child dashboard uses package access for transition_support', () => {
    assert.match(dashboardSrc, /fetchPackageAccess/);
    assert.match(dashboardSrc, /features\?\.transition_support/);
  });
});
