'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  hashToken,
  isValidRawRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
} = require('../src/lib/refresh-tokens');

test('isValidRawRefreshToken accepts 64-char hex only', () => {
  const valid = 'a'.repeat(64);
  assert.equal(isValidRawRefreshToken(valid), true);
  assert.equal(isValidRawRefreshToken(''), false);
  assert.equal(isValidRawRefreshToken('[object Object]'), false);
  assert.equal(isValidRawRefreshToken(JSON.stringify({ raw: 'x' })), false);
  assert.equal(isValidRawRefreshToken({ raw: 'x' }), false);
  assert.equal(isValidRawRefreshToken(null), false);
});

test('hashToken returns null for non-string without throwing', () => {
  assert.equal(hashToken(null), null);
  assert.equal(hashToken({ raw: 'ab' }), null);
  assert.equal(hashToken('not-hex'), null);
});

test('verifyRefreshToken returns null for object-shaped cookie value', async () => {
  const row = await verifyRefreshToken('[object Object]');
  assert.equal(row, null);
});

test('setRefreshCookie refuses invalid value and clears cookie', () => {
  const cleared = [];
  const res = {
    cookie() {},
    clearCookie(name) {
      cleared.push(name);
    },
  };
  setRefreshCookie(res, { raw: 'deadbeef' });
  assert.deepEqual(cleared, ['refresh_token']);
});
