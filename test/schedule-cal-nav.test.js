const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MODULE = 'public/js/schedule-cal-nav.js';
const WINDOW_FNS = [
  'getWeekStart',
  'getWeekNumber',
  'getDayFromOffset',
  'updateCalNavLabel',
  'setCalView',
  'calNavPrev',
  'calNavNext',
  'calNavToday',
  'refreshCalView',
  'renderMonthView',
  'calMonthDayClick',
];

describe('Fas 8 PR-S2 schedule-cal-nav.js', () => {
  it('is an IIFE exposing calendar nav on window and ScheduleCalNav', () => {
    const src = read(MODULE);
    assert.match(src, /^\(function \(\) \{/m, `${MODULE} must be an IIFE`);
    assert.match(src, /window\.ScheduleCalNav\s*=\s*\{/);
    assert.match(src, /registerHost,/);
    for (const fn of WINDOW_FNS) {
      assert.match(src, new RegExp(`function ${fn}\\b`), `${MODULE} must define ${fn}`);
      assert.match(src, new RegExp(`window\\.${fn}\\s*=\\s*${fn};`), `${MODULE} must expose window.${fn}`);
    }
  });

  it('uses registerHost for host-specific calendar behavior', () => {
    const src = read(MODULE);
    assert.match(src, /function registerHost\b/);
    assert.match(src, /hostHooks\.onSetCalView/);
    assert.match(src, /hostHooks\.onWeekNav/);
    assert.match(src, /hostHooks\.onCalNavToday/);
    assert.match(src, /hostHooks\.formatMonthChildName/);
  });

  it('preserves month view DOM contract', () => {
    const src = read(MODULE);
    assert.match(src, /getElementById\('scheduleContent'\)/);
    assert.match(src, /cal-scroll-wrap/);
    assert.match(src, /calMonthDayClick/);
    assert.match(src, /ScheduleCore\.DAYS_SHORT/);
  });

  it('host files no longer define extracted calendar functions', () => {
    for (const file of ['public/js/schedule.js', 'public/js/dashboard.js']) {
      const src = read(file);
      for (const fn of WINDOW_FNS) {
        assert.doesNotMatch(src, new RegExp(`function ${fn}\\b`), `${file} must not define ${fn}`);
      }
    }
  });

  it('host files register ScheduleCalNav hooks', () => {
    const sched = read('public/js/schedule.js');
    assert.match(sched, /ScheduleCalNav\.registerHost/);
    assert.match(sched, /onSetCalView/);
    assert.match(sched, /ScheduleCustody\.refresh/);
    assert.match(sched, /onCalNavToday/);

    const dash = read('public/js/dashboard.js');
    assert.match(dash, /ScheduleCalNav\.registerHost/);
    assert.match(dash, /formatMonthChildName/);
    assert.doesNotMatch(dash, /ScheduleCustody/);
  });

  it('host files retain calendar state declarations', () => {
    for (const file of ['public/js/schedule.js', 'public/js/dashboard.js']) {
      const src = read(file);
      assert.match(src, /let calView = 'week'/);
      assert.match(src, /let weekOffset = 0/);
      assert.match(src, /let dayOffset = 0/);
    }
  });

  it('schedule.html loads schedule-cal-nav after schedule-core and before schedule.js', () => {
    const html = read('public/schedule.html');
    const coreIdx = html.indexOf('/js/schedule-core.js');
    const navIdx = html.indexOf('/js/schedule-cal-nav.js');
    const schedIdx = html.indexOf('/js/schedule.js');
    assert.ok(coreIdx !== -1, 'schedule-core.js missing');
    assert.ok(navIdx !== -1, 'schedule-cal-nav.js missing');
    assert.ok(schedIdx !== -1, 'schedule.js missing');
    assert.ok(navIdx > coreIdx, 'schedule-cal-nav must load after schedule-core');
    assert.ok(navIdx < schedIdx, 'schedule-cal-nav must load before schedule.js');
  });

  it('dashboard.html loads schedule-cal-nav after schedule-core and before dashboard.js', () => {
    const html = read('public/dashboard.html');
    const coreIdx = html.indexOf('/js/schedule-core.js');
    const navIdx = html.indexOf('/js/schedule-cal-nav.js');
    const dashIdx = html.indexOf('/js/dashboard.js');
    assert.ok(coreIdx !== -1, 'schedule-core.js missing');
    assert.ok(navIdx !== -1, 'schedule-cal-nav.js missing');
    assert.ok(dashIdx !== -1, 'dashboard.js missing');
    assert.ok(navIdx > coreIdx, 'schedule-cal-nav must load after schedule-core');
    assert.ok(navIdx < dashIdx, 'schedule-cal-nav must load before dashboard.js');
  });

  it('both pages preserve cal-nav DOM contract', () => {
    for (const page of ['public/schedule.html', 'public/dashboard.html']) {
      const html = read(page);
      assert.match(html, /id="calNavLabel"/);
      assert.match(html, /id="btnViewDay"/);
      assert.match(html, /id="btnViewWeek"/);
      assert.match(html, /id="btnViewMonth"/);
      assert.match(html, /onclick="calNavPrev\(\)"/);
      assert.match(html, /onclick="calNavNext\(\)"/);
      assert.match(html, /onclick="calNavToday\(\)"/);
      assert.match(html, /onclick="setCalView\('week'\)"/);
    }
  });
});
