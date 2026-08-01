'use strict';

const crypto = require('node:crypto');

/**
 * Optional HMAC fingerprint for local prep/runner alignment checks (never stored in DB).
 */
function pinFingerprint(pin, key) {
  if (!pin || !key) return null;
  return crypto.createHmac('sha256', String(key))
    .update(String(pin), 'utf8')
    .digest('hex')
    .slice(0, 16);
}

function pinFingerprintsMatch(pin, key, expectedFingerprint) {
  if (!expectedFingerprint) return null;
  const actual = pinFingerprint(pin, key);
  return actual === expectedFingerprint;
}

module.exports = {
  pinFingerprint,
  pinFingerprintsMatch,
};
