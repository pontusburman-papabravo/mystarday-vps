const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('F2 dashboard-special-days.js', () => {
  it('special-days logic lives in its own file as an IIFE', () => {
    const src = read('public/js/dashboard-special-days.js');
    assert.match(src, /^\(function \(\) \{/m);
    assert.match(src, /async function renderSpecialDaysCalendar\(/);
    assert.match(src, /async function sdSave\(/);
    assert.match(src, /async function sdDeleteSpecialDay\(/);
    assert.match(src, /const \{ fmtTime \} = window\.ScheduleCore;/);
  });

  it('exposes entry points on window for onclick + setViewMode', () => {
    const src = read('public/js/dashboard-special-days.js');
    for (const fn of [
      'renderSpecialDaysCalendar', 'sdNavMonth', 'sdOpenDay', 'closeSpecialDayModal',
      'sdCopyFromTemplate', 'sdAddItem', 'sdRemovePendingItem', 'sdRemoveItem',
      'sdClearAll', 'sdSave', 'sdDeleteSpecialDay',
    ]) {
      assert.match(src, new RegExp(`window\\.${fn}\\s*=\\s*${fn};`), `window.${fn} not exposed`);
    }
  });

  it('dashboard.js no longer defines special-days state or functions', () => {
    const src = read('public/js/dashboard.js');
    assert.doesNotMatch(src, /let sdCalYear =/);
    assert.doesNotMatch(src, /async function renderSpecialDaysCalendar\(/);
    assert.doesNotMatch(src, /async function sdSave\(/);
    assert.doesNotMatch(src, /function renderSdItems\(/);
    assert.doesNotMatch(src, /const MONTH_NAMES =/);
  });

  it('dashboard.js still calls renderSpecialDaysCalendar from setViewMode', () => {
    const src = read('public/js/dashboard.js');
    assert.match(src, /mode === 'special-days'.*renderSpecialDaysCalendar\(\)/);
  });

  it('dashboard.html loads special-days after dashboard.js (so window state exists)', () => {
    const html = read('public/dashboard.html');
    const dashIdx = html.indexOf('/js/dashboard.js');
    const sdIdx = html.indexOf('/js/dashboard-special-days.js');
    assert.ok(sdIdx !== -1, 'dashboard-special-days.js script tag missing');
    assert.ok(dashIdx < sdIdx, 'special-days must load after dashboard.js');
  });
});
