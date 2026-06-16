'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const config = require('../src/lib/config');
const { childParentApiBlock } = require('../src/middleware/child-parent-api-block');
const { injectPlatformHtml } = require('../src/middleware/platform-html');

test('childParentApiBlock allows /me for child JWT', () => {
  let called = false;
  const req = { user: { type: 'child', id: 'c1' }, path: '/me/rewards' };
  const res = { status() { return res; }, json() {} };
  childParentApiBlock(req, res, () => { called = true; });
  assert.equal(called, true);
});

test('childParentApiBlock allows verify-pin for child JWT', () => {
  let called = false;
  const req = { user: { type: 'child', id: 'c1' }, path: '/family/verify-pin' };
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

test('childParentApiBlock restores parent session for GET /children', () => {
  const parentToken = jwt.sign(
    { type: 'parent', id: 'p1', familyId: 'f1' },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
  const session = Buffer.from(JSON.stringify({
    access_token: parentToken,
    refresh_token: 'rt',
  }), 'utf8').toString('base64');

  let called = false;
  const req = {
    user: { type: 'child', id: 'c1' },
    path: '/children',
    cookies: { stjarndag_parent_session: session },
  };
  const res = { status() { return res; }, json() {} };
  childParentApiBlock(req, res, () => {
    called = true;
    assert.equal(req.user.type, 'parent');
    assert.equal(req.user.id, 'p1');
  });
  assert.equal(called, true);
});

test('childParentApiBlock denies unknown child routes by default', () => {
  let statusCode;
  const req = { user: { type: 'child', id: 'c1' }, path: '/messages/inbox' };
  const res = {
    status(code) { statusCode = code; return res; },
    json() {},
  };
  childParentApiBlock(req, res, () => {});
  assert.equal(statusCode, 403);
});

test('childParentApiBlock passes parent through', () => {
  let called = false;
  const req = { user: { type: 'parent', id: 'p1' }, path: '/family/members' };
  const res = { status() { return res; }, json() {} };
  childParentApiBlock(req, res, () => { called = true; });
  assert.equal(called, true);
});

test('injectPlatformHtml adds device-mode and skips duplicate platform.js', () => {
  const html = '<!DOCTYPE html><html><head><script src="/js/platform.js"></script></head><body></body></html>';
  const out = injectPlatformHtml(html);
  assert.match(out, /device-mode\.js/);
  assert.match(out, /native-tab-bar\.js/);
  assert.match(out, /parent-tab-bar\.css/);
  const platformCount = (out.match(/\/js\/platform\.js/g) || []).length;
  assert.equal(platformCount, 1);
});

test('getChildAccess SQL filters revoked_at', () => {
  const fs = require('fs');
  const authz = fs.readFileSync(require('path').join(__dirname, '../src/middleware/authz.js'), 'utf8');
  assert.match(authz, /getChildAccess[\s\S]*revoked_at IS NULL/);
});

test('login-picker path allowed for child JWT', () => {
  let called = false;
  const req = { user: { type: 'child', id: 'c1' }, path: '/auth/login-picker-children' };
  const res = { status() { return res; }, json() {} };
  childParentApiBlock(req, res, () => { called = true; });
  assert.equal(called, true);
});

test('injectPlatformHtml is idempotent', () => {
  const once = injectPlatformHtml('<html><head></head><body></body></html>');
  const twice = injectPlatformHtml(once);
  assert.equal(once, twice);
});
