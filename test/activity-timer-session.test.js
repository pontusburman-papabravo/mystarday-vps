'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadActivityTimerSession() {
  const store = new Map();
  const window = {
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, value);
      },
      removeItem(key) {
        store.delete(key);
      },
      get length() {
        return store.size;
      },
      key(i) {
        return [...store.keys()][i] ?? null;
      },
    },
  };
  const code = fs.readFileSync(
    path.join(__dirname, '../public/js/activity-timer-session.js'),
    'utf8'
  );
  vm.runInNewContext(code, { window, localStorage: window.localStorage, console });
  return { ATS: window.ActivityTimerSession, store };
}

describe('activity-timer-session (localStorage)', () => {
  test('start sets ends_at and running status', () => {
    const { ATS } = loadActivityTimerSession();
    const s = ATS.startSession('c1', '2026-07-03', 'item-1', 120);
    assert.equal(s.status, 'running');
    assert.ok(s.ends_at);
    assert.equal(ATS.resolveStatus(s, 120), 'running');
  });

  test('reload mid-timer: remaining from ends_at', () => {
    const { ATS, store } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'item-1', 120);
    const key = 'activity_timer_session:c1:2026-07-03:item-1';
    const session = JSON.parse(store.get(key));
    session.ends_at = new Date(Date.now() + 40_000).toISOString();
    store.set(key, JSON.stringify(session));

    const remaining = ATS.computeRemainingSeconds(ATS.getSession('c1', '2026-07-03', 'item-1'), 120);
    assert.ok(remaining >= 38 && remaining <= 42);
  });

  test('pause and resume freeze and continue countdown', () => {
    const { ATS } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'item-1', 60);
    ATS.pauseSession('c1', '2026-07-03', 'item-1', 60);
    let session = ATS.getSession('c1', '2026-07-03', 'item-1');
    assert.equal(ATS.resolveStatus(session, 60), 'paused');
    const pausedRemaining = ATS.computeRemainingSeconds(session, 60);

    ATS.resumeSession('c1', '2026-07-03', 'item-1');
    session = ATS.getSession('c1', '2026-07-03', 'item-1');
    assert.equal(ATS.resolveStatus(session, 60), 'running');
    const afterResume = ATS.computeRemainingSeconds(session, 60);
    assert.ok(afterResume >= pausedRemaining - 2 && afterResume <= pausedRemaining + 2);
  });

  test('stop clears session (IDLE)', () => {
    const { ATS, store } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'item-1', 60);
    ATS.stopSession('c1', '2026-07-03', 'item-1');
    assert.equal(ATS.getSession('c1', '2026-07-03', 'item-1'), null);
    assert.equal(store.size, 0);
    assert.equal(ATS.resolveStatus(null, 60), 'idle');
  });

  test('start is idempotent while running (no ends_at reset)', () => {
    const { ATS, store } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'item-1', 60);
    const key = 'activity_timer_session:c1:2026-07-03:item-1';
    const first = JSON.parse(store.get(key));
    const endsFirst = first.ends_at;
    ATS.startSession('c1', '2026-07-03', 'item-1', 60);
    const second = JSON.parse(store.get(key));
    assert.equal(second.ends_at, endsFirst);
  });

  test('force restart replaces running session', () => {
    const { ATS, store } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'item-1', 30);
    const key = 'activity_timer_session:c1:2026-07-03:item-1';
    const running = JSON.parse(store.get(key));
    running.ends_at = new Date(Date.now() + 4_000).toISOString();
    store.set(key, JSON.stringify(running));
    ATS.startSession('c1', '2026-07-03', 'item-1', 30, undefined, { force: true });
    const rem = ATS.computeRemainingSeconds(ATS.getSession('c1', '2026-07-03', 'item-1'), 30);
    assert.ok(rem >= 28 && rem <= 30);
  });

  test('restart starts fresh running session', () => {
    const { ATS } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'item-1', 30);
    ATS.pauseSession('c1', '2026-07-03', 'item-1', 30);
    ATS.startSession('c1', '2026-07-03', 'item-1', 30, undefined, { force: true });
    const session = ATS.getSession('c1', '2026-07-03', 'item-1');
    assert.equal(ATS.resolveStatus(session, 30), 'running');
    const rem = ATS.computeRemainingSeconds(session, 30);
    assert.ok(rem >= 28 && rem <= 30);
  });

  test('natural end resolves to finished', () => {
    const { ATS, store } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'item-1', 5);
    const key = 'activity_timer_session:c1:2026-07-03:item-1';
    const session = JSON.parse(store.get(key));
    session.ends_at = new Date(Date.now() - 1000).toISOString();
    store.set(key, JSON.stringify(session));
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-07-03', 'item-1'), 5), 'finished');
    assert.equal(ATS.computeRemainingSeconds(ATS.getSession('c1', '2026-07-03', 'item-1'), 5), 0);
  });

  test('clearSession removes key (Klar path)', () => {
    const { ATS, store } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'item-1', 60);
    ATS.clearSession('c1', '2026-07-03', 'item-1');
    assert.equal(ATS.getSession('c1', '2026-07-03', 'item-1'), null);
    assert.equal(store.size, 0);
  });

  test('corrupt localStorage does not throw', () => {
    const { ATS, store } = loadActivityTimerSession();
    store.set('activity_timer_session:c1:2026-07-03:bad', '{not-json');
    store.set('activity_timer_session:c1:2026-07-03:bad2', JSON.stringify({ foo: 1 }));
    assert.equal(ATS.getSession('c1', '2026-07-03', 'bad'), null);
    assert.equal(ATS.getSession('c1', '2026-07-03', 'bad2'), null);
    assert.equal(ATS.resolveStatus(null, 60), 'idle');
  });

  test('sandProgress matches remaining at start, half, pause, finished', () => {
    const { ATS, store } = loadActivityTimerSession();
    const duration = 100;
    assert.equal(ATS.sandProgress(100, duration), 0);
    assert.equal(ATS.sandProgress(50, duration), 0.5);
    assert.equal(ATS.sandProgress(0, duration), 1);
    ATS.startSession('c1', '2026-07-03', 'item-1', duration);
    const key = 'activity_timer_session:c1:2026-07-03:item-1';
    const running = JSON.parse(store.get(key));
    running.ends_at = new Date(Date.now() + 50_000).toISOString();
    store.set(key, JSON.stringify(running));
    ATS.pauseSession('c1', '2026-07-03', 'item-1', duration);
    const session = ATS.getSession('c1', '2026-07-03', 'item-1');
    const pausedRem = ATS.computeRemainingSeconds(session, duration);
    assert.ok(pausedRem >= 48 && pausedRem <= 52);
    assert.ok(Math.abs(ATS.sandProgress(pausedRem, duration) - 0.5) < 0.05);
  });

  test('two daily_log_item_ids same day do not share session', () => {
    const { ATS } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'morning', 120);
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-07-03', 'morning'), 120), 'running');
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-07-03', 'evening'), 120), 'idle');
  });

  test('sub-step session uses distinct storage key', () => {
    const { ATS, store } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'item-1', 60, 'sub-a');
    ATS.startSession('c1', '2026-07-03', 'item-1', 90);
    assert.equal(ATS.sessionToken('item-1', 'sub-a'), 'item-1:sub:sub-a');
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-07-03', 'item-1', 'sub-a'), 60), 'running');
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-07-03', 'item-1'), 90), 'running');
    assert.equal(store.size, 2);
  });

  test('double resume is idempotent (running session unchanged)', () => {
    const { ATS, store } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'item-1', 60);
    ATS.pauseSession('c1', '2026-07-03', 'item-1', 60);
    const first = ATS.resumeSession('c1', '2026-07-03', 'item-1');
    const second = ATS.resumeSession('c1', '2026-07-03', 'item-1');
    assert.equal(second.ends_at, first.ends_at);
    const key = 'activity_timer_session:c1:2026-07-03:item-1';
    assert.equal(store.size, 1);
    assert.equal(JSON.parse(store.get(key)).status, 'running');
  });

  test('paused remaining stable across simulated delay', () => {
    const { ATS, store } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'item-1', 30);
    const key = 'activity_timer_session:c1:2026-07-03:item-1';
    const running = JSON.parse(store.get(key));
    running.ends_at = new Date(Date.now() + 10_000).toISOString();
    store.set(key, JSON.stringify(running));
    ATS.pauseSession('c1', '2026-07-03', 'item-1', 30);
    const paused = ATS.getSession('c1', '2026-07-03', 'item-1');
    const rem1 = ATS.computeRemainingSeconds(paused, 30);
    const rem2 = ATS.computeRemainingSeconds(paused, 30);
    assert.equal(rem1, rem2);
    assert.equal(paused.ends_at, null);
  });

  test('clearSessionsForDailyLogItem removes parent and sub-step keys', () => {
    const { ATS, store } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'item-1', 30);
    ATS.startSession('c1', '2026-07-03', 'item-1', 45, 'sub-1');
    assert.equal(store.size, 2);
    ATS.clearSessionsForDailyLogItem('c1', '2026-07-03', 'item-1');
    assert.equal(store.size, 0);
  });

  test('siblings do not share timer state (different childId)', () => {
    const { ATS } = loadActivityTimerSession();
    ATS.startSession('child-a', '2026-07-03', 'item-1', 60);
    assert.equal(ATS.resolveStatus(ATS.getSession('child-a', '2026-07-03', 'item-1'), 60), 'running');
    assert.equal(ATS.resolveStatus(ATS.getSession('child-b', '2026-07-03', 'item-1'), 60), 'idle');
  });

  test('old schedule date does not leak timer to new day', () => {
    const { ATS } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-02', 'item-1', 60);
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-07-03', 'item-1'), 60), 'idle');
    assert.equal(ATS.getSession('c1', '2026-07-02', 'item-1')?.status, 'running');
  });

  test('pruneSessions removes stale daily_log_item keys', () => {
    const { ATS, store } = loadActivityTimerSession();
    ATS.startSession('c1', '2026-07-03', 'keep-item', 30);
    ATS.startSession('c1', '2026-07-03', 'drop-item', 30);
    assert.equal(store.size, 2);
    ATS.pruneSessions('c1', '2026-07-03', ['keep-item']);
    assert.ok(store.has('activity_timer_session:c1:2026-07-03:keep-item'));
    assert.equal(store.has('activity_timer_session:c1:2026-07-03:drop-item'), false);
  });
});
