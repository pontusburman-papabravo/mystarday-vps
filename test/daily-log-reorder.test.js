'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateOrderedItemIds,
  DailyLogReorderError,
} = require('../src/lib/daily-log-reorder');

describe('daily-log-reorder validateOrderedItemIds', () => {
  it('rejects empty array', () => {
    assert.throws(
      () => validateOrderedItemIds([]),
      (err) => err instanceof DailyLogReorderError && err.statusCode === 400
    );
  });

  it('rejects duplicate ids', () => {
    assert.throws(
      () => validateOrderedItemIds(['a', 'a']),
      (err) => err.message.includes('Duplicerade')
    );
  });
});
