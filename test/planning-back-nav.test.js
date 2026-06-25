'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('planning-back-nav.js exports PlanningBackNav helpers', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/planning-back-nav.js'), 'utf8');
  assert.match(src, /PlanningBackNav/);
  assert.match(src, /markFromPlanning/);
  assert.match(src, /planFromPlanning/);
});

test('planning-hub marks planFromPlanning on hub link click', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/planning-hub.js'), 'utf8');
  assert.match(src, /PlanningBackNav\.markFromPlanning/);
});

test('assign-schedule auto-selects day after child pick', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/assign-schedule.html'), 'utf8');
  assert.match(html, /function updateEmptyState/);
  assert.match(html, /await selectDay\(defaultDayOfWeek\(\)\)/);
  assert.match(html, /id="emptyStateMsg"/);
});

test('assign-schedule confirm overlay above bottom nav', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/assign-schedule.html'), 'utf8');
  assert.match(html, /z-index:\s*10050/);
  assert.match(html, /\.confirm-overlay\.hidden[\s\S]*?display:\s*none\s*!important/);
  const css = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');
  assert.match(css, /parent-magic-page-assign-schedule \.confirm-overlay[\s\S]*?z-index:\s*10300/);
  assert.match(css, /parent-magic-page-assign-schedule \.confirm-overlay\.hidden[\s\S]*?display:\s*none\s*!important/);
});
