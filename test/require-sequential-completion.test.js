'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

describe('NU/NÄSTA/SEDAN parent opt-in (default off)', () => {
  it('migrations default require_sequential_completion and show_now_next to false', () => {
    const seq = read('migrations/1809510000000_require_sequential_completion.js');
    const nnl = read('migrations/1809520000000_child_show_now_next_default_off.js');
    assert.match(seq, /DEFAULT false/);
    assert.match(nnl, /show_now_next SET DEFAULT false/);
  });

  it('child-self treats flags as opt-in (=== true)', () => {
    const src = read('src/routes/daily-logs/child-self.js');
    assert.match(src, /show_now_next === true/);
    assert.match(src, /require_sequential_completion === true/);
  });

  it('focus quest mode requires showNowNext parent opt-in or barnets_samling today', () => {
    const src = read('public/js/child-dashboard-activities.js');
    assert.match(src, /focusQuestMode = isTodayFocusLayer\(\) && isToday && \(showNowNext \|\| samlingTodayFocus\)/);
  });

  it('child-settings and child-profile-setup couple NU/NÄSTA/SEDAN toggle to both fields', () => {
    const settings = read('public/js/child-settings.js');
    const setup = read('public/js/child-profile-setup.js');
    assert.match(settings, /saveNnlMode/);
    assert.match(setup, /saveNnlMode/);
    assert.match(setup, /require_sequential_completion: enabled/);
    assert.match(setup, /Fri avbockning — barnet väljer själv/);
  });
});
