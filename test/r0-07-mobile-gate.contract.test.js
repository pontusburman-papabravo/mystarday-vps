'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const GATE_SRC = fs.readFileSync(path.join(ROOT, 'scripts/r0-07-mobile-gate.mjs'), 'utf8');

const EXPECTED_SCRIPTS = [
  'r0-01-mobile-order-smoke.mjs',
  'r0-02-mobile-substeps-smoke.mjs',
  'r0-03-child-login-today-smoke.mjs',
  'r0-04-child-offline-smoke.mjs',
  'r0-05-child-mobile-a11y-smoke.mjs',
  'r0-06-support-diagnostics-mobile-smoke.mjs',
];

describe('R0-07 mobile gate orchestrator', () => {
  it('chains R0-01…R0-06 smokes in roadmap order', () => {
    let lastIdx = -1;
    for (const script of EXPECTED_SCRIPTS) {
      const idx = GATE_SRC.indexOf(script);
      assert.ok(idx > lastIdx, `expected ${script} after prior steps`);
      lastIdx = idx;
      assert.ok(fs.existsSync(path.join(ROOT, 'scripts', script)), `${script} exists`);
    }
  });

  it('documents synthetic-only / no prod PII in gate output', () => {
    assert.match(GATE_SRC, /synthetic|no prod PII|PII/i);
  });

  it('is wired as npm run test:r0-mobile-gate', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['test:r0-mobile-gate'], 'node scripts/r0-07-mobile-gate.mjs');
  });
});
