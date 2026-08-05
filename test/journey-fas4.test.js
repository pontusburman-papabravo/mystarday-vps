'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('journey Fas 4 — activation sunset', () => {
  it('activation-program uses participant-aware runtime sunset middleware', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/routes/activation-program.js'),
      'utf8'
    );
    assert.match(src, /isActivationProgramApiSunsetForFamily/);
    assert.match(src, /enroll-choice/);
  });

  it('new enrollments gated by activationNewEnrollments flag on enroll-choice', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/routes/activation-program.js'),
      'utf8'
    );
    assert.match(src, /activationNewEnrollments/);
    assert.match(src, /enroll-choice/);
  });

  it('public invite route gates new enrollments flag', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/routes/public.js'),
      'utf8'
    );
    assert.match(src, /activationNewEnrollments/);
    assert.match(src, /activation-program\/invite/);
  });

  it('context exposes activation_ui_removed capability', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/lib/journey/context-builder.js'),
      'utf8'
    );
    assert.match(src, /activation_ui_removed/);
    assert.match(src, /capabilities/);
  });
});
