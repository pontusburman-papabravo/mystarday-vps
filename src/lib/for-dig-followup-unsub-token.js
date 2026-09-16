'use strict';

/**
 * Signed För dig follow-up unsubscribe tokens.
 * URL contains unsub_token UUID + HMAC — never parent_id or email.
 * No expiry: the link must keep working after the email is sent.
 */

const crypto = require('crypto');
const config = require('./config');

const PREFIX = 'fd1';
const HMAC_PAYLOAD_PREFIX = 'for_dig_followup_unsub:v1:';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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

function signUnsubToken(unsubToken) {
  const uuid = String(unsubToken || '').toLowerCase();
  const sig = hmacFor(signingSecrets()[0], uuid);
  return `${PREFIX}.${uuid}.${sig}`;
}

function verifyUnsubToken(raw) {
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
      return { ok: true, unsubToken: uuid };
    }
  }
  return { ok: false, reason: 'invalid_token' };
}

function buildUnsubscribeUrl(unsubToken, baseUrl = config.email.baseUrl) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  const token = signUnsubToken(unsubToken);
  return `${root}/for-dig/followup-unsubscribe?t=${encodeURIComponent(token)}`;
}

module.exports = {
  PREFIX,
  signUnsubToken,
  verifyUnsubToken,
  buildUnsubscribeUrl,
};
