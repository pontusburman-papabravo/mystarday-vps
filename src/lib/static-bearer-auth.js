/**
 * Timing-safe comparison of a static env token against Authorization: Bearer.
 * Does not log header or token values.
 */
'use strict';

const crypto = require('crypto');

const BEARER_RE = /^Bearer\s+(\S+)\s*$/i;
const MIN_TOKEN_LENGTH = 16;

function timingSafeEqualStrings(a, b) {
  const aBuf = Buffer.from(String(a), 'utf8');
  const bBuf = Buffer.from(String(b), 'utf8');
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') return '';
  const match = authorizationHeader.match(BEARER_RE);
  return match ? match[1] : '';
}

function isConfiguredStaticToken(expectedToken) {
  return typeof expectedToken === 'string' && expectedToken.length >= MIN_TOKEN_LENGTH;
}

/**
 * @param {string|undefined} authorizationHeader
 * @param {string|undefined} expectedToken raw token from env (no "Bearer " prefix)
 * @returns {{ configured: boolean, authorized: boolean }}
 */
function verifyStaticBearerToken(authorizationHeader, expectedToken) {
  if (!isConfiguredStaticToken(expectedToken)) {
    return { configured: false, authorized: false };
  }
  const presented = extractBearerToken(authorizationHeader);
  if (!presented) {
    return { configured: true, authorized: false };
  }
  return {
    configured: true,
    authorized: timingSafeEqualStrings(presented, expectedToken),
  };
}

module.exports = {
  MIN_TOKEN_LENGTH,
  extractBearerToken,
  isConfiguredStaticToken,
  timingSafeEqualStrings,
  verifyStaticBearerToken,
};
