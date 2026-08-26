'use strict';

/**
 * Regression test: last check-off of the day must not open the mood/rating
 * modal on top of the ChildTodayFocus ALL_DONE celebration overlay.
 *
 * Flow under test (public/js/child-dashboard-checkoff.js + child-today-focus.js):
 *   toggleItem() -> _processCheckOff() -> coalescedLoadDay()
 *   -> ChildTodayFocus.updateFromDailyLog() resolves ALL_DONE -> celebration overlay
 *   -> openRatingModal() must be skipped for THIS check-off (dayJustBecameAllDone()).
 *
 * Non-last check-offs (day still ACTIVE afterwards) must keep opening the
 * rating modal as before when mood rating is enabled.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FOCUS_SRC = fs.readFileSync(path.join(ROOT, 'public/js/child-today-focus.js'), 'utf8');
const CHECKOFF_SRC = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-checkoff.js'), 'utf8');

function fakeClassList(initial) {
  const set = new Set(initial || []);
  return {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    toggle: (c, force) => {
      if (force === undefined) { set.has(c) ? set.delete(c) : set.add(c); }
      else if (force) set.add(c);
      else set.delete(c);
    },
    contains: (c) => set.has(c),
  };
}

function fakeEl(overrides) {
  return Object.assign({
    textContent: '',
    value: '',
    style: {},
    dataset: {},
    classList: fakeClassList(['hidden']),
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    querySelector: () => null,
    addEventListener: () => {},
  }, overrides || {});
}

function fakeGenericEl() {
  return {
    classList: fakeClassList([]),
    querySelector: () => null,
    addEventListener: () => {},
    appendChild: () => {},
  };
}

/**
 * @param {object} loadDayPayload — daily-log payload ChildTodayFocus should resolve
 *   from the (mocked) coalescedLoadDay() call triggered by this check-off.
 */
function loadCheckoffModule(loadDayPayload) {
  const bodyAppends = [];
  const cardEl = fakeEl({ dataset: { feedbackFor: 'both', itemIcon: '⭐', itemName: 'Borsta tänder' } });
  const ratingModalEl = fakeEl();
  const elements = {
    'card-a1': cardEl,
    ratingModal: ratingModalEl,
    ratingActivityIcon: fakeEl(),
    ratingActivityName: fakeEl(),
    ratingComment: fakeEl(),
    moodSlider: fakeEl(),
    ratingSliderBlock: fakeEl(),
    ratingCardsBlock: fakeEl(),
    ratingFaceBlock: fakeEl(),
    scoreDisplay: fakeEl(),
    scoreLabel: fakeEl(),
  };
  const doc = {
    getElementById: (id) => elements[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => fakeGenericEl(),
    body: { appendChild: (el) => { bodyAppends.push(el); } },
    documentElement: { classList: fakeClassList([]), getAttribute: () => null },
  };

  const win = {
    cpt: (key) => key,
    addEventListener: () => {},
  };

  // Only run zero-delay timers synchronously; ignore delayed ones (celebration
  // dismiss, dopamine bursts, scroll-into-view) — irrelevant to this test and
  // would otherwise keep the process alive waiting on real timers.
  const fakeSetTimeout = (fn, ms) => { if (!ms) fn(); return 0; };

  const sandbox = {
    window: win,
    document: doc,
    console,
    navigator: { onLine: true },
    setTimeout: fakeSetTimeout,
    cpt: win.cpt,
    me: { id: 'child1' },
    currentDate: '2026-08-25',
    todayStr: '2026-08-25',
    getLocalDate: () => '2026-08-25',
    subStepCache: { a1: [] },
    subStepExpanded: {},
    itemRatings: {},
    showMoodRating: true,
    moodInputMode: 'slider',
    Auth: {
      api: async (url) => (url.includes('/sub-steps') ? { sub_steps: [] } : {}),
    },
    coalescedLoadDay: async () => {
      win.ChildTodayFocus.updateFromDailyLog(loadDayPayload, true);
    },
    launchDopaminBurst: () => {},
    showToast: () => {},
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(FOCUS_SRC, context, { filename: 'child-today-focus.js' });
  // child-dashboard-checkoff.js reads window.ChildTodayFocus AND bare
  // ChildTodayFocus (same convention used throughout child-dashboard*.js,
  // relying on window === globalThis in a real browser) — bridge it here
  // since our sandbox's `window` is a plain object, not the vm global.
  context.ChildTodayFocus = win.ChildTodayFocus;
  vm.runInContext(CHECKOFF_SRC, context, { filename: 'child-dashboard-checkoff.js' });

  return { win, ratingModalEl, bodyAppends };
}

async function flushMicrotasks() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe('child check-off — ALL_DONE celebration owns the screen exclusively', () => {
  it('last check-off (day becomes ALL_DONE): rating modal is NOT opened, celebration overlay IS shown', async () => {
    const allDonePayload = { items: [], total: 2, completed: 2, now_next_filtered: true };
    const { win, ratingModalEl, bodyAppends } = loadCheckoffModule(allDonePayload);

    await win.toggleItem('a1', false);
    await flushMicrotasks();

    assert.equal(
      ratingModalEl.classList.contains('hidden'), true,
      'rating modal must stay hidden when this check-off completes the day'
    );
    assert.ok(
      bodyAppends.some((el) => el.id === 'ctfCelebrationOverlay'),
      'ALL_DONE celebration overlay must be the one reaction shown'
    );
  });

  it('non-last check-off (day stays ACTIVE): rating modal still opens as before', async () => {
    const activePayload = {
      items: [{ id: 'b2', completed: false, star_value: 1 }],
      total: 2,
      completed: 1,
      now_next_filtered: true,
    };
    const { win, ratingModalEl, bodyAppends } = loadCheckoffModule(activePayload);

    await win.toggleItem('a1', false);
    await flushMicrotasks();

    assert.equal(
      ratingModalEl.classList.contains('hidden'), false,
      'rating modal should still open for non-last check-offs when mood rating is enabled'
    );
    assert.ok(
      !bodyAppends.some((el) => el.id === 'ctfCelebrationOverlay'),
      'celebration overlay must not show when the day is not yet all done'
    );
  });
});
