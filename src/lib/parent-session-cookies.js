'use strict';

const {
  consumeHandoffAndActivateSession,
  clearHandoffCookie,
  mapHandoffClientCode,
} = require('./parent-session-handoff');

/**
 * Activate saved parent session from opaque handoff cookie.
 * @returns {Promise<{ ok: true, parent: object, expiresAt: number }|{ ok: false, code: string }>}
 */
async function activateParentSessionCookies(req, res, options = {}) {
  const result = await consumeHandoffAndActivateSession(req, res, options);
  if (!result.ok) {
    return {
      ok: false,
      code: result.clientCode || mapHandoffClientCode(result.code),
    };
  }
  return {
    ok: true,
    parent: result.parent,
    expiresAt: result.expiresAt,
  };
}

/**
 * Legacy sync reader — opaque handoffs do not expose tokens client-side.
 * @returns {null}
 */
function readSavedParentSession() {
  return null;
}

function clearParentSessionCookie(res) {
  clearHandoffCookie(res);
}

module.exports = {
  readSavedParentSession,
  activateParentSessionCookies,
  clearParentSessionCookie,
};
