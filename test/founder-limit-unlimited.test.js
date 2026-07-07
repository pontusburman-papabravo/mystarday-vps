'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const paymentPolicy = require('../src/lib/payment-policy');

describe('founder family limit (unlimited default)', () => {
  it('qualifies all families when limit is unlimited', () => {
    assert.equal(paymentPolicy.qualifiesForLifetimeFree(0, null), true);
    assert.equal(paymentPolicy.qualifiesForLifetimeFree(999, null), true);
  });

  it('qualifies only under cap when limit is set', () => {
    assert.equal(paymentPolicy.qualifiesForLifetimeFree(224, 225), true);
    assert.equal(paymentPolicy.qualifiesForLifetimeFree(225, 225), false);
  });

  it('parseLimit treats null/0 as unlimited', () => {
    assert.equal(paymentPolicy.parseLimit(null), null);
    assert.equal(paymentPolicy.parseLimit(0), null);
    assert.equal(paymentPolicy.parseLimit(''), null);
    assert.equal(paymentPolicy.parseLimit(100), 100);
  });

  it('migration clears founder_family_limit and backfills real families', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1809620000000_founder_limit_unlimited.js'),
      'utf8'
    );
    assert.match(src, /founder_family_limit/);
    assert.match(src, /'null'::jsonb/);
    assert.match(src, /SET is_lifetime_free = true/);
    assert.match(src, /lower\(p\.email\) LIKE '%@example\.com'/);
    assert.match(src, /tier = 'lifetime_free'/);
  });
});
