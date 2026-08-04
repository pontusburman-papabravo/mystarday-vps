'use strict';

/**
 * Align httpOnly access_token with an active child refresh_token.
 * Fixes stale parent JWT + valid child refresh (native cold launch / WebView cookie races).
 * Does not treat localStorage as proof — refresh row is server-verified.
 */

const db = require('./db');
const config = require('./config');
const jwt = require('jsonwebtoken');
const { verifyRefreshToken, setAccessCookie } = require('./refresh-tokens');
const { parseDuration } = require('../routes/auth/session');

function decodeAccessToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
  } catch (primaryErr) {
    if (!config.jwt.previousSecret) return null;
    try {
      return jwt.verify(token, config.jwt.previousSecret, { algorithms: ['HS256'] });
    } catch {
      return null;
    }
  }
}

/**
 * When refresh_token belongs to a child, ensure access_token matches (mint if needed).
 * @returns {Promise<{ reconciled: boolean, alreadyChild: boolean, childId?: string }>}
 */
async function reconcileChildSessionCookies(req, res) {
  const refreshRaw = req.cookies?.refresh_token;
  if (!refreshRaw) {
    return { reconciled: false, alreadyChild: false };
  }

  const refreshRow = await verifyRefreshToken(refreshRaw);
  if (!refreshRow || refreshRow.user_type !== 'child' || !refreshRow.child_id) {
    return { reconciled: false, alreadyChild: false };
  }

  const accessDecoded = decodeAccessToken(req.cookies?.access_token);
  if (
    accessDecoded
    && accessDecoded.type === 'child'
    && accessDecoded.id === refreshRow.child_id
  ) {
    return { reconciled: false, alreadyChild: true, childId: refreshRow.child_id };
  }

  const childRes = await db.query(
    'SELECT id, family_id, username, name FROM child WHERE id = $1',
    [refreshRow.child_id]
  );
  const child = childRes.rows[0];
  if (!child) {
    return { reconciled: false, alreadyChild: false };
  }

  const accessToken = jwt.sign(
    {
      id: child.id,
      type: 'child',
      familyId: child.family_id,
      username: child.username,
      name: child.name,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.childExpiresIn }
  );
  const accessExpiresSecs = parseDuration(config.jwt.childExpiresIn);
  setAccessCookie(res, accessToken, accessExpiresSecs);
  req.cookies.access_token = accessToken;

  return { reconciled: true, alreadyChild: true, childId: child.id };
}

module.exports = {
  reconcileChildSessionCookies,
  decodeAccessToken,
};
