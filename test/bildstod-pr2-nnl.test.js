'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('bildstöd PR 2 — Senare copy (child UI)', () => {
  const childUiFiles = [
    'public/js/child-dashboard-activities.js',
    'public/js/child-dashboard-photo-cards.js',
  ];

  for (const file of childUiFiles) {
    it(`${file} uses i18n zoneLater (not hardcoded Sedan)`, () => {
      const src = read(file);
      assert.match(src, /today\.zoneLater|scheduleChrome\.nextBadge/);
      assert.doesNotMatch(src, /Nu\/Nästa\/Sedan/);
      if (file.includes('child-dashboard-activities') || file.includes('photo-cards')) {
        assert.doesNotMatch(src, /['"]Sedan['"]/);
      }
    });
  }

  it('child-dashboard.js exposes renderNowNextLaterZones', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /function renderNowNextLaterZones/);
    assert.match(src, /window\.renderNowNextLaterZones/);
    assert.match(src, /nnl-zones-layout/);
  });

  it('child-dashboard-activities delegates to renderNowNextLaterZones', () => {
    const src = read('public/js/child-dashboard-activities.js');
    assert.match(src, /renderNowNextLaterZones/);
  });

  it('child-week-overview.js is readonly IIFE using /api/me/weekly-schedule', () => {
    const src = read('public/js/child-week-overview.js');
    assert.match(src, /\(function \(\)/);
    assert.match(src, /\/api\/me\/weekly-schedule/);
    assert.match(src, /weekOverview\.title/);
    assert.doesNotMatch(src, /method:\s*['"]POST/);
  });
});

describe('bildstöd PR 2 — default view_type for new children', () => {
  it('children.js INSERT sets now_next_later', () => {
    const src = read('src/routes/children.js');
    assert.match(src, /INSERT INTO child[\s\S]*view_type[\s\S]*now_next_later/);
  });

  it('onboarding.js INSERT sets now_next_later', () => {
    const src = read('src/routes/onboarding.js');
    assert.match(src, /INSERT INTO child[\s\S]*view_type[\s\S]*now_next_later/);
  });

  it('migration sets column default without backfill UPDATE', () => {
    const src = read('migrations/1809400000000_child_view_type_default_now_next_later.js');
    assert.match(src, /SET DEFAULT 'now_next_later'/);
    assert.doesNotMatch(src, /UPDATE child/i);
  });

  it('onboarding default selectedViewType is timeline', () => {
    const src = read('public/js/onboarding.js');
    assert.match(src, /selectedViewType = 'timeline'/);
  });
});
