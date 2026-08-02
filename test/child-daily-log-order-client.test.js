'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const server = require('../src/lib/daily-log-child-order');

function loadClientOrder() {
  const src = fs.readFileSync(
    path.join(__dirname, '../public/js/child-daily-log-order.js'),
    'utf8'
  );
  const sandbox = { window: {} };
  vm.runInNewContext(src, sandbox);
  return sandbox.window.ChildDailyLogOrder;
}

describe('child-daily-log-order client parity', () => {
  it('matches server compare for null child_sort_order and legacy zeros', () => {
    const client = loadClientOrder();
    const cases = [
      [
        { sort_order: 2, child_sort_order: null, section: 'morgon' },
        { sort_order: 0, child_sort_order: null, section: 'morgon' },
      ],
      [
        { name: 'A', sort_order: 0, child_sort_order: 0, section: 'morgon' },
        { name: 'B', sort_order: 1, child_sort_order: 0, section: 'morgon' },
      ],
      [
        { sort_order: 0, child_sort_order: 3, section: 'morgon' },
        { sort_order: 9, child_sort_order: 1, section: 'morgon' },
      ],
    ];
    for (const [a, b] of cases) {
      assert.equal(
        client.compareChildDailyLogItems(a, b),
        server.compareChildDailyLogItems(a, b)
      );
    }
  });
});
