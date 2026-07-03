'use strict';

/**
 * Shared auth session helpers (E2 phase 1).
 * Token/cookie/login-finalization logic shared across the auth route groups.
 */

const jwt = require('jsonwebtoken');
const config = require('../../lib/config');
const { recordLoginEvent } = require('../../lib/login-event');
const {
  createRefreshToken,
  setRefreshCookie,
  setAccessCookie,
  clearAccessCookie,
  clearRefreshCookie,
} = require('../../lib/refresh-tokens');
const { generateCsrfToken } = require('../../middleware/csrf');

/**
 * Parse a jwt-style duration string ("15m", "8h") into seconds.
 * Falls back to the numeric value if already a number.
 */
function parseDuration(val) {
  if (typeof val === 'number') return val;
  const match = String(val).match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 minutes
  const num = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 's') return num;
  if (unit === 'm') return num * 60;
  if (unit === 'h') return num * 3600;
  if (unit === 'd') return num * 86400;
  return 900;
}

/**
 * Finalize a login: sign access token, rotate refresh token, set cookies,
 * issue CSRF token, and send the standard login JSON response.
 * Used by the OAuth login routes (Apple / Google).
 */
async function completeLogin(req, res, parent, userType, meta = {}) {
  // WHY: All modules already imported at top of file — but duplicated
  // here to keep the helper self-contained and avoid closure surprises.

  // Record login event for analytics
  recordLoginEvent({ userId: parent.id, role: userType, familyId: parent.family_id }).catch(() => {});

  const accessToken = jwt.sign(
    {
      id: parent.id,
      type: userType,
      familyId: parent.family_id,
      email: parent.email || null,
      isAdmin: parent.is_admin || false,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const rawRefresh = await createRefreshToken({
    userId: parent.id,
    userType,
    familyId: parent.family_id,
  });
  setRefreshCookie(res, rawRefresh);

  const expiresInSecs = typeof config.jwt.expiresIn === 'string'
    ? parseDuration(config.jwt.expiresIn)
    : config.jwt.expiresIn;
  setAccessCookie(res, accessToken, expiresInSecs);

  const csrfToken = generateCsrfToken(res);

  const user = {
    id: parent.id,
    email: parent.email || null,
    familyId: parent.family_id,
    isAdmin: parent.is_admin || false,
    type: userType,
    onboarding_completed: parent.onboarding_completed, // auth/routing only — DO NOT USE FOR PRODUCT LOGIC
  };

  const expiresAt = Date.now() + expiresInSecs * 1000;
  console.log('[AUTH] login completed', { parentId: parent.id, userType });
  const body = { csrfToken, user, expiresAt };
  if (meta.isNewAccount) body.isNewAccount = true;
  res.json(body);
}

/** Clear session cookies — uses config.cookieSecure + legacy opposite flag for mismatched deploys. */
function clearAllSessionCookies(res) {
  clearAccessCookie(res);
  clearRefreshCookie(res);
  res.clearCookie('csrf_token', { path: '/' });
  const altSecure = !config.cookieSecure;
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: altSecure,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: altSecure,
    sameSite: 'lax',
    path: '/api/auth',
  });
}

module.exports = { parseDuration, completeLogin, clearAllSessionCookies };
