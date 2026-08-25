'use strict';

/**
 * Regression test for the duplicate "all done" celebration bug:
 * when today-focus-mode is active (the default for every child since
 * ChildTodayFocus.init() is called unconditionally), renderActivities()
 * used to ALSO render its own legacy celebCard + full-screen confetti on
 * top of ChildTodayFocus's own one-time celebration overlay — two "all
 * done" boxes/frames stacked on the same event. See public/js/child-today-focus.js
 * (showCelebrationOverlay) and public/js/child-dashboard-activities.js.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-activities.js'), 'utf8');

function fakeContainer() {
  return {
    innerHTML: '',
    querySelectorAll: function () { return []; },
  };
}

function loadActivitiesModule({ focusLayerOn }) {
  const container = fakeContainer();
  const confettiCalls = [];
  const sandbox = {
    window: {
      cpt: function (key) { return key; },
    },
    cpt: function (key) { return key; },
    document: {
      getElementById: function (id) {
        return id === 'scheduleView' ? container : null;
      },
    },
    console: console,
    currentDate: '2026-08-25',
    todayStr: '2026-08-25',
    viewType: 'now_next_later',
    showNowNext: false,
    subStepExpanded: {},
    checkMilestones: function () {},
    initChildSortable: function () {},
    initTimeTimers: function () {},
    launchConfetti: function () { confettiCalls.push(true); },
    isTodayFocusLayer: function () { return focusLayerOn; },
    setTimeout: setTimeout,
  };
  vm.runInNewContext(SRC, sandbox, { filename: 'child-dashboard-activities.js' });
  return { win: sandbox.window, container, confettiCalls };
}

function allDoneDailyLog() {
  return { items: [], total: 2, completed: 2, now_next_filtered: true };
}

describe('child dashboard — all-done celebration is not duplicated', () => {
  it('today-focus-mode ON: renderActivities skips the legacy celebCard + confetti (ChildTodayFocus owns the celebration)', () => {
    const { win, container, confettiCalls } = loadActivitiesModule({ focusLayerOn: true });
    win.renderActivities(allDoneDailyLog(), 10);
    assert.doesNotMatch(container.innerHTML, /celebCard/, 'legacy celebration card must not render alongside the focus-mode overlay');
    assert.equal(confettiCalls.length, 0, 'legacy full-screen confetti must not fire alongside the focus-mode overlay');
  });

  it('today-focus-mode OFF (fallback): renderActivities still shows its own celebration', () => {
    const { win, container, confettiCalls } = loadActivitiesModule({ focusLayerOn: false });
    win.renderActivities(allDoneDailyLog(), 10);
    assert.match(container.innerHTML, /celebCard/, 'fallback celebration card should still render when ChildTodayFocus is unavailable');
    return new Promise((resolve) => {
      setTimeout(() => {
        assert.equal(confettiCalls.length, 1, 'fallback confetti should still fire when ChildTodayFocus is unavailable');
        resolve();
      }, 250);
    });
  });
});
