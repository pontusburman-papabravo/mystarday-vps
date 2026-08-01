'use strict';

/** RC-1 smoke: classify picker preflight / verify-pin-picker without inferring from HTTP status alone. */

function classifyPinPreflight(preflight) {
  if (!preflight || preflight.bodyReadOk === false) {
    return 'OTHER_CONTRACT_ERROR';
  }
  if (preflight.has_session !== true) {
    return 'HANDOFF_INVALID_BEFORE_PIN';
  }
  if (preflight.has_pin !== true) {
    return 'PARENT_PIN_NOT_CONFIGURED';
  }
  return 'PIN_VERIFICATION_ALLOWED';
}

function classifyVerifyPinPickerOutcome(status, code, ok) {
  if (status === 200 && ok === true) {
    return null;
  }
  if (code === 'PARENT_PIN_INVALID') {
    return 'PARENT_PIN_SECRET_MISMATCH';
  }
  if (
    code === 'PARENT_HANDOFF_INVALID'
    || code === 'PARENT_HANDOFF_USED'
    || code === 'PARENT_HANDOFF_EXPIRED'
    || code === 'PARENT_HANDOFF_CONSUME_FAILED'
  ) {
    return 'HANDOFF_INVALID_BEFORE_PIN';
  }
  if (status === 429) {
    return 'OTHER_CONTRACT_ERROR';
  }
  return 'OTHER_CONTRACT_ERROR';
}

function buildVerifyPinPickerCapture(status, headers, body, bodyReadOk = true) {
  const h = headers || {};
  const retryAfterRaw = h['retry-after'] ?? h['Retry-After'] ?? null;
  return {
    status,
    code: body && body.code ? body.code : null,
    ok: body && body.ok === true,
    bodyReadOk: bodyReadOk !== false,
    requestId: h['x-request-id'] || h['X-Request-Id'] || null,
    retryAfter: retryAfterRaw != null ? String(retryAfterRaw) : null,
  };
}

const PARENT_ROUTE_RE = /^\/(dashboard|planning|family|settings|for-dig)/;

/**
 * Merge picker JSON from Puppeteer and CDP (CDP preferred when Puppeteer read failed).
 */
function mergeVerifyPinPickerBodies(puppeteerBody, puppeteerReadOk, cdpSanitized) {
  const fromPuppeteer = puppeteerReadOk && puppeteerBody && typeof puppeteerBody === 'object'
    ? {
      ok: puppeteerBody.ok === true,
      code: puppeteerBody.code || null,
      hasParent: Boolean(puppeteerBody.parent),
      hasCsrfToken: Boolean(puppeteerBody.csrfToken),
      source: 'puppeteer',
    }
    : null;
  const fromCdp = cdpSanitized && cdpSanitized.jsonParseOk
    ? {
      ok: cdpSanitized.ok === true,
      code: cdpSanitized.code || null,
      hasParent: cdpSanitized.hasParent === true,
      hasCsrfToken: cdpSanitized.hasCsrfToken === true,
      source: 'cdp',
    }
    : null;
  if (fromCdp && fromCdp.ok) return fromCdp;
  if (fromPuppeteer && fromPuppeteer.ok) return fromPuppeteer;
  if (fromCdp) return fromCdp;
  return fromPuppeteer || {
    ok: false,
    code: null,
    hasParent: false,
    hasCsrfToken: false,
    source: 'none',
  };
}

/**
 * Classify picker + navigation outcome (pure — for harness and unit tests).
 * @param {object} input
 * @returns {{ success: boolean, classification: string, productBug?: boolean }}
 */
function classifyPickerHandoffResolution(input) {
  const {
    httpStatus,
    puppeteerReadOk = false,
    puppeteerOk = false,
    cdpJsonOk = false,
    cdpOk = false,
    code = null,
    navigationStarted = false,
    navigationError = null,
    endState = null,
  } = input;

  if (httpStatus === 429) {
    return { success: false, classification: 'OTHER_CONTRACT_ERROR' };
  }
  if (httpStatus === 401 && code === 'PARENT_PIN_INVALID') {
    return { success: false, classification: 'QA_FIXTURE_OR_SECRET_INJECTION_FAILURE' };
  }
  if (httpStatus === 401 || httpStatus === 409 || httpStatus === 500) {
    return { success: false, classification: 'OTHER_CONTRACT_ERROR' };
  }

  const es = endState || {};
  const parentRoute = typeof es.pathname === 'string' && PARENT_ROUTE_RE.test(es.pathname);
  const settleParentRoute = typeof es.pathnameAfterSettle === 'string'
    && PARENT_ROUTE_RE.test(es.pathnameAfterSettle);
  const meParent = es.meType === 'parent';
  const authParent = es.authUserType === 'parent';
  const deviceChild = es.deviceModeIsChild === true;
  const hasCsrf = es.hasCsrf === true;
  const childUsernameGone = es.hasChildUsername !== true;
  const handoffConsumed = es.handoffCookiePresent !== true;
  const hasAccess = es.hasAccessCookie === true;
  const hasRefresh = es.hasRefreshCookie === true;
  const atChildLogin = es.pathname === '/child-login' || es.pathnameAfterSettle === '/child-login';

  const fullEndState = parentRoute
    && settleParentRoute
    && meParent
    && authParent
    && !deviceChild
    && hasCsrf
    && childUsernameGone
    && handoffConsumed
    && hasAccess
    && hasRefresh
    && !atChildLogin;

  if (httpStatus === 200) {
    const contractOk = puppeteerOk || cdpOk;
    if (contractOk && fullEndState) {
      if (puppeteerReadOk && puppeteerOk) {
        return { success: true, classification: 'SUCCESS_PICKER_BODY_AND_NAVIGATION' };
      }
      if (cdpJsonOk && cdpOk && !puppeteerReadOk) {
        return { success: true, classification: 'SUCCESS_PICKER_CDP_BODY_AND_NAVIGATION' };
      }
      if (!puppeteerReadOk && cdpJsonOk && cdpOk) {
        return { success: true, classification: 'SUCCESS_PICKER_BODY_CAPTURE_RACE_RECOVERED' };
      }
      return { success: true, classification: 'SUCCESS_PICKER_BODY_AND_NAVIGATION' };
    }
    if (fullEndState && !contractOk) {
      return { success: true, classification: 'SUCCESS_PICKER_BODY_CAPTURE_RACE_RECOVERED' };
    }

    if (meParent && deviceChild) {
      return { success: false, classification: 'CLIENT_DEVICE_MODE_REMAINS_CHILD', productBug: true };
    }
    if (meParent && atChildLogin) {
      return { success: false, classification: 'SESSION_GATE_REDIRECTED_TO_CHILD', productBug: true };
    }
    if (contractOk && !navigationStarted && !navigationError) {
      return { success: false, classification: 'CLIENT_NAVIGATION_FAILED', productBug: true };
    }
    if (httpStatus === 200 && !contractOk && !fullEndState) {
      if (navigationError) {
        return { success: false, classification: 'TEST_HARNESS_NAVIGATION_RACE' };
      }
      return { success: false, classification: 'TEST_HARNESS_RESPONSE_BODY_CAPTURE_FAILED' };
    }
    if (!fullEndState && navigationStarted) {
      return { success: false, classification: 'TEST_HARNESS_NEW_DOCUMENT_NOT_READY' };
    }
    if (contractOk) {
      return { success: false, classification: 'SERVER_COOKIE_ACTIVATION_BUG', productBug: true };
    }
    return { success: false, classification: 'SERVER_PICKER_CONTRACT_BUG', productBug: true };
  }

  return { success: false, classification: 'OTHER_CONTRACT_ERROR' };
}

module.exports = {
  classifyPinPreflight,
  classifyVerifyPinPickerOutcome,
  buildVerifyPinPickerCapture,
  mergeVerifyPinPickerBodies,
  classifyPickerHandoffResolution,
  PARENT_ROUTE_RE,
};
