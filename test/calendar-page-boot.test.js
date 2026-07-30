'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

describe('calendar-page boot and payload', () => {
  it('calendar.html loads page-boot before calendar-page and registers via external script', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/calendar.html'), 'utf8');
    assert.doesNotMatch(html, /<script>\s*function pt\(/);
    const bootIdx = html.indexOf('parent-magic-page-boot.js');
    const pageIdx = html.indexOf('calendar-page.js');
    const bootstrapIdx = html.indexOf('parent-magic-bootstrap.js');
    assert.ok(bootIdx > 0 && pageIdx > bootIdx, 'page-boot before calendar-page');
    assert.ok(bootstrapIdx > pageIdx, 'calendar-page before bootstrap');
    assert.match(html, /parent-magic-router\.js/);
  });

  it('calendar-page.js registers Magic boot handler after ParentMagicPageBoot', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/calendar-page.js'), 'utf8');
    assert.match(js, /registerCalendarBootHandler/);
    assert.match(js, /ParentMagicPageBoot\.register\('calendar'/);
    assert.match(js, /__bootCalendarPage/);
    assert.match(js, /stjarndag-magic-navigated/);
    assert.match(js, /resetCalendarBootState/);
  });

  it('parent-magic-router soft-nav loads calendar-page.js', () => {
    const router = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-router.js'), 'utf8');
    assert.match(router, /'\/calendar':\s*'calendar'/);
    assert.match(router, /calendar:\s*\[[\s\S]*calendar-page\.js/);
  });

  it('normalize rejects missing data.days and normalizes day.activities', () => {
    // Expose normalize for unit test via eval slice
    const js = fs.readFileSync(path.join(ROOT, 'public/js/calendar-page.js'), 'utf8');
    const fnBody = js.match(/function normalizeCalendarWeekPayload\(raw\) \{[\s\S]*?\n\}/)[0];
    const normalize = vm.runInNewContext(`${fnBody}; normalizeCalendarWeekPayload;`);
    assert.equal(normalize(null), null);
    assert.equal(normalize({ weekStart: '2026-01-01' }), null);
    const week = normalize({
      days: [{ date: '2026-01-01' }, { date: '2026-01-02', activities: [{ name: 'A' }] }],
      weekStart: '2026-01-01',
      weekEnd: '2026-01-07',
    });
    assert.ok(Array.isArray(week.days));
    assert.equal(week.days[0].activities.length, 0);
    assert.equal(week.days[1].activities.length, 1);
  });

  it('empty week days array is valid normalized payload', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/calendar-page.js'), 'utf8');
    const fnBody = js.match(/function normalizeCalendarWeekPayload\(raw\) \{[\s\S]*?\n\}/)[0];
    const normalize = vm.runInNewContext(`${fnBody}; normalizeCalendarWeekPayload;`);
    const week = normalize({ days: [], weekStart: '2026-01-01', weekEnd: '2026-01-07' });
    assert.ok(week && Array.isArray(week.days) && week.days.length === 0);
  });

  it('renderCalendar shows error path when days invalid (source guard)', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/calendar-page.js'), 'utf8');
    assert.match(js, /if \(!normalized \|\| !Array\.isArray\(normalized\.days\)\)/);
    assert.match(js, /showError\(pt\('schedule\.calendar\.loadError'\)\)/);
  });
});
