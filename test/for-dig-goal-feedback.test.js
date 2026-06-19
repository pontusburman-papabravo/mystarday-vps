'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { INTENT_LABELS } = require('../src/lib/for-dig-config');

describe('for-dig-goal-feedback admin labels', () => {
  it('INTENT_LABELS covers all admin display keys', () => {
    const keys = ['mindre_tjat', 'tydligare_rutiner', 'sjalvstandighet', 'mindre_stress', 'annat'];
    for (const key of keys) {
      assert.ok(INTENT_LABELS[key], `missing label for ${key}`);
    }
  });
});
