'use strict';

const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

test('getDomainTrackingStatus reports tracking inactive when subdomain missing', async () => {
  const domainPath = require.resolve('../src/lib/resend-domain-status');
  delete require.cache[domainPath];
  const { getDomainTrackingStatus, clearDomainStatusCache } = require('../src/lib/resend-domain-status');

  clearDomainStatusCache();
  process.env.RESEND_API_KEY = 're_test_key';

  const originalFetch = global.fetch;
  global.fetch = mock.fn(async (url) => {
    if (String(url).endsWith('/domains')) {
      return {
        ok: true,
        json: async () => ({
          data: [{ id: 'dom-1', name: 'mystarday.se' }],
        }),
      };
    }
    if (String(url).includes('/domains/dom-1')) {
      return {
        ok: true,
        json: async () => ({
          name: 'mystarday.se',
          status: 'verified',
          open_tracking: false,
          click_tracking: false,
          tracking_subdomain: null,
          records: [],
        }),
      };
    }
    throw new Error('unexpected url ' + url);
  });

  try {
    const status = await getDomainTrackingStatus();
    assert.equal(status.available, true);
    assert.equal(status.domain, 'mystarday.se');
    assert.equal(status.tracking_active, false);
    assert.equal(status.open_tracking, false);
    assert.equal(status.click_tracking, false);
  } finally {
    global.fetch = originalFetch;
    clearDomainStatusCache();
    delete process.env.RESEND_API_KEY;
  }
});

test('getDomainTrackingStatus reports tracking active when subdomain verified', async () => {
  const domainPath = require.resolve('../src/lib/resend-domain-status');
  delete require.cache[domainPath];
  const { getDomainTrackingStatus, clearDomainStatusCache } = require('../src/lib/resend-domain-status');

  clearDomainStatusCache();
  process.env.RESEND_API_KEY = 're_test_key';

  const originalFetch = global.fetch;
  global.fetch = mock.fn(async (url) => {
    if (String(url).endsWith('/domains')) {
      return {
        ok: true,
        json: async () => ({
          data: [{ id: 'dom-1', name: 'mystarday.se' }],
        }),
      };
    }
    if (String(url).includes('/domains/dom-1')) {
      return {
        ok: true,
        json: async () => ({
          name: 'mystarday.se',
          status: 'verified',
          open_tracking: true,
          click_tracking: true,
          tracking_subdomain: 'links',
          records: [{ record: 'Tracking', status: 'verified' }],
        }),
      };
    }
    throw new Error('unexpected url ' + url);
  });

  try {
    const status = await getDomainTrackingStatus();
    assert.equal(status.tracking_active, true);
    assert.equal(status.tracking_subdomain, 'links');
  } finally {
    global.fetch = originalFetch;
    clearDomainStatusCache();
    delete process.env.RESEND_API_KEY;
  }
});
