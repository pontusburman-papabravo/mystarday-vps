'use strict';

const crypto = require('crypto');
const config = require('./config');

const PREFIX = 'sf1';

function signingSecret() {
  return config.jwt.secret;
}

function signSupportFollowUpToken(messageId) {
  const id = String(messageId);
  if (!/^\d+$/.test(id)) {
    throw new Error('support follow-up token requires numeric message id');
  }
  const sig = crypto.createHmac('sha256', signingSecret()).update(`${PREFIX}:${id}`).digest('base64url');
  return `${PREFIX}.${id}.${sig}`;
}

function verifySupportFollowUpToken(token) {
  if (!token || typeof token !== 'string') {
    return { ok: false };
  }
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX || !/^\d+$/.test(parts[1])) {
    return { ok: false };
  }
  const id = parts[1];
  const expected = crypto.createHmac('sha256', signingSecret()).update(`${PREFIX}:${id}`).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts[2]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false };
  }
  return { ok: true, messageId: Number(id) };
}

function supportFollowUpUrl(messageId) {
  const base = String(config.email.baseUrl || '').replace(/\/$/, '');
  return `${base}/support/svar/${signSupportFollowUpToken(messageId)}`;
}

module.exports = {
  signSupportFollowUpToken,
  verifySupportFollowUpToken,
  supportFollowUpUrl,
};
