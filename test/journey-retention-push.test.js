'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

describe('journey communication-gate retention_push', () => {
  it('gate module validates retention_push milestone in source', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/journey/communication-gate.js'),
      'utf8'
    );
    assert.match(src, /intent === 'retention_push'/);
    assert.match(src, /milestone_day_mismatch/);
    assert.match(src, /never_completed/);
    assert.match(src, /opts\.milestoneDay/);
  });
});
