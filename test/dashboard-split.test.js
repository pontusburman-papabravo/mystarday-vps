const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// Fas 8 F2d–F2i: dashboard.js split into feature modules.
const MODULES = {
  'public/js/dashboard-views.js': ['renderTimeline', 'renderSbsView', 'loadAllChildrenSchedules'],
  'public/js/dashboard-activity-modal.js': ['loadTemplates', 'submitAddActivity', 'removeItem', 'openEditItem', 'confirmRecurrence'],
  'public/js/dashboard-approvals.js': ['openGiveStarsModal', 'submitGiveStars', 'openRequestPanel', 'approveRedemption'],
  'public/js/dashboard-dnd.js': ['initDragDrop', 'moveItem', 'copyActivityToDay', 'openDayDndModal'],
  'public/js/dashboard-copy-modals.js': ['confirmDeleteSchedule', 'openCopyDayModal', 'submitCopyChild', 'openConfirmModal'],
  'public/js/dashboard-card-actions.js': ['toggleInlineRedemption', 'togglePauseDay', 'openGiveStarsQuick', 'dashToggleActivity'],
};

describe('F2d–F2i dashboard split', () => {
  for (const [file, fns] of Object.entries(MODULES)) {
    it(`${path.basename(file)} is an IIFE exposing its handlers on window`, () => {
      const src = read(file);
      assert.match(src, /^\(function \(\) \{/m, `${file} must be an IIFE`);
      for (const fn of fns) {
        assert.match(src, new RegExp(`function ${fn}\\b`), `${file} must define ${fn}`);
        assert.match(src, new RegExp(`window\\.${fn}\\s*=\\s*${fn};`), `${file} must expose window.${fn}`);
      }
    });
  }

  it('dashboard.js no longer defines the extracted functions', () => {
    const src = read('public/js/dashboard.js');
    for (const fns of Object.values(MODULES)) {
      for (const fn of fns) {
        assert.doesNotMatch(src, new RegExp(`function ${fn}\\b`), `dashboard.js must not still define ${fn}`);
      }
    }
  });

  it('dashboard.js is under the ~1500 line target', () => {
    const lines = read('public/js/dashboard.js').split('\n').length;
    assert.ok(lines < 1500, `dashboard.js is ${lines} lines (target < 1500)`);
  });

  it('dashboard.html loads every split module after dashboard.js', () => {
    const html = read('public/dashboard.html');
    const dashIdx = html.indexOf('/js/dashboard.js');
    for (const file of Object.keys(MODULES)) {
      const tag = '/js/' + path.basename(file);
      const idx = html.indexOf(tag);
      assert.ok(idx !== -1, `${tag} script tag missing`);
      assert.ok(idx > dashIdx, `${tag} must load after dashboard.js`);
    }
  });
});
