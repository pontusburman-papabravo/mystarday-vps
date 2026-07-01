'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('custody-banner (Phase 4.5a)', () => {
  it('consumes context API only — no custody date logic', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/custody-banner.js'), 'utf8');
    assert.match(src, /\/api\/family\/custody\/context/);
    assert.doesNotMatch(src, /getWeekVariantForDate/);
    assert.doesNotMatch(src, /custody-resolver/);
    assert.doesNotMatch(src, /Vecka A/);
    assert.doesNotMatch(src, /Vecka B/);
  });

  it('shows home label and next handoff hint from API', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/custody-banner.js'), 'utf8');
    assert.match(src, /Denna vecka: hos /);
    assert.match(src, /Nästa byte på /);
    assert.match(src, /nextHandoff|nextTransition/);
    assert.match(src, /activeHome/);
  });
});
