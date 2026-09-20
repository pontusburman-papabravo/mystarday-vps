'use strict';

/**
 * Signed För dig follow-up answer tokens.
 * URL contains recipient UUID + HMAC — never parent_id or email.
 * GET must not write; POST uses the same token as the capability.
 */

const crypto = require('crypto');
const config = require('./config');

const PREFIX = 'fdq1';
const HMAC_PAYLOAD_PREFIX = 'for_dig_followup_answer:v1:';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ANSWER_PATH = '/for-dig/hur-gick-det';

function signingSecrets() {
  const secrets = [config.jwt.secret];
  if (config.jwt.previousSecret) secrets.push(config.jwt.previousSecret);
  return secrets.filter(Boolean);
}

function hmacFor(secret, uuid) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${HMAC_PAYLOAD_PREFIX}${uuid}`)
    .digest('base64url');
}

function signaturesMatch(expected, actual) {
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(actual));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function signAnswerToken(recipientId) {
  const uuid = String(recipientId || '').toLowerCase();
  const sig = hmacFor(signingSecrets()[0], uuid);
  return `${PREFIX}.${uuid}.${sig}`;
}

function verifyAnswerToken(raw) {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, reason: 'invalid_token' };
  }
  const parts = raw.trim().split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) {
    return { ok: false, reason: 'invalid_token' };
  }
  const uuid = parts[1].toLowerCase();
  if (!UUID_RE.test(uuid)) {
    return { ok: false, reason: 'invalid_token' };
  }
  for (const secret of signingSecrets()) {
    if (signaturesMatch(hmacFor(secret, uuid), parts[2])) {
      return { ok: true, recipientId: uuid };
    }
  }
  return { ok: false, reason: 'invalid_token' };
}

function buildAnswerUrl(recipientId, { baseUrl = config.email.baseUrl, score } = {}) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  const token = signAnswerToken(recipientId);
  const params = new URLSearchParams({ t: token });
  if (score != null) params.set('score', String(score));
  return `${root}${ANSWER_PATH}?${params.toString()}`;
}

module.exports = {
  PREFIX,
  ANSWER_PATH,
  UUID_RE,
  signAnswerToken,
  verifyAnswerToken,
  buildAnswerUrl,
};
