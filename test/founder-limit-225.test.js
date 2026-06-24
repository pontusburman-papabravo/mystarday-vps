'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('founder family limit 225', () => {
  it('payment-policy default is 225', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/payment-policy.js'), 'utf8');
    assert.match(src, /DEFAULT_FOUNDER_LIMIT = 225/);
    assert.match(src, /familyCountBeforeInsert < founderLimit/);
  });

  it('migration upserts founder_family_limit to 225', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1808640000000_founder_limit_225.js'),
      'utf8'
    );
    assert.match(src, /founder_family_limit/);
    assert.match(src, /'225'/);
    assert.match(src, /ON CONFLICT \(key\) DO UPDATE/);
  });
});
