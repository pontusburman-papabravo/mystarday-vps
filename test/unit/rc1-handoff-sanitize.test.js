'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  sanitizeLogoutBody,
  sanitizeVerifyPinPickerBody,
} = require('../e2e/helpers/rc1-prod-smoke-handoff');

describe('rc1 handoff sanitize helpers', () => {
  it('sanitizeLogoutBody keeps contract flags without message text', () => {
    const out = sanitizeLogoutBody({
      loggedOut: true,
      handoffAvailable: false,
      message: 'Localized secret text',
      sessionRestored: false,
    });
    assert.equal(out.loggedOut, true);
    assert.equal(out.handoffAvailable, false);
    assert.equal(out.hasMessage, true);
    assert.equal(out.message, undefined);
  });

  it('sanitizeVerifyPinPickerBody redacts parent PII', () => {
    const out = sanitizeVerifyPinPickerBody({
      ok: true,
      csrfToken: 'csrf-secret',
      parent: { id: 'p1', email: 'a@b.se', family_id: 'f1' },
    });
    assert.equal(out.ok, true);
    assert.equal(out.hasCsrfToken, true);
    assert.equal(out.parent.hasId, true);
    assert.equal(out.parent.hasEmail, true);
    assert.equal(out.csrfToken, undefined);
  });
});
