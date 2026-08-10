'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('offline queue keys completion by daily_log item id (not active child)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/offline-queue.js'), 'utf8');
  assert.match(src, /COMPLETE_ACTIVITY/);
  assert.match(src, /itemId/);
  assert.match(src, /return 'item:' \+ \(action\.payload\.itemId/);
  assert.match(src, /daily-log-items\/\$\{itemId\}/);
});

test('offline queue star/redeem payloads carry explicit childId', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/offline-queue.js'), 'utf8');
  assert.match(src, /ADD_STARS.*childId/s);
  assert.match(src, /REDEEM_REWARD.*childId/s);
  assert.match(src, /child_id: childId/);
});
