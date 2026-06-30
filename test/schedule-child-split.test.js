const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MODULES = {
  'public/js/schedule-special-days.js': {
    page: 'public/schedule.html', host: '/js/schedule.js',
    fns: ['renderSpecialDaysCalendar', 'sdOpenDay', 'sdSave', 'sdDeleteSpecialDay'],
  },
  'public/js/schedule-template-mode.js': {
    page: 'public/schedule.html', host: '/js/schedule.js',
    fns: ['loadTemplate', 'renderTemplate', 'openTemplateModal', 'createScheduleWithTemplate'],
  },
  'public/js/schedule-insert-fill.js': {
    page: 'public/schedule.html', host: '/js/schedule.js',
    fns: ['openInsertDayModal', 'doInsertDay', 'openFillWeekModal', 'submitFillWeek', 'submitNewScheduleTemplate'],
  },
  'public/js/child-dashboard-rewards.js': {
    page: 'public/child-dashboard.html', host: '/js/child-dashboard.js',
    fns: ['loadRewards', 'renderSkattkammaren', 'requestRedeem', 'openGoalPicker', 'setGoal'],
  },
};

describe('F3a–F3d schedule + child-dashboard split', () => {
  for (const [file, cfg] of Object.entries(MODULES)) {
    it(`${path.basename(file)} is an IIFE exposing handlers on window`, () => {
      const src = read(file);
      assert.match(src, /^\(function \(\) \{/m, `${file} must be an IIFE`);
      for (const fn of cfg.fns) {
        assert.match(src, new RegExp(`function ${fn}\\b`), `${file} must define ${fn}`);
        assert.match(src, new RegExp(`window\\.${fn}\\s*=\\s*${fn};`), `${file} must expose window.${fn}`);
      }
    });

    it(`${path.basename(cfg.page)} loads ${path.basename(file)} after its host`, () => {
      const html = read(cfg.page);
      const hostIdx = html.indexOf(cfg.host);
      const modIdx = html.indexOf('/js/' + path.basename(file));
      assert.ok(modIdx !== -1, `${file} script tag missing`);
      assert.ok(modIdx > hostIdx, `${file} must load after ${cfg.host}`);
    });
  }

  it('host files no longer define the extracted functions', () => {
    const sched = read('public/js/schedule.js');
    const child = read('public/js/child-dashboard.js');
    for (const fn of ['renderSpecialDaysCalendar', 'loadTemplate', 'openFillWeekModal']) {
      assert.doesNotMatch(sched, new RegExp(`function ${fn}\\b`), `schedule.js must not still define ${fn}`);
    }
    for (const fn of ['loadRewards', 'renderSkattkammaren']) {
      assert.doesNotMatch(child, new RegExp(`function ${fn}\\b`), `child-dashboard.js must not still define ${fn}`);
    }
  });

  it('child-dashboard-rewards.js is precached for offline', () => {
    assert.match(read('public/sw.js'), /'\/js\/child-dashboard-rewards\.js'/);
  });

  it('child rewards load shares window.rewardsLoaded across split scripts', () => {
    const dash = read('public/js/child-dashboard.js');
    const rewards = read('public/js/child-dashboard-rewards.js');
    assert.match(dash, /window\.rewardsLoaded\s*=\s*false/);
    assert.match(dash, /!window\.rewardsLoaded/);
    assert.match(rewards, /window\.rewardsLoaded\s*=\s*true/);
    assert.match(rewards, /_loadRewardsInflight/);
    assert.match(rewards, /Försök igen/);
  });

  it('child-rewards-engine reads star_balance from goal API', () => {
    const src = read('public/js/child-rewards-engine.js');
    assert.match(src, /star_balance/);
    assert.match(src, /reward_name/);
  });
});
