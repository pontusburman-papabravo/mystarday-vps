'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveDefaultScheduleName } = require('../src/lib/seed-child-default-schedule');

describe('resolveDefaultScheduleName', () => {
  it('defaults to förskola without birthday', () => {
    assert.equal(resolveDefaultScheduleName(null), 'Förskola vardag');
    assert.equal(resolveDefaultScheduleName(undefined), 'Förskola vardag');
  });

  it('uses skola for age 6+', () => {
    const sixYearsAgo = new Date();
    sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 7);
    const birthday = sixYearsAgo.toISOString().slice(0, 10);
    assert.equal(resolveDefaultScheduleName(birthday), 'Skola vardag');
  });

  it('uses förskola for age under 6', () => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const birthday = twoYearsAgo.toISOString().slice(0, 10);
    assert.equal(resolveDefaultScheduleName(birthday), 'Förskola vardag');
  });
});
