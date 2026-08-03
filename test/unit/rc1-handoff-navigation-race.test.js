'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyPickerHandoffResolution,
  mergeVerifyPinPickerBodies,
} = require('../e2e/helpers/rc1-handoff-picker-contract');
const { sanitizeVerifyPinPickerBodyFromText } = require('../e2e/helpers/rc1-handoff-cdp-body');

const fullParentEnd = {
  pathname: '/dashboard',
  pathnameAfterSettle: '/dashboard',
  meType: 'parent',
  authUserType: 'parent',
  deviceModeIsChild: false,
  hasCsrf: true,
  hasChildUsername: false,
  handoffCookiePresent: false,
  hasAccessCookie: true,
  hasRefreshCookie: true,
};

describe('rc1-handoff-navigation-race', () => {
  it('HTTP 200 + Puppeteer body OK + navigation → success', () => {
    const r = classifyPickerHandoffResolution({
      httpStatus: 200,
      puppeteerReadOk: true,
      puppeteerOk: true,
      cdpJsonOk: false,
      cdpOk: false,
      navigationStarted: true,
      endState: fullParentEnd,
    });
    assert.equal(r.success, true);
    assert.equal(r.classification, 'SUCCESS_PICKER_BODY_AND_NAVIGATION');
  });

  it('HTTP 200 + Puppeteer body fail + CDP body OK → recovered success', () => {
    const r = classifyPickerHandoffResolution({
      httpStatus: 200,
      puppeteerReadOk: false,
      puppeteerOk: false,
      cdpJsonOk: true,
      cdpOk: true,
      navigationStarted: true,
      endState: fullParentEnd,
    });
    assert.equal(r.success, true);
    assert.equal(r.classification, 'SUCCESS_PICKER_CDP_BODY_AND_NAVIGATION');
  });

  it('HTTP 200 + both body captures fail + full parent end-state → recovered success', () => {
    const r = classifyPickerHandoffResolution({
      httpStatus: 200,
      puppeteerReadOk: false,
      puppeteerOk: false,
      cdpJsonOk: false,
      cdpOk: false,
      navigationStarted: true,
      endState: fullParentEnd,
    });
    assert.equal(r.success, true);
    assert.equal(r.classification, 'SUCCESS_PICKER_BODY_CAPTURE_RACE_RECOVERED');
  });

  it('HTTP 200 + parent /api/auth/me but child DeviceMode → client product bug', () => {
    const r = classifyPickerHandoffResolution({
      httpStatus: 200,
      puppeteerReadOk: true,
      puppeteerOk: true,
      navigationStarted: true,
      endState: { ...fullParentEnd, deviceModeIsChild: true },
    });
    assert.equal(r.success, false);
    assert.equal(r.classification, 'CLIENT_DEVICE_MODE_REMAINS_CHILD');
    assert.equal(r.productBug, true);
  });

  it('HTTP 200 + parent-session but /child-login after settle → SessionGate bug', () => {
    const r = classifyPickerHandoffResolution({
      httpStatus: 200,
      puppeteerReadOk: true,
      puppeteerOk: true,
      navigationStarted: true,
      endState: {
        ...fullParentEnd,
        pathnameAfterSettle: '/child-login',
        meType: 'parent',
      },
    });
    assert.equal(r.success, false);
    assert.equal(r.classification, 'SESSION_GATE_REDIRECTED_TO_CHILD');
  });

  it('HTTP 401 + PARENT_PIN_INVALID → fixture/secret failure', () => {
    const r = classifyPickerHandoffResolution({
      httpStatus: 401,
      code: 'PARENT_PIN_INVALID',
    });
    assert.equal(r.success, false);
    assert.equal(r.classification, 'QA_FIXTURE_OR_SECRET_INJECTION_FAILURE');
  });

  it('HTTP 429 → hard failure', () => {
    const r = classifyPickerHandoffResolution({
      httpStatus: 429,
    });
    assert.equal(r.success, false);
    assert.equal(r.classification, 'OTHER_CONTRACT_ERROR');
  });

  it('navigation before pickerRes.json() does not require puppeteer body when CDP ok', () => {
    const merged = mergeVerifyPinPickerBodies({}, false, {
      jsonParseOk: true,
      ok: true,
      code: null,
      hasParent: true,
      hasCsrfToken: true,
    });
    assert.equal(merged.ok, true);
    assert.equal(merged.source, 'cdp');
  });

  it('HTTP 200 + success body but no navigation → client navigation failure', () => {
    const r = classifyPickerHandoffResolution({
      httpStatus: 200,
      puppeteerReadOk: true,
      puppeteerOk: true,
      cdpJsonOk: true,
      cdpOk: true,
      navigationStarted: false,
      navigationError: null,
      endState: null,
    });
    assert.equal(r.success, false);
    assert.equal(r.classification, 'CLIENT_NAVIGATION_FAILED');
    assert.equal(r.productBug, true);
  });

  it('sanitizeVerifyPinPickerBodyFromText omits secrets', () => {
    const out = sanitizeVerifyPinPickerBodyFromText(JSON.stringify({
      ok: true,
      parent: { id: 'uuid', email: 'secret@example.com' },
      csrfToken: 'csrf-secret',
    }));
    assert.equal(out.ok, true);
    assert.equal(out.hasParent, true);
    assert.equal(out.hasCsrfToken, true);
    assert.equal(out.parent, undefined);
  });
});
