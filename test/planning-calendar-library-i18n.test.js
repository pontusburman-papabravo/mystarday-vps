'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('calendar page boots without waiting only on late parent-i18n-ready', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/calendar.html'), 'utf8');
  assert.match(html, /ParentMagicPageBoot\.register\('calendar'/);
  assert.match(html, /DOMContentLoaded',\s*bootCalendar/);
  assert.match(html, /_calendarBooted/);
});

test('library-magic-schedules uses pt for segment labels', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/library-magic-schedules.js'), 'utf8');
  assert.match(src, /library\.standard\.segments\.schedules/);
  assert.doesNotMatch(src, /label: '📅 Scheman'/);
});
