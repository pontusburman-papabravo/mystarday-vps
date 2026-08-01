'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyPinPreflight,
  classifyVerifyPinPickerOutcome,
  buildVerifyPinPickerCapture,
} = require('../e2e/helpers/rc1-handoff-picker-contract');

describe('rc1-handoff-picker-contract', () => {
  it('classifyPinPreflight requires session and pin', () => {
    assert.equal(
      classifyPinPreflight({ bodyReadOk: true, has_session: false, has_pin: false }),
      'HANDOFF_INVALID_BEFORE_PIN'
    );
    assert.equal(
      classifyPinPreflight({ bodyReadOk: true, has_session: true, has_pin: false }),
      'PARENT_PIN_NOT_CONFIGURED'
    );
    assert.equal(
      classifyPinPreflight({ bodyReadOk: true, has_session: true, has_pin: true }),
      'PIN_VERIFICATION_ALLOWED'
    );
  });

  it('classifyVerifyPinPickerOutcome uses stable code', () => {
    assert.equal(classifyVerifyPinPickerOutcome(200, null, true), null);
    assert.equal(
      classifyVerifyPinPickerOutcome(401, 'PARENT_PIN_INVALID', false),
      'PARENT_PIN_SECRET_MISMATCH'
    );
    assert.equal(
      classifyVerifyPinPickerOutcome(401, 'PARENT_HANDOFF_INVALID', false),
      'HANDOFF_INVALID_BEFORE_PIN'
    );
    assert.equal(classifyVerifyPinPickerOutcome(401, 'SERVER_ERROR', false), 'OTHER_CONTRACT_ERROR');
  });

  it('buildVerifyPinPickerCapture omits secrets', () => {
    const out = buildVerifyPinPickerCapture(
      401,
      { 'x-request-id': 'req-1', 'retry-after': '30' },
      { ok: false, code: 'PARENT_PIN_INVALID', csrfToken: 'secret' },
      true
    );
    assert.equal(out.status, 401);
    assert.equal(out.code, 'PARENT_PIN_INVALID');
    assert.equal(out.ok, false);
    assert.equal(out.requestId, 'req-1');
    assert.equal(out.retryAfter, '30');
    assert.equal(out.bodyReadOk, true);
    assert.equal(out.csrfToken, undefined);
  });
});
