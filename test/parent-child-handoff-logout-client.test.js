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

  it('sessionRestored completes parent client state before dashboard (no SessionGate short-circuit)', () => {
    assert.match(src, /_completeHandoffParentSessionRestore/);
    assert.match(src, /data\.sessionRestored[\s\S]{0,220}_completeHandoffParentSessionRestore/);
    assert.match(src, /_completeHandoffParentSessionRestore[\s\S]{0,900}fetch\('\/api\/auth\/me'/);
    assert.match(src, /_completeHandoffParentSessionRestore[\s\S]{0,900}isParentUser\(me\)/);
    assert.match(src, /_completeHandoffParentSessionRestore[\s\S]{0,900}_clearStaleChildLocalState/);
    assert.match(src, /_completeHandoffParentSessionRestore[\s\S]{0,900}DeviceMode\.enterParent/);
    assert.match(src, /_completeHandoffParentSessionRestore[\s\S]{0,900}ensureCsrfToken/);
    assert.match(src, /_completeHandoffParentSessionRestore[\s\S]{0,400}location\.href = '\/dashboard'/);
    const restoredBlock = src.match(/if \(res\.ok && data\.sessionRestored\) \{[\s\S]*?\n        \}/);
    assert.ok(restoredBlock, 'sessionRestored block');
    assert.doesNotMatch(restoredBlock[0], /shouldBlockSessionRestore/);
  });

  it('exposes localized handoff and logout failure strings', () => {
    assert.match(src, /auth\.errors\.handoffInvalid/);
    assert.match(src, /auth\.errors\.logoutFailed/);
    assert.match(src, /auth\.errors\.logoutRateLimited/);
  });
});
