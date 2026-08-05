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

describe('transition support parent/child gate alignment', () => {
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
