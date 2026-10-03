'use strict';

/**
 * PR3 — Planering has three primary choices. Calendar is a view of the week.
 * Hem does not host a second schedule editor.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function sliceBetween(src, start, end) {
  const from = src.indexOf(start);
  const to = src.indexOf(end);
  assert.ok(from >= 0 && to > from, `missing ${start} .. ${end}`);
  return src.slice(from, to);
}

describe('Planering three primary choices', () => {
  it('primary destinations are Veckan, Aktiviteter, and Mer', () => {
    const src = read('public/js/planning-hub.js');
    const primary = sliceBetween(src, 'const PRIMARY_CHOICES', 'const MER_LINKS');
    assert.match(primary, /planning\.primary\.week\.title/);
    assert.match(primary, /'\/schedule'/);
    assert.match(primary, /planning\.primary\.activities\.title/);
    assert.match(primary, /'\/library'/);
    assert.match(src, /primaryCardHtml\(PRIMARY_CHOICES\[0\], 'week'\)/);
    assert.match(src, /primaryCardHtml\(PRIMARY_CHOICES\[1\], 'activities'\)/);
    assert.match(src, /data-planning-primary="more"/);
    assert.doesNotMatch(primary, /\/calendar/);
    assert.doesNotMatch(primary, /\/daily-log/);
    assert.doesNotMatch(src, /href: '\/calendar'/);
    assert.doesNotMatch(src, /href: '\/daily-log'/);
  });

  it('Mer contains print and assign and does not promote daily log', () => {
    const src = read('public/js/planning-hub.js');
    const mer = sliceBetween(src, 'const MER_LINKS', 'const CUSTODY_LINK');
    assert.match(mer, /\/print-schema/);
    assert.match(mer, /\/assign-schedule/);
    assert.match(src, /setAttribute\('data-overlay', 'modal'\)/);
    assert.match(src, /el\.id = 'planningMoreSheet'/);
    assert.doesNotMatch(src, /dailyLog/);
    assert.doesNotMatch(src, /\/daily-log/);
    assert.doesNotMatch(read('public/js/planning-hub.js'), /z-index\s*:|z-\[\d+\]/);
  });

  it('/calendar compatibility sends the parent to the schedule calendar view', () => {
    const routes = read('src/routes/index.js');
    assert.match(routes, /app\.get\('\/calendar'/);
    assert.match(routes, /params\.set\('view', 'calendar'\)/);
    assert.match(routes, /res\.redirect\(302, '\/schedule\?' \+ params\.toString\(\)\)/);
    const page = read('public/calendar.html');
    assert.match(page, /window\.location\.replace\('\/schedule\?' \+ params\.toString\(\)\)/);
    assert.match(page, /params\.set\('view', 'calendar'\)/);
    const schedule = read('public/schedule.html');
    assert.match(schedule, /id="scheduleCalendarView"/);
    assert.match(schedule, /calendar-page\.js/);
    const boot = read('public/js/schedule.js');
    assert.match(boot, /preSelectView === 'calendar'/);
    assert.match(boot, /ScheduleCalendarView\.show\(\)/);
    assert.match(read('public/js/calendar-page.js'), /function renderGrid/);
    assert.match(read('public/js/calendar-page.js'), /function renderCalendar/);
  });

  it('Hem no longer opens an in-page schedule editor', () => {
    const html = read('public/dashboard.html');
    const js = read('public/js/dashboard.js');
    const hub = read('public/js/dashboard-home-hub.js');
    const add = read('public/js/dashboard-activity-modal.js');
    assert.doesNotMatch(html, /id="scheduleEditorView"/);
    assert.doesNotMatch(js, /scheduleEditorView/);
    assert.doesNotMatch(hub, /scheduleEditorView/);
    assert.match(js, /function canonicalScheduleHref/);
    assert.match(js, /return '\/schedule\?child=' \+ encodeURIComponent\(childId\)/);
    assert.match(js, /window\.location\.assign\(canonicalScheduleHref\(id\)\)/);
    assert.match(add, /\/schedule\?child=/);
    assert.match(read('public/schedule.html'), /id="scheduleEditorView"/);
    assert.match(read('public/js/schedule.js'), /scheduleEditorView/);
  });

  it('nav-config keeps exactly five parent tabs', () => {
    const src = read('public/js/nav-config.js');
    const block = sliceBetween(src, 'const PRIMARY_NAV = [', 'const SETTINGS_NAV');
    const ids = [...block.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
    assert.deepEqual(ids, ['home', 'planning', 'rewards', 'for_you', 'family']);
    assert.doesNotMatch(block, /href: '\/calendar'/);
  });
});
