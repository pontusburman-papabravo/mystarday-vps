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
async function insertRefreshTokenRow(client, { userId, userType, familyId, trustedDeviceId = null }) {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(raw);
  const expiresAt = new Date(Date.now() + config.refreshToken.expiryDays * 24 * 60 * 60 * 1000);
  const parentId = userType === 'parent' ? userId : null;
  const childId = userType === 'child' ? userId : null;
  await client.query(
    `INSERT INTO refresh_token (parent_id, child_id, token_hash, family_id, user_type, expires_at, trusted_device_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [parentId, childId, hash, familyId, userType, expiresAt, trustedDeviceId]
  );
  return raw;
}

async function createRefreshToken({ userId, userType, familyId, trustedDeviceId = null }) {
  return insertRefreshTokenRow(
    { query: (text, params) => db.query(text, params) },
    { userId, userType, familyId, trustedDeviceId }
  );
}

/**
 * Verify a raw refresh token. Returns the token row or null if invalid/expired.
 * Deletes expired tokens on lookup (passive cleanup).
 */
async function verifyRefreshToken(raw) {
  if (!raw) return null;

  const hash = hashToken(raw);
  const result = await db.query(
    `SELECT id, parent_id, child_id, family_id, user_type, expires_at, trusted_device_id
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

  if (row.trusted_device_id) {
    const dev = await db.query(
      'SELECT id FROM family_trusted_device WHERE id = $1 AND revoked_at IS NULL',
      [row.trusted_device_id]
    );
    if (!dev.rows[0]) {
      await db.query('DELETE FROM refresh_token WHERE id = $1', [row.id]);
      return null;
    }
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
    `SELECT id, parent_id, child_id, family_id, user_type, expires_at, trusted_device_id
     FROM refresh_token WHERE token_hash = $1`,
    [hash]
  );
  return result.rows[0] || null;
}

/**
 * Atomically consume a refresh token and issue exactly one successor (single-use under concurrency).
 * @returns {Promise<{ ok: true, row: object, newRaw: string, newRow: object } | { ok: false, code: string }>}
 */
async function rotateRefreshToken(raw) {
  if (!raw) return { ok: false, code: 'missing_token' };

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const hash = hashToken(raw);
    const locked = await client.query(
      `SELECT id, parent_id, child_id, family_id, user_type, expires_at, trusted_device_id
       FROM refresh_token WHERE token_hash = $1 FOR UPDATE`,
      [hash]
    );
    const row = locked.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return { ok: false, code: 'invalid' };
    }
    if (new Date(row.expires_at) < new Date()) {
      await client.query('DELETE FROM refresh_token WHERE id = $1', [row.id]);
      await client.query('COMMIT');
      return { ok: false, code: 'expired' };
    }
    if (row.trusted_device_id) {
      const dev = await client.query(
        'SELECT id FROM family_trusted_device WHERE id = $1 AND revoked_at IS NULL',
        [row.trusted_device_id]
      );
      if (!dev.rows[0]) {
        await client.query('DELETE FROM refresh_token WHERE id = $1', [row.id]);
        await client.query('COMMIT');
        return { ok: false, code: 'device_revoked' };
      }
    }

    await client.query('DELETE FROM refresh_token WHERE id = $1', [row.id]);
    const newRaw = await insertRefreshTokenRow(client, {
      userId: row.user_type === 'parent' ? row.parent_id : row.child_id,
      userType: row.user_type,
      familyId: row.family_id,
      trustedDeviceId: row.trusted_device_id || null,
    });
    await client.query('COMMIT');

    const newRow = await lookupRefreshTokenRow(newRaw);
    return { ok: true, row, newRaw, newRow };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function revokeRefreshTokensForTrustedDevice(deviceId, client = null) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  await q('DELETE FROM refresh_token WHERE trusted_device_id = $1', [deviceId]);
}

async function revokeRefreshTokensForTrustedDevices(deviceIds, client = null) {
  if (!deviceIds?.length) return;
  const q = client ? client.query.bind(client) : db.query.bind(db);
  await q('DELETE FROM refresh_token WHERE trusted_device_id = ANY($1::uuid[])', [deviceIds]);
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
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/api/auth',
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
  insertRefreshTokenRow,
  createRefreshToken,
  verifyRefreshToken,
  lookupRefreshTokenRow,
  rotateRefreshToken,
  revokeRefreshTokensForTrustedDevice,
  revokeRefreshTokensForTrustedDevices,
  revokeRefreshToken,
  revokeRefreshTokenForSession,
  revokeAllRefreshTokens,
  setRefreshCookie,
  clearRefreshCookie,
  setAccessCookie,
  clearAccessCookie,
};
