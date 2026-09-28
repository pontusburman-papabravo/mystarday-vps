'use strict';

/**
 * NEXT → NOW must keep the same activity model: title, substeps, progress,
 * completion. The TEACCH NU overlay used to replace the NOW card and drop
 * the checklist even though NEXT still showed it.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const STEPS = [
  { id: 's1', name: 'Bring out material', completed: false },
  { id: 's2', name: 'Work Focused', completed: false },
  { id: 's3', name: 'Tidy up', completed: false },
];

function itemA() {
  return {
    id: 'act-a',
    name: 'Morning circle',
    display_name: 'Morning circle',
    icon: '☀️',
    completed: false,
    sub_step_count: 0,
    star_value: 1,
  };
}

function itemB(overrides) {
  return Object.assign({
    id: 'act-b',
    name: 'Independent work',
    display_name: 'Independent work',
    icon: '📚',
    completed: false,
    sub_step_count: 3,
    star_value: 2,
    seven_questions: { where: { text: 'Desk', emoji: '🪑' } },
  }, overrides || {});
}

function itemPlain() {
  return {
    id: 'act-plain',
    name: 'Snack',
    display_name: 'Snack',
    icon: '🍎',
    completed: false,
    sub_step_count: 0,
    star_value: 1,
  };
}

function fakeEl(id, attrs) {
  attrs = attrs || {};
  const el = {
    id: id || '',
    className: '',
    innerHTML: '',
    _text: '',
    dataset: Object.assign({}, attrs.dataset || {}),
    classList: {
      add: function () {},
      remove: function () {},
      toggle: function () {},
      contains: function () { return false; },
    },
    setAttribute: function () {},
    getAttribute: function (name) { return attrs[name] || null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    appendChild: function () {},
    addEventListener: function () {},
    style: {},
  };
  Object.defineProperty(el, 'textContent', {
    set: function (v) {
      el._text = String(v || '');
      el.innerHTML = el._text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    },
    get: function () { return el._text; },
  });
  return el;
}

function loadHarness(opts) {
  opts = opts || {};
  const subStepCache = opts.subStepCache || {};
  const subStepExpanded = opts.subStepExpanded || {};
  const loadDayCalls = [];
  const elements = {
    scheduleView: fakeEl('scheduleView'),
  };

  function cpt(key, params) {
    if (key === 'steps.substepsLabel') return 'Substeps';
    if (key === 'steps.substepsDone') {
      return (params && params.done) + '/' + (params && params.total);
    }
    if (key === 'scheduleChrome.substepIntro') return 'Tap a step';
    if (key === 'today.zoneNow') return 'Now';
    if (key === 'today.zoneNext') return 'Next';
    if (key === 'todayWarmth.nowBadge') return 'Now';
    if (key === 'sevenQuestions.readAloud') return 'Read aloud';
    if (key === 'sevenQuestions.exitActivity') return 'Exit activity';
    if (key.indexOf('sevenQuestions.labels.') === 0) return key.split('.').pop();
    return key;
  }

  const sandbox = {
    document: {
      body: {
        classList: { add: function () {}, remove: function () {} },
      },
      getElementById: function (id) {
        if (elements[id]) return elements[id];
        const el = fakeEl(id);
        elements[id] = el;
        return el;
      },
      createElement: function (tag) {
        return fakeEl(tag);
      },
      querySelectorAll: function () { return []; },
    },
    console,
    setTimeout,
    clearTimeout,
    Event: function Event() {},
    navigator: { onLine: true },
    localStorage: { getItem: function () { return '1'; }, setItem: function () {} },
    cpt,
    escHtml: function (s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
    },
    currentDate: '2026-09-28',
    todayStr: '2026-09-28',
    viewType: 'now_next_later',
    showNowNext: true,
    requireSequentialCompletion: true,
    visualTimer: false,
    hideClock: true,
    colorCoding: false,
    transitionSupportEnabled: false,
    allowChildReorder: false,
    subStepCache,
    subStepExpanded,
    itemRatings: {},
    substepIntroState: { seen: true },
    Auth: {
      api: async function () { return { sub_steps: STEPS }; },
    },
    Sortable: function () { return { destroy: function () {} }; },
    showToast: function () {},
    loadDay: function (date, showLoader) {
      loadDayCalls.push({ date, showLoader });
      return Promise.resolve();
    },
    fetchPackageAccess: async function () {
      return {
        components: { teacch: { has: opts.teacch !== false } },
        features: { de_sju_fragorna: opts.teacch !== false },
      };
    },
    ChildReadAloud: { isAvailable: function () { return true; } },
    ChildPackageNav: { setNavHidden: function () {} },
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(read('public/js/child-seven-questions.js'), sandbox, {
    filename: 'child-seven-questions.js',
  });
  vm.runInContext(read('public/js/child-dashboard-substeps.js'), sandbox, {
    filename: 'child-dashboard-substeps.js',
  });
  vm.runInContext(read('public/js/child-dashboard-activities.js'), sandbox, {
    filename: 'child-dashboard-activities.js',
  });

  return {
    sandbox,
    window: sandbox.window,
    loadDayCalls,
    async ready() {
      if (sandbox.window.ChildSevenQuestions && sandbox.window.ChildSevenQuestions.ready) {
        await sandbox.window.ChildSevenQuestions.ready();
      }
    },
  };
}

function countNamedSteps(html) {
  return STEPS.filter((step) => html.includes(step.name)).length;
}

function renderZones(win, nowItems, nextItems) {
  let html = '';
  nowItems.forEach(function (item) {
    html += win.renderNowCard(item, true);
  });
  nextItems.forEach(function (item) {
    html += win.renderActivityCard(item, true, 'next');
  });
  return html;
}

describe('NOW/NEXT share one activity model for substeps', () => {
  it('Test 1 — 3 substeps stay visible after NEXT → NOW (TEACCH NU overlay)', async () => {
    const steps = STEPS.map((s) => Object.assign({}, s));
    const { window, sandbox, ready } = loadHarness({
      teacch: true,
      subStepCache: { 'act-b': steps },
      subStepExpanded: { 'act-b': true },
    });
    await ready();

    const before = renderZones(window, [itemA()], [itemB()]);
    assert.equal(countNamedSteps(before), 3, 'NEXT must render all 3 substeps');
    assert.match(before, /Morning circle/);
    assert.match(before, /Independent work/);

    sandbox.subStepCache['act-b'] = steps;
    sandbox.subStepExpanded['act-b'] = true;
    const after = renderZones(window, [itemB()], []);
    assert.equal(countNamedSteps(after), 3, 'NOW must still render all 3 substeps');
    assert.match(after, /teacch-now-card/);
    assert.match(after, /data-sub-step-count="3"/);
    assert.match(after, /Read aloud/);
    assert.match(after, /Exit activity/);
  });

  it('Test 2 — 1/3 progress follows the activity from NEXT to NOW', async () => {
    const steps = [
      { id: 's1', name: 'Bring out material', completed: true },
      { id: 's2', name: 'Work Focused', completed: false },
      { id: 's3', name: 'Tidy up', completed: false },
    ];
    const { window, sandbox, ready } = loadHarness({
      teacch: true,
      subStepCache: { 'act-b': steps },
      subStepExpanded: { 'act-b': true },
    });
    await ready();

    const nextHtml = window.renderActivityCard(itemB(), true, 'next');
    assert.match(nextHtml, /1\/3/);
    assert.match(nextHtml, /substep-check checked/);

    sandbox.subStepCache['act-b'] = steps;
    sandbox.subStepExpanded['act-b'] = true;
    const nowHtml = window.renderNowCard(itemB(), true);
    const model = window.getActivityCardModel(itemB());
    assert.equal(model.subDone, 1);
    assert.equal(model.subStepCount, 3);
    assert.equal(model.title, 'Independent work');
    assert.equal(model.completed, false);
    assert.match(nowHtml, /1\/3/);
    assert.match(nowHtml, /Bring out material/);
    assert.match(nowHtml, /Work Focused/);
    assert.match(nowHtml, /Tidy up/);
    assert.equal((nowHtml.match(/substep-check checked/g) || []).length, 1);
  });

  it('Test 3 — activity without substeps stays a title-only NOW card', async () => {
    const { window, ready } = loadHarness({ teacch: false });
    await ready();
    const html = window.renderNowCard(itemPlain(), true);
    assert.match(html, /Snack/);
    assert.doesNotMatch(html, /activity-substeps-block/);
    assert.doesNotMatch(html, /substep-row/);
    assert.match(html, /data-sub-step-count="0"/);
    const model = window.getActivityCardModel(itemPlain());
    assert.equal(model.hasSubSteps, false);
    assert.equal(model.subStepCount, 0);
  });

  it('Exit activity reloads the day and NOW still uses the shared substep block', async () => {
    const steps = STEPS.map((s) => Object.assign({}, s));
    const { window, sandbox, loadDayCalls, ready } = loadHarness({
      teacch: true,
      subStepCache: { 'act-b': steps },
      subStepExpanded: { 'act-b': true },
    });
    await ready();

    const nowHtml = window.renderNowCard(itemB(), true);
    assert.match(nowHtml, /teacch-exit-btn/);
    assert.match(nowHtml, /ChildSevenQuestions\.exitNu/);
    assert.equal(countNamedSteps(nowHtml), 3);

    window.ChildSevenQuestions.exitNu();
    assert.equal(loadDayCalls.length, 1);
    assert.equal(loadDayCalls[0].date, '2026-09-28');
    assert.equal(loadDayCalls[0].showLoader, false);

    sandbox.subStepCache['act-b'] = steps;
    sandbox.subStepExpanded['act-b'] = true;
    const afterExit = window.renderNowCard(itemB(), true);
    assert.equal(countNamedSteps(afterExit), 3);
    assert.match(afterExit, /Read aloud/);
    assert.match(afterExit, /Exit activity/);
  });

  it('retainSubstepStateForItems keeps progress for surviving activities', () => {
    const { window, sandbox } = loadHarness({
      teacch: false,
      subStepCache: {
        'act-a': [],
        'act-b': [
          { id: 's1', name: 'Bring out material', completed: true },
          { id: 's2', name: 'Work Focused', completed: false },
          { id: 's3', name: 'Tidy up', completed: false },
        ],
      },
      subStepExpanded: { 'act-a': true, 'act-b': true },
    });

    window.retainSubstepStateForItems([itemB()]);
    assert.equal(sandbox.subStepCache['act-a'], undefined);
    assert.equal(sandbox.subStepCache['act-b'].length, 3);
    assert.equal(sandbox.subStepExpanded['act-a'], undefined);
    assert.equal(sandbox.subStepExpanded['act-b'], true);
    assert.equal(window.getActivityCardModel(itemB()).subDone, 1);
  });

  it('auto-expand prefers the NOW card over NEXT', () => {
    const { window, sandbox } = loadHarness({ teacch: false });
    const expanded = [];
    const nowBtn = fakeEl('expand-btn-act-b');
    const nextBtn = fakeEl('expand-btn-act-c');
    sandbox.document.getElementById = function (id) {
      if (id === 'expand-btn-act-b') return nowBtn;
      if (id === 'expand-btn-act-c') return nextBtn;
      return fakeEl(id);
    };
    const nowCard = {
      dataset: { subStepCount: '3', itemId: 'act-b' },
    };
    const nextCard = {
      dataset: { subStepCount: '2', itemId: 'act-c' },
    };
    const container = {
      querySelectorAll: function (sel) {
        if (sel.indexOf('.now-card') !== -1) return [nowCard];
        return [nowCard, nextCard];
      },
    };
    sandbox.window.expandSubSteps = function (_event, itemId) {
      expanded.push(itemId);
    };
    sandbox.expandSubSteps = sandbox.window.expandSubSteps;
    window.autoExpandNowSubsteps(container);
    assert.deepEqual(expanded, ['act-b']);
  });
});
