'use strict';

const { sanitizeErrorMessage } = require('./rc1-handoff-cdp-body');
const { inferClientBranch } = require('./rc1-handoff-client-trace');

function inferServerOutcomeFromLogs(serverHandoffLogs, httpStatus) {
  const entries = serverHandoffLogs?.entries || [];
  const post = entries.find((e) => e.phase === 'child_logout_post_consume');
  const pre = entries.find((e) => e.phase === 'child_logout_pre');
  if (httpStatus === 500) return 'consume_failed';
  if (httpStatus === 409) return 'invalid_handoff';
  if (httpStatus === 401) return 'invalid_child_session';
  if (post && httpStatus === 200) return 'session_restored_likely';
  if (pre?.handoffOk && httpStatus === 200 && !post) return 'needs_parent_pin_likely';
  return null;
}

function contractFlagsFromSources(puppeteerRead, cdpBody) {
  const fromPuppeteer = puppeteerRead?.bodyReadOk ? puppeteerRead.body : null;
  if (cdpBody?.jsonParseOk) {
    return {
      sessionRestored: cdpBody.sessionRestored === true,
      needsParentPin: cdpBody.needsParentPin === true,
      loggedOut: cdpBody.loggedOut === true,
      handoffAvailable: cdpBody.handoffAvailable === true,
      code: cdpBody.code || null,
      switchChild: cdpBody.switchChild === true,
      source: 'cdp',
    };
  }
  if (fromPuppeteer) {
    return {
      sessionRestored: fromPuppeteer.sessionRestored === true,
      needsParentPin: fromPuppeteer.needsParentPin === true,
      loggedOut: fromPuppeteer.loggedOut === true,
      handoffAvailable: fromPuppeteer.handoffAvailable === true,
      code: fromPuppeteer.code || null,
      switchChild: fromPuppeteer.switchChild === true,
      source: 'puppeteer',
    };
  }
  return {
    sessionRestored: false,
    needsParentPin: false,
    loggedOut: false,
    handoffAvailable: false,
    code: null,
    switchChild: false,
    source: 'none',
  };
}

function classifyHandoffOutcome(diag) {
  const puppeteer = diag.logout?.puppeteerBodyRead;
  const cdp = diag.logoutWire?.cdpBody || diag.logout?.cdpBody;
  const authMe = diag.authMeImmediate;
  const httpStatus = diag.logout?.status;
  const serverOutcome = inferServerOutcomeFromLogs(diag.serverHandoffLogs, httpStatus);
  const contract = contractFlagsFromSources(puppeteer, cdp);
  const clientBranch = inferClientBranch(diag.clientTrace);
  const gateBlocked = diag.sessionGateBefore?.shouldBlockBeforeLogout === true
    || diag.clientTrace?.gateBlockedCalls?.some((v) => v === true);

  if (puppeteer && puppeteer.bodyReadOk === false && !(cdp && cdp.jsonParseOk)) {
    if (serverOutcome === 'session_restored_likely') {
      return 'DIAGNOSTIC_BLOCK_RESPONSE_BODY_OR_SESSION_GATE';
    }
    return 'RESPONSE_BODY_CAPTURE_FAILED';
  }

  if (puppeteer && puppeteer.bodyReadOk === false && cdp && cdp.jsonParseOk) {
    if (cdp.sessionRestored && authMe?.kind === 'parent') {
      return 'TEST_HARNESS_BUG';
    }
  }

  if (serverOutcome === 'session_restored_likely' && authMe?.kind === 'parent') {
    const path = diag.logout?.pathnameAfterResponse;
    const gate = diag.sessionGateBefore?.shouldBlockBeforeLogout === true
      || diag.clientTrace?.deviceModeIsChild === true
      || gateBlocked;
    if (path === '/child-login' && gate) {
      return 'SESSION_GATE_OR_CLIENT_NAVIGATION_BUG';
    }
    if (puppeteer && puppeteer.bodyReadOk === false && !(cdp && cdp.jsonParseOk)) {
      return 'TEST_HARNESS_BUG';
    }
  }

  if (contract.sessionRestored && authMe?.kind === 'parent') {
    const path = diag.logout?.pathnameAfterResponse || diag.finalPath;
    if (path === '/child-login' && gateBlocked) {
      return 'SESSION_GATE_OR_CLIENT_NAVIGATION_BUG';
    }
    if (clientBranch === 'session_restored_but_gate_blocked') {
      return 'SESSION_GATE_OR_CLIENT_NAVIGATION_BUG';
    }
    return 'SUCCESS_SESSION_RESTORED';
  }

  if (contract.needsParentPin) {
    return 'SUCCESS_NEEDS_PARENT_PIN_PENDING';
  }

  if (serverOutcome === 'session_restored_likely' && authMe?.kind === 'parent') {
    if (diag.logout?.pathnameAfterResponse === '/child-login' && gateBlocked) {
      return 'SESSION_GATE_OR_CLIENT_NAVIGATION_BUG';
    }
    return 'DIAGNOSTIC_BLOCK_RESPONSE_BODY_OR_SESSION_GATE';
  }

  if (serverOutcome === 'session_restored_likely' && authMe?.kind === 'anonymous') {
    return 'SERVER_COOKIE_ACTIVATION_BUG';
  }

  if (cdp && cdp.jsonParseOk && httpStatus === 200
    && !contract.sessionRestored && !contract.needsParentPin && !contract.loggedOut
    && serverOutcome === 'session_restored_likely') {
    return 'SERVER_LOGOUT_CONTRACT_BUG';
  }

  if (serverOutcome === 'session_restored_likely' && !cdp?.jsonParseOk && !(puppeteer?.bodyReadOk)) {
    return 'DIAGNOSTIC_BLOCK_RESPONSE_BODY_OR_SESSION_GATE';
  }

  if (diag.logoutWire?.switchChildInBody || contract.switchChild) {
    return 'TEST_UI_CONTRACT_SWITCH_CHILD';
  }

  if (httpStatus === 409) return 'INVALID_HANDOFF_HTTP_409';

  if (authMe?.kind === 'child') {
    return 'CHILD_SESSION_REMAINING';
  }

  return 'DIAGNOSTIC_BLOCK_RESPONSE_BODY_OR_SESSION_GATE';
}

async function readPuppeteerLogoutBody(page, logoutRes) {
  const responseStatus = logoutRes.status();
  const responseUrl = logoutRes.url();
  let pageUrlAtRead = null;
  let pageClosed = false;
  let frameDetached = false;
  try {
    pageUrlAtRead = page.url();
  } catch (err) {
    const msg = err.message || '';
    pageClosed = /closed/i.test(msg);
    frameDetached = /detached/i.test(msg);
  }

  try {
    const text = await logoutRes.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      return {
        bodyReadOk: false,
        bodyReadErrorName: 'JSONParseError',
        bodyReadErrorMessage: 'logout_response_not_json',
        responseStatus,
        responseUrl,
        pageUrlAtRead,
        pageClosed,
        frameDetached,
        rawLength: text?.length ?? 0,
      };
    }
    return {
      bodyReadOk: true,
      body: parsed,
      responseStatus,
      responseUrl,
      pageUrlAtRead,
      pageClosed,
      frameDetached,
    };
  } catch (err) {
    return {
      bodyReadOk: false,
      bodyReadErrorName: err.name || 'Error',
      bodyReadErrorMessage: sanitizeErrorMessage(err.message),
      responseStatus,
      responseUrl,
      pageUrlAtRead,
      pageClosed,
      frameDetached,
    };
  }
}

function cookieJarSummary(cookies) {
  return {
    names: cookies.map((c) => c.name),
    hasAccess: cookies.some((c) => c.name === 'access_token'),
    hasRefresh: cookies.some((c) => c.name === 'refresh_token'),
    handoffCount: cookies.filter((c) => c.name === 'stjarndag_parent_session').length,
  };
}

module.exports = {
  classifyHandoffOutcome,
  inferServerOutcomeFromLogs,
  contractFlagsFromSources,
  readPuppeteerLogoutBody,
  cookieJarSummary,
};
