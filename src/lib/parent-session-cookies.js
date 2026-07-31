'use strict';

const config = require('./config');
const {
  consumeHandoffAndActivateSession,
  clearHandoffCookie,
} = require('./parent-session-handoff');

/**
 * Activate saved parent session from opaque handoff cookie.
 * @returns {Promise<boolean>}
 */
async function activateParentSessionCookies(req, res) {
  const result = await consumeHandoffAndActivateSession(req, res);
  return result.ok;
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
