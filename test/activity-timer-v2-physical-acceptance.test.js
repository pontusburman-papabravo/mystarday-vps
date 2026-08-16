'use strict';

/**
 * Activity Timer V2 — physical iPhone acceptance regressions (Package 4).
 * Simulates force-close restore, profile switch, and 2.5 s bell contract.
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

function snapshotStore(store) {
  return new Map(store);
}

function restoreStore(store, snap) {
  store.clear();
  for (const [k, v] of snap) store.set(k, v);
}

function parseDisplaySeconds(text) {
  if (!text || text === '0:00') return 0;
  const short = text.match(/^0:(\d+)$/);
  if (short) return parseInt(short[1], 10);
  const long = text.match(/^(\d+):(\d+)$/);
  if (long) return parseInt(long[1], 10) * 60 + parseInt(long[2], 10);
  return null;
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
      textContent: opts.textContent || '',
      set innerHTML(html) {
        node._innerHTML = html;
        node.children = [];
        const stack = [node];
        const tagRe = /<(\/?)([a-z0-9-]+)([^>]*)>/gi;
        let m;
        while ((m = tagRe.exec(html)) !== null) {
          const closing = m[1] === '/';
          const tagName = m[2];
          if (closing) {
            if (stack.length > 1) stack.pop();
            continue;
          }
          const attrs = m[3] || '';
          const idMatch = attrs.match(/\bid="([^"]+)"/);
          const classMatch = attrs.match(/\bclass="([^"]+)"/);
          const actionMatch = attrs.match(/\bdata-action="([^"]+)"/);
          const child = makeElement(tagName, {
            id: idMatch ? idMatch[1] : '',
            className: classMatch ? classMatch[1] : '',
            dataset: actionMatch ? { action: actionMatch[1] } : {},
          });
          stack[stack.length - 1].appendChild(child);
          if (!['button', 'span', 'p', 'h2'].includes(tagName)) stack.push(child);
        }
      },
      get innerHTML() {
        return node._innerHTML || '';
      },
      style: {},
      offsetWidth: 100,
      classList: {
        contains(c) { return node.className.split(/\s+/).filter(Boolean).includes(c); },
        add(...cls) {
          node.className = [...new Set([...node.className.split(/\s+/).filter(Boolean), ...cls])].join(' ');
        },
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
      closest() { return null; },
      addEventListener() {},
      setAttribute() {},
      getAttribute() { return null; },
      focus() {},
    };
    return node;
  };
}

function loadTimerHarness(opts = {}) {
  const store = opts.store || new Map();
  const byId = new Map();
  const makeElement = makeElementFactory(byId);
  const toggleItemCalls = [];
  const toggleSubStepCalls = [];
  let audioContextCount = 0;
  let hapticCount = 0;
  let reducedMotion = !!opts.reducedMotion;
  const bellStopTimes = [];

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
          }
          for (const c of n.children || []) walk(c);
        }
        walk(body);
        return out;
      },
      addEventListener(type, fn) {
        window._docListeners = window._docListeners || {};
        (window._docListeners[type] = window._docListeners[type] || []).push(fn);
      },
    },
    navigator: opts.navigator || {},
    scrollY: 0,
    scrollTo() {},
    setTimeout(fn, ms) { return setTimeout(fn, ms); },
    clearTimeout(id) { clearTimeout(id); },
    addEventListener(type, fn) {
      window._winListeners = window._winListeners || {};
      (window._winListeners[type] = window._winListeners[type] || []).push(fn);
    },
    matchMedia(q) {
      return { matches: q.includes('prefers-reduced-motion') ? reducedMotion : false };
    },
    Capacitor: opts.capacitorNative ? {
      isNativePlatform() { return true; },
      Plugins: {
        App: {
          addListener(_event, fn) {
            window._appStateHandler = fn;
            return Promise.resolve({ remove() {} });
          },
        },
      },
    } : undefined,
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
        const self = this;
        return {
          type: 'sine',
          frequency: { setValueAtTime() {} },
          connect() {},
          start() {},
          stop(at) { bellStopTimes.push(at); },
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect() {},
        };
      }
      resume() { return Promise.resolve(); }
      close() {}
    },
    webkitAudioContext: null,
  };
  window.webkitAudioContext = window.AudioContext;
  window.document.defaultView = window;

  const intervals = [];
  const nativeSetInterval = setInterval;
  const nativeClearInterval = clearInterval;
  window.setInterval = function (fn, ms) {
    const id = nativeSetInterval(fn, ms);
    intervals.push(id);
    return id;
  };
  window.clearInterval = function (id) {
    nativeClearInterval(id);
    const idx = intervals.indexOf(id);
    if (idx >= 0) intervals.splice(idx, 1);
  };

  vm.runInNewContext(read('public/js/activity-timer-session.js'), {
    window,
    localStorage: window.localStorage,
    console,
  });

  vm.runInNewContext(read('public/js/child-dashboard-activity-timer.js'), {
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
    Capacitor: window.Capacitor,
  });

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
        if (!wrap._digits) {
          wrap._digits = makeElement('span', { className: 'activity-timer-digits', textContent: '2:00' });
        }
        return wrap._digits;
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

  function expireSession(itemId, subStepId) {
    const key = subStepId
      ? `activity_timer_session:${window.me.id}:${window.currentDate}:${itemId}:sub:${subStepId}`
      : `activity_timer_session:${window.me.id}:${window.currentDate}:${itemId}`;
    const raw = store.get(key);
    if (!raw) return;
    const session = JSON.parse(raw);
    session.ends_at = new Date(Date.now() - 1000).toISOString();
    store.set(key, JSON.stringify(session));
  }

  function simulateOverlayDone(itemId, subStepId) {
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

  return {
    window,
    store,
    byId,
    ATS: window.ActivityTimerSession,
    CAT: window.ChildActivityTimer,
    addTimerWrap,
    addCard(itemId) {
      const card = makeElement('div', {
        id: `card-${itemId}`,
        dataset: { itemName: 'Brush', itemIcon: '🪥' },
      });
      byId.set(card.id, card);
      body.appendChild(card);
      return card;
    },
    expireSession,
    simulateOverlayDone,
    toggleItemCalls,
    toggleSubStepCalls,
    get audioContextCount() { return audioContextCount; },
    get hapticCount() { return hapticCount; },
    bellStopTimes,
    dispose() {
      intervals.forEach(function (id) { nativeClearInterval(id); });
      intervals.length = 0;
    },
    advanceWallClock(ms) {
      for (const key of [...store.keys()]) {
        if (!key.includes('activity_timer_session:')) continue;
        const session = JSON.parse(store.get(key));
        if (session.ends_at) {
          session.ends_at = new Date(new Date(session.ends_at).getTime() - ms).toISOString();
          store.set(key, JSON.stringify(session));
        }
      }
    },
  };
}

function brushTeethItems(itemId) {
  return [{
    id: itemId,
    completed: false,
    duration_seconds: null,
    sub_step_timed_count: 1,
  }];
}

describe('Activity Timer V2 physical acceptance — session restore root cause', () => {
  it('initForItems keeps substep sessions when parent has timed substeps only', () => {
    const h = loadTimerHarness();
    h.ATS.startSession('child-1', '2026-08-04', 'log-brush', 120, 'sub-brush');
    h.CAT.initForItems(brushTeethItems('log-brush'));
    assert.ok(h.ATS.getSession('child-1', '2026-08-04', 'log-brush', 'sub-brush'));
    h.dispose();
  });
});

describe('Activity Timer V2 physical acceptance — force-close restore', () => {
  it('A running: destroy runtime, advance wall clock, restore ≈80s not 120s', () => {
    const sharedStore = new Map();
    const h1 = loadTimerHarness({ store: sharedStore });
    h1.ATS.startSession('child-1', '2026-08-04', 'log-brush', 120, 'sub-brush');
    const key = 'activity_timer_session:child-1:2026-08-04:log-brush:sub:sub-brush';
    const session = JSON.parse(sharedStore.get(key));
    session.ends_at = new Date(Date.now() + 80_000).toISOString();
    sharedStore.set(key, JSON.stringify(session));

    const snap = snapshotStore(sharedStore);
    const h2 = loadTimerHarness({ store: sharedStore, childId: 'child-1' });
    restoreStore(h2.store, snap);
    h2.advanceWallClock(0);

    const item = {
      id: 'log-brush',
      completed: false,
      duration_seconds: 120,
      sub_step_timed_count: 1,
    };
    h2.CAT.initForItems(brushTeethItems('log-brush'));
    const html = h2.CAT.renderSubStepBlock('log-brush', {
      id: 'sub-brush',
      completed: false,
      duration_seconds: 120,
    });
    const digits = html.match(/activity-timer-digits[^>]*>([^<]+)/);
    const seconds = parseDisplaySeconds(digits ? digits[1] : '');
    assert.ok(seconds >= 78 && seconds <= 82, `expected ~80s, got ${seconds}`);
    assert.doesNotMatch(html, /activity-timer-start/);
    h2.dispose();
  });

  it('B paused: destroy runtime, advance wall clock, paused remaining unchanged', () => {
    const sharedStore = new Map();
    const h1 = loadTimerHarness({ store: sharedStore });
    h1.ATS.startSession('child-1', '2026-08-04', 'item-1', 120);
    h1.ATS.pauseSession('child-1', '2026-08-04', 'item-1', 120);
    const paused = h1.ATS.computeRemainingSeconds(h1.ATS.getSession('child-1', '2026-08-04', 'item-1'), 120);
    const snap = snapshotStore(sharedStore);

    const h2 = loadTimerHarness({ store: sharedStore });
    restoreStore(h2.store, snap);
    h2.advanceWallClock(40_000);
    const session = h2.ATS.getSession('child-1', '2026-08-04', 'item-1');
    assert.equal(h2.ATS.resolveStatus(session, 120), 'paused');
    const rem = h2.ATS.computeRemainingSeconds(session, 120);
    assert.equal(rem, paused);
  });

  it('C finished: one sound/haptic, restore shows 0:00 without replay', () => {
    const sharedStore = new Map();
    const h1 = loadTimerHarness({ store: sharedStore });
    h1.addTimerWrap('item-1', 5);
    h1.ATS.startSession('child-1', '2026-08-04', 'item-1', 5);
    h1.expireSession('item-1');
    h1.CAT.tickAll();
    assert.equal(h1.hapticCount, 1);
    assert.equal(h1.audioContextCount, 1);
    const snap = snapshotStore(sharedStore);

    const h2 = loadTimerHarness({ store: sharedStore });
    restoreStore(h2.store, snap);
    h2.addTimerWrap('item-1', 5);
    h2.CAT.tickAll();
    assert.equal(h2.hapticCount, 0);
    assert.equal(h2.audioContextCount, 0);
    const html = h2.CAT.renderBlock({
      id: 'item-1',
      completed: false,
      duration_seconds: 5,
      sub_step_timed_count: 0,
    });
    assert.match(html, /0:00/);
  });
});

describe('Activity Timer V2 physical acceptance — profile switch restore', () => {
  it('D/E child A → B → A restores wall-clock remaining independently', () => {
    const sharedStore = new Map();
    const date = '2026-08-04';

    const hA1 = loadTimerHarness({ store: sharedStore, childId: 'child-a', date });
    hA1.ATS.startSession('child-a', date, 'item-a', 120);
    const keyA = `activity_timer_session:child-a:${date}:item-a`;
    const sessA = JSON.parse(sharedStore.get(keyA));
    sessA.ends_at = new Date(Date.now() + 70_000).toISOString();
    sharedStore.set(keyA, JSON.stringify(sessA));

    const hB = loadTimerHarness({ store: sharedStore, childId: 'child-b', date });
    assert.equal(hB.ATS.resolveStatus(hB.ATS.getSession('child-b', date, 'item-a'), 120), 'idle');
    hB.ATS.startSession('child-b', date, 'item-b', 60);
    const keyB = `activity_timer_session:child-b:${date}:item-b`;
    const sessB = JSON.parse(sharedStore.get(keyB));
    sessB.ends_at = new Date(Date.now() + 25_000).toISOString();
    sharedStore.set(keyB, JSON.stringify(sessB));

    const hA2 = loadTimerHarness({ store: sharedStore, childId: 'child-a', date });
    hA2.CAT.initForItems([{ id: 'item-a', completed: false, duration_seconds: 120, sub_step_timed_count: 0 }]);
    const remA = hA2.ATS.computeRemainingSeconds(hA2.ATS.getSession('child-a', date, 'item-a'), 120);
    assert.ok(remA >= 68 && remA <= 72);

    const hB2 = loadTimerHarness({ store: sharedStore, childId: 'child-b', date });
    hB2.CAT.initForItems([{ id: 'item-b', completed: false, duration_seconds: 60, sub_step_timed_count: 0 }]);
    const remB = hB2.ATS.computeRemainingSeconds(hB2.ATS.getSession('child-b', date, 'item-b'), 60);
    assert.ok(remB >= 23 && remB <= 27);
    assert.equal(hB2.ATS.resolveStatus(hB2.ATS.getSession('child-b', date, 'item-a'), 120), 'idle');
    hA2.dispose();
    hB2.dispose();
  });
});

describe('Activity Timer V2 physical acceptance — bell effect', () => {
  it('E natural zero: one finish event with ~2.5s audible envelope, no replay on restore', () => {
    const h = loadTimerHarness();
    h.addTimerWrap('bell-item', 5);
    h.ATS.startSession('child-1', '2026-08-04', 'bell-item', 5);
    h.expireSession('bell-item');
    h.CAT.tickAll();
    assert.equal(h.audioContextCount, 1);
    assert.equal(h.hapticCount, 1);
    assert.ok(h.bellStopTimes.length >= 3, 'expected multi-partial bell');
    const maxStop = Math.max(...h.bellStopTimes);
    assert.ok(maxStop >= 2.2 && maxStop <= 2.6, `bell tail ${maxStop}s`);

    h.CAT.tickAll();
    assert.equal(h.audioContextCount, 1);
    assert.equal(h.hapticCount, 1);

    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /FINISH_BELL_MS = 2500/);
    assert.doesNotMatch(src, /setInterval[\s\S]{0,120}playFinishChime/);
  });
});

describe('Activity Timer V2 physical acceptance — Klar paths', () => {
  it('F Klar before zero: no bell, completion once, session removed', () => {
    const h = loadTimerHarness();
    h.addCard('item-1');
    h.addTimerWrap('item-1', 120);
    h.ATS.startSession('child-1', '2026-08-04', 'item-1', 120);
    const key = 'activity_timer_session:child-1:2026-08-04:item-1';
    const session = JSON.parse(h.store.get(key));
    session.ends_at = new Date(Date.now() + 90_000).toISOString();
    h.store.set(key, JSON.stringify(session));

    h.simulateOverlayDone('item-1');
    assert.equal(h.audioContextCount, 0);
    assert.equal(h.hapticCount, 0);
    assert.equal(h.store.has(key), false);
    assert.equal(h.toggleItemCalls.length, 1);
  });

  it('G Klar after zero: no second bell, completion once, session removed', () => {
    const h = loadTimerHarness();
    h.addCard('item-sub');
    h.addTimerWrap('item-sub', 5, 'brush');
    h.ATS.startSession('child-1', '2026-08-04', 'item-sub', 5, 'brush');
    h.expireSession('item-sub', 'brush');
    h.CAT.tickAll();
    assert.equal(h.audioContextCount, 1);

    h.simulateOverlayDone('item-sub', 'brush');
    assert.equal(h.audioContextCount, 1);
    assert.equal(h.toggleSubStepCalls.length, 1);
    assert.equal(h.toggleItemCalls.length, 0);
    assert.equal(h.store.size, 0);
  });
});

describe('Activity Timer V2 physical acceptance — lifecycle hooks', () => {
  it('pageshow and Capacitor appStateChange refresh running timers', () => {
    const h = loadTimerHarness({ capacitorNative: true });
    h.addTimerWrap('run-item', 120);
    h.ATS.startSession('child-1', '2026-08-04', 'run-item', 120);
    const key = 'activity_timer_session:child-1:2026-08-04:run-item';
    const session = JSON.parse(h.store.get(key));
    session.ends_at = new Date(Date.now() + 50_000).toISOString();
    h.store.set(key, JSON.stringify(session));
    h.CAT.initForItems([{ id: 'run-item', completed: false, duration_seconds: 120, sub_step_timed_count: 0 }]);

    const pageshow = (h.window._winListeners && h.window._winListeners.pageshow) || [];
    assert.ok(pageshow.length >= 1);
    pageshow[0]({ persisted: false });

    const wrap = h.byId.get('activity-timer-run-item');
    const digits = wrap && wrap._digits && wrap._digits.textContent;
    const seconds = parseDisplaySeconds(digits);
    assert.ok(seconds >= 48 && seconds <= 52, `pageshow tick expected ~50s, got ${seconds}`);

    session.ends_at = new Date(Date.now() + 40_000).toISOString();
    h.store.set(key, JSON.stringify(session));
    assert.ok(typeof h.window._appStateHandler === 'function');
    h.window._appStateHandler({ isActive: true });
    const secondsAfterApp = parseDisplaySeconds(wrap._digits.textContent);
    assert.ok(secondsAfterApp >= 38 && secondsAfterApp <= 42);
    h.dispose();
  });
});
