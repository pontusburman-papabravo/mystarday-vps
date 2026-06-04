'use strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getDayOfWeek } = require('../src/lib/daily-log-generator');

describe('daily-log-generator', () => {
  it('getDayOfWeek returns Thursday=4 for 2026-06-04 Stockholm', () => {
    assert.equal(getDayOfWeek('2026-06-04', 'Europe/Stockholm'), 4);
  });
});
