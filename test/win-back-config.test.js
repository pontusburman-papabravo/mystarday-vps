'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { getWinBackStaleHours, DEFAULT_STALE_HOURS } = require('../src/lib/win-back-config');

describe('win-back-config', () => {
  const prev = process.env.WIN_BACK_STALE_HOURS;

  afterEach(() => {
    if (prev === undefined) delete process.env.WIN_BACK_STALE_HOURS;
    else process.env.WIN_BACK_STALE_HOURS = prev;
  });

  it('defaults to 7 days (168h)', () => {
    delete process.env.WIN_BACK_STALE_HOURS;
    assert.equal(getWinBackStaleHours(), DEFAULT_STALE_HOURS);
    assert.equal(DEFAULT_STALE_HOURS, 168);
  });

  it('reads WIN_BACK_STALE_HOURS from env', () => {
    process.env.WIN_BACK_STALE_HOURS = '72';
    assert.equal(getWinBackStaleHours(), 72);
  });

  it('falls back on invalid env', () => {
    process.env.WIN_BACK_STALE_HOURS = 'nope';
    assert.equal(getWinBackStaleHours(), DEFAULT_STALE_HOURS);
  });
});
