'use strict';

function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') return '';
  return message
    .replace(/[a-f0-9]{32,}/gi, '[redacted-hex]')
    .replace(/\b\d{4}\b/g, '[redacted-pin]')
    .slice(0, 240);
}

function decodeCdpBody(body, base64Encoded) {
  if (body == null) return '';
  if (base64Encoded) {
    return Buffer.from(body, 'base64').toString('utf8');
  }
  return String(body);
}

/**
 * Sanitized contract fields from logout JSON (no message text, no tokens).
 */
function sanitizeLogoutBodyFromText(rawText) {
  const out = {
    bodyCaptureOk: false,
    bodyLength: rawText ? rawText.length : 0,
    jsonParseOk: false,
    sessionRestored: null,
    needsParentPin: null,
    loggedOut: null,
    handoffAvailable: null,
    code: null,
    switchChild: null,
  };
  if (!rawText || !rawText.trim()) {
    return out;
  }
  out.bodyCaptureOk = true;
  let parsed;
  try {
    parsed = JSON.parse(rawText);
    out.jsonParseOk = true;
  } catch {
    return out;
  }
  out.sessionRestored = parsed.sessionRestored === true;
  out.needsParentPin = parsed.needsParentPin === true;
  out.loggedOut = parsed.loggedOut === true;
  out.handoffAvailable = parsed.handoffAvailable === true;
  out.code = parsed.code || null;
  out.switchChild = parsed.switchChild === true;
  return out;
}

/**
 * Sanitized verify-pin-picker JSON (no parent id/email, csrf, or PIN).
 */
function sanitizeVerifyPinPickerBodyFromText(rawText) {
  const out = {
    bodyCaptureOk: false,
    bodyLength: rawText ? rawText.length : 0,
    jsonParseOk: false,
    ok: null,
    code: null,
    hasParent: false,
    hasCsrfToken: false,
  };
  if (!rawText || !rawText.trim()) {
    return out;
  }
  out.bodyCaptureOk = true;
  let parsed;
  try {
    parsed = JSON.parse(rawText);
    out.jsonParseOk = true;
  } catch {
    return out;
  }
  out.ok = parsed.ok === true;
  out.code = parsed.code || null;
  out.hasParent = Boolean(parsed.parent && (parsed.parent.id || parsed.parent.family_id || parsed.parent.familyId));
  out.hasCsrfToken = Boolean(parsed.csrfToken);
  return out;
}

function summarizeSetCookieNames(names) {
  const list = Array.isArray(names) ? names : [];
  return {
    setCookieNames: list,
    clearsHandoffCookie: list.some((n) => n === 'stjarndag_parent_session'),
    setsAccessCookie: list.includes('access_token'),
    setsRefreshCookie: list.includes('refresh_token'),
    setsCsrfCookie: list.includes('csrf_token'),
  };
}

module.exports = {
  sanitizeErrorMessage,
  decodeCdpBody,
  sanitizeLogoutBodyFromText,
  sanitizeVerifyPinPickerBodyFromText,
  summarizeSetCookieNames,
};
