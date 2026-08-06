'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { GLOBAL_FLAG_KEY } = require('../src/lib/english-app-global-flag');

describe('english-app-global-flag ops', () => {
  it('uses canonical feature_flag key', () => {
    assert.equal(GLOBAL_FLAG_KEY, 'english_app_global_enabled');
  });
});
