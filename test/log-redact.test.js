'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { maskEmail } = require('../src/lib/log-redact');

describe('log-redact (N12)', () => {
  it('maskEmail redacts local part', () => {
    assert.equal(maskEmail('anna@example.com'), 'a***@example.com');
    assert.equal(maskEmail('AB@Example.COM'), 'a***@example.com');
  });

  it('maskEmail handles edge cases', () => {
    assert.equal(maskEmail(''), '(redacted)');
    assert.equal(maskEmail('not-an-email'), '(redacted)');
    assert.equal(maskEmail('@nodomain'), '(redacted)');
  });
});
