'use strict';

/**
 * PR1 — one stacking scale and one blocking-overlay policy.
 * Chrome (bottom nav, native tab bar, help FAB, feedback FAB) loses
 * hit-testing while any data-overlay="modal" is open, including when
 * another overlay is still open after one closes.
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

function layerValue(css, name) {
  const match = css.match(new RegExp('--' + name + ':\\s*(\\d+)'));
  assert.ok(match, 'missing --' + name);
  return Number(match[1]);
}

function createEl(tag) {
  const el = {
    nodeType: 1,
    tagName: String(tag || 'div').toUpperCase(),
    attributes: Object.create(null),
    classSet: new Set(),
    children: [],
    parentNode: null,
    style: {},
    id: '',
  };
  el.classList = {
    contains(token) { return el.classSet.has(token); },
    add(token) { el.classSet.add(token); },
    remove(token) { el.classSet.delete(token); },
    toggle(token, force) {
      const on = force === undefined ? !el.classSet.has(token) : !!force;
      if (on) el.classSet.add(token);
      else el.classSet.delete(token);
      return on;
    },
  };
  el.setAttribute = function (key, value) {
    el.attributes[key] = String(value);
    if (key === 'id') el.id = String(value);
    if (key === 'class') {
      el.classSet = new Set(String(value).split(/\s+/).filter(Boolean));
    }
  };
  el.getAttribute = function (key) {
    return Object.prototype.hasOwnProperty.call(el.attributes, key) ? el.attributes[key] : null;
  };
  el.hasAttribute = function (key) {
    return Object.prototype.hasOwnProperty.call(el.attributes, key);
  };
  el.removeAttribute = function (key) {
    delete el.attributes[key];
  };
  el.appendChild = function (child) {
    child.parentNode = el;
    el.children.push(child);
    return child;
  };
  el.remove = function () {
    if (!el.parentNode) return;
    el.parentNode.children = el.parentNode.children.filter((child) => child !== el);
    el.parentNode = null;
  };
  return el;
}

function walk(el, out) {
  (el.children || []).forEach((child) => {
    out.push(child);
    walk(child, out);
  });
}

function matches(el, selector) {
  if (selector === '[data-overlay], .fixed.inset-0') {
    return matches(el, '[data-overlay]') || matches(el, '.fixed.inset-0');
  }
  if (selector === '[data-overlay]') return el.hasAttribute('data-overlay');
  if (selector === '.fixed.inset-0') {
    return el.classList.contains('fixed') && el.classList.contains('inset-0');
  }
  return false;
}

function createDocument() {
  const doc = {
    readyState: 'complete',
    documentElement: createEl('html'),
    body: createEl('body'),
  };
  doc.documentElement.style.setProperty = function (name, value) {
    doc.documentElement.style[name] = value;
  };
  doc.documentElement.appendChild(doc.body);
  doc.querySelectorAll = function (selector) {
    const out = [];
    walk(doc.body, out);
    return out.filter((el) => matches(el, selector));
  };
  doc.getElementById = function (id) {
    const out = [];
    walk(doc.body, out);
    return out.find((el) => el.id === id) || null;
  };
  doc.querySelector = function () { return null; };
  doc.addEventListener = function () {};
  doc.createElement = function (tag) { return createEl(tag); };
  return doc;
}

function bootPolicy(doc, extra) {
  const sandbox = {
    console,
    document: doc,
    MutationObserver: function MutationObserver() {},
    setTimeout,
    clearTimeout,
  };
  sandbox.MutationObserver.prototype.observe = function () {};
  sandbox.MutationObserver.prototype.disconnect = function () {};
  sandbox.window = sandbox;
  sandbox.visualViewport = {
    height: 800,
    offsetTop: 0,
    addEventListener() {},
  };
  sandbox.innerHeight = 800;
  sandbox.addEventListener = function () {};
  Object.assign(sandbox, extra || {});
  vm.createContext(sandbox);
  vm.runInContext(read('public/js/modal-open-observer.js'), sandbox, { filename: 'modal-open-observer.js' });
  return sandbox;
}

function addOverlay(doc, id, attrs) {
  const el = createEl('div');
  el.setAttribute('id', id);
  Object.keys(attrs || {}).forEach((key) => el.setAttribute(key, attrs[key]));
  doc.body.appendChild(el);
  return el;
}

describe('overlay layer scale', () => {
  const css = read('public/css/app-layers.css');

  it('defines one canonical scale with toast above modal and modal above chrome', () => {
    const fab = layerValue(css, 'layer-fab');
    const nav = layerValue(css, 'layer-bottom-nav');
    const backdrop = layerValue(css, 'layer-modal-backdrop');
    const modal = layerValue(css, 'layer-modal');
    const toast = layerValue(css, 'layer-toast');
    const emergency = layerValue(css, 'layer-emergency');
    assert.ok(fab < nav);
    assert.ok(nav < backdrop);
    assert.ok(backdrop < modal);
    assert.ok(modal < toast);
    assert.ok(toast < emergency);
    assert.match(css, /--layer-content:\s*0/);
    assert.match(css, /--layer-sticky:\s*100/);
    assert.match(css, /--layer-popover:\s*200/);
  });

  it('hides nav and FABs from hit-testing while a blocking overlay is open', () => {
    for (const sel of ['.parent-bottom-nav', '.native-tab-bar', '#hbBtn', '#globalFeedbackBtn', '.global-feedback-fab']) {
      const escaped = sel.replace(/[.#]/g, '\\$&');
      assert.match(css, new RegExp('body\\.modal-open ' + escaped));
    }
    assert.match(css, /visibility:\s*hidden !important/);
    assert.match(css, /pointer-events:\s*none !important/);
    assert.match(css, /\[data-overlay="modal"\]/);
    assert.match(css, /bottom:\s*var\(--overlay-keyboard-inset\)/);
  });

  it('places the toast on the toast layer, above the modal layer', () => {
    const toast = read('public/js/toast.js');
    assert.match(toast, /data-overlay',\s*'toast'/);
    assert.doesNotMatch(toast, /z-\[9999\]/);
    assert.match(css, /\[data-overlay="toast"\][\s\S]*z-index:\s*var\(--layer-toast\)/);
    assert.ok(layerValue(css, 'layer-toast') > layerValue(css, 'layer-modal'));
  });
});

describe('overlay policy behavior', () => {
  it('blocks chrome for a schedule modal and restores it when the modal closes', () => {
    const doc = createDocument();
    const sandbox = bootPolicy(doc);
    addOverlay(doc, 'scheduleAddMenuModal', { 'data-overlay': 'modal', class: 'fixed inset-0' });
    addOverlay(doc, 'hbBtn', {});
    addOverlay(doc, 'globalFeedbackBtn', { class: 'global-feedback-fab' });
    addOverlay(doc, 'parentBottomNav', { class: 'parent-bottom-nav' });
    assert.equal(sandbox.OverlayPolicy.sync(), 1);
    assert.equal(doc.body.classList.contains('modal-open'), true);

    doc.getElementById('scheduleAddMenuModal').classList.add('hidden');
    assert.equal(sandbox.OverlayPolicy.sync(), 0);
    assert.equal(doc.body.classList.contains('modal-open'), false);
  });

  it('treats the PIN gate as blocking without relying on a Tailwind z-index', () => {
    const doc = createDocument();
    const sandbox = bootPolicy(doc);
    addOverlay(doc, 'parentPinHandoffGateModal', { 'data-overlay': 'modal', role: 'dialog' });
    assert.equal(sandbox.OverlayPolicy.isBlocking(doc.getElementById('parentPinHandoffGateModal')), true);
    assert.equal(sandbox.OverlayPolicy.sync(), 1);
    assert.equal(doc.body.classList.contains('modal-open'), true);
    assert.match(read('public/js/parent-pin-handoff-gate.js'), /data-overlay',\s*'modal'/);
    assert.match(read('public/js/adult-pin-gate-ui.js'), /data-overlay',\s*'modal'/);
    assert.doesNotMatch(read('public/js/parent-pin-handoff-gate.js'), /z-\[90\]/);
    assert.doesNotMatch(read('public/js/adult-pin-gate-ui.js'), /z-index:10000/);
  });

  it('treats the För dig activation dialog as a blocking overlay', () => {
    const doc = createDocument();
    const sandbox = bootPolicy(doc);
    addOverlay(doc, 'forDigBackdrop', {
      'data-overlay': 'modal',
      class: 'for-dig-modal-backdrop',
      'data-activation': '1',
    });
    assert.equal(sandbox.OverlayPolicy.sync(), 1);
    assert.equal(doc.body.classList.contains('modal-open'), true);
    const src = read('public/js/for-dig.js');
    assert.equal((src.match(/data-overlay',\s*'modal'/g) || []).length >= 2, true);
  });

  it('blocks chrome while the feedback modal is open, including its own FAB', () => {
    const doc = createDocument();
    const sandbox = bootPolicy(doc);
    addOverlay(doc, 'globalFeedbackBtn', { class: 'global-feedback-fab' });
    const modal = addOverlay(doc, 'globalFeedbackModal', {
      'data-overlay': 'modal',
      class: 'hidden fixed inset-0',
    });
    assert.equal(sandbox.OverlayPolicy.sync(), 0);
    modal.classList.remove('hidden');
    assert.equal(sandbox.OverlayPolicy.sync(), 1);
    assert.equal(doc.body.classList.contains('modal-open'), true);
    assert.match(read('public/js/feedback.js'), /data-overlay',\s*'modal'/);
    assert.doesNotMatch(read('public/js/feedback.js'), /zIndex = '10000'/);
  });

  it('blocks navigation under the widget overlay and restores only that overlay on cleanup', () => {
    const widget = read('public/js/widget-install-prompt.js');
    const nav = read('public/js/settings-native-nav.js');
    assert.match(widget, /data-overlay',\s*'modal'/);
    assert.doesNotMatch(widget, /z-\[10450\]/);
    assert.doesNotMatch(widget, /classList\.remove\('modal-open'\)/);
    assert.doesNotMatch(nav, /classList\.remove\('modal-open'\)/);
    assert.match(nav, /OverlayPolicy\.sync/);

    const doc = createDocument();
    const sandbox = bootPolicy(doc);
    sandbox.location = { pathname: '/settings' };
    sandbox.matchMedia = function () { return { matches: false }; };
    addOverlay(doc, 'msj-widget-prompt-overlay', { 'data-overlay': 'modal', class: 'fixed inset-0' });
    const realModal = addOverlay(doc, 'confirmOverlay', { 'data-overlay': 'modal' });
    assert.equal(sandbox.OverlayPolicy.sync(), 2);

    vm.runInContext(nav, sandbox, { filename: 'settings-native-nav.js' });

    assert.equal(doc.getElementById('msj-widget-prompt-overlay'), null);
    assert.equal(realModal.parentNode, doc.body);
    assert.equal(doc.body.classList.contains('modal-open'), true);

    realModal.remove();
    assert.equal(sandbox.OverlayPolicy.sync(), 0);
    assert.equal(doc.body.classList.contains('modal-open'), false);
  });

  it('clears modal-open when widget cleanup removes the only overlay', () => {
    const doc = createDocument();
    const sandbox = bootPolicy(doc);
    sandbox.location = { pathname: '/settings' };
    sandbox.matchMedia = function () { return { matches: false }; };
    addOverlay(doc, 'msj-widget-prompt-overlay', { 'data-overlay': 'modal' });
    assert.equal(sandbox.OverlayPolicy.sync(), 1);
    vm.runInContext(read('public/js/settings-native-nav.js'), sandbox, { filename: 'settings-native-nav.js' });
    assert.equal(doc.getElementById('msj-widget-prompt-overlay'), null);
    assert.equal(doc.body.classList.contains('modal-open'), false);
  });

  it('keeps chrome blocked until the last blocking overlay closes', () => {
    const doc = createDocument();
    const sandbox = bootPolicy(doc);
    const first = addOverlay(doc, 'pinGate', { 'data-overlay': 'modal' });
    const second = addOverlay(doc, 'feedbackModal', { 'data-overlay': 'modal' });
    assert.equal(sandbox.OverlayPolicy.sync(), 2);
    first.remove();
    assert.equal(sandbox.OverlayPolicy.sync(), 1);
    assert.equal(doc.body.classList.contains('modal-open'), true);
    second.classList.add('hidden');
    assert.equal(sandbox.OverlayPolicy.sync(), 0);
    assert.equal(doc.body.classList.contains('modal-open'), false);
  });

  it('does not treat a toast as a blocking overlay', () => {
    const doc = createDocument();
    const sandbox = bootPolicy(doc);
    addOverlay(doc, 'toast', { 'data-overlay': 'toast', class: 'fixed' });
    assert.equal(sandbox.OverlayPolicy.sync(), 0);
    assert.equal(doc.body.classList.contains('modal-open'), false);
  });

  it('lifts the modal above the keyboard inset from visualViewport', () => {
    const doc = createDocument();
    const sandbox = bootPolicy(doc);
    sandbox.visualViewport.height = 500;
    sandbox.visualViewport.offsetTop = 0;
    sandbox.innerHeight = 800;
    assert.equal(sandbox.OverlayPolicy.syncKeyboardInset(), 300);
    assert.equal(doc.documentElement.style['--overlay-keyboard-inset'], '300px');
  });
});

describe('overlay policy is on the parent surfaces that open modals', () => {
  it('marks dashboard, schedule, and the schedule add menu as blocking overlays', () => {
    assert.match(read('public/dashboard.html'), /id="addActivityModal"[^>]*data-overlay="modal"|data-overlay="modal"[^>]*id="addActivityModal"/);
    assert.match(read('public/schedule.html'), /id="addActivityModal"[^>]*data-overlay="modal"|data-overlay="modal"[^>]*id="addActivityModal"/);
    assert.match(read('public/js/schedule-add-menu.js'), /data-overlay',\s*'modal'/);
    assert.match(read('public/dashboard.html'), /modal-open-observer\.js/);
    assert.match(read('public/schedule.html'), /modal-open-observer\.js/);
  });

  it('injects the layer stylesheet and observer on parent pages that do not ship them inline', () => {
    const { injectPlatformHtml } = require('../src/middleware/platform-html');
    const html = injectPlatformHtml(
      '<!DOCTYPE html><html><head></head><body></body></html>',
      '/settings',
      { query: {}, get: function () { return ''; } }
    );
    assert.match(html, /\/css\/app-layers\.css/);
    assert.match(html, /\/js\/modal-open-observer\.js/);
  });
});
