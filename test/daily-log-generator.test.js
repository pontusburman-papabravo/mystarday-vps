'use strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getDayOfWeek, getChildAgeInYears, getSchoolVariant } = require('../src/lib/daily-log-generator');

describe('daily-log-generator', () => {
  it('getDayOfWeek returns Thursday=4 for 2026-06-04 Stockholm', () => {
    assert.equal(getDayOfWeek('2026-06-04', 'Europe/Stockholm'), 4);
  });

  it('batchInsertDailyLogItems uses 10 bind params per row (sort_order + section, no child_sort_order)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/daily-log-generator.js'),
      'utf8',
    );
    const start = src.indexOf('async function batchInsertDailyLogItems');
    const end = src.indexOf('function getLocalDateStr');
    assert.ok(start >= 0 && end > start);
    const fn = src.slice(start, end);
    assert.match(fn, /pi \+= 10;/);
    assert.match(fn, /sort_order, section\) VALUES/);
    assert.doesNotMatch(fn, /child_sort_order, section\) VALUES/);
  });

  it('getChildAgeInYears uses timezone calendar dates (L4)', () => {
    const prevIso = process.env.TEST_FIXED_NOW_ISO;
    const prevMs = process.env.TEST_FIXED_NOW_MS;
    delete process.env.TEST_FIXED_NOW_ISO;
    delete process.env.TEST_FIXED_NOW_MS;
    const realDate = Date;
    global.Date = class extends realDate {
      constructor(...args) {
        if (args.length === 0) {
          super('2026-06-04T10:00:00.000Z');
        } else {
          super(...args);
        }
      }
      static now() {
        return new realDate('2026-06-04T10:00:00.000Z').getTime();
      }
    };
    try {
      assert.equal(getChildAgeInYears('2020-06-05', 'Europe/Stockholm'), 6);
      assert.equal(getSchoolVariant('2020-06-05'), 'Skola/Förskola');
    } finally {
      global.Date = realDate;
      if (prevIso !== undefined) process.env.TEST_FIXED_NOW_ISO = prevIso;
      else delete process.env.TEST_FIXED_NOW_ISO;
      if (prevMs !== undefined) process.env.TEST_FIXED_NOW_MS = prevMs;
      else delete process.env.TEST_FIXED_NOW_MS;
    }
  });
});
