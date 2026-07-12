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

function loadWarmth(gateOn) {
  const script = read('public/js/child-today-warmth.js');
  const win = {
    ChildWorlds: gateOn ? { isBarnetsSamlingEnabled: function () { return true; } } : {},
    ChildTheme: { getActiveThemeId: function () { return 'sports'; } },
    ChildTodayFun: {
      currentDagdelKey: function () { return 'kvall'; },
    },
    document: {
      documentElement: {
        getAttribute: function (name) {
          if (name === 'data-barnets-samling' && gateOn) return 'on';
          return null;
        },
      },
      readyState: 'complete',
      addEventListener: function () {},
      getElementById: function () { return null; },
    },
    matchMedia: function () { return { matches: false }; },
  };
  vm.runInNewContext(script, { window: win, document: win.document }, { filename: 'child-today-warmth.js' });
  return win;
}

describe('child-today-warmth — värme & igenkänning', () => {
  it('dayNarrative uses NPF-friendly copy instead of score language', () => {
    const win = loadWarmth(true);
    const text = win.ChildTodayWarmth.dayNarrative({ state: 'active' });
    assert.match(text, /kvällsrutinen/);
    assert.doesNotMatch(text, /\d+ av \d+/);
  });

  it('maps themes to small corner decals', () => {
    const win = loadWarmth(true);
    assert.equal(win.ChildTodayWarmth.THEME_DECALS.music.emoji, '🎵');
    assert.equal(win.ChildTodayWarmth.THEME_DECALS.sports.emoji, '⚽');
    assert.equal(win.ChildTodayWarmth.THEME_DECALS.ocean.emoji, '🐬');
  });

  it('sectionCompleteLabel is calm Swedish feedback', () => {
    const win = loadWarmth(true);
    assert.equal(win.ChildTodayWarmth.sectionCompleteLabel('morgon'), '✓ Morgon klar');
  });

  it('suppresses milestone confetti when gate ON', () => {
    const win = loadWarmth(true);
    assert.equal(win.ChildTodayWarmth.shouldSuppressMilestoneConfetti(), true);
    const celebrations = read('public/js/child-dashboard-celebrations.js');
    assert.match(celebrations, /shouldSuppressMilestoneConfetti/);
  });

  it('checkoff uses micro spark path when gate ON', () => {
    const checkoff = read('public/js/child-dashboard-checkoff.js');
    assert.match(checkoff, /ChildTodayWarmth\.microSpark/);
  });
});
