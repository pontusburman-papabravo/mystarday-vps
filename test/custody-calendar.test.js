'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('calendar custody (Phase 4.3)', () => {
  it('calendar-week uses schedule engine, not custody-resolver', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/calendar.js'), 'utf8');
    assert.match(src, /resolveCustodyDateSync/);
    assert.match(src, /loadCustodyContext/);
    assert.match(src, /custody_home_id/);
    assert.doesNotMatch(src, /custody-resolver/);
    assert.doesNotMatch(src, /getWeekVariantForDate/);
    assert.doesNotMatch(src, /getHomeForDate/);
  });

  it('template lookup follows custody_home_id → week_variant → legacy order', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/calendar.js'), 'utf8');
    assert.match(src, /weekVariantForHomeId/);
    assert.match(src, /templatesByHome/);
    assert.match(src, /templatesByVariant/);
  });
});
