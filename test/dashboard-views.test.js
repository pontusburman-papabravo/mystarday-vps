const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const WINDOW_EXPORTS = [
  'renderTimeline',
  'loadAllChildrenSchedules',
  'renderSbsView',
  'renderSbsChildSelector',
  'loadSbsSchedule',
  'selectSbsChild',
];

describe('F2d dashboard-views.js', () => {
  it('timeline + sbs views live in their own IIFE', () => {
    const src = read('public/js/dashboard-views.js');
    assert.match(src, /^\(function \(\) \{/m);
    assert.match(src, /const \{ DAYS, SECTIONS, fmtTime, getDayDateLabel \} = window\.ScheduleCore;/);
    assert.match(src, /function renderTimeline\(/);
    assert.match(src, /async function loadAllChildrenSchedules\(/);
    assert.match(src, /function renderSbsView\(/);
  });

  it('exposes entry points on window for setViewMode + legacy callers', () => {
    const src = read('public/js/dashboard-views.js');
    for (const fn of WINDOW_EXPORTS) {
      assert.match(src, new RegExp(`window\\.${fn}\\s*=\\s*${fn};`), `window.${fn} not exposed`);
    }
  });

  it('dashboard.js no longer defines the extracted functions', () => {
    const src = read('public/js/dashboard.js');
    for (const fn of WINDOW_EXPORTS) {
      assert.doesNotMatch(src, new RegExp(`function ${fn}\\b`), `dashboard.js must not still define ${fn}`);
    }
    assert.doesNotMatch(src, /function initTimelineDnd\(/);
    assert.doesNotMatch(src, /function initSbsDnd\(/);
  });

  it('dashboard.js still calls renderTimeline/renderSbsView from setViewMode', () => {
    const src = read('public/js/dashboard.js');
    assert.match(src, /mode === 'timeline'.*renderTimeline\(\)/);
    assert.match(src, /mode === 'sbs'.*renderSbsView\(\)/);
  });

  it('dashboard.html loads views after dashboard.js', () => {
    const html = read('public/dashboard.html');
    const dashIdx = html.indexOf('/js/dashboard.js');
    const viewsIdx = html.indexOf('/js/dashboard-views.js');
    assert.ok(viewsIdx !== -1, 'dashboard-views.js script tag missing');
    assert.ok(dashIdx < viewsIdx, 'views must load after dashboard.js');
  });

  it('sw.js cache version bumped for the split', () => {
    const src = read('public/sw.js');
    assert.match(src, /stjarndag-v31[0-9]|stjarndag-v3[2-9]\d/);
  });
});
