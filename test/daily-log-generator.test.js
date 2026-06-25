'use strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getDayOfWeek } = require('../src/lib/daily-log-generator');

describe('daily-log-generator', () => {
  it('getDayOfWeek returns Thursday=4 for 2026-06-04 Stockholm', () => {
    assert.equal(getDayOfWeek('2026-06-04', 'Europe/Stockholm'), 4);
  });

  it('batchInsertDailyLogItems uses 10 bind params per row (11 cols, child_sort_order reuses sort_order)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/daily-log-generator.js'),
      'utf8',
    );
    const start = src.indexOf('async function batchInsertDailyLogItems');
    const end = src.indexOf('function getLocalDateStr');
    assert.ok(start >= 0 && end > start);
    const fn = src.slice(start, end);
    assert.match(fn, /pi \+= 10;/);
    assert.match(fn, /child_sort_order, section\) VALUES/);
    assert.doesNotMatch(fn, /pi \+ 10\}/);
  });
});
