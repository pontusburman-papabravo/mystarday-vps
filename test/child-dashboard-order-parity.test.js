'use strict';

const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('child dashboard order parity (API-driven)', () => {
  it('day_sections preserves API item order (no client sortByTime)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../public/js/child-dashboard-activities.js'),
      'utf8'
    );
    assert.doesNotMatch(src, /sortByTime/);
    assert.match(src, /items: sections\['morgon'\]/);
  });

  it('now_next_later path iterates items in API order within sections', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../public/js/child-dashboard-activities.js'),
      'utf8'
    );
    assert.match(src, /for \(const item of sections\[section\]\)/);
    assert.match(src, /viewType === 'day_sections'/);
  });

  it('photo cards render from same items array as classic list', () => {
    const photo = fs.readFileSync(
      path.join(__dirname, '../public/js/child-dashboard-photo-cards.js'),
      'utf8'
    );
    assert.match(photo, /renderPhotoActivityCard|renderSubstepsBlock/);
  });

  it('Idag focus quest queue follows API item order', () => {
    const focus = fs.readFileSync(
      path.join(__dirname, '../public/js/child-today-focus.js'),
      'utf8'
    );
    assert.doesNotMatch(focus, /sortBySchedule/);
    assert.match(focus, /const ordered = items/);
  });
});
