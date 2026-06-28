'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sortDefaultScheduleItems } = require('../src/lib/default-schedule-order');

describe('default-schedule-order', () => {
  it('sorts Helg items morgon → dag → kvall', () => {
    const items = [
      { name: 'Middag', section: 'kvall', sort_order: 0 },
      { name: 'Leka fritt', section: 'dag', sort_order: 0 },
      { name: 'Sova ut', section: 'morgon', sort_order: 0 },
      { name: 'Borsta tänderna (kväll)', section: 'kvall', sort_order: 1 },
      { name: 'Utflykt / Park', section: 'dag', sort_order: 1 },
    ];
    const sorted = sortDefaultScheduleItems(items);
    assert.deepEqual(sorted.map((i) => i.name), [
      'Sova ut',
      'Leka fritt',
      'Utflykt / Park',
      'Middag',
      'Borsta tänderna (kväll)',
    ]);
  });
});
