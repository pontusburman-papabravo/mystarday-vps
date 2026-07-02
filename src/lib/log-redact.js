'use strict';

/**
 * Redact PII before writing to server logs (N12).
 */

/**
 * Mask email for logs: `a***@example.com`. Non-strings → '(redacted)'.
 * @param {string|null|undefined} email
 * @returns {string}
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '(redacted)';
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf('@');
  if (at <= 0) return '(redacted)';
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const maskedLocal = local.length <= 1 ? '*' : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
}

module.exports = { maskEmail };
