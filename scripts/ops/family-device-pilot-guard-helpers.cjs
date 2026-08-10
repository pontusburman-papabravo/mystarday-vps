'use strict';

const {
  assertFamilyDevicePilotDisposableEmail,
  isFamilyDevicePilotDisposableEmail,
  PILOT_EMAIL_RE,
} = require('../../src/lib/family-device-pilot-guard');

function makeDisposableEmailFromGuard() {
  const crypto = require('crypto');
  // Must match PILOT_EMAIL_RE: fd-pilot-<digits>@example.com
  return `fd-pilot-${Date.now()}${crypto.randomInt(1000, 9999)}@example.com`;
}

const makeDisposableEmail = makeDisposableEmailFromGuard;

module.exports = {
  assertFamilyDevicePilotDisposableEmail,
  isFamilyDevicePilotDisposableEmail,
  PILOT_EMAIL_RE,
  makeDisposableEmailFromGuard,
  makeDisposableEmail,
};
