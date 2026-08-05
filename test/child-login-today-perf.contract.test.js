'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('child-login uses short post-success redirect with reduced-motion fast path', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/child-login.js'), 'utf8');
  assert.match(src, /childLoginPostSuccessRedirectMs/);
  assert.match(src, /prefers-reduced-motion:\s*reduce/);
  assert.match(src, /performance\.mark\('child-login-success'\)/);
  assert.doesNotMatch(src, /setTimeout\(\(\)\s*=>\s*\{\s*window\.location\.href\s*=\s*'\/child\/today';\s*\},\s*1200\)/);
});

test('loadDay renders activities before background ratings fetch', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-load-day.js'), 'utf8');
  const renderIdx = src.indexOf('renderActivities(data');
  const bgRatingsIdx = src.indexOf('void loadRatingsForItems');
  assert.ok(renderIdx > 0 && bgRatingsIdx > renderIdx, 'renderActivities before background ratings');
  assert.doesNotMatch(src, /await loadRatingsForItems/);
  assert.match(src, /performance\.mark\('child-today-first-activities-rendered'\)/);
});
