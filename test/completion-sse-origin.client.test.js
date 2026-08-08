'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SSE_JS = path.join(__dirname, '../public/js/child-dashboard-sse.js');

describe('child-dashboard SSE completion origin suppression', () => {
  const src = fs.readFileSync(SSE_JS, 'utf8');

  it('suppresses reload only when clientOriginId matches this device', () => {
    assert.match(src, /detail\.clientOriginId/);
    assert.match(src, /getChildCompletionClientId/);
    assert.doesNotMatch(src, /detail\.childId\s*===/);
  });

  it('still schedules reload when origin is absent (parent/widget/other device)', () => {
    assert.match(src, /scheduleSSEReload\(\)/);
    const handler = src.split("sse:DAILY_LOG_ITEM_COMPLETED")[1] || '';
    assert.match(handler, /clientOriginId === myOrigin/);
  });
});
