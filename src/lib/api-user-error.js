'use strict';

/**
 * Stable, language-neutral API error bodies for user-visible failures.
 * Clients localize via `code` (+ optional `details`). `error` repeats the
 * code for older clients and must not carry Swedish copy.
 */
function apiErrorBody(code, extra = {}) {
  const body = { error: code, code };
  if (extra && extra.details != null) body.details = extra.details;
  for (const [key, value] of Object.entries(extra || {})) {
    if (key === 'details') continue;
    body[key] = value;
  }
  return body;
}

function sendApiError(res, status, code, extra = {}) {
  return res.status(status).json(apiErrorBody(code, extra));
}

module.exports = {
  apiErrorBody,
  sendApiError,
};
