'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ChildLoginSchema } = require('../src/lib/schemas');
const { childLoginCodeFromZodError } = require('../src/middleware/validate-child-login');

describe('childLoginCodeFromZodError', () => {
  function codeForBody(body) {
    const result = ChildLoginSchema.safeParse(body);
    assert.equal(result.success, false);
    return childLoginCodeFromZodError(result.error);
  }

  it('maps missing username to CHILD_NAME_REQUIRED', () => {
    assert.equal(codeForBody({ pin: '1234' }), 'CHILD_NAME_REQUIRED');
  });

  it('maps empty username to CHILD_NAME_REQUIRED', () => {
    assert.equal(codeForBody({ username: '', pin: '1234' }), 'CHILD_NAME_REQUIRED');
  });

  it('maps missing pin to CHILD_PIN_REQUIRED', () => {
    assert.equal(codeForBody({ username: 'Anna' }), 'CHILD_PIN_REQUIRED');
  });

  it('maps short pin to CHILD_PIN_INVALID_FORMAT', () => {
    assert.equal(codeForBody({ username: 'Anna', pin: '12' }), 'CHILD_PIN_INVALID_FORMAT');
  });

  it('maps non-numeric pin to CHILD_PIN_INVALID_FORMAT', () => {
    assert.equal(codeForBody({ username: 'Anna', pin: '12ab' }), 'CHILD_PIN_INVALID_FORMAT');
  });

  it('maps too long username to CHILD_NAME_INVALID', () => {
    assert.equal(codeForBody({ username: 'x'.repeat(51), pin: '1234' }), 'CHILD_NAME_INVALID');
  });
});
