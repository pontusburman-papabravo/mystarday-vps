'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { isDashboardReadPath, isDashboardReadBurstRequest } = require('../src/middleware/rateLimiter');

describe('isDashboardReadPath — exact prod-log burst endpoints only', () => {
  test('matches every path from the prod incident list', () => {
    const exactPaths = [
      '/family',
      '/children',
      '/family/dashboard-stats',
      '/family/readiness',
      '/family/next-action',
      '/family/first-success',
      '/family/activation-config',
      '/family/star-history',
      '/family/custody/context',
      '/family/locale-context',
      '/rewards/pending-requests',
      '/widget/native-status',
      '/notifications/unread-count',
      '/messages/unread',
      '/subscription/status',
      '/iap/config',
      '/dagens-nyhet/banner',
      '/reports/active-count',
      '/growth/feedback/eligible',
      '/account/referral',
    ];
    for (const p of exactPaths) {
      assert.equal(isDashboardReadPath({ path: p }), true, `expected ${p} to match`);
    }
  });

  test('matches /for-dig/* sub-paths', () => {
    assert.equal(isDashboardReadPath({ path: '/for-dig/goals' }), true);
    assert.equal(isDashboardReadPath({ path: '/for-dig/installs' }), true);
    assert.equal(isDashboardReadPath({ path: '/for-dig/popular' }), true);
    assert.equal(isDashboardReadPath({ path: '/for-dig/favorites' }), true);
  });

  test('matches /me/journey-context and its /registry sub-path', () => {
    assert.equal(isDashboardReadPath({ path: '/me/journey-context' }), true);
    assert.equal(isDashboardReadPath({ path: '/me/journey-context/registry' }), true);
  });

  test('does NOT sweep unrelated /family/* or /me/* sub-paths into the read bucket', () => {
    assert.equal(isDashboardReadPath({ path: '/family/settings' }), false);
    assert.equal(isDashboardReadPath({ path: '/family/add-parent' }), false);
    assert.equal(isDashboardReadPath({ path: '/family/trusted-devices/this-device' }), false);
    assert.equal(isDashboardReadPath({ path: '/me/activation-program/new-completions' }), false);
  });

  test('does not match unrelated endpoints', () => {
    assert.equal(isDashboardReadPath({ path: '/rewards' }), false);
    assert.equal(isDashboardReadPath({ path: '/activities' }), false);
  });
});

describe('isDashboardReadBurstRequest — method + actor gating', () => {
  test('authenticated parent GET on a read path is eligible', () => {
    assert.equal(
      isDashboardReadBurstRequest({ method: 'GET', path: '/family', user: { id: 'p1', type: 'parent' } }),
      true
    );
  });

  test('HEAD on a read path is eligible', () => {
    assert.equal(
      isDashboardReadBurstRequest({ method: 'HEAD', path: '/children', user: { id: 'p1', type: 'parent' } }),
      true
    );
  });

  test('mutations (POST/PUT/PATCH/DELETE) are never eligible, even on a read path', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.equal(
        isDashboardReadBurstRequest({ method, path: '/family', user: { id: 'p1', type: 'parent' } }),
        false,
        `${method} must stay on the standard apiLimiter bucket`
      );
    }
  });

  test('child sessions are never eligible', () => {
    assert.equal(
      isDashboardReadBurstRequest({ method: 'GET', path: '/family', user: { id: 'c1', type: 'child' } }),
      false
    );
  });

  test('admin sessions are never eligible', () => {
    assert.equal(
      isDashboardReadBurstRequest({ method: 'GET', path: '/family', user: { id: 'a1', type: 'parent', isAdmin: true } }),
      false
    );
  });

  test('unauthenticated requests are never eligible', () => {
    assert.equal(isDashboardReadBurstRequest({ method: 'GET', path: '/family', user: null }), false);
  });

  test('a non-read path is never eligible regardless of actor', () => {
    assert.equal(
      isDashboardReadBurstRequest({ method: 'GET', path: '/rewards', user: { id: 'p1', type: 'parent' } }),
      false
    );
  });
});
