/**
 * Verify Resend webhook payloads (Svix signing).
 */
const crypto = require('crypto');

function decodeWebhookSecret(secret) {
  if (!secret) return null;
  const prefix = 'whsec_';
  if (secret.startsWith(prefix)) {
    return Buffer.from(secret.slice(prefix.length), 'base64');
  }
  return Buffer.from(secret, 'utf8');
}

/**
 * @param {string|Buffer} rawBody
 * @param {Record<string, string|undefined>} headers
 * @param {string} secret
 * @returns {object|null} Parsed event or null if invalid
 */
function verifyResendWebhook(rawBody, headers, secret) {
  const svixId = headers['svix-id'];
  const svixTimestamp = headers['svix-timestamp'];
  const svixSignature = headers['svix-signature'];
  const key = decodeWebhookSecret(secret);

  if (!svixId || !svixTimestamp || !svixSignature || !key) return null;

  const ts = parseInt(svixTimestamp, 10);
  if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return null;

  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const signed = `${svixId}.${svixTimestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', key).update(signed).digest('base64');

  const signatures = svixSignature.split(' ');
  let valid = false;
  for (const part of signatures) {
    const comma = part.indexOf(',');
    if (comma === -1) continue;
    const version = part.slice(0, comma);
    const sig = part.slice(comma + 1);
    if (version !== 'v1' || !sig) continue;
    try {
      const sigBuf = Buffer.from(sig);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
        valid = true;
        break;
      }
    } catch (_) {
      // length mismatch — try next signature
    }
  }

  if (!valid) return null;

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

module.exports = { verifyResendWebhook };
