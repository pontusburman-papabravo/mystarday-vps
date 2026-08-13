'use strict';

const {
  assertActivityTimerPilotDisposableEmail,
  isActivityTimerPilotDisposableEmail,
  PILOT_EMAIL_RE,
} = require('../../src/lib/activity-timer-pilot-guard');

function makeDisposableEmailFromGuard() {
  const crypto = require('crypto');
  return `at-pilot-${Date.now()}${crypto.randomInt(1000, 9999)}@example.com`;
}

const makeDisposableEmail = makeDisposableEmailFromGuard;

module.exports = {
  assertActivityTimerPilotDisposableEmail,
  isActivityTimerPilotDisposableEmail,
  PILOT_EMAIL_RE,
  makeDisposableEmailFromGuard,
  makeDisposableEmail,
};
