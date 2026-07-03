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
  test('reload mid-timer: remaining from started_at, not full duration', () => {
    const { ATS, store } = loadActivityTimerSession();
    const childId = 'child-1';
    const date = '2026-07-03';
    const itemA = 'item-morning';

    ATS.startSession(childId, date, itemA, 120);
    const key = `activity_timer_session:${childId}:${date}:${itemA}`;
    const session = JSON.parse(store.get(key));
    session.started_at = new Date(Date.now() - 40_000).toISOString();
    store.set(key, JSON.stringify(session));

    const remaining = ATS.computeRemainingSeconds(
      ATS.getSession(childId, date, itemA),
      120
    );
    assert.ok(remaining >= 75 && remaining <= 82, `expected ~80s remaining, got ${remaining}`);
    assert.equal(ATS.resolveStatus(ATS.getSession(childId, date, itemA), 120), 'running');
  });

  test('two daily_log_item_ids same day do not share session', () => {
    const { ATS } = loadActivityTimerSession();
    const childId = 'child-1';
    const date = '2026-07-03';
    const morning = 'log-morning';
    const evening = 'log-evening';

    ATS.startSession(childId, date, morning, 120);

    assert.equal(ATS.resolveStatus(ATS.getSession(childId, date, morning), 120), 'running');
    assert.equal(ATS.resolveStatus(ATS.getSession(childId, date, evening), 120), 'idle');
  });

  test('end_sound_played flag persists on finished session', () => {
    const { ATS } = loadActivityTimerSession();
    const childId = 'c';
    const date = '2026-07-03';
    const itemId = 'i1';

    ATS.startSession(childId, date, itemId, 5);
    ATS.markFinished(childId, date, itemId);
    ATS.setEndSoundPlayed(childId, date, itemId);

    const again = ATS.getSession(childId, date, itemId);
    assert.equal(again.end_sound_played, true);
    assert.equal(ATS.resolveStatus(again, 5), 'finished');
  });

  test('clearSession removes key (Klar path)', () => {
    const { ATS, store } = loadActivityTimerSession();
    const childId = 'c';
    const date = '2026-07-03';
    const itemId = 'i1';
    ATS.startSession(childId, date, itemId, 60);
    ATS.clearSession(childId, date, itemId);
    assert.equal(ATS.getSession(childId, date, itemId), null);
    assert.equal(store.size, 0);
  });
});
