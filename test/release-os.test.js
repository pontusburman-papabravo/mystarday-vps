'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { childParentApiBlock } = require('../src/middleware/child-parent-api-block');

test('childParentApiBlock allows /me for child JWT', () => {
  let called = false;
  const req = { user: { type: 'child', id: 'c1' }, path: '/me/rewards' };
  const res = { status() { return res; }, json() {} };
  childParentApiBlock(req, res, () => { called = true; });
  assert.equal(called, true);
});

test('childParentApiBlock blocks /family for child JWT', () => {
  let statusCode;
  const req = { user: { type: 'child', id: 'c1' }, path: '/family/members' };
  const res = {
    status(code) { statusCode = code; return res; },
    json() {},
  };
  let nextCalled = false;
  childParentApiBlock(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(statusCode, 403);
});

test('childParentApiBlock passes parent through', () => {
  let called = false;
  const req = { user: { type: 'parent', id: 'p1' }, path: '/family/members' };
  const res = { status() { return res; }, json() {} };
  childParentApiBlock(req, res, () => { called = true; });
  assert.equal(called, true);
});
