'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('väg B activation email', () => {
  it('scheduler respects ACTIVATION_PROGRAM_EMAIL_ENABLED', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/activation-program-email-scheduler.js'),
      'utf8'
    );
    assert.match(src, /isActivationEmailEnabled/);
    assert.match(src, /isEligibleForActivationEmail/);
  });

  it('enable-vag-b.sh sets env and restarts', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/enable-vag-b.sh'), 'utf8');
    assert.match(src, /ACTIVATION_PROGRAM_EMAIL_ENABLED=true/);
    assert.match(src, /preview-activation-vag-b/);
  });
});
