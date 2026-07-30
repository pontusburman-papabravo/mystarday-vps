'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const onboardingJs = fs.readFileSync(
  path.join(__dirname, '..', 'public/js/onboarding.js'),
  'utf8'
);

test('onboarding.js must not declare top-level function ot (overwrites window.ot)', () => {
  assert.doesNotMatch(
    onboardingJs,
    /^\s*function\s+ot\s*\(/m,
    'top-level function ot becomes window.ot and breaks onboarding-i18n'
  );
});

test('onboarding.js must not declare top-level function onboardingPlural', () => {
  assert.doesNotMatch(
    onboardingJs,
    /^\s*function\s+onboardingPlural\s*\(/m,
    'top-level onboardingPlural becomes window.onboardingPlural'
  );
});
