/**
 * Refresh token management.
 * Owns: creating, verifying, and revoking refresh tokens stored in the DB.
 * Does NOT own: JWT access token signing (that stays in routes/auth.js).
 *
 * Tokens are stored hashed (SHA-256). The raw token is only ever sent in the
 * httpOnly cookie — the DB never stores the plain value.
 */
const crypto = require('crypto');
const db = require('./db');
const config = require('./config');

/**
 * Hash a token for storage. Using SHA-256 (not bcrypt) because:
 *   - Refresh tokens are already 32 random bytes — not a password.
 *   - We need fast lookup by hash for every SSE reconnect.
 *   - bcrypt's intentional slowness is for low-entropy inputs (passwords).
 */
function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Generate and store a new refresh token.
 * Returns the raw token (set in cookie by caller).
 */
async function createRefreshToken({ userId, userType, familyId }) {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(raw);
  const expiresAt = new Date(Date.now() + config.refreshToken.expiryDays * 24 * 60 * 60 * 1000);

  const parentId = userType === 'parent' ? userId : null;
  const childId  = userType === 'child'  ? userId : null;

  await db.query(
    `INSERT INTO refresh_token (parent_id, child_id, token_hash, family_id, user_type, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [parentId, childId, hash, familyId, userType, expiresAt]
  );

  return raw;
}

/**
 * Verify a raw refresh token. Returns the token row or null if invalid/expired.
 * Deletes expired tokens on lookup (passive cleanup).
 */
async function verifyRefreshToken(raw) {
  if (!raw) return null;

  const hash = hashToken(raw);
  const result = await db.query(
    `SELECT id, parent_id, child_id, family_id, user_type, expires_at
     FROM refresh_token
     WHERE token_hash = $1`,
    [hash]
  );

  const row = result.rows[0];
  if (!row) return null;

  // Expired — delete and return null
  if (new Date(row.expires_at) < new Date()) {
    await db.query('DELETE FROM refresh_token WHERE id = $1', [row.id]);
    return null;
  }

  return row;
}

/**
 * Look up refresh token row without side effects (logging / pre-revoke checks).
 */
async function lookupRefreshTokenRow(raw) {
  if (!raw) return null;
  const hash = hashToken(raw);
  const result = await db.query(
    `SELECT id, parent_id, child_id, family_id, user_type, expires_at
     FROM refresh_token WHERE token_hash = $1`,
    [hash]
  );
  return result.rows[0] || null;
}

/**
 * Revoke refresh token only when it matches the active session identity.
 * Mismatch does not delete the row (prevents child logout from revoking parent handoff refresh).
 */
async function revokeRefreshTokenForSession(raw, { userType, userId, familyId }) {
  if (!raw) return { revoked: false, reason: 'missing_token' };
  const row = await lookupRefreshTokenRow(raw);
  if (!row) return { revoked: false, reason: 'not_found' };
  if (familyId && row.family_id !== familyId) {
    return { revoked: false, reason: 'family_mismatch' };
  }
  if (userType === 'child') {
    if (row.user_type !== 'child' || row.child_id !== userId) {
      return { revoked: false, reason: 'identity_mismatch' };
    }
  } else if (userType === 'parent') {
    if (row.user_type !== 'parent' || row.parent_id !== userId) {
      return { revoked: false, reason: 'identity_mismatch' };
    }
  } else {
    return { revoked: false, reason: 'invalid_user_type' };
  }
  await db.query('DELETE FROM refresh_token WHERE id = $1', [row.id]);
  return { revoked: true };
}

/**
 * Revoke a specific refresh token (logout).
 */
async function revokeRefreshToken(raw) {
  if (!raw) return;
  const hash = hashToken(raw);
  const row = await db.query(
    'SELECT parent_id FROM refresh_token WHERE token_hash = $1',
    [hash]
  );
  await db.query('DELETE FROM refresh_token WHERE token_hash = $1', [hash]);
  if (row.rows[0]?.parent_id) {
    const { revokeHandoffsForParent } = require('./parent-session-handoff');
    await revokeHandoffsForParent(row.rows[0].parent_id);
  }
}

/**
 * Revoke all refresh tokens for a user (e.g., password change).
 */
async function revokeAllRefreshTokens({ userId, userType }) {
  if (userType === 'parent') {
    await db.query('DELETE FROM refresh_token WHERE parent_id = $1', [userId]);
  } else {
    await db.query('DELETE FROM refresh_token WHERE child_id = $1', [userId]);
  }
  const { revokeHandoffsForUser } = require('./parent-session-handoff');
  await revokeHandoffsForUser({ userId, userType });
}

/**
 * Set the refresh token as a secure httpOnly cookie on the response.
 */
function setRefreshCookie(res, raw) {
  const maxAgeMs = config.refreshToken.expiryDays * 24 * 60 * 60 * 1000;
  res.cookie('refresh_token', raw, {
    httpOnly: true,
    secure: config.cookieSecure,
    // 'lax' so the cookie is sent on top-level navigations (e.g. the user returns to the app).
    // 'strict' would block the cookie being sent when the user opens a link from email.
    // SSE uses a query param fallback, not this cookie.
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/api/auth', // only sent to auth endpoints — not broadcast on every request
  });
}

/**
 * Clear the refresh token cookie (logout).
 */
function clearRefreshCookie(res) {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/api/auth',
  });
}

/**
 * Set the access token as a secure httpOnly cookie.
 * The access token is also returned in the response body (for backwards compat
 * during rollout). After the cookie is trusted, the token field can be removed.
 *
 * Cookie maxAge is 30 days — independent of the JWT's internal TTL (15 min).
 * Why: users close the PWA for hours/days. If the cookie expires before the refresh
 * token (30d), the browser deletes it and the user must re-authenticate even though
 * their refresh token is still valid. By keeping the cookie for 30 days, the refresh
 * flow triggers on next open and silently rotates to a fresh access token.
 *
 * @param {object} res  - Express response object
 * @param {string} token - Raw JWT access token string
 * @param {number} expiresInSecs - Token TTL in seconds (ignored — cookie is 30d)
 */
function setAccessCookie(res, token, expiresInSecs) {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    maxAge: THIRTY_DAYS_MS,
    path: '/',
  });
}

/**
 * Clear the access token cookie (logout).
 */
function clearAccessCookie(res) {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
  });
}

module.exports = {
  hashToken,
  createRefreshToken,
  verifyRefreshToken,
  lookupRefreshTokenRow,
  revokeRefreshToken,
  revokeRefreshTokenForSession,
  revokeAllRefreshTokens,
  setRefreshCookie,
  clearRefreshCookie,
  setAccessCookie,
  clearAccessCookie,
};
