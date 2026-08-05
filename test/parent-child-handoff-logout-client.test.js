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

  it('resolves expectedFamilyId before child logout handoff', () => {
    assert.match(src, /await this\._resolveExpectedFamilyIdForHandoff\(\)/);
    assert.match(
      src,
      /_completeHandoffParentSessionRestore\(expectedFamilyId\)/
    );
    assert.match(src, /expectedFamilyId: expectedFamilyId/);
  });

  it('uses verify-pin-picker Model B after needsParentPin', () => {
    assert.match(src, /verifyUrl: '\/api\/family\/verify-pin-picker'/);
    assert.match(src, /applyPickerResponse: true/);
    assert.match(src, /deferPickerResponseApply: true/);
    assert.doesNotMatch(src, /needsParentPin[\s\S]{0,400}restore-parent-session/);
  });

  it('sessionRestored completes parent client state before dashboard (no SessionGate short-circuit)', () => {
    assert.match(src, /_completeHandoffParentSessionRestore/);
    assert.match(src, /data\.sessionRestored[\s\S]{0,400}_completeHandoffParentSessionRestore/);
    assert.match(src, /_completeHandoffParentSessionRestore[\s\S]{0,400}_finishParentHandoffRestoreThen/);
    assert.match(src, /_syncParentSessionFromServer/);
    assert.match(src, /_fetchAuthMeForHandoff/);
    assert.match(src, /cache: 'no-store'/);
    assert.match(src, /AUTH_ME_FAMILY_MISMATCH/);
    assert.match(src, /_completeHandoffParentSessionRestore[\s\S]{0,400}location\.replace\('\/dashboard'\)/);
    const restoredBlock = src.match(/if \(res\.ok && data\.sessionRestored\) \{[\s\S]*?\n        \}/);
    assert.ok(restoredBlock, 'sessionRestored block');
    assert.doesNotMatch(restoredBlock[0], /shouldBlockSessionRestore/);
  });

  it('needsParentPin path polls parent session before dashboard navigation', () => {
    assert.match(src, /_finishParentHandoffRestoreThen/);
    assert.match(src, /_syncParentSessionFromServer/);
    assert.match(
      src,
      /void Auth\._finishParentHandoffRestoreThen\(onSuccess, opts\.expectedFamilyId\)/
    );
    assert.match(src, /AUTH_ME_NOT_PARENT_TIMEOUT/);
    assert.match(src, /_finishParentHandoffRestoreThen[\s\S]{0,1200}onReady\(result\.user\)/);
    assert.doesNotMatch(
      src.match(/async _finishParentHandoffRestoreThen[\s\S]{0,800}/)?.[0] || '',
      /onReady\([\s\S]{0,80}_syncParentSessionFromServer/
    );
    assert.match(
      src,
      /needsParentPin[\s\S]{0,700}deferPickerResponseApply: true/
    );
    assert.doesNotMatch(
      src.match(/if \(res\.ok && data\.needsParentPin\) \{[\s\S]*?\n        \}/)?.[0] || '',
      /location\.href = '\/dashboard'/
    );
  });

  it('exposes localized handoff and logout failure strings', () => {
    assert.match(src, /auth\.errors\.handoffInvalid/);
    assert.match(src, /auth\.errors\.logoutFailed/);
    assert.match(src, /auth\.errors\.logoutRateLimited/);
  });
});
