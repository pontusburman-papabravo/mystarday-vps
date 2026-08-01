'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { executeWithPrimaryAndCleanup } = require('../helpers/rc1-scope-errors');

describe('executeWithPrimaryAndCleanup', () => {
  it('preserves both errors when body and cleanup fail', async () => {
    const primary = new Error('primary failure');
    const cleanup = new Error('cleanup failure');

    await assert.rejects(
      () => executeWithPrimaryAndCleanup({
        fn: async () => {
          throw primary;
        },
        cleanup: async () => {
          throw cleanup;
        },
      }),
      (err) => {
        assert.equal(err.name, 'AggregateError');
        assert.match(err.message, /primary failure/);
        assert.match(err.message, /cleanup failure/);
        assert.equal(err.errors.length, 2);
        assert.equal(err.errors[0], primary);
        assert.equal(err.errors[1], cleanup);
        return true;
      }
    );
  });

  it('throws primary when only body fails', async () => {
    const primary = new Error('only primary');
    await assert.rejects(
      () => executeWithPrimaryAndCleanup({
        fn: async () => {
          throw primary;
        },
        cleanup: async () => {},
      }),
      primary
    );
  });

  it('throws cleanup when only cleanup fails', async () => {
    const cleanup = new Error('only cleanup');
    await assert.rejects(
      () => executeWithPrimaryAndCleanup({
        fn: async () => 'ok',
        cleanup: async () => {
          throw cleanup;
        },
      }),
      cleanup
    );
  });
});
