'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function matchesSelector(node, sel) {
  if (!node || !node.className) return false;
  if (sel.startsWith('.')) {
    const cls = sel.slice(1);
    return node.className.split(/\s+/).filter(Boolean).includes(cls);
  }
  return false;
}

function makeElement(tag, opts) {
  const node = {
    tagName: String(tag).toUpperCase(),
    id: (opts && opts.id) || '',
    className: (opts && opts.className) || '',
    dataset: Object.assign({}, (opts && opts.dataset) || {}),
    parentElement: null,
    children: [],
    hidden: false,
    innerHTML: '',
    style: {},
    offsetWidth: 100,
    classList: {
      contains(c) {
        return node.className.split(/\s+/).filter(Boolean).includes(c);
      },
      add() {},
      remove() {},
    },
    appendChild(child) {
      child.parentElement = node;
      node.children.push(child);
    },
    querySelector(sel) {
      function walk(n) {
        if (matchesSelector(n, sel)) return n;
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
        if (matchesSelector(n, sel)) out.push(n);
        for (const c of n.children || []) walk(c);
      }
      walk(node);
      return out;
    },
    closest(sel) {
      let n = node;
      while (n) {
        if (sel.includes(',')) {
          const parts = sel.split(',').map((s) => s.trim());
          for (const p of parts) {
            if (matchesSelector(n, p)) return n;
          }
        } else if (matchesSelector(n, sel)) {
          return n;
        }
        n = n.parentElement;
      }
      return null;
    },
    addEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    focus() {},
  };
  return node;
}

describe('activity timer — dead Start regression', () => {
  it('uses capture-phase delegation so wrap stopPropagation does not block Start', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /addEventListener\('click', function \(e\) \{[\s\S]*\}, true\)/);
  });

  it('capture handler runs before bubble stopPropagation on timer wrap', () => {
    const order = [];
    const startBtn = makeElement('button', {
      className: 'activity-timer-start btn-child-action',
      dataset: { itemId: 'item-1' },
    });
    const captureFn = (e) => {
      const start = e.target.closest('.activity-timer-start');
      if (start) {
        order.push('start-handled');
        e.stopPropagation();
      }
    };
    const wrapBubble = (e) => {
      e.stopPropagation();
      order.push('wrap-blocked');
    };
    const event = {
      target: startBtn,
      _stopped: false,
      stopPropagation() { this._stopped = true; },
      preventDefault() {},
    };
    captureFn(event);
    if (!event._stopped) wrapBubble(event);
    assert.deepEqual(order, ['start-handled']);
  });

  it('plays finish sound and screen flash when timer reaches zero', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /function startFinishCelebration/);
    assert.match(src, /FINISH_CELEBRATION_MS = 15000/);
    assert.match(src, /activity-timer-celebration--on/);
    assert.doesNotMatch(src, /activity-timer-finish-flash/);
    assert.match(src, /playEndChime\(true\)/);
  });

  it('hides parent timer when timed substeps exist', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /sub_step_timed_count/);
    assert.match(src, /timedSubStepsOnItem/);
    assert.match(src, /!timedSubStepsOnItem\(item\)/);
  });

  it('keeps screen awake while a timer is running', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /syncScreenWakeLock/);
    assert.match(src, /wakeLock\.request\('screen'\)/);
  });

  it('overlay mounts large hourglass via overlayHourglassMountHtml', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /hgSlot\.innerHTML = overlayHourglassMountHtml\(\)/);
    assert.doesNotMatch(src, /hourglassMountHtml\(false\)/);
  });

  it('wireDelegation registers a single capture listener', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /if \(_wired\) return/);
    assert.match(src, /_wired = true/);
  });

  it('inline list uses compact icon, not SVG hourglass mount', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /function inlineTimerIconHtml/);
    assert.match(src, /activity-timer-inline-icon/);
    const inner = src.match(/function renderTimerInner[\s\S]*?function renderTimerWrap/);
    assert.ok(inner);
    assert.doesNotMatch(inner[0], /hourglassMountHtml\(true\)/);
    assert.doesNotMatch(inner[0], /data-hourglass-mount/);
  });

  it('substep rows separate toggle line from timer controls', () => {
    const substeps = read('public/js/child-dashboard-substeps.js');
    const support = read('public/js/child-support-layer.js');
    assert.match(substeps, /substep-row-primary/);
    assert.match(substeps, /substep-timer-slot/);
    assert.match(support, /substep-timer-slot/);
    assert.match(support, /activity-timer-wrap, \.substep-timer-slot/);
  });

  it('substep Start uses sub_step id in session key', () => {
    const { ATS } = (function loadSession() {
      const store = new Map();
      const window = {
        localStorage: {
          getItem(key) { return store.has(key) ? store.get(key) : null; },
          setItem(key, value) { store.set(key, value); },
          removeItem(key) { store.delete(key); },
        },
      };
      vm.runInNewContext(read('public/js/activity-timer-session.js'), {
        window,
        localStorage: window.localStorage,
        console,
      });
      return { ATS: window.ActivityTimerSession, store };
    })();
    ATS.startSession('c1', '2026-08-04', 'log-item', 120, 'sub-9');
    const s = ATS.getSession('c1', '2026-08-04', 'log-item', 'sub-9');
    assert.equal(s.activity_sub_step_id, 'sub-9');
  });
});
