'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  effectiveChildItemSortOrder,
  compareChildDailyLogItems,
} = require('../src/lib/daily-log-child-order');

describe('daily-log-child-order', () => {
  it('uses parent sort_order when child_sort_order is null', () => {
    const item = { sort_order: 5, child_sort_order: null, section: 'morgon' };
    assert.equal(effectiveChildItemSortOrder(item), 5);
  });

  it('uses child_sort_order when child has customized', () => {
    const item = { sort_order: 5, child_sort_order: 1, section: 'morgon' };
    assert.equal(effectiveChildItemSortOrder(item), 1);
  });

  it('compareChildDailyLogItems respects parent order when child_sort_order null', () => {
    const a = { sort_order: 2, child_sort_order: null, section: 'morgon' };
    const b = { sort_order: 0, child_sort_order: null, section: 'morgon' };
    assert.ok(compareChildDailyLogItems(a, b) > 0);
    assert.ok(compareChildDailyLogItems(b, a) < 0);
  });

  it('compareChildDailyLogItems breaks ties on sort_order when legacy child_sort_order is 0', () => {
    const items = [
      { name: 'A', sort_order: 0, child_sort_order: 0, section: 'morgon' },
      { name: 'B', sort_order: 1, child_sort_order: 0, section: 'morgon' },
      { name: 'C', sort_order: 2, child_sort_order: 0, section: 'morgon' },
    ];
    const sorted = [...items].sort(compareChildDailyLogItems);
    assert.deepEqual(sorted.map((i) => i.name), ['A', 'B', 'C']);
  });

  it('compareChildDailyLogItems uses child override when set', () => {
    const a = { sort_order: 0, child_sort_order: 3, section: 'morgon' };
    const b = { sort_order: 9, child_sort_order: 1, section: 'morgon' };
    assert.ok(compareChildDailyLogItems(a, b) > 0);
  });
});
