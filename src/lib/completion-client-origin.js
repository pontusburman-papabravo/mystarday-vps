'use strict';

const CLIENT_ORIGIN_RE = /^[a-zA-Z0-9_-]{8,64}$/;

/**
 * Client instance id from child completion PUT (header or JSON body).
 */
function readCompletionClientOrigin(req) {
  const header = req.headers['x-completion-client-id'];
  if (typeof header === 'string' && CLIENT_ORIGIN_RE.test(header)) {
    return header;
  }
  const bodyId = req.body?.client_completion_id;
  if (typeof bodyId === 'string' && CLIENT_ORIGIN_RE.test(bodyId)) {
    return bodyId;
  }
  return null;
}

module.exports = { readCompletionClientOrigin, CLIENT_ORIGIN_RE };
