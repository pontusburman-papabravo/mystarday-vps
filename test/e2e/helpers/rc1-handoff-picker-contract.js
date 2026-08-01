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

module.exports = {
  classifyPinPreflight,
  classifyVerifyPinPickerOutcome,
  buildVerifyPinPickerCapture,
};
