'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AUTH_JS = path.join(__dirname, '../public/js/auth.js');

describe('Auth.logout handoff contract (client)', () => {
  const src = fs.readFileSync(AUTH_JS, 'utf8');

  it('checks HTTP status before treating logout as success', () => {
    assert.match(src, /res\.status === 429/);
    assert.match(src, /!res\.ok && res\.status >= 500/);
    assert.match(src, /res\.status === 409 && data\.code === 'PARENT_HANDOFF_INVALID'/);
  });

  it('uses verify-pin-picker Model B after needsParentPin', () => {
    assert.match(src, /verifyUrl: '\/api\/family\/verify-pin-picker'/);
    assert.match(src, /applyPickerResponse: true/);
    assert.doesNotMatch(src, /needsParentPin[\s\S]{0,400}restore-parent-session/);
  });

  it('exposes localized handoff and logout failure strings', () => {
    assert.match(src, /auth\.errors\.handoffInvalid/);
    assert.match(src, /auth\.errors\.logoutFailed/);
    assert.match(src, /auth\.errors\.logoutRateLimited/);
  });
});
