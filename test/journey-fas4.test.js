'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('journey Fas 4 — activation sunset', () => {
  it('activation-program returns 410 when api deprecated flag middleware present', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/routes/activation-program.js'),
      'utf8'
    );
    assert.match(src, /activationApiDeprecated/);
    assert.match(src, /410/);
    assert.match(src, /journey-context/);
  });

  it('new enrollments gated by activationNewEnrollments flag', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/routes/activation-program.js'),
      'utf8'
    );
    assert.match(src, /activationNewEnrollments/);
    assert.match(src, /enroll-choice/);
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
