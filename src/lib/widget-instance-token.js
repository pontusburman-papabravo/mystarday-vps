'use strict';

const crypto = require('crypto');
const config = require('./config');

const TOKEN_TTL_SEC = 15 * 60;

function signingSecret() {
  return config.jwt.secret;
}

function signInstanceToken(childId, dailyLogItemId, expiresAtSec) {
  const exp = expiresAtSec || Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const payload = `${childId}|${dailyLogItemId}|${exp}`;
  const sig = crypto.createHmac('sha256', signingSecret()).update(payload).digest('base64url');
  const raw = JSON.stringify({ v: 1, c: childId, i: dailyLogItemId, e: exp, s: sig });
  return Buffer.from(raw, 'utf8').toString('base64url');
}

function verifyInstanceToken(token, expectedChildId) {
  if (!token || typeof token !== 'string') {
    return { ok: false, code: 'INSTANCE_TOKEN_INVALID' };
  }
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (parsed.v !== 1 || !parsed.c || !parsed.i || !parsed.e || !parsed.s) {
      return { ok: false, code: 'INSTANCE_TOKEN_INVALID' };
    }
    if (expectedChildId && parsed.c !== expectedChildId) {
      return { ok: false, code: 'INSTANCE_TOKEN_CHILD_MISMATCH' };
    }
    const now = Math.floor(Date.now() / 1000);
    if (parsed.e < now) {
      return { ok: false, code: 'INSTANCE_TOKEN_EXPIRED' };
    }
    const payload = `${parsed.c}|${parsed.i}|${parsed.e}`;
    const expectedSig = crypto.createHmac('sha256', signingSecret()).update(payload).digest('base64url');
    const a = Buffer.from(expectedSig);
    const b = Buffer.from(parsed.s);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, code: 'INSTANCE_TOKEN_INVALID' };
    }
    return { ok: true, childId: parsed.c, dailyLogItemId: parsed.i };
  } catch {
    return { ok: false, code: 'INSTANCE_TOKEN_INVALID' };
  }
}

module.exports = {
  TOKEN_TTL_SEC,
  signInstanceToken,
  verifyInstanceToken,
};
