const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('F2c dashboard-star-history.js', () => {
  it('star-history logic lives in its own file as an IIFE', () => {
    const src = read('public/js/dashboard-star-history.js');
    assert.match(src, /^\(function \(\) \{/m);
    assert.match(src, /let starHistoryData = null;/);
    assert.match(src, /async function loadStarHistory\(/);
    assert.match(src, /function renderStarHistory\(/);
  });

  it('exposes entry points on window', () => {
    const src = read('public/js/dashboard-star-history.js');
    assert.match(src, /window\.loadStarHistory\s*=\s*loadStarHistory;/);
    assert.match(src, /window\.renderStarHistory\s*=\s*renderStarHistory;/);
  });

  it('dashboard.js no longer defines star-history state or functions', () => {
    const src = read('public/js/dashboard.js');
    assert.doesNotMatch(src, /let starHistoryData = null;/);
    assert.doesNotMatch(src, /async function loadStarHistory\(/);
    assert.doesNotMatch(src, /function renderStarHistory\(/);
  });

  it('dashboard.js still calls loadStarHistory at init + after give-stars', () => {
    const src = read('public/js/dashboard.js');
    assert.match(src, /loadStarHistory\(\)/);
  });

  it('dashboard.html loads star-history after dashboard.js', () => {
    const html = read('public/dashboard.html');
    const dashIdx = html.indexOf('/js/dashboard.js');
    const shIdx = html.indexOf('/js/dashboard-star-history.js');
    assert.ok(shIdx !== -1, 'dashboard-star-history.js script tag missing');
    assert.ok(dashIdx < shIdx, 'star-history must load after dashboard.js');
  });
});
