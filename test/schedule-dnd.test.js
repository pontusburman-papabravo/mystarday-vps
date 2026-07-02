const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MODULE = 'public/js/schedule-dnd.js';
const HOST = 'public/js/schedule.js';
const HTML = 'public/schedule.html';

const WINDOW_FNS = [
  'initDragDrop',
  'captureAndAskReorder',
  'showReorderDialog',
  'cancelReorderDialog',
  'confirmReorderAllDays',
  'confirmReorderTodayOnly',
  'moveItem',
  'copyActivityToDay',
  'openDayDndModal',
  'closeDayDndModal',
  'doDayDndCopy',
  'doDayDndSwap',
];

describe('Fas 8 PR-S4 schedule-dnd.js', () => {
  it('is an IIFE exposing drag & drop handlers on window', () => {
    const src = read(MODULE);
    assert.match(src, /^\(function \(\) \{/m, `${MODULE} must be an IIFE`);
    for (const fn of WINDOW_FNS) {
      assert.match(src, new RegExp(`function ${fn}\\b`), `${MODULE} must define ${fn}`);
      assert.match(src, new RegExp(`window\\.${fn}\\s*=\\s*${fn};`), `${MODULE} must expose window.${fn}`);
    }
  });

  it('uses ScheduleCore for DAYS/SECTIONS', () => {
    const src = read(MODULE);
    assert.match(src, /const \{ DAYS, SECTIONS \} = window\.ScheduleCore;/);
  });

  it('keeps module-private Sortable/reorder/day-DnD state out of the global scope', () => {
    const src = read(MODULE);
    assert.match(src, /let scheduleSortables/);
    assert.match(src, /let scheduleDragSrc/);
    assert.match(src, /let _pendingReorderSection/);
    assert.match(src, /let _pendingReorderOrder/);
    assert.match(src, /let dayDndSrc = null, dayDndDst = null;/);
  });

  it('omits dead code saveReorder() (no callers anywhere in public/js)', () => {
    const src = read(MODULE);
    assert.doesNotMatch(src, /function saveReorder\b/);
    // But documents the decision so a future reader isn't confused by its absence.
    assert.match(src, /saveReorder/);
  });

  it('confirmReorderTodayOnly keeps schedule.js cal-view-aware date + error-path behavior', () => {
    const src = read(MODULE);
    assert.match(src, /getCurrentDayDateStr\(\)/);
    assert.doesNotMatch(src, /getCurrentDateStr\(\)/, 'must not use the dashboard-only getCurrentDateStr()');
    // Error path renders inside the catch block (schedule.js behavior), not after it.
    const fnMatch = src.match(/async function confirmReorderTodayOnly[\s\S]*?\n  \}\n/);
    assert.ok(fnMatch, 'confirmReorderTodayOnly not found');
    assert.match(fnMatch[0], /catch \(err\) \{\s*showToast\(err\.message[\s\S]*?renderSchedule\(\);\s*\}/);
  });

  it('preserves Sortable + day-DnD DOM contract', () => {
    const src = read(MODULE);
    assert.match(src, /items-'\s*\+\s*sec\.key/);
    assert.match(src, /\.drag-handle/);
    assert.match(src, /\.activity-item/);
    assert.match(src, /\.once-task-item/);
    assert.match(src, /getElementById\('dayDndModal'\)/);
    assert.match(src, /getElementById\('dayDndTitle'\)/);
    assert.match(src, /reorder-dialog-overlay/);
  });

  it('schedule.js no longer defines the extracted drag & drop functions', () => {
    const src = read(HOST);
    for (const fn of WINDOW_FNS) {
      assert.doesNotMatch(src, new RegExp(`function ${fn}\\b`), `schedule.js must not define ${fn}`);
    }
    assert.doesNotMatch(src, /function saveReorder\b/, 'schedule.js must not define saveReorder');
    assert.doesNotMatch(src, /let scheduleSortables/, 'schedule.js must not keep scheduleSortables state');
    assert.doesNotMatch(src, /let dayDndSrc/, 'schedule.js must not keep dayDndSrc state');
    assert.match(src, /schedule-dnd\.js/);
  });

  it('schedule.js retains shared DnD state used by renderDayTabs + schedule-views.js', () => {
    const src = read(HOST);
    assert.match(src, /let dndType = null;/);
    assert.match(src, /let dndSrcDay = null;/);
    // Day-tab drag/drop listeners stay in renderDayTabs — not moved.
    assert.match(src, /dndType = 'day-tab'; dndSrcDay = day;/);
    assert.match(src, /openDayDndModal\(dndSrcDay, day\)/);
    assert.match(src, /copyActivityToDay\(dragSrcItem, day\)/);
    // renderSchedule still triggers (re)initialization after each render.
    assert.match(src, /initDragDrop\(\);/);
  });

  it('schedule-activity-modals.js exports getCurrentDayDateStr for schedule-dnd.js + schedule.js callers', () => {
    const src = read('public/js/schedule-activity-modals.js');
    assert.match(src, /function getCurrentDayDateStr\b/);
    assert.match(src, /window\.getCurrentDayDateStr\s*=\s*getCurrentDayDateStr;/);
  });

  it('schedule.html loads schedule-dnd.js after schedule.js and before schedule-views.js', () => {
    const html = read(HTML);
    const hostIdx = html.indexOf('schedule.js?v=');
    const modIdx = html.indexOf('schedule-dnd.js');
    const viewsIdx = html.indexOf('schedule-views.js');
    assert.ok(hostIdx !== -1 && modIdx !== -1 && viewsIdx !== -1, 'expected script tags');
    assert.ok(hostIdx < modIdx, 'schedule.js must load before schedule-dnd.js');
    assert.ok(modIdx < viewsIdx, 'schedule-dnd.js must load before schedule-views.js');
  });

  it('schedule.html preserves drag & drop / reorder onclick contract', () => {
    const html = read(HTML);
    assert.match(html, /onclick="closeDayDndModal\(\)"/);
  });

  it('dashboard-dnd.js and schedule-dnd.js do not duplicate exports in the same host page', () => {
    const dashboardHtml = read('public/dashboard.html');
    const scheduleHtml = read(HTML);
    assert.doesNotMatch(scheduleHtml, /\/js\/dashboard-dnd\.js/, 'schedule.html must not also load dashboard-dnd.js');
    assert.doesNotMatch(dashboardHtml, /\/js\/schedule-dnd\.js/, 'dashboard.html must not also load schedule-dnd.js');
  });
});
