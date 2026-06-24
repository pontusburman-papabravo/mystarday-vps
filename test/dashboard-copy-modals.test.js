const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const WINDOW_EXPORTS = [
  'confirmDeleteSchedule',
  'openCopyDayModal',
  'toggleCopyDay',
  'closeCopyDayModal',
  'submitCopyDay',
  'openCopyChildModal',
  'selectCopyChild',
  'closeCopyChildModal',
  'submitCopyChild',
  'openConfirmModal',
  'closeConfirmModal',
];

describe('F2h dashboard-copy-modals.js', () => {
  it('copy/delete/confirm modals live in their own IIFE', () => {
    const src = read('public/js/dashboard-copy-modals.js');
    assert.match(src, /^\(function \(\) \{/m);
    assert.match(src, /const \{ DAYS \} = window\.ScheduleCore;/);
    assert.match(src, /function confirmDeleteSchedule\(/);
    assert.match(src, /function openConfirmModal\(/);
    assert.match(src, /async function submitCopyDay\(/);
    assert.match(src, /async function submitCopyChild\(/);
  });

  it('exposes entry points on window for inline onclick + cross-file callers', () => {
    const src = read('public/js/dashboard-copy-modals.js');
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

  it('activity-modal still calls openConfirmModal from removeItem (cross-file)', () => {
    const src = read('public/js/dashboard-activity-modal.js');
    assert.match(src, /openConfirmModal\(/);
  });

  it('dashboard.html loads copy-modals after dashboard.js', () => {
    const html = read('public/dashboard.html');
    const dashIdx = html.indexOf('/js/dashboard.js');
    const modIdx = html.indexOf('/js/dashboard-copy-modals.js');
    assert.ok(modIdx !== -1, 'dashboard-copy-modals.js script tag missing');
    assert.ok(dashIdx < modIdx, 'copy-modals must load after dashboard.js');
  });

  it('sw.js cache version bumped for the split', () => {
    const src = read('public/sw.js');
    assert.match(src, /stjarndag-v31[1-9]|stjarndag-v3[2-9]\d/);
  });
});
