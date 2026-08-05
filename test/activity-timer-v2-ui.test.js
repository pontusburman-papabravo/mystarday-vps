'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('activity timer v2 — UI integration', () => {
  it('child timer reads v2 flag from daily log (master switch)', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /activityTimerV2Enabled/);
    const loadDay = read('public/js/child-dashboard-load-day.js');
    assert.match(loadDay, /activity_timer_v2/);
  });

  it('Extra stöd NU card embeds activity timer block', () => {
    const src = read('public/js/child-seven-questions.js');
    assert.match(src, /ChildActivityTimer\.renderBlock/);
    assert.match(src, /teacch-activity-timer/);
  });

  it('child timer uses delivered SVG hourglass component in overlay only', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /ActivityHourglassUI/);
    assert.match(src, /syncHourglass/);
    assert.match(src, /overlayHourglassMountHtml/);
    assert.match(src, /activity-timer-overlay-hourglass/);
    assert.match(src, /inlineTimerIconHtml/);
  });

  it('close overlay does not clear session in timer module', () => {
    const src = read('public/js/child-dashboard-activity-timer.js');
    assert.match(src, /function closeOverlay/);
    assert.doesNotMatch(src, /closeOverlay[\s\S]{0,120}clearSession/);
  });
});
