'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  resolveFirstStarMode,
  applyFirstStarModeFilter,
} = require('../src/lib/first-star-mode');

describe('first-star-mode helpers', () => {
  it('resolveFirstStarMode is false when flag off', () => {
    assert.equal(resolveFirstStarMode({ flagEnabled: false, lifetimeCompletions: 0 }), false);
    assert.equal(resolveFirstStarMode({ flagEnabled: false, lifetimeCompletions: 3 }), false);
  });

  it('resolveFirstStarMode is true only with flag on and zero completions', () => {
    assert.equal(resolveFirstStarMode({ flagEnabled: true, lifetimeCompletions: 0 }), true);
    assert.equal(resolveFirstStarMode({ flagEnabled: true, lifetimeCompletions: 1 }), false);
  });

  it('applyFirstStarModeFilter returns first unchecked item tagged now', () => {
    const items = [
      { id: 'a', section: 'morgon', completed: true, sort_order: 0 },
      { id: 'b', section: 'morgon', completed: false, sort_order: 1 },
      { id: 'c', section: 'dag', completed: false, sort_order: 0 },
    ];
    const filtered = applyFirstStarModeFilter(items);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'b');
    assert.equal(filtered[0]._nnl_status, 'now');
  });

  it('applyFirstStarModeFilter respects section order morgon → dag → kvall → natt', () => {
    const items = [
      { id: 'k', section: 'kvall', completed: false, sort_order: 0 },
      { id: 'd', section: 'dag', completed: false, sort_order: 0 },
    ];
    const filtered = applyFirstStarModeFilter(items);
    assert.equal(filtered[0].id, 'd');
  });
});

describe('first-star-mode child daily-log API wiring', () => {
  it('child-self route wires flag, helpers, and first_star_mode response field', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/daily-logs/child-self.js'),
      'utf8'
    );
    assert.match(src, /FLAG_KEYS\.firstStarMode/);
    assert.match(src, /countLifetimeCompletions/);
    assert.match(src, /applyFirstStarModeFilter/);
    assert.match(src, /first_star_mode/);
  });

  it('migration seeds activation_first_star_mode_v1 default OFF', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../migrations/1809170000000_activation_first_star_mode_flag.js'),
      'utf8'
    );
    assert.match(src, /activation_first_star_mode_v1/);
    assert.match(src, /false/);
  });
});
