'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { pinFingerprint, pinFingerprintsMatch } = require('../src/lib/rc1-pin-fingerprint');

describe('rc1-pin-fingerprint', () => {
  it('produces stable 16-char hex without logging pin', () => {
    const fp = pinFingerprint('1234', 'test-key');
    assert.match(fp, /^[a-f0-9]{16}$/);
    assert.equal(fp, pinFingerprint('1234', 'test-key'));
    assert.notEqual(fp, pinFingerprint('5678', 'test-key'));
  });

  it('matches runner secret to prep output', () => {
    const key = 'ephemeral';
    const fp = pinFingerprint('9999', key);
    assert.equal(pinFingerprintsMatch('9999', key, fp), true);
    assert.equal(pinFingerprintsMatch('0000', key, fp), false);
  });
});
