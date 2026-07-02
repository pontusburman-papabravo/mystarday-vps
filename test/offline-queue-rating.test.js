'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('offline-queue maps CHILD_RATE to ratings route', () => {
  const src = fs.readFileSync(path.join(__dirname, '../public/js/offline-queue.js'), 'utf8');
  assert.match(src, /case 'CHILD_RATE'/);
  assert.match(src, /\/api\/me\/daily-log-items\/\$\{itemId\}\/rate/);
  assert.doesNotMatch(src, /EMOTION_TOGGLE/);
  assert.doesNotMatch(src, /\/api\/me\/children\/\$\{childId\}\/emotion/);
  assert.match(src, /queueChildRate/);
});

test('offline-queue completion actions unchanged', () => {
  const src = fs.readFileSync(path.join(__dirname, '../public/js/offline-queue.js'), 'utf8');
  assert.match(src, /COMPLETE_ACTIVITY/);
  assert.match(src, /UNCOMPLETE_ACTIVITY/);
  assert.match(src, /\/api\/me\/daily-log-items\/\$\{itemId\}\/complete/);
});
