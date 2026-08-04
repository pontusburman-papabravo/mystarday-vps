'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('child dashboard mutable globals (#763 regression)', () => {
  const hostSrc = read('public/js/child-dashboard.js');
  const loadDaySrc = read('public/js/child-dashboard-load-day.js');

  const mutableGlobals = [
    'weekOffset',
    'subStepCache',
    'allowChildReorder',
    'showNowNext',
    'requireSequentialCompletion',
    'viewType',
    'showMoodRating',
    'moodInputMode',
    'transitionLeadMinutes',
    'dopaminAnimation',
    'visualTimer',
    'activityTimersEnabled',
    'activityTimerV2Enabled',
    'hideClock',
    'colorCoding',
  ];

  for (const name of mutableGlobals) {
    it(`child-dashboard.js declares let ${name}`, () => {
      assert.match(hostSrc, new RegExp(`let ${name}\\s*=`), `expected let ${name} in host`);
      assert.doesNotMatch(hostSrc, new RegExp(`const ${name}\\s*=`), `must not be const ${name}`);
    });

    it(`child-dashboard-load-day.js may assign ${name}`, () => {
      if (!new RegExp(`\\b${name}\\s*=`).test(loadDaySrc)) return;
      assert.match(hostSrc, new RegExp(`let ${name}\\s*=`), `${name} is assigned in load-day but not let in host`);
    });
  }

  it('expandSubSteps may mark substep intro seen on first tap', () => {
    const substepsSrc = read('public/js/child-dashboard-substeps.js');
    assert.match(substepsSrc, /substepIntroState\.seen\s*=\s*true/);
    assert.match(hostSrc, /const substepIntroState\s*=\s*\{/);
  });
});
