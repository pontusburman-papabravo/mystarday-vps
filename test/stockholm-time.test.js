'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getStockholmDateParts,
  stockholmWallClockToUtcMs,
} = require('../src/lib/stockholm-time');

describe('stockholm time helpers', () => {
  it('maps 21:00 Stockholm in summer to 19:00 UTC', () => {
    const utcMs = stockholmWallClockToUtcMs(2026, 6, 21, 21, 0);
    assert.equal(new Date(utcMs).toISOString(), '2026-06-21T19:00:00.000Z');
  });

  it('maps 21:00 Stockholm in winter to 20:00 UTC', () => {
    const utcMs = stockholmWallClockToUtcMs(2026, 1, 4, 21, 0);
    assert.equal(new Date(utcMs).toISOString(), '2026-01-04T20:00:00.000Z');
  });

  it('reads Stockholm wall clock from UTC instants', () => {
    const parts = getStockholmDateParts(new Date('2026-06-21T17:00:00.000Z'));
    assert.equal(parts.hour, 19);
    assert.equal(parts.minute, 0);
  });
});
