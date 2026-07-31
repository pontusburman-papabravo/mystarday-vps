'use strict';

/**
 * Opaque parent session handoff (child login preserves parent restore path).
 * Cookie holds only a random token; DB stores SHA-256 hash + refresh_token_id.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('./db');
const config = require('./config');
const {
  createRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
  setAccessCookie,
} = require('./refresh-tokens');
const { parseDuration } = require('../routes/auth/session');

const HANDOFF_COOKIE = 'stjarndag_parent_session';
const HANDOFF_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashOpaque(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function clearHandoffCookie(res) {
  res.clearCookie(HANDOFF_COOKIE, { path: '/' });
}

function isLegacyBase64SessionCookie(raw) {
  if (!raw || typeof raw !== 'string') return false;
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return Boolean(parsed?.access_token && parsed?.refresh_token);
  } catch {
    return false;
  }
}

function handoffCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

async function parentHasActiveFamilyAccess(parentId, familyId) {
  const result = await db.query(
    `SELECT 1
     FROM parent p
     WHERE p.id = $1 AND p.family_id = $2
       AND EXISTS (
         SELECT 1 FROM parent_child pc
         JOIN child c ON c.id = pc.child_id
         WHERE pc.parent_id = p.id
           AND c.family_id = p.family_id
           AND pc.revoked_at IS NULL
       )`,
    [parentId, familyId]
  );
  return result.rows.length > 0;
}

async function loadHandoffRowByCookie(req) {
  const raw = req.cookies?.[HANDOFF_COOKIE];
  if (!raw) return null;

  if (isLegacyBase64SessionCookie(raw)) {
    return { legacy: true, raw };
  }

  const tokenHash = hashOpaque(raw);
  const result = await db.query(
    `SELECT id, parent_id, family_id, refresh_token_id, expires_at, used_at, revoked_at
     FROM parent_session_handoff
     WHERE token_hash = $1`,
    [tokenHash]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { ...row, raw };
}

async function revokeHandoffsForParent(parentId) {
  await db.query(
    `UPDATE parent_session_handoff
     SET revoked_at = NOW()
     WHERE parent_id = $1 AND revoked_at IS NULL`,
    [parentId]
  );
}

async function revokeHandoffsForUser({ userId, userType }) {
  if (userType !== 'parent') return;
  await revokeHandoffsForParent(userId);
}

/**
 * Create handoff from current parent httpOnly refresh cookie (child login).
 */
async function createHandoffFromParentCookies(req, res) {
  const parentAccess = req.cookies?.access_token;
  const parentRefresh = req.cookies?.refresh_token;
  if (!parentAccess || !parentRefresh) return false;

  let parentId;
  let familyId;
  try {
    const decoded = jwt.verify(parentAccess, config.jwt.secret, { algorithms: ['HS256'] });
    if (decoded.type !== 'parent') return false;
    parentId = decoded.id;
    familyId = decoded.familyId;
  } catch {
    if (!config.jwt.previousSecret) return false;
    try {
      const decoded = jwt.verify(parentAccess, config.jwt.previousSecret, { algorithms: ['HS256'] });
      if (decoded.type !== 'parent') return false;
      parentId = decoded.id;
      familyId = decoded.familyId;
    } catch {
      return false;
    }
  }

  const refreshRow = await verifyRefreshToken(parentRefresh);
  if (!refreshRow || refreshRow.user_type !== 'parent' || refreshRow.parent_id !== parentId) {
    return false;
  }

  await revokeHandoffsForParent(parentId);

  const opaque = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashOpaque(opaque);
  const refreshExpires = new Date(refreshRow.expires_at);
  const ttlCap = new Date(Date.now() + HANDOFF_TTL_MS);
  const expiresAt = refreshExpires < ttlCap ? refreshExpires : ttlCap;

  await db.query(
    `INSERT INTO parent_session_handoff (
       token_hash, parent_id, family_id, refresh_token_id, expires_at, created_ip, user_agent
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      tokenHash,
      parentId,
      familyId,
      refreshRow.id,
      expiresAt,
      req.ip || null,
      (req.headers['user-agent'] || '').slice(0, 500) || null,
    ]
  );

  res.cookie(HANDOFF_COOKIE, opaque, handoffCookieOptions(HANDOFF_TTL_MS));
  return true;
}

function signParentAccessToken(parentRow) {
  return jwt.sign(
    {
      id: parentRow.id,
      type: 'parent',
      familyId: parentRow.family_id,
      email: parentRow.email || null,
      isAdmin: parentRow.is_admin || false,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

async function fetchParentRow(parentId) {
  const result = await db.query(
    `SELECT id, email, family_id, is_admin, onboarding_completed FROM parent WHERE id = $1`,
    [parentId]
  );
  return result.rows[0] || null;
}

async function refreshRowStillValid(handoff) {
  const result = await db.query(
    `SELECT id, expires_at FROM refresh_token
     WHERE id = $1 AND parent_id = $2`,
    [handoff.refresh_token_id, handoff.parent_id]
  );
  const row = result.rows[0];
  if (!row) return false;
  return new Date(row.expires_at) >= new Date();
}

/**
 * Validate handoff without consuming (for in-request parent context).
 */
async function validateHandoffForRequest(req, res) {
  const loaded = await loadHandoffRowByCookie(req);
  if (!loaded) return null;
  if (loaded.legacy) {
    clearHandoffCookie(res);
    return null;
  }
  if (loaded.revoked_at || loaded.used_at) return null;
  if (new Date(loaded.expires_at) < new Date()) return null;
  if (!await parentHasActiveFamilyAccess(loaded.parent_id, loaded.family_id)) return null;
  if (!await refreshRowStillValid(loaded)) return null;
  return loaded;
}

/**
 * Issue parent JWT for req only (no cookie swap, no consume).
 */
async function applyHandoffToRequestCookies(req, res) {
  const handoff = await validateHandoffForRequest(req, res);
  if (!handoff) return false;

  const parentRow = await fetchParentRow(handoff.parent_id);
  if (!parentRow) return false;

  const accessToken = signParentAccessToken(parentRow);
  req.cookies.access_token = accessToken;
  return true;
}

/**
 * Atomically consume handoff and set parent session cookies (logout / activate).
 */
async function consumeHandoffAndActivateSession(req, res) {
  const loaded = await loadHandoffRowByCookie(req);
  if (!loaded) return { ok: false, code: 'missing' };
  if (loaded.legacy) {
    clearHandoffCookie(res);
    return { ok: false, code: 'legacy' };
  }

  const consume = await db.query(
    `UPDATE parent_session_handoff
     SET used_at = NOW()
     WHERE id = $1
       AND used_at IS NULL
       AND revoked_at IS NULL
       AND expires_at > NOW()
     RETURNING id, parent_id, family_id, refresh_token_id`,
    [loaded.id]
  );
  if (consume.rows.length === 0) {
    return { ok: false, code: 'used_or_expired' };
  }
  const handoff = consume.rows[0];

  if (!await parentHasActiveFamilyAccess(handoff.parent_id, handoff.family_id)) {
    return { ok: false, code: 'access_revoked' };
  }

  const refreshCheck = await db.query(
    `SELECT id FROM refresh_token WHERE id = $1 AND parent_id = $2 AND expires_at > NOW()`,
    [handoff.refresh_token_id, handoff.parent_id]
  );
  if (refreshCheck.rows.length === 0) {
    return { ok: false, code: 'refresh_invalid' };
  }

  await db.query('DELETE FROM refresh_token WHERE id = $1', [handoff.refresh_token_id]);

  const parentRow = await fetchParentRow(handoff.parent_id);
  if (!parentRow) return { ok: false, code: 'parent_missing' };

  const newRefresh = await createRefreshToken({
    userId: handoff.parent_id,
    userType: 'parent',
    familyId: handoff.family_id,
  });
  const accessToken = signParentAccessToken(parentRow);
  const expiresInSecs = typeof config.jwt.expiresIn === 'string'
    ? parseDuration(config.jwt.expiresIn)
    : config.jwt.expiresIn;

  setRefreshCookie(res, newRefresh);
  setAccessCookie(res, accessToken, expiresInSecs);
  clearHandoffCookie(res);

  return {
    ok: true,
    parent: parentRow,
    expiresAt: Date.now() + expiresInSecs * 1000,
  };
}

async function resolveParentIdFromHandoff(req, res) {
  const handoff = await validateHandoffForRequest(req, res);
  return handoff?.parent_id || null;
}

async function resolveFamilyIdFromHandoff(req, res) {
  const handoff = await validateHandoffForRequest(req, res);
  return handoff?.family_id || null;
}

module.exports = {
  HANDOFF_COOKIE,
  hashOpaque,
  clearHandoffCookie,
  isLegacyBase64SessionCookie,
  createHandoffFromParentCookies,
  validateHandoffForRequest,
  applyHandoffToRequestCookies,
  consumeHandoffAndActivateSession,
  resolveParentIdFromHandoff,
  resolveFamilyIdFromHandoff,
  revokeHandoffsForParent,
  revokeHandoffsForUser,
  parentHasActiveFamilyAccess,
};
