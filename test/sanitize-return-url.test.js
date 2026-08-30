'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeReturnUrl } = require('../src/lib/sanitize-return-url');

test('sanitizeReturnUrl strips pin query keys and keeps other params', () => {
  assert.equal(
    sanitizeReturnUrl('/child-wizard?id=abc&pin=1234&name=A'),
    '/child-wizard?id=abc&name=A'
  );
  assert.equal(sanitizeReturnUrl('/login?next=%2Fchild-wizard%3Fpin%3D1234'), '/login?next=%2Fchild-wizard');
  assert.equal(sanitizeReturnUrl('/home'), '/home');
  assert.equal(sanitizeReturnUrl('https://evil.example/x?pin=1'), '/');
  assert.equal(sanitizeReturnUrl('//evil.example?pin=1'), '/');
});
