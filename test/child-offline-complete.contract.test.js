const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const QUEUE_SRC = path.join(__dirname, '../public/js/offline-queue.js');
const CHECKOFF_SRC = path.join(__dirname, '../public/js/child-dashboard-checkoff.js');
const STORE_SRC = path.join(__dirname, '../public/js/offline-store.js');

test('offline-queue exposes enqueue alias and queueComplete for child checkoff', () => {
  const q = fs.readFileSync(QUEUE_SRC, 'utf8');
  assert.match(q, /queueComplete\(itemId\)/);
  assert.match(q, /enqueue\(itemId, action\)/);
});

test('child checkoff queues offline before loadDay refresh path', () => {
  const c = fs.readFileSync(CHECKOFF_SRC, 'utf8');
  assert.match(c, /queuedOffline/);
  assert.match(c, /patchOfflineCompletionCache/);
  assert.match(c, /queueComplete\(itemId\)/);
});

test('offline-queue queueAction enqueues inside active IDB transaction', () => {
  const q = fs.readFileSync(QUEUE_SRC, 'utf8');
  assert.doesNotMatch(
    q,
    /tx\.oncomplete\s*=\s*\(\)\s*=>\s*\{[\s\S]*store\.add\(entry\)/
  );
  assert.match(q, /cursor\.continue\(\)[\s\S]*store\.add\(entry\)/);
});

test('offline store patches cached daily log item completion', () => {
  const s = fs.readFileSync(STORE_SRC, 'utf8');
  assert.match(s, /patchDailyLogItemCompleted/);
});
