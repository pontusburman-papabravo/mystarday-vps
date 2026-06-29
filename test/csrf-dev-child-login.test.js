'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { csrfProtect } = require('../src/middleware/csrf');

function mockReq(method, path) {
  return {
    method,
    path,
    cookies: {},
    headers: {},
  };
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('csrfProtect exempts POST /auth/dev-child-login', () => {
  const req = mockReq('POST', '/auth/dev-child-login');
  const res = mockRes();
  let called = false;
  csrfProtect(req, res, () => { called = true; });
  assert.equal(called, true, 'middleware should call next() without CSRF token');
});
