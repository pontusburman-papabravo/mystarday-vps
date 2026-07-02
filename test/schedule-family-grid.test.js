const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MODULE = 'public/js/schedule-family-grid.js';
const WINDOW_FNS = [
  'setScheduleMode',
  'fwRenderGrid',
  'fwChangeWeek',
  'fwGoToCurrentWeek',
  'fwGoToEdit',
];

describe('Fas 8 PR-S1 schedule-family-grid.js', () => {
  it('is an IIFE exposing family-grid handlers on window', () => {
    const src = read(MODULE);
    assert.match(src, /^\(function \(\) \{/m, `${MODULE} must be an IIFE`);
    for (const fn of WINDOW_FNS) {
      assert.match(src, new RegExp(`function ${fn}\\b`), `${MODULE} must define ${fn}`);
      assert.match(src, new RegExp(`window\\.${fn}\\s*=\\s*${fn};`), `${MODULE} must expose window.${fn}`);
    }
  });

  it('schedule.js no longer defines the extracted functions', () => {
    const src = read('public/js/schedule.js');
    for (const fn of WINDOW_FNS) {
      assert.doesNotMatch(src, new RegExp(`function ${fn}\\b`), `schedule.js must not still define ${fn}`);
    }
  });

  it('schedule.js retains family-grid shared state', () => {
    const src = read('public/js/schedule.js');
    assert.match(src, /let scheduleMode = 'single'/);
    assert.match(src, /let fwWeekOffset = 0/);
    assert.match(src, /let fwChildData = \{\}/);
  });

  it('schedule.html loads schedule-family-grid.js after schedule.js and before schedule-special-days.js', () => {
    const html = read('public/schedule.html');
    const schedIdx = html.indexOf('/js/schedule.js');
    const gridIdx = html.indexOf('/js/schedule-family-grid.js');
    const specialIdx = html.indexOf('/js/schedule-special-days.js');
    assert.ok(schedIdx !== -1, 'schedule.js script tag missing');
    assert.ok(gridIdx !== -1, 'schedule-family-grid.js script tag missing');
    assert.ok(specialIdx !== -1, 'schedule-special-days.js script tag missing');
    assert.ok(gridIdx > schedIdx, 'schedule-family-grid must load after schedule.js');
    assert.ok(gridIdx < specialIdx, 'schedule-family-grid must load before schedule-special-days.js');
  });

  it('schedule.html preserves family-grid DOM contract', () => {
    const html = read('public/schedule.html');
    assert.match(html, /id="familyGridView"/);
    assert.match(html, /id="fwGridContainer"/);
    assert.match(html, /id="fwWeekLabel"/);
    assert.match(html, /id="fwLegend"/);
    assert.match(html, /onclick="setScheduleMode\('family'\)"/);
    assert.match(html, /onclick="fwChangeWeek\(-1\)"/);
    assert.match(html, /onclick="fwGoToCurrentWeek\(\)"/);
  });

  it('family-grid module reads shared globals from schedule.js', () => {
    const src = read(MODULE);
    assert.match(src, /\bscheduleMode\b/);
    assert.match(src, /\bfwWeekOffset\b/);
    assert.match(src, /\bfwChildData\b/);
    assert.match(src, /\bchildren\b/);
    assert.match(src, /\bcurrentChildId\b/);
    assert.match(src, /\bcurrentDay\b/);
    assert.match(src, /\bselectChild\b/);
    assert.match(src, /\brenderDayTabs\b/);
    assert.match(src, /\bloadScheduleForDay\b/);
  });

  it('fwRenderGrid preserves grid DOM contract', () => {
    const src = read(MODULE);
    assert.match(src, /fw-grid/);
    assert.match(src, /fw-day-cell/);
    assert.match(src, /fw-pill/);
    assert.match(src, /fwGoToEdit/);
  });
});
