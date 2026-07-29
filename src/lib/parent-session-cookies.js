'use strict';

const config = require('./config');

/**
 * Read saved parent session from stjarndag_parent_session cookie.
 * @returns {{ access_token: string, refresh_token: string } | null}
 */
function readSavedParentSession(req) {
  const parentSessionCookie = req.cookies?.stjarndag_parent_session;
  if (!parentSessionCookie) return null;
  try {
    const session = JSON.parse(Buffer.from(parentSessionCookie, 'base64').toString('utf8'));
    if (!session?.access_token || !session?.refresh_token) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Swap httpOnly child cookies for saved parent session (clears stjarndag_parent_session).
 * @returns {boolean}
 */
function activateParentSessionCookies(req, res) {
  const session = readSavedParentSession(req);
  if (!session) return false;

  res.cookie('access_token', session.access_token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
  res.cookie('refresh_token', session.refresh_token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
  res.clearCookie('stjarndag_parent_session', { path: '/' });
  return true;
}

module.exports = {
  readSavedParentSession,
  activateParentSessionCookies,
};
