'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeLogoutBodyFromText } = require('../e2e/helpers/rc1-handoff-cdp-body');
const { classifyHandoffOutcome } = require('../e2e/helpers/rc1-handoff-classify');

describe('rc1 handoff CDP body sanitize', () => {
  it('parses sessionRestored without leaking message', () => {
    const out = sanitizeLogoutBodyFromText('{"sessionRestored":true,"message":"secret"}');
    assert.equal(out.jsonParseOk, true);
    assert.equal(out.sessionRestored, true);
    assert.equal(out.bodyLength, 43);
  });
});

describe('classifyHandoffOutcome', () => {
  it('uses DIAGNOSTIC_BLOCK when server post_consume but capture failed', () => {
    const c = classifyHandoffOutcome({
      logout: {
        status: 200,
        puppeteerBodyRead: { bodyReadOk: false },
        pathnameAfterResponse: '/child-login',
      },
      logoutWire: { cdpBody: { jsonParseOk: false } },
      authMeImmediate: { kind: 'anonymous' },
      serverHandoffLogs: { entries: [{ phase: 'child_logout_post_consume', handoffOk: true }] },
      sessionGateBefore: { shouldBlockBeforeLogout: true },
    });
    assert.equal(c, 'DIAGNOSTIC_BLOCK_RESPONSE_BODY_OR_SESSION_GATE');
  });

  it('classifies SESSION_GATE when server restored likely and parent me at child-login', () => {
    const c = classifyHandoffOutcome({
      logout: {
        status: 200,
        puppeteerBodyRead: { bodyReadOk: false },
        pathnameAfterResponse: '/child-login',
      },
      logoutWire: { cdpBody: { jsonParseOk: false } },
      authMeImmediate: { kind: 'parent' },
      serverHandoffLogs: { entries: [{ phase: 'child_logout_post_consume' }] },
      sessionGateBefore: { shouldBlockBeforeLogout: true, deviceModeIsChild: true },
    });
    assert.equal(c, 'SESSION_GATE_OR_CLIENT_NAVIGATION_BUG');
  });
});
