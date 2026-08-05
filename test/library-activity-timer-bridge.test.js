'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const bridgeSrc = fs.readFileSync(
  path.join(__dirname, '../public/js/library-activity-timer-bridge.js'),
  'utf8'
);
const librarySrc = fs.readFileSync(path.join(__dirname, '../public/js/library.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/library.html'), 'utf8');

describe('library activity timer setup bridge', () => {
  test('bridge does not auto-enable on duration change', () => {
    assert.doesNotMatch(bridgeSrc, /activity_timers_enabled\s*=\s*true/);
    assert.doesNotMatch(librarySrc, /activity_timers_enabled:\s*true/);
  });

  test('explicit PUT enable with client lock', () => {
    assert.match(bridgeSrc, /activity_timers_enabled:\s*true/);
    assert.match(bridgeSrc, /_enabling/);
    assert.match(bridgeSrc, /btn\.disabled = true/);
  });

  test('per-child rows when master off', () => {
    assert.match(bridgeSrc, /activity_timers_enabled !== true/);
    assert.match(bridgeSrc, /activity-timer-bridge-enable/);
    assert.match(bridgeSrc, /settingsUrl/);
  });

  test('kill switch hides enable CTA', () => {
    assert.match(bridgeSrc, /activity_timer_v2_rollout_available/);
    assert.match(bridgeSrc, /bridgeUnavailable/);
  });

  test('library modal hosts bridge container', () => {
    assert.match(html, /id="activityTimerMasterBridge"/);
    assert.match(html, /library-activity-timer-bridge\.js/);
  });

  test('library refreshes bridge on duration updates', () => {
    assert.match(librarySrc, /refreshActivityTimerMasterBridge/);
    assert.match(librarySrc, /LibraryActivityTimerBridge\.refresh/);
  });
});
