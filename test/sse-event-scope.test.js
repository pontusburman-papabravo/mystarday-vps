'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listChildScopedEventTypes, validateBroadcastPayload } = require('../src/lib/sse-event-scope');

test('child-scoped SSE events require childId at broadcast time', () => {
  for (const type of listChildScopedEventTypes()) {
    const bad = validateBroadcastPayload(type, {});
    assert.equal(bad.ok, false, type);
    const good = validateBroadcastPayload(type, { childId: '00000000-0000-4000-8000-000000000001' });
    assert.equal(good.ok, true, type);
  }
});

test('family-scoped SYSTEM_ALERT does not require childId', () => {
  assert.equal(validateBroadcastPayload('SYSTEM_ALERT', { message: 'x' }).ok, true);
});
