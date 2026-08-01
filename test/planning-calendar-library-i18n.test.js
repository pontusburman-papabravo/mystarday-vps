'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('calendar page boots via calendar-page.js after parent-magic-page-boot', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/calendar.html'), 'utf8');
  assert.match(html, /calendar-page\.js/);
  assert.doesNotMatch(html, /ParentMagicPageBoot\.register\('calendar'/);
  const bootIdx = html.indexOf('parent-magic-page-boot.js');
  const pageIdx = html.indexOf('calendar-page.js');
  assert.ok(bootIdx > 0 && pageIdx > bootIdx, 'parent-magic-page-boot.js must load before calendar-page.js');
  const js = fs.readFileSync(path.join(ROOT, 'public/js/calendar-page.js'), 'utf8');
  assert.match(js, /registerCalendarBootHandler/);
  assert.match(js, /normalizeCalendarWeekPayload/);
  assert.match(js, /stjarndag-magic-navigated/);
});

test('library-magic-schedules uses pt for segment labels', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/library-magic-schedules.js'), 'utf8');
  assert.match(src, /library\.standard\.segments\.schedules/);
  assert.doesNotMatch(src, /label: '📅 Scheman'/);
});

test('library-magic-schedules toggles std panes from _stdSegment', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/library-magic-schedules.js'), 'utf8');
  assert.match(src, /function stdPaneClass\(segmentId\)/);
  assert.match(src, /stdPaneClass\('schedules'\)/);
  assert.match(src, /stdPaneClass\('activities'\)/);
  assert.match(src, /stdPaneClass\('rewards'\)/);
  assert.doesNotMatch(src, /library-magic-std-pane hidden" data-std-pane="activities"/);
});

test('library-magic-schedules preserves legacy containers across render', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/library-magic-schedules.js'), 'utf8');
  assert.match(src, /restoreLegacyStdContent\(\);\s*\n\s*if \(_detailId/s);
});

test('library-magic.css styles copied standard rows in section mount (dark)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'public/css/library-magic.css'), 'utf8');
  assert.match(css, /#libraryMagicSectionMount \.bg-green-50/);
  assert.match(css, /#libraryMagicSectionMount \.text-navy/);
});
