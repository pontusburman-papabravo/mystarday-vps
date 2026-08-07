'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isChildRoutineBurstPath } = require('../src/middleware/rateLimiter');

test('child routine completion paths are burst-exempt route patterns', () => {
  assert.equal(isChildRoutineBurstPath({ originalUrl: '/api/me/daily-log-items/abc/complete' }), true);
  assert.equal(isChildRoutineBurstPath({ originalUrl: '/api/me/daily-log-items/abc/uncomplete' }), true);
  assert.equal(
    isChildRoutineBurstPath({ originalUrl: '/api/me/daily-log-items/abc/sub-steps/step-1/complete' }),
    true
  );
  assert.equal(isChildRoutineBurstPath({ originalUrl: '/api/me/goal' }), false);
  assert.equal(isChildRoutineBurstPath({ originalUrl: '/api/me/daily-log?date=2026-01-01' }), false);
});
