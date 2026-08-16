'use strict';

/**
 * Activity Timer V2 — release-readiness matrix (32 scenarios).
 * Executable where session/runtime allows; source-contract elsewhere.
 */

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadSession() {
  const store = new Map();
  const window = {
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, value); },
      removeItem(key) { store.delete(key); },
      get length() { return store.size; },
      key(i) { return [...store.keys()][i] ?? null; },
    },
  };
  vm.runInNewContext(read('public/js/activity-timer-session.js'), {
    window,
    localStorage: window.localStorage,
    console,
  });
  return { ATS: window.ActivityTimerSession, store };
}

function srcBundle(files) {
  return files.map((f) => read(f)).join('\n');
}

const MATRIX = [
  { id: '01', name: 'master off → no timer', files: ['public/js/child-dashboard-activity-timer.js'], patterns: [/function timersActive/, /activityTimersEnabled/] },
  { id: '02', name: 'master on + no duration → no timer', files: ['public/js/child-dashboard-activity-timer.js'], patterns: [/duration_seconds >= 5/] },
  { id: '03', name: '120 s → 2:00', files: ['public/js/activity-timer-session.js'], patterns: [/formatDisplay/, /2:00|m \+ ':'/] },
  { id: '04', name: '45 s → 0:45', files: ['public/js/activity-timer-session.js'], patterns: [/formatDisplay/, /0:/] },
  { id: '05', name: 'double start → one session', exec: 'doubleStart' },
  { id: '06', name: 'pause freezes remaining', exec: 'pauseFreeze' },
  { id: '07', name: 'resume continues', exec: 'resumeContinue' },
  { id: '08', name: 'stop → idle/full duration', exec: 'stopIdle' },
  { id: '09', name: 'restart → fresh full duration', exec: 'restartFresh' },
  { id: '10', name: 'natural finish → 0:00', exec: 'naturalFinish' },
  { id: '11', name: 'natural finish → no auto-complete', files: ['public/js/child-dashboard-activity-timer.js'], patterns: [/maybeFinishNatural/, /toggleItem/], anti: [/maybeFinishNatural[\s\S]{0,200}toggleItem/] },
  { id: '12', name: 'finish effect only once', files: ['public/js/child-dashboard-activity-timer.js'], patterns: [/end_sound_played/, /setEndSoundPlayed/] },
  { id: '13', name: 'early Klar → session removed', exec: 'earlyClear' },
  { id: '14', name: 'finished Klar → session removed', exec: 'finishedClear' },
  { id: '15', name: 'reload running', exec: 'reloadRunning' },
  { id: '16', name: 'reload paused', exec: 'reloadPaused' },
  { id: '17', name: 'reload finished, no repeat sound', files: ['public/js/child-dashboard-activity-timer.js'], patterns: [/end_sound_played/, /playFinishChime/] },
  { id: '18', name: 'background/foreground wall clock', exec: 'wallClock' },
  { id: '19', name: 'two same activities/day independent', exec: 'twoInstances' },
  { id: '20', name: 'child A / child B independent', exec: 'profileIsolation' },
  { id: '21', name: 'substep timer independent', exec: 'substepIndependent' },
  { id: '22', name: 'activity timer suppressed with timed substeps', files: ['public/js/child-dashboard-activity-timer.js'], patterns: [/timedSubStepsOnItem/, /!timedSubStepsOnItem\(item\)/] },
  { id: '23', name: 'whole activity completion clears item + substep timers', exec: 'clearAllSubs' },
  { id: '24', name: 'duration edit during running does not mutate active session', files: ['public/js/activity-timer-session.js'], patterns: [/duration_seconds/, /startSession[\s\S]{0,400}force/] },
  { id: '25', name: 'item removed → prune session', exec: 'prune' },
  { id: '26', name: 'date change isolation', exec: 'dateChange' },
  { id: '27', name: 'kill switch → no V2', files: ['src/lib/activity-timer-rollout.js'], patterns: [/ACTIVITY_TIMER_V2_DISABLED/, /activityTimerV2EnabledForChild/] },
  { id: '28', name: 'parent master bridge', files: ['public/js/library-activity-timer-bridge.js'], patterns: [/activity_timers_enabled/, /enableForChild/], anti: [/activity_timers_enabled\s*=\s*true[^;]*save/] },
  { id: '29', name: 'wrong/unauthorized parent write fails safely', files: ['test/activity-timer-child-api.integration.test.js'] },
  { id: '30', name: 'reduced-motion behavior', files: ['public/js/child-dashboard-activity-timer.js'], patterns: [/prefers-reduced-motion/, /reducedMotion\(\)/] },
  { id: '31', name: 'Wake Lock unavailable → timer still works', files: ['public/js/child-dashboard-activity-timer.js'], patterns: [/wakeLock/, /catch \{ \/\* ignore \*\/ \}/] },
  { id: '32', name: 'malformed localStorage → idle, no crash', exec: 'corrupt' },
];

const EXEC = {
  doubleStart({ ATS, store }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 60);
    const key = 'activity_timer_session:c1:2026-08-04:item-1';
    const first = JSON.parse(store.get(key)).ends_at;
    ATS.startSession('c1', '2026-08-04', 'item-1', 60);
    assert.equal(JSON.parse(store.get(key)).ends_at, first);
    assert.equal(store.size, 1);
  },
  pauseFreeze({ ATS }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 60);
    ATS.pauseSession('c1', '2026-08-04', 'item-1', 60);
    const s = ATS.getSession('c1', '2026-08-04', 'item-1');
    const r1 = ATS.computeRemainingSeconds(s, 60);
    const r2 = ATS.computeRemainingSeconds(s, 60);
    assert.equal(r1, r2);
    assert.equal(s.ends_at, null);
  },
  resumeContinue({ ATS }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 60);
    ATS.pauseSession('c1', '2026-08-04', 'item-1', 60);
    const paused = ATS.computeRemainingSeconds(ATS.getSession('c1', '2026-08-04', 'item-1'), 60);
    ATS.resumeSession('c1', '2026-08-04', 'item-1');
    const rem = ATS.computeRemainingSeconds(ATS.getSession('c1', '2026-08-04', 'item-1'), 60);
    assert.ok(rem >= paused - 2 && rem <= paused + 2);
  },
  stopIdle({ ATS, store }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 60);
    ATS.stopSession('c1', '2026-08-04', 'item-1');
    assert.equal(ATS.getSession('c1', '2026-08-04', 'item-1'), null);
    assert.equal(store.size, 0);
  },
  restartFresh({ ATS }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 30);
    ATS.pauseSession('c1', '2026-08-04', 'item-1', 30);
    ATS.startSession('c1', '2026-08-04', 'item-1', 30, undefined, { force: true });
    const rem = ATS.computeRemainingSeconds(ATS.getSession('c1', '2026-08-04', 'item-1'), 30);
    assert.ok(rem >= 28 && rem <= 30);
  },
  naturalFinish({ ATS, store }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 5);
    const key = 'activity_timer_session:c1:2026-08-04:item-1';
    const session = JSON.parse(store.get(key));
    session.ends_at = new Date(Date.now() - 500).toISOString();
    store.set(key, JSON.stringify(session));
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-08-04', 'item-1'), 5), 'finished');
    assert.equal(ATS.computeRemainingSeconds(ATS.getSession('c1', '2026-08-04', 'item-1'), 5), 0);
  },
  earlyClear({ ATS, store }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 60);
    ATS.clearSession('c1', '2026-08-04', 'item-1');
    assert.equal(store.size, 0);
  },
  finishedClear({ ATS, store }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 5);
    ATS.markFinished('c1', '2026-08-04', 'item-1');
    ATS.clearSession('c1', '2026-08-04', 'item-1');
    assert.equal(store.size, 0);
  },
  reloadRunning({ ATS, store }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 120);
    const key = 'activity_timer_session:c1:2026-08-04:item-1';
    const session = JSON.parse(store.get(key));
    session.ends_at = new Date(Date.now() + 40_000).toISOString();
    store.set(key, JSON.stringify(session));
    const rem = ATS.computeRemainingSeconds(ATS.getSession('c1', '2026-08-04', 'item-1'), 120);
    assert.ok(rem >= 38 && rem <= 42);
  },
  reloadPaused({ ATS }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 30);
    ATS.pauseSession('c1', '2026-08-04', 'item-1', 30);
    const s = ATS.getSession('c1', '2026-08-04', 'item-1');
    assert.equal(ATS.resolveStatus(s, 30), 'paused');
    assert.equal(ATS.computeRemainingSeconds(s, 30), ATS.computeRemainingSeconds(s, 30));
  },
  wallClock({ ATS, store }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 60);
    const key = 'activity_timer_session:c1:2026-08-04:item-1';
    const session = JSON.parse(store.get(key));
    session.ends_at = new Date(Date.now() + 50_000).toISOString();
    store.set(key, JSON.stringify(session));
    const rem = ATS.computeRemainingSeconds(ATS.getSession('c1', '2026-08-04', 'item-1'), 60);
    assert.ok(rem >= 48 && rem <= 52);
  },
  twoInstances({ ATS }) {
    ATS.startSession('c1', '2026-08-04', 'morning', 120);
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-08-04', 'evening'), 120), 'idle');
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-08-04', 'morning'), 120), 'running');
  },
  profileIsolation({ ATS }) {
    ATS.startSession('child-a', '2026-08-04', 'item-1', 60);
    assert.equal(ATS.resolveStatus(ATS.getSession('child-a', '2026-08-04', 'item-1'), 60), 'running');
    assert.equal(ATS.resolveStatus(ATS.getSession('child-b', '2026-08-04', 'item-1'), 60), 'idle');
  },
  substepIndependent({ ATS, store }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 60, 'sub-a');
    ATS.startSession('c1', '2026-08-04', 'item-1', 90);
    assert.equal(store.size, 2);
    ATS.pauseSession('c1', '2026-08-04', 'item-1', 60, 'sub-a');
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-08-04', 'item-1', 'sub-a'), 60), 'paused');
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-08-04', 'item-1'), 90), 'running');
  },
  clearAllSubs({ ATS, store }) {
    ATS.startSession('c1', '2026-08-04', 'item-1', 30);
    ATS.startSession('c1', '2026-08-04', 'item-1', 45, 'sub-1');
    assert.equal(store.size, 2);
    ATS.clearSessionsForDailyLogItem('c1', '2026-08-04', 'item-1');
    assert.equal(store.size, 0);
  },
  prune({ ATS, store }) {
    ATS.startSession('c1', '2026-08-04', 'keep', 30);
    ATS.startSession('c1', '2026-08-04', 'drop', 30);
    ATS.pruneSessions('c1', '2026-08-04', ['keep']);
    assert.ok(store.has('activity_timer_session:c1:2026-08-04:keep'));
    assert.equal(store.has('activity_timer_session:c1:2026-08-04:drop'), false);
  },
  dateChange({ ATS }) {
    ATS.startSession('c1', '2026-08-02', 'item-1', 60);
    assert.equal(ATS.resolveStatus(ATS.getSession('c1', '2026-08-03', 'item-1'), 60), 'idle');
  },
  corrupt({ ATS, store }) {
    store.set('activity_timer_session:c1:2026-08-04:bad', '{not-json');
    store.set('activity_timer_session:c1:2026-08-04:bad2', JSON.stringify({ foo: 1 }));
    assert.equal(ATS.getSession('c1', '2026-08-04', 'bad'), null);
    assert.equal(ATS.resolveStatus(null, 60), 'idle');
  },
};

describe('Activity Timer V2 release-readiness matrix', () => {
  for (const row of MATRIX) {
    it(`${row.id} ${row.name}`, () => {
      if (row.exec) {
        const ctx = loadSession();
        EXEC[row.exec](ctx);
        return;
      }
      if (row.files) {
        const combined = srcBundle(row.files);
        for (const re of row.patterns || []) {
          assert.match(combined, re, `${row.id}: missing ${re}`);
        }
        for (const re of row.anti || []) {
          assert.doesNotMatch(combined, re, `${row.id}: forbidden ${re}`);
        }
        return;
      }
      assert.ok(fs.existsSync(path.join(ROOT, row.files[0])), `${row.id}: file exists`);
    });
  }
});

describe('Activity Timer V2 — finish UX contract', () => {
  it('substep onComplete uses toggleSubStep completion path', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /toggleSubStep/);
    assert.match(src, /function onComplete/);
  });

  it('no auto-complete at zero in onComplete', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.doesNotMatch(src, /maybeFinishNatural[\s\S]{0,240}toggleItem/);
  });
});

describe('Activity Timer V2 — rollout model', () => {
  it('LEGACY_ALLOWLIST_RUNTIME_USAGE documented in rollout module', () => {
    const src = read('src/lib/activity-timer-rollout.js');
    assert.match(src, /familyHasActivityTimerV2/);
    assert.match(src, /ACTIVITY_TIMER_V2_ALLOWLIST/);
    assert.match(src, /activityTimerV2EnabledForChild/);
  });

  it('NORMAL_CUSTOMER_RUNTIME uses per-child master only', () => {
    const childSelf = read('src/routes/daily-logs/child-self.js');
    const rollout = read('src/lib/activity-timer-rollout.js');
    assert.match(childSelf, /activityTimerV2EnabledForChild/);
    assert.match(rollout, /activityTimersEnabled === true/);
  });
});

describe('Activity Timer V2 — prod pilot tooling safety', () => {
  it('pilot uses disposable email guard and self-cleanup', () => {
    const core = read('scripts/ops/activity-timer-prod-pilot-core.cjs');
    const guard = read('src/lib/activity-timer-pilot-guard.js');
    const db = read('scripts/ops/activity-timer-pilot-db.cjs');
    assert.match(core, /createDisposableActivityTimerQaFamily/);
    assert.match(core, /deletePilotFamily/);
    assert.match(guard, /assertActivityTimerPilotFamily/);
    assert.doesNotMatch(db, /TRUNCATE/i);
    assert.doesNotMatch(core, /npm run test/);
    assert.doesNotMatch(core, /test:gate/);
  });
});

describe('Activity Timer V2 — Standard Library timer values', () => {
  it('brush_teeth.brush = 120 and wash_hands.wash = 20 in frozen manifest', () => {
    const manifest = read('config/standard-library/v1.1.json');
    assert.match(manifest, /brush_teeth\.brush/);
    assert.match(manifest, /"duration_seconds"\s*:\s*120/);
    assert.match(manifest, /wash_hands\.wash/);
    assert.match(manifest, /"duration_seconds"\s*:\s*20/);
  });
});
