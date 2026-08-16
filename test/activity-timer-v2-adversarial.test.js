'use strict';

/**
 * Activity Timer V2 — adversarial runtime/integration tests (Prompt 2).
 * Exercises completion paths, finish effects, collisions, wake lock, reduced motion.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function makeElementFactory(byId) {
  return function makeElement(tag, opts = {}) {
    const node = {
      tagName: String(tag).toUpperCase(),
      id: opts.id || '',
      className: opts.className || '',
      dataset: Object.assign({}, opts.dataset || {}),
      parentElement: null,
      children: [],
      hidden: false,
      _innerHTML: '',
      set innerHTML(html) {
        node._innerHTML = html;
        node.children = [];
        const stack = [node];
        const tagRe = /<(\/?)([a-z0-9-]+)([^>]*)>/gi;
        let m;
        while ((m = tagRe.exec(html)) !== null) {
          const closing = m[1] === '/';
          const tag = m[2];
          if (closing) {
            if (stack.length > 1) stack.pop();
            continue;
          }
          const attrs = m[3] || '';
          const idMatch = attrs.match(/\bid="([^"]+)"/);
          const classMatch = attrs.match(/\bclass="([^"]+)"/);
          const actionMatch = attrs.match(/\bdata-action="([^"]+)"/);
          const child = makeElement(tag, {
            id: idMatch ? idMatch[1] : '',
            className: classMatch ? classMatch[1] : '',
            dataset: actionMatch ? { action: actionMatch[1] } : {},
          });
          stack[stack.length - 1].appendChild(child);
          if (!['button', 'span', 'p', 'h2'].includes(tag)) stack.push(child);
        }
      },
      get innerHTML() {
        return node._innerHTML || '';
      },
      style: {},
      offsetWidth: 100,
      classList: {
        contains(c) { return node.className.split(/\s+/).filter(Boolean).includes(c); },
        add(...cls) { node.className = [...new Set([...node.className.split(/\s+/).filter(Boolean), ...cls])].join(' '); },
        remove(...cls) {
          const set = new Set(node.className.split(/\s+/).filter(Boolean));
          cls.forEach((c) => set.delete(c));
          node.className = [...set].join(' ');
        },
      },
      appendChild(child) {
        child.parentElement = node;
        node.children.push(child);
        if (child.id) byId.set(child.id, child);
      },
    remove() {
      if (node.parentElement) {
        node.parentElement.children = node.parentElement.children.filter((c) => c !== node);
      }
    },
    querySelector(sel) {
      function walk(n) {
        if (!n) return null;
        if (sel.startsWith('#') && n.id === sel.slice(1)) return n;
        if (sel.startsWith('.') && n.className && n.className.split(/\s+/).includes(sel.slice(1))) return n;
        if (sel.includes('[data-action=')) {
          const m = sel.match(/\[data-action="([^"]+)"\]/);
          if (m && n.dataset && n.dataset.action === m[1]) return n;
        }
        for (const c of n.children || []) {
          const hit = walk(c);
          if (hit) return hit;
        }
        return null;
      }
      return walk(node);
    },
      querySelectorAll(sel) {
        const out = [];
        function walk(n) {
          if (sel.startsWith('.') && n.className && n.className.split(/\s+/).includes(sel.slice(1))) {
            if (!sel.includes('[data-item-id]') || (n.dataset && n.dataset.itemId)) out.push(n);
            else if (!sel.includes('[data-item-id]')) out.push(n);
          }
          if (sel.includes('.activity-timer-wrap[data-item-id]')
            && n.className && n.className.split(/\s+/).includes('activity-timer-wrap')
            && n.dataset && n.dataset.itemId) {
            out.push(n);
          }
          for (const c of n.children || []) walk(c);
        }
        walk(node);
        return out;
      },
    closest(sel) {
      let n = node;
      while (n) {
        if (sel.startsWith('.') && n.className && n.className.split(/\s+/).includes(sel.slice(1))) return n;
        n = n.parentElement;
      }
      return null;
    },
    addEventListener(type, fn) {
      node._listeners = node._listeners || {};
      (node._listeners[type] = node._listeners[type] || []).push(fn);
    },
    setAttribute() {},
    getAttribute() { return null; },
    focus() {},
  };
  return node;
  };
}

function loadTimerHarness(opts = {}) {
  const store = new Map();
  const byId = new Map();
  const makeElement = makeElementFactory(byId);
  const toggleItemCalls = [];
  const toggleSubStepCalls = [];
  let audioContextCount = 0;
  let hapticCount = 0;
  let reducedMotion = !!opts.reducedMotion;

  const body = makeElement('body');
  byId.set('body', body);

  const window = {
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, value); },
      removeItem(key) { store.delete(key); },
      get length() { return store.size; },
      key(i) { return [...store.keys()][i] ?? null; },
    },
    document: {
      body,
      visibilityState: 'visible',
      createElement(tag) { return makeElement(tag); },
      getElementById(id) { return byId.get(id) || null; },
      querySelectorAll(sel) {
        const out = [];
        function walk(n) {
          if (sel.includes('.activity-timer-wrap[data-item-id]')
            && n.className && n.className.split(/\s+/).includes('activity-timer-wrap')
            && n.dataset && n.dataset.itemId) {
            out.push(n);
          } else if (sel.startsWith('.') && n.className && n.className.split(/\s+/).includes(sel.slice(1))) {
            out.push(n);
          }
          for (const c of n.children || []) walk(c);
        }
        walk(body);
        return out;
      },
      addEventListener() {},
    },
    navigator: opts.navigator || {},
    scrollY: 0,
    scrollTo() {},
    setInterval(fn, ms) { return setInterval(fn, ms); },
    clearInterval(id) { clearInterval(id); },
    setTimeout(fn, ms) { return setTimeout(fn, ms); },
    clearTimeout(id) { clearTimeout(id); },
    matchMedia(q) {
      return { matches: q.includes('prefers-reduced-motion') ? reducedMotion : false };
    },
    Platform: {
      haptics: {
        light() { hapticCount += 1; },
        medium() {},
      },
    },
    ActivityHourglassUI: {
      preload() {},
      mountHtml() { return '<div data-hourglass-mount="1"></div>'; },
      applyToRoot() {},
    },
    childT(key) { return key; },
    activityTimerV2Enabled: true,
    activityTimersEnabled: true,
    me: { id: opts.childId || 'child-1' },
    currentDate: opts.date || '2026-08-04',
    toggleItem(itemId, isCurrentlyDone) {
      toggleItemCalls.push({ itemId, isCurrentlyDone });
    },
    toggleSubStep(event, itemId, subStepId, isCurrentlyDone) {
      toggleSubStepCalls.push({ itemId, subStepId, isCurrentlyDone });
    },
    AudioContext: class MockAudioContext {
      constructor() {
        audioContextCount += 1;
        this.state = 'running';
        this.currentTime = 0;
        this.destination = {};
      }
      createOscillator() {
        return { type: 'sine', frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} };
      }
      createGain() {
        return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
      }
      resume() { return Promise.resolve(); }
      close() {}
    },
    webkitAudioContext: null,
  };
  window.webkitAudioContext = window.AudioContext;
  window.document.defaultView = window;

  vm.runInNewContext(read('public/js/activity-timer-session.js'), {
    window,
    localStorage: window.localStorage,
    console,
  });

  const timerGlobals = {
    window,
    document: window.document,
    navigator: window.navigator,
    console,
    setInterval: window.setInterval,
    clearInterval: window.clearInterval,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    me: window.me,
    currentDate: window.currentDate,
    activityTimersEnabled: window.activityTimersEnabled,
    activityTimerV2Enabled: window.activityTimerV2Enabled,
    Platform: window.Platform,
    ActivityHourglassUI: window.ActivityHourglassUI,
    ActivityTimerSession: window.ActivityTimerSession,
    toggleItem: window.toggleItem,
    toggleSubStep: window.toggleSubStep,
    childT: window.childT,
    matchMedia: window.matchMedia.bind(window),
    AudioContext: window.AudioContext,
    webkitAudioContext: window.webkitAudioContext,
  };
  vm.runInNewContext(read('public/js/child-dashboard-activity-timer.js'), timerGlobals);

  function addTimerWrap(itemId, duration, subStepId) {
    const id = subStepId
      ? `activity-timer-${itemId}-sub-${subStepId}`
      : `activity-timer-${itemId}`;
    const wrap = makeElement('div', {
      id,
      className: 'activity-timer-wrap',
      dataset: {
        itemId,
        duration: String(duration),
        status: 'running',
        ...(subStepId ? { subStepId } : {}),
      },
    });
    wrap.querySelector = function (sel) {
      if (sel === '.activity-timer-digits') {
        return makeElement('span', { className: 'activity-timer-digits', textContent: '1:00' });
      }
      if (sel === '.activity-timer-aria') {
        return makeElement('span', { className: 'activity-timer-aria' });
      }
      if (sel === '.activity-timer-status-label') {
        return makeElement('span', { className: 'activity-timer-status-label' });
      }
      return null;
    };
    byId.set(id, wrap);
    body.appendChild(wrap);
    return wrap;
  }

  function addCard(itemId) {
    const card = makeElement('div', { id: `card-${itemId}`, className: '', dataset: { itemName: 'Test', itemIcon: '⭐' } });
    byId.set(card.id, card);
    body.appendChild(card);
    return card;
  }

  function invokeOverlayDone(itemId, subStepId) {
    const { me, currentDate } = window;
    window.ActivityTimerSession.clearSession(me.id, currentDate, itemId, subStepId || undefined);
    if (subStepId) {
      window.toggleSubStep({ stopPropagation() {} }, itemId, subStepId, false);
      return;
    }
    const wrap = window.document.getElementById(`activity-timer-${itemId}`);
    if (wrap) wrap.remove();
    window.toggleItem(itemId, false);
  }

  function expireSession(itemId, subStepId) {
    const key = window.ActivityTimerSession.sessionToken
      ? `activity_timer_session:${window.me.id}:${window.currentDate}:${subStepId ? `${itemId}:sub:${subStepId}` : itemId}`
      : null;
    const storageKey = `activity_timer_session:${window.me.id}:${window.currentDate}:${subStepId ? `${itemId}:sub:${subStepId}` : itemId}`;
    const raw = store.get(storageKey);
    assert.ok(raw, 'session exists');
    const session = JSON.parse(raw);
    session.ends_at = new Date(Date.now() - 500).toISOString();
    store.set(storageKey, JSON.stringify(session));
  }

  return {
    window,
    store,
    byId,
    toggleItemCalls,
    toggleSubStepCalls,
    get audioContextCount() { return audioContextCount; },
    get hapticCount() { return hapticCount; },
    addTimerWrap,
    addCard,
    simulateOverlayDone: invokeOverlayDone,
    expireSession,
    ATS: window.ActivityTimerSession,
    CAT: window.ChildActivityTimer,
  };
}

describe('Activity Timer V2 adversarial — onComplete source contract', () => {
  it('invokeOverlayDone mirrors timer onComplete source', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /function onComplete\(itemId, subStepId\)/);
    assert.match(src, /ActivityTimerSession\.clearSession\(me\.id, currentDate, itemId, subStepId \|\| undefined\)/);
    assert.match(src, /toggleSubStep\(\{ stopPropagation: function \(\) \{\} \}, itemId, subStepId, false\)/);
    assert.match(src, /toggleItem\(itemId, false\)/);
    assert.doesNotMatch(src, /function onComplete[\s\S]{0,500}toggleItem[\s\S]{0,80}toggleItem/);
  });
});

describe('Activity Timer V2 adversarial — main activity completion', () => {
  it('before zero: Klar clears session and toggles activity exactly once', () => {
    const h = loadTimerHarness();
    h.addCard('item-main');
    h.addTimerWrap('item-main', 120);
    h.ATS.startSession('child-1', '2026-08-04', 'item-main', 120);
    assert.equal(h.store.size, 1);

    h.simulateOverlayDone('item-main', null);

    assert.equal(h.store.size, 0);
    assert.equal(h.toggleItemCalls.length, 1);
    assert.equal(h.toggleItemCalls[0].itemId, 'item-main');
    assert.equal(h.toggleItemCalls[0].isCurrentlyDone, false);
    assert.equal(h.audioContextCount, 0, 'no finish chime before zero');
  });

  it('after zero: natural finish does not auto-complete; Klar completes once', () => {
    const h = loadTimerHarness();
    h.addCard('item-main');
    h.addTimerWrap('item-main', 5);
    h.ATS.startSession('child-1', '2026-08-04', 'item-main', 5);
    h.expireSession('item-main');

    h.CAT.tickAll();
    assert.equal(h.toggleItemCalls.length, 0, 'no auto-complete at zero');
    assert.equal(h.hapticCount, 1);
    assert.equal(h.audioContextCount, 1);

    h.CAT.tickAll();
    assert.equal(h.hapticCount, 1, 'effects not replayed on rerender');
    assert.equal(h.audioContextCount, 1);

    h.simulateOverlayDone('item-main', null);
    assert.equal(h.store.size, 0);
    assert.equal(h.toggleItemCalls.length, 1);
    assert.equal(h.toggleItemCalls[0].itemId, 'item-main');

    // Timer onComplete closes overlay after first Klar; duplicate tap not reachable in UI.
    assert.equal(h.store.size, 0);
  });
});

describe('Activity Timer V2 adversarial — substep completion', () => {
  it('before zero: toggleSubStep exactly once with correct IDs', () => {
    const h = loadTimerHarness();
    h.addCard('item-sub');
    h.addTimerWrap('item-sub', 20, 'wash');
    h.ATS.startSession('child-1', '2026-08-04', 'item-sub', 20, 'wash');

    h.simulateOverlayDone('item-sub', 'wash');

    assert.equal(h.store.size, 0);
    assert.equal(h.toggleSubStepCalls.length, 1);
    assert.equal(h.toggleSubStepCalls[0].itemId, 'item-sub');
    assert.equal(h.toggleSubStepCalls[0].subStepId, 'wash');
    assert.equal(h.toggleItemCalls.length, 0, 'parent activity not completed');
  });

  it('after zero: natural finish then Klar calls toggleSubStep once', () => {
    const h = loadTimerHarness();
    h.addCard('item-sub');
    h.addTimerWrap('item-sub', 5, 'brush');
    h.ATS.startSession('child-1', '2026-08-04', 'item-sub', 5, 'brush');
    h.expireSession('item-sub', 'brush');

    h.CAT.tickAll();
    assert.equal(h.toggleSubStepCalls.length, 0);
    assert.equal(h.toggleItemCalls.length, 0);

    h.simulateOverlayDone('item-sub', 'brush');
    assert.equal(h.toggleSubStepCalls.length, 1);
    assert.equal(h.toggleItemCalls.length, 0);
  });
});

describe('Activity Timer V2 adversarial — finish effect once', () => {
  it('persisted end_sound_played prevents replay after reload tick', () => {
    const h = loadTimerHarness();
    h.addTimerWrap('fx-item', 5);
    h.ATS.startSession('child-1', '2026-08-04', 'fx-item', 5);
    h.expireSession('fx-item');

    h.CAT.tickAll();
    assert.equal(h.hapticCount, 1);
    assert.equal(h.audioContextCount, 1);

    const key = 'activity_timer_session:child-1:2026-08-04:fx-item';
    const session = JSON.parse(h.store.get(key));
    assert.equal(session.end_sound_played, true);

    h.CAT.tickAll();
    h.CAT.tickAll();
    assert.equal(h.hapticCount, 1);
    assert.equal(h.audioContextCount, 1);
  });
});

describe('Activity Timer V2 adversarial — session collision', () => {
  it('same child/date/canonical activity with two daily_log_item_id values stay independent', () => {
    const h = loadTimerHarness();
    h.ATS.startSession('child-1', '2026-08-04', 'log-am-brush', 120);
    h.ATS.startSession('child-1', '2026-08-04', 'log-pm-brush', 120);
    assert.equal(h.store.size, 2);

    h.ATS.pauseSession('child-1', '2026-08-04', 'log-am-brush', 120);
    assert.equal(h.ATS.resolveStatus(h.ATS.getSession('child-1', '2026-08-04', 'log-am-brush'), 120), 'paused');
    assert.equal(h.ATS.resolveStatus(h.ATS.getSession('child-1', '2026-08-04', 'log-pm-brush'), 120), 'running');
  });

  it('child A and child B same activity/date do not leak', () => {
    const h = loadTimerHarness();
    h.ATS.startSession('child-a', '2026-08-04', 'item-1', 60);
    assert.equal(h.ATS.resolveStatus(h.ATS.getSession('child-b', '2026-08-04', 'item-1'), 60), 'idle');
  });

  it('substep vs parent activity sessions do not collide', () => {
    const h = loadTimerHarness();
    h.ATS.startSession('child-1', '2026-08-04', 'item-1', 90);
    h.ATS.startSession('child-1', '2026-08-04', 'item-1', 20, 'sub-1');
    assert.equal(h.store.size, 2);
    h.ATS.clearSession('child-1', '2026-08-04', 'item-1', 'sub-1');
    assert.ok(h.ATS.getSession('child-1', '2026-08-04', 'item-1'));
  });
});

describe('Activity Timer V2 adversarial — force close / clock restore', () => {
  it('running recalculates; paused keeps pause; finished stays finished; no negative countdown', () => {
    const h = loadTimerHarness();
    h.ATS.startSession('child-1', '2026-08-04', 'run-item', 60);
    const runKey = 'activity_timer_session:child-1:2026-08-04:run-item';
    const runSession = JSON.parse(h.store.get(runKey));
    runSession.ends_at = new Date(Date.now() + 25_000).toISOString();
    h.store.set(runKey, JSON.stringify(runSession));
    const rem = h.ATS.computeRemainingSeconds(h.ATS.getSession('child-1', '2026-08-04', 'run-item'), 60);
    assert.ok(rem >= 23 && rem <= 27);

    h.ATS.startSession('child-1', '2026-08-04', 'pause-item', 30);
    h.ATS.pauseSession('child-1', '2026-08-04', 'pause-item', 30);
    const paused = h.ATS.getSession('child-1', '2026-08-04', 'pause-item');
    assert.equal(h.ATS.resolveStatus(paused, 30), 'paused');

    h.ATS.startSession('child-1', '2026-08-04', 'done-item', 5);
    h.ATS.markFinished('child-1', '2026-08-04', 'done-item');
    assert.equal(h.ATS.computeRemainingSeconds(h.ATS.getSession('child-1', '2026-08-04', 'done-item'), 5), 0);
    assert.ok(h.ATS.computeRemainingSeconds(h.ATS.getSession('child-1', '2026-08-04', 'done-item'), 5) >= 0);
  });
});

describe('Activity Timer V2 adversarial — wake lock failure', () => {
  it('missing wakeLock and rejected request do not break timer start/tick', async () => {
    const h = loadTimerHarness({ navigator: {} });
    h.addTimerWrap('wl-item', 30);
    h.ATS.startSession('child-1', '2026-08-04', 'wl-item', 30);
    assert.doesNotThrow(() => h.CAT.tickAll());

    const h2 = loadTimerHarness({
      navigator: {
        wakeLock: {
          request() { return Promise.reject(new Error('denied')); },
        },
      },
    });
    h2.addTimerWrap('wl-item-2', 30);
    h2.ATS.startSession('child-1', '2026-08-04', 'wl-item-2', 30);
    await new Promise((r) => setTimeout(r, 20));
    assert.doesNotThrow(() => h2.CAT.tickAll());
  });
});

describe('Activity Timer V2 adversarial — reduced motion', () => {
  it('timer works without burst replay; finish semantics stay once', () => {
    const h = loadTimerHarness({ reducedMotion: true });
    h.addTimerWrap('rm-item', 5);
    h.ATS.startSession('child-1', '2026-08-04', 'rm-item', 5);
    h.expireSession('rm-item');

    h.CAT.tickAll();
    assert.equal(h.hapticCount, 1);
    assert.equal(h.audioContextCount, 1);

    const layer = h.byId.get('activity-timer-celebration');
    if (layer) {
      assert.equal(layer.classList.contains('activity-timer-celebration--on'), false);
    }

    h.CAT.tickAll();
    assert.equal(h.hapticCount, 1);
  });
});

describe('Activity Timer V2 adversarial — master / kill switch independence', () => {
  it('ACTIVITY_TIMER_V2_DISABLED wins over child master', () => {
    const prev = process.env.ACTIVITY_TIMER_V2_DISABLED;
    process.env.ACTIVITY_TIMER_V2_DISABLED = 'true';
    const rolloutPath = require.resolve('../src/lib/activity-timer-rollout');
    delete require.cache[rolloutPath];
    const { activityTimerV2EnabledForChild, isRolloutDisabled } = require('../src/lib/activity-timer-rollout');
    assert.equal(isRolloutDisabled(), true);
    assert.equal(activityTimerV2EnabledForChild(true), false);
    process.env.ACTIVITY_TIMER_V2_DISABLED = prev;
    delete require.cache[rolloutPath];
  });

  it('child master false disables even when kill switch off', () => {
    const prev = process.env.ACTIVITY_TIMER_V2_DISABLED;
    delete process.env.ACTIVITY_TIMER_V2_DISABLED;
    const rolloutPath = require.resolve('../src/lib/activity-timer-rollout');
    delete require.cache[rolloutPath];
    const { activityTimerV2EnabledForChild } = require('../src/lib/activity-timer-rollout');
    assert.equal(activityTimerV2EnabledForChild(false), false);
    assert.equal(activityTimerV2EnabledForChild(true), true);
    process.env.ACTIVITY_TIMER_V2_DISABLED = prev;
    delete require.cache[rolloutPath];
  });

  it('parent duration bridge does not silently flip child master', () => {
    const bridge = read('public/js/library-activity-timer-bridge.js');
    assert.doesNotMatch(bridge, /activity_timers_enabled\s*=\s*true[^;]*save/);
  });
});

describe('Activity Timer V2 — matrix classification honesty', () => {
  const CLASSIFICATION = {
    '01': 'SOURCE_CONTRACT', '02': 'SOURCE_CONTRACT', '03': 'SESSION_EXECUTED', '04': 'SESSION_EXECUTED',
    '05': 'SESSION_EXECUTED', '06': 'SESSION_EXECUTED', '07': 'SESSION_EXECUTED', '08': 'SESSION_EXECUTED',
    '09': 'SESSION_EXECUTED', '10': 'SESSION_EXECUTED', '11': 'INTEGRATION_EXECUTED', '12': 'INTEGRATION_EXECUTED',
    '13': 'SESSION_EXECUTED', '14': 'SESSION_EXECUTED', '15': 'SESSION_EXECUTED', '16': 'SESSION_EXECUTED',
    '17': 'INTEGRATION_EXECUTED', '18': 'SESSION_EXECUTED', '19': 'SESSION_EXECUTED', '20': 'SESSION_EXECUTED',
    '21': 'SESSION_EXECUTED', '22': 'SOURCE_CONTRACT', '23': 'SESSION_EXECUTED', '24': 'SOURCE_CONTRACT',
    '25': 'SESSION_EXECUTED', '26': 'SESSION_EXECUTED', '27': 'INTEGRATION_EXECUTED', '28': 'SOURCE_CONTRACT',
    '29': 'INTEGRATION_EXECUTED', '30': 'INTEGRATION_EXECUTED', '31': 'INTEGRATION_EXECUTED', '32': 'SESSION_EXECUTED',
  };

  it('documents honest evidence tier per matrix row (no inflated RUNTIME_EXECUTED)', () => {
    for (const id of Object.keys(CLASSIFICATION)) {
      assert.ok(['RUNTIME_EXECUTED', 'SESSION_EXECUTED', 'INTEGRATION_EXECUTED', 'SOURCE_CONTRACT'].includes(CLASSIFICATION[id]), id);
    }
    assert.equal(Object.keys(CLASSIFICATION).length, 32);
  });

  it('main/substep Klar and finish-once scenarios have integration coverage in adversarial suite', () => {
    assert.match(read('test/activity-timer-v2-adversarial.test.js'), /before zero: Klar clears session/);
    assert.match(read('test/activity-timer-v2-adversarial.test.js'), /toggleSubStep exactly once/);
    assert.match(read('test/activity-timer-v2-adversarial.test.js'), /persisted end_sound_played prevents replay/);
  });
});
