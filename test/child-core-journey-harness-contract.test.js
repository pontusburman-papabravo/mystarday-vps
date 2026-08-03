'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const harness = fs.readFileSync(
  path.join(ROOT, 'scripts/child-core-journey-harness.mjs'),
  'utf8'
);

describe('child-core-journey-harness contract', () => {
  it('covers iPhone-like and Android-like viewports', () => {
    assert.match(harness, /390/);
    assert.match(harness, /844/);
    assert.match(harness, /412/);
    assert.match(harness, /hasTouch:\s*true/);
  });

  it('emulates slow network, reduced motion, and larger text', () => {
    assert.match(harness, /emulateNetworkConditions|SLOW_NETWORK/);
    assert.match(harness, /prefers-reduced-motion/);
    assert.match(harness, /fontSize\s*=\s*'18px'/);
  });

  it('exercises order, substep, and session resume checks', () => {
    assert.match(harness, /order_check|orderOk/);
    assert.match(harness, /substep-row/);
    assert.match(harness, /session_resume|resumeOk/);
    assert.match(harness, /\/child\/today/);
  });

  it('redacts credentials and tokens from logs', () => {
    assert.match(harness, /function redact/);
    assert.match(harness, /password|pin|token/i);
    assert.doesNotMatch(harness, /FOUNDER_QA_PASSWORD|console\.log\(.*password/i);
  });

  it('is wired as npm script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['test:child-core-harness'], 'node scripts/child-core-journey-harness.mjs');
  });
});
