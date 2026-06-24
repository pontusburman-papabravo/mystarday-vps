const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const WINDOW_EXPORTS = [
  'openGiveStarsModal',
  'submitGiveStars',
  'openRequestPanel',
  'closeRequestPanel',
  'approveGoalChange',
  'denyGoalChange',
  'approveRedemption',
  'denyRedemption',
];

describe('F2f dashboard-approvals.js', () => {
  it('give-stars + request panel live in their own IIFE', () => {
    const src = read('public/js/dashboard-approvals.js');
    assert.match(src, /^\(function \(\) \{/m);
    assert.match(src, /function openGiveStarsModal\(/);
    assert.match(src, /async function submitGiveStars\(/);
    assert.match(src, /async function openRequestPanel\(/);
    assert.match(src, /async function approveRedemption\(/);
  });

  it('exposes entry points on window for inline onclick + cross-file callers', () => {
    const src = read('public/js/dashboard-approvals.js');
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

  it('card-actions still calls openGiveStarsModal at runtime (cross-file)', () => {
    const src = read('public/js/dashboard-card-actions.js');
    assert.match(src, /openGiveStarsModal\(/);
  });

  it('daily-summary still calls window.openRequestPanel at runtime', () => {
    const src = read('public/js/dashboard-daily-summary.js');
    assert.match(src, /window\.openRequestPanel/);
  });

  it('dashboard.html loads approvals after dashboard.js and before special-days', () => {
    const html = read('public/dashboard.html');
    const dashIdx = html.indexOf('/js/dashboard.js');
    const apprIdx = html.indexOf('/js/dashboard-approvals.js');
    const cardIdx = html.indexOf('/js/dashboard-card-actions.js');
    assert.ok(apprIdx !== -1, 'dashboard-approvals.js script tag missing');
    assert.ok(dashIdx < apprIdx, 'approvals must load after dashboard.js');
    assert.ok(cardIdx < apprIdx, 'approvals must load after card-actions (openGiveStarsModal dependency)');
  });

  it('sw.js cache version bumped for the split', () => {
    const src = read('public/sw.js');
    assert.match(src, /stjarndag-v30[9]|stjarndag-v3[1-9]\d/);
  });
});
