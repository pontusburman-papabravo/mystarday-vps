'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts/check-engine-shadow-logic.mjs');

describe('Engine shadow-logic guard', () => {
  it('passes on current codebase (legacy allowlisted)', () => {
    const out = execFileSync('node', [SCRIPT], { encoding: 'utf8' });
    assert.match(out, /OK/);
  });
});
