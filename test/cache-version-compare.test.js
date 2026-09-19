'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { cacheVersionNumber, isCacheAtLeast } = require('./helpers/cache-version');

describe('cache version compare', () => {
  it('parses the numeric suffix', () => {
    assert.equal(cacheVersionNumber('stjarndag-v492'), 492);
    assert.equal(cacheVersionNumber('stjarndag-v1000'), 1000);
  });

  it('treats v1000 as newer than v492 (not string order)', () => {
    assert.equal('stjarndag-v1000' >= 'stjarndag-v492', false);
    assert.equal(isCacheAtLeast('stjarndag-v1000', 492), true);
    assert.equal(isCacheAtLeast('stjarndag-v491', 492), false);
  });
});
