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
    const fnMatch = src.match(/function templateActivitiesForDay[\s\S]*?^}/m);
    assert.ok(fnMatch, 'templateActivitiesForDay not found');
    const fn = fnMatch[0];
    const homeIdx = fn.indexOf('templatesByHome');
    const variantIdx = fn.indexOf('weekVariantForHomeId');
    assert.ok(homeIdx > 0 && variantIdx > homeIdx, 'custody_home_id lookup must precede week_variant');
    assert.match(src, /legacyWeekVariant/);
    assert.match(src, /@deprecated Phase 4 UI/);
  });
});
