'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('apiLimiter applies per-user keys for authenticated traffic', () => {
  const limiter = fs.readFileSync(path.join(__dirname, '../src/middleware/rateLimiter.js'), 'utf8');
  assert.match(limiter, /keyGenerator: \(req\) => \{[\s\S]*user:\$\{req\.user\.id\}/);
  const skipBlock = limiter.slice(limiter.indexOf('const apiLimiter'));
  const skipFn = skipBlock.slice(skipBlock.indexOf('skip:'), skipBlock.indexOf('handler:'));
  assert.doesNotMatch(skipFn, /req\.user && req\.user\.id.*skip authenticated/);
});

test('globalLimiter still skips authenticated users at IP layer', () => {
  const limiter = fs.readFileSync(path.join(__dirname, '../src/middleware/rateLimiter.js'), 'utf8');
  assert.match(limiter, /req\.user && req\.user\.id/);
});
