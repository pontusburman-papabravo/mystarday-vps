const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MODULE = 'public/js/dnd-touch-bridge.js';

describe('Fas 8 PR-0 dnd-touch-bridge.js', () => {
  it('is an IIFE exposing initTouchDndBridge on window', () => {
    const src = read(MODULE);
    assert.match(src, /^\(function \(\) \{/m, `${MODULE} must be an IIFE`);
    assert.match(src, /function initTouchDndBridge\b/);
    assert.match(src, /window\.initTouchDndBridge\s*=\s*initTouchDndBridge;/);
  });

  it('preserves touch-bridge behavior contract', () => {
    const src = read(MODULE);
    assert.match(src, /\[draggable="true"\]/);
    assert.match(src, /dnd-ghost/);
    assert.match(src, /copy-ghost/);
    assert.match(src, /day-ghost/);
    assert.match(src, /,380\)/);
    assert.match(src, /DragEvent\('dragstart'/);
    assert.match(src, /DragEvent\('dragover'/);
    assert.match(src, /DragEvent\('drop'/);
    assert.match(src, /DragEvent\('dragend'/);
    assert.match(src, /\bescHtml\b/);
  });

  it('host files no longer define initTouchDndBridge', () => {
    for (const file of ['public/js/schedule.js', 'public/js/dashboard.js']) {
      const src = read(file);
      assert.doesNotMatch(src, /function initTouchDndBridge\b/, `${file} must not define initTouchDndBridge`);
      assert.match(src, /initTouchDndBridge\(\)/, `${file} must still call initTouchDndBridge()`);
    }
  });

  it('schedule.html loads dnd-touch-bridge after dom-utils and before schedule.js', () => {
    const html = read('public/schedule.html');
    const domIdx = html.indexOf('/js/dom-utils.js');
    const bridgeIdx = html.indexOf('/js/dnd-touch-bridge.js');
    const schedIdx = html.indexOf('/js/schedule.js');
    assert.ok(domIdx !== -1, 'dom-utils.js missing');
    assert.ok(bridgeIdx !== -1, 'dnd-touch-bridge.js missing');
    assert.ok(schedIdx !== -1, 'schedule.js missing');
    assert.ok(bridgeIdx > domIdx, 'dnd-touch-bridge must load after dom-utils');
    assert.ok(bridgeIdx < schedIdx, 'dnd-touch-bridge must load before schedule.js');
  });

  it('dashboard.html loads dnd-touch-bridge after dom-utils and before dashboard.js', () => {
    const html = read('public/dashboard.html');
    const domIdx = html.indexOf('/js/dom-utils.js');
    const bridgeIdx = html.indexOf('/js/dnd-touch-bridge.js');
    const dashIdx = html.indexOf('/js/dashboard.js');
    assert.ok(domIdx !== -1, 'dom-utils.js missing');
    assert.ok(bridgeIdx !== -1, 'dnd-touch-bridge.js missing');
    assert.ok(dashIdx !== -1, 'dashboard.js missing');
    assert.ok(bridgeIdx > domIdx, 'dnd-touch-bridge must load after dom-utils');
    assert.ok(bridgeIdx < dashIdx, 'dnd-touch-bridge must load before dashboard.js');
  });
});
