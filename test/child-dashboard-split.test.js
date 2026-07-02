const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MODULES = {
  'public/js/child-dashboard-offline.js': [
    'showOfflineBanner',
    'hideOfflineBanner',
    'showOfflineEmptyState',
    'showOfflineErrorState',
  ],
  'public/js/child-dashboard-day-nav.js': [
    'renderDayTabs',
    'navigateWeek',
    'goToToday',
    'updateTodayBtn',
    'updateDateLine',
  ],
  'public/js/child-dashboard-timers.js': ['initTimeTimers'],
};

describe('Fas 8 F3 child-dashboard split', () => {
  for (const [file, fns] of Object.entries(MODULES)) {
    it(`${path.basename(file)} is an IIFE exposing handlers on window`, () => {
      const src = read(file);
      assert.match(src, /^\(function \(\) \{/m, `${file} must be an IIFE`);
      for (const fn of fns) {
        assert.match(src, new RegExp(`function ${fn}\\b`), `${file} must define ${fn}`);
        assert.match(src, new RegExp(`window\\.${fn}\\s*=\\s*${fn};`), `${file} must expose window.${fn}`);
      }
    });
  }

  it('child-dashboard.js no longer defines extracted functions', () => {
    const src = read('public/js/child-dashboard.js');
    for (const fns of Object.values(MODULES)) {
      for (const fn of fns) {
        assert.doesNotMatch(src, new RegExp(`function ${fn}\\b`), `child-dashboard.js must not define ${fn}`);
      }
    }
  });

  it('child-dashboard.js retains weekOffset state', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /let weekOffset = 0/);
    assert.match(src, /let visualTimer = true/);
  });

  it('child-dashboard.html loads split modules before child-dashboard.js', () => {
    const html = read('public/child-dashboard.html');
    const hostIdx = html.indexOf('/js/child-dashboard.js');
    for (const file of Object.keys(MODULES)) {
      const tag = '/js/' + path.basename(file);
      const idx = html.indexOf(tag);
      assert.ok(idx !== -1, `${tag} missing`);
      assert.ok(idx < hostIdx, `${tag} must load before child-dashboard.js`);
    }
  });
});
