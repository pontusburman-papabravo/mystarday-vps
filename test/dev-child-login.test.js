'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isDevChildLoginAllowed } = require('../src/lib/dev-child-login');

function mockReq(host, nodeEnv) {
  const prev = process.env.NODE_ENV; // pragma: allowlist secret
  if (nodeEnv !== undefined) process.env.NODE_ENV = nodeEnv; // pragma: allowlist secret
  const req = { hostname: host };
  const result = isDevChildLoginAllowed(req);
  if (nodeEnv !== undefined) process.env.NODE_ENV = prev; // pragma: allowlist secret
  return result;
}

test('isDevChildLoginAllowed: true on localhost in development', () => {
  assert.equal(mockReq('localhost', 'development'), true);
  assert.equal(mockReq('127.0.0.1', 'development'), true);
});

test('isDevChildLoginAllowed: false when not in development mode', () => {
  assert.equal(mockReq('localhost', 'test'), false);
  assert.equal(mockReq('example.com', 'test'), false);
});

test('isDevChildLoginAllowed: false on non-local host even in development', () => {
  assert.equal(mockReq('example.com', 'development'), false);
});

test('isDevChildLoginAllowed: respects DEV_CHILD_SKIP_LOGIN=false', () => {
  const prev = process.env.DEV_CHILD_SKIP_LOGIN;
  process.env.DEV_CHILD_SKIP_LOGIN = 'false';
  try {
    assert.equal(mockReq('localhost', 'development'), false);
  } finally {
    if (prev === undefined) delete process.env.DEV_CHILD_SKIP_LOGIN;
    else process.env.DEV_CHILD_SKIP_LOGIN = prev;
  }
});
