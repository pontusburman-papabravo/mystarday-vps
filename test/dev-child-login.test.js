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

test('isDevChildLoginAllowed: false when not in development mode and remote DB', () => {
  const prevDb = process.env.DATABASE_URL;
  const prevEnv = process.env.NODE_ENV; // pragma: allowlist secret
  process.env.DATABASE_URL = 'postgresql://user@remote.example.com:5432/stjarndag';
  process.env.NODE_ENV = 'test'; // pragma: allowlist secret
  try {
    assert.equal(mockReq('localhost', 'test'), false);
    assert.equal(mockReq('example.com', 'test'), false);
  } finally {
    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;
    if (prevEnv === undefined) delete process.env.NODE_ENV; // pragma: allowlist secret
    else process.env.NODE_ENV = prevEnv; // pragma: allowlist secret
  }
});

test('isDevChildLoginAllowed: false on non-local host even in development', () => {
  assert.equal(mockReq('example.com', 'development'), false);
});

test('isDevChildLoginAllowed: respects ALLOW_DEV_CHILD_SKIP=true on localhost', () => {
  const prevSkip = process.env.ALLOW_DEV_CHILD_SKIP;
  const prevEnv = process.env.NODE_ENV; // pragma: allowlist secret
  process.env.ALLOW_DEV_CHILD_SKIP = 'true';
  process.env.NODE_ENV = 'test'; // pragma: allowlist secret
  try {
    assert.equal(isDevChildLoginAllowed({ hostname: 'localhost' }), true);
  } finally {
    if (prevSkip === undefined) delete process.env.ALLOW_DEV_CHILD_SKIP;
    else process.env.ALLOW_DEV_CHILD_SKIP = prevSkip;
    if (prevEnv === undefined) delete process.env.NODE_ENV; // pragma: allowlist secret
    else process.env.NODE_ENV = prevEnv; // pragma: allowlist secret
  }
});

test('isDevChildLoginAllowed: true on localhost with local DATABASE_URL', () => {
  const prevDb = process.env.DATABASE_URL;
  const prevEnv = process.env.NODE_ENV; // pragma: allowlist secret
  process.env.DATABASE_URL = 'postgresql://user@localhost:5432/stjarndag';
  process.env.NODE_ENV = 'test'; // pragma: allowlist secret
  try {
    assert.equal(isDevChildLoginAllowed({ hostname: 'localhost' }), true);
  } finally {
    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;
    if (prevEnv === undefined) delete process.env.NODE_ENV; // pragma: allowlist secret
    else process.env.NODE_ENV = prevEnv; // pragma: allowlist secret
  }
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
