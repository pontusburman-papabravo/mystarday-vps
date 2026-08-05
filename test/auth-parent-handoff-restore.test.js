'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AUTH_JS = path.join(__dirname, '../public/js/auth.js');

describe('auth parent handoff restore (PR F hardening)', () => {
  const src = fs.readFileSync(AUTH_JS, 'utf8');

  it('defers picker setAuth/DeviceMode when deferPickerResponseApply is true', () => {
    assert.match(src, /deferPickerResponseApply/);
    const overlayBlock = src.match(
      /if \(applyPickerResponse && res\.ok && res\.parent\) \{[\s\S]*?\n        \}/
    );
    assert.ok(overlayBlock, 'applyPickerResponse block');
    const awaitBranch = overlayBlock[0].match(
      /if \(awaitSuccessBeforeClose\) \{[\s\S]*?setOverlayRestorePending\(true\)[\s\S]*?_finishParentHandoffRestoreThen/
    );
    assert.ok(awaitBranch, 'awaitSuccessBeforeClose handoff branch');
    assert.doesNotMatch(awaitBranch[0], /Auth\.setAuth/);
    assert.doesNotMatch(awaitBranch[0], /DeviceMode\.enterParent/);
    assert.doesNotMatch(awaitBranch[0].match(/setOverlayRestorePending\(true\)[\s\S]*?return;/)?.[0] || '', /removeChild\(overlay\)/);
  });

  it('needsParentPin passes defer, awaitSuccessBeforeClose and expectedFamilyId', () => {
    const block = src.match(/if \(res\.ok && data\.needsParentPin\) \{[\s\S]*?\n        \}/);
    assert.ok(block);
    assert.match(block[0], /deferPickerResponseApply: true/);
    assert.match(block[0], /awaitSuccessBeforeClose: true/);
    assert.match(block[0], /expectedFamilyId: expectedFamilyId/);
  });

  it('legacy applyPickerResponse without defer still sets Auth before onSuccess', () => {
    const overlayBlock = src.match(
      /if \(applyPickerResponse && res\.ok && res\.parent\) \{[\s\S]*?\n        \}/
    );
    assert.match(overlayBlock[0], /if \(!deferPickerResponseApply\) \{[\s\S]{0,220}Auth\.setAuth/);
    assert.match(overlayBlock[0], /if \(!deferPickerResponseApply\) \{[\s\S]{0,320}onSuccess\(res\)/);
  });

  it('requires exact expectedFamilyId match (no null wildcard)', () => {
    assert.match(src, /actualFamilyId === expectedFamilyId/);
    assert.doesNotMatch(
      src.match(/async _syncParentSessionFromServer[\s\S]{0,1200}/)?.[0] || '',
      /!expectedFamilyId \|\| actualFamilyId/
    );
    assert.match(src, /EXPECTED_FAMILY_ID_MISSING/);
  });

  it('resolves expectedFamilyId via _resolveExpectedFamilyIdForHandoff and /api/auth/me fallback', () => {
    assert.match(src, /_resolveExpectedFamilyIdForHandoff/);
    assert.match(src, /_fetchAuthMeForHandoff/);
    assert.match(src, /await this\._resolveExpectedFamilyIdForHandoff\(\)/);
  });

  it('fails handoff when expectedFamilyId missing before sessionRestored or needsParentPin', () => {
    const sessionBlock = src.match(/if \(res\.ok && data\.sessionRestored\) \{[\s\S]*?\n        \}/);
    const pinBlock = src.match(/if \(res\.ok && data\.needsParentPin\) \{[\s\S]*?\n        \}/);
    assert.match(sessionBlock[0], /!expectedFamilyId[\s\S]{0,120}EXPECTED_FAMILY_ID_MISSING/);
    assert.match(pinBlock[0], /!expectedFamilyId[\s\S]{0,120}EXPECTED_FAMILY_ID_MISSING/);
  });

  it('AUTH_ME_FAMILY_MISMATCH returns immediately without retry loop continuation', () => {
    assert.match(src, /code: 'AUTH_ME_FAMILY_MISMATCH'/);
    assert.match(
      src,
      /AUTH_ME_FAMILY_MISMATCH[\s\S]{0,80}\};\s*\n\s*\}/
    );
  });

  it('uses AbortController per-request timeout on handoff /api/auth/me', () => {
    assert.match(src, /AUTH_ME_HANDOFF_REQUEST_TIMEOUT_MS/);
    assert.match(src, /AUTH_ME_HANDOFF_TOTAL_TIMEOUT_MS/);
    assert.match(src, /_fetchAuthMeForHandoff[\s\S]{0,400}AbortController/);
    assert.match(src, /clearTimeout\(abortTimer\)/);
    assert.match(src, /cache: 'no-store'/);
  });

  it('enforces total handoff restore deadline across polls', () => {
    assert.match(src, /AUTH_ME_HANDOFF_TOTAL_TIMEOUT_MS = 12000/);
    assert.match(src, /AUTH_ME_HANDOFF_REQUEST_TIMEOUT_MS = 2500/);
    assert.match(src, /deadlineAt = Date\.now\(\)/);
    assert.match(src, /remainingMs = deadlineAt - Date\.now\(\)/);
    assert.match(src, /AUTH_ME_HANDOFF_TOTAL_TIMEOUT/);
    assert.match(src, /Math\.min\(AUTH_ME_HANDOFF_REQUEST_TIMEOUT_MS, remainingMs\)/);
    assert.match(src, /Math\.min\(delayMs, remainingAfter\)/);
  });

  it('keeps PIN overlay busy until restore completes when awaitSuccessBeforeClose', () => {
    assert.match(src, /setOverlayRestorePending/);
    assert.match(src, /parentGate\.restoringParentMode/);
    assert.match(src, /errors\.handoffRestoreFailed/);
    assert.match(src, /overlayRestorePending/);
  });

  it('awaitSuccessBeforeClose uses try/finally-style cleanup on restore failure', () => {
    assert.match(src, /resetOverlayAfterHandoffFailure/);
    const awaitBlock = src.match(
      /if \(awaitSuccessBeforeClose\) \{[\s\S]*?\n          \}/
    );
    assert.ok(awaitBlock, 'awaitSuccessBeforeClose block');
    assert.match(awaitBlock[0], /try \{[\s\S]*await Auth\._finishParentHandoffRestoreThen/);
    assert.match(awaitBlock[0], /finally \{[\s\S]*!handoffRestoreSucceeded[\s\S]*resetOverlayAfterHandoffFailure/);
    assert.match(awaitBlock[0], /resetOverlayAfterHandoffFailure/);
  });

  it('dedupes concurrent restore via _parentHandoffRestorePromise', () => {
    assert.match(src, /_parentHandoffRestorePromise/);
    assert.match(src, /if \(this\._parentHandoffRestorePromise\)/);
    assert.match(src, /_parentHandoffRestorePromise = null/);
    assert.match(src, /onReadyCalled/);
  });

  it('401/403 auth me fails fast on handoff sync', () => {
    assert.match(src, /fetched\.status === 401 \|\| fetched\.status === 403/);
  });

  it('500 responses retry within poll budget', () => {
    assert.match(src, /fetched\.status >= 500/);
    assert.match(src, /AUTH_ME_HANDOFF_POLL_ATTEMPTS/);
  });

  it('logs sanitized handoff failure codes only', () => {
    assert.match(src, /_logHandoffRestoreFailure/);
    assert.match(src, /\.replace\(\/\[\^\\w_\]\/g, ''\)/);
  });

  it('no-PIN restore delegates only to _finishParentHandoffRestoreThen', () => {
    assert.match(
      src,
      /async _completeHandoffParentSessionRestore\(expectedFamilyId\)[\s\S]{0,200}_finishParentHandoffRestoreThen/
    );
    assert.doesNotMatch(
      src.match(/async _completeHandoffParentSessionRestore[\s\S]{0,400}/)?.[0] || '',
      /fetch\('\/api\/auth\/me'/
    );
  });

  it('navigation uses location.replace for dashboard restore', () => {
    assert.match(src, /location\.replace\('\/dashboard'\)/);
  });

  it('switchChildMember handoff unchanged', () => {
    assert.match(src, /switchChildMember/);
    assert.match(src, /ensureParentAccessFromChild/);
  });
});
