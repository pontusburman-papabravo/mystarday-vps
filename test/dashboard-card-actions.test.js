const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const WINDOW_EXPORTS = [
  'toggleInlineRedemption',
  'inlineApproveGoalChange',
  'inlineDenyGoalChange',
  'inlineApproveRedemption',
  'inlineDenyRedemption',
  'togglePauseDay',
  'openGiveStarsQuick',
  'openLedigDagModal',
  'ledigDagToggle',
  'dashToggleActivity',
];

describe('F2i dashboard-card-actions.js', () => {
  it('card actions live in their own IIFE', () => {
    const src = read('public/js/dashboard-card-actions.js');
    assert.match(src, /^\(function \(\) \{/m);
    assert.match(src, /async function toggleInlineRedemption\(/);
    assert.match(src, /function openGiveStarsQuick\(/);
    assert.match(src, /async function dashToggleActivity\(/);
  });

  it('exposes entry points on window for inline onclick', () => {
    const src = read('public/js/dashboard-card-actions.js');
    for (const fn of WINDOW_EXPORTS) {
      assert.match(src, new RegExp(`window\\.${fn}\\s*=\\s*${fn};`), `window.${fn} not exposed`);
    }
  });

  it('dashboard.js no longer defines the extracted functions', () => {
    const src = read('public/js/dashboard.js');
    for (const fn of WINDOW_EXPORTS) {
      assert.doesNotMatch(src, new RegExp(`function ${fn}\\b`), `dashboard.js must not still define ${fn}`);
    }
  });

  it('dashboard.js still renders onclick hooks for card actions', () => {
    const src = read('public/js/dashboard.js');
    assert.match(src, /dashToggleActivity\(/);
    assert.match(src, /toggleInlineRedemption\(/);
    assert.match(src, /togglePauseDay\(/);
  });

  it('dashboard.html loads card-actions after dashboard.js', () => {
    const html = read('public/dashboard.html');
    const dashIdx = html.indexOf('/js/dashboard.js');
    const modIdx = html.indexOf('/js/dashboard-card-actions.js');
    assert.ok(modIdx !== -1, 'dashboard-card-actions.js script tag missing');
    assert.ok(dashIdx < modIdx, 'card-actions must load after dashboard.js');
  });

  it('sw.js cache version bumped for the split', () => {
    const src = read('public/sw.js');
    assert.match(src, /stjarndag-v30[8-9]|stjarndag-v3[1-9]\d/);
  });
});
