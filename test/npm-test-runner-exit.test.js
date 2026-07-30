'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseTapSummary } = require('../scripts/run-full-npm-test.js');

test('parseTapSummary reads final TAP counters', () => {
  const tap = `
ok 1 - a
not ok 2 - b
1..2
# tests 2
# pass 1
# fail 1
# skipped 0
# cancelled 0
`;
  const s = parseTapSummary(tap);
  assert.equal(s.pass, 1);
  assert.equal(s.fail, 1);
  assert.equal(s.skip, 0);
  assert.equal(s.cancelled, 0);
});
