'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('dashboard-custody (Phase 4.5b)', () => {
  it('uses context API and calendar-week — no custody date logic', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/dashboard-custody.js'), 'utf8');
    assert.match(src, /\/api\/family\/custody\/context/);
    assert.match(src, /calendar-week/);
    assert.doesNotMatch(src, /getWeekVariantForDate/);
    assert.doesNotMatch(src, /custody-resolver/);
    assert.doesNotMatch(src, /Vecka A/);
  });

  it('prefers CustodyContext fields with legacy fallback', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/dashboard-custody.js'), 'utf8');
    assert.match(src, /activeHome/);
    assert.match(src, /isParentDay/);
    assert.match(src, /ctx\.home/);
    assert.match(src, /ctx\.isMyDay/);
    assert.match(src, /data-custody-home-label/);
  });
});
