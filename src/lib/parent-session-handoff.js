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
  insertRefreshTokenRow,
  verifyRefreshToken,
  setRefreshCookie,
  setAccessCookie,
  lookupRefreshTokenRow,
  hashToken,
  isValidRawRefreshToken,
} = require('./refresh-tokens');
const { parseDuration } = require('../routes/auth/session');

const HANDOFF_COOKIE = 'stjarndag_parent_session';
const HANDOFF_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Stable internal codes for logs and server-side branching (never sent with secrets). */
const HANDOFF_CODES = {
  cookie_missing: 'HANDOFF_COOKIE_MISSING',
  row_missing: 'HANDOFF_ROW_MISSING',
  legacy: 'HANDOFF_LEGACY',
  revoked: 'HANDOFF_REVOKED',
  used: 'HANDOFF_USED',
  expired: 'HANDOFF_EXPIRED',
  access_revoked: 'HANDOFF_ACCESS_REVOKED',
  parent_refresh_missing: 'HANDOFF_PARENT_REFRESH_MISSING',
  parent_refresh_invalid: 'HANDOFF_PARENT_REFRESH_INVALID',
};

function truncateHash(hex) {
  if (!hex || typeof hex !== 'string') return 'none';
  if (hex.length <= 10) return hex;
  return `${hex.slice(0, 8)}…`;
}

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

async function parentHasActiveFamilyAccess(parentId, familyId, queryFn = db.query.bind(db)) {
  const result = await queryFn(
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
/**
 * Dormant parent refresh + handoff when child session starts from trusted device
 * (no parent access/refresh cookies on the request).
 */
async function createHandoffFromTrustedDeviceEnroller(req, res, { parentId, familyId, trustedDeviceId }) {
  if (!parentId || !familyId) return false;
  if (!await parentHasActiveFamilyAccess(parentId, familyId)) return false;

  await revokeHandoffsForParent(parentId);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const inserted = await insertRefreshTokenRow(client, {
      userId: parentId,
      userType: 'parent',
      familyId,
    });

    const opaque = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashOpaque(opaque);
    const refreshExpires = new Date(inserted.row.expires_at);
    const ttlCap = new Date(Date.now() + HANDOFF_TTL_MS);
    const expiresAt = refreshExpires < ttlCap ? refreshExpires : ttlCap;

    await client.query(
      `INSERT INTO parent_session_handoff (
         token_hash, parent_id, family_id, refresh_token_id, expires_at, created_ip, user_agent
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        tokenHash,
        parentId,
        familyId,
        inserted.row.id,
        expiresAt,
        req?.ip || null,
        (req?.headers?.['user-agent'] || '').slice(0, 500) || null,
      ]
    );
    await client.query('COMMIT');

    res.cookie(HANDOFF_COOKIE, opaque, handoffCookieOptions(HANDOFF_TTL_MS));
    return { ok: true, refreshTokenId: inserted.row.id };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    console.error('[HANDOFF] trusted device enroller handoff failed:', err.message);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Ensure opaque handoff exists before swapping to a child session.
 * Reuses valid handoff; else parent cookies; else trusted-device enroller parent.
 */
async function ensureHandoffForChildSession(req, res, deviceRow) {
  const evaluated = await evaluateHandoffForRequest(req, res);
  if (evaluated.ok) return true;

  if (await createHandoffFromParentCookies(req, res)) return true;

  if (!deviceRow?.created_by_parent_id || !deviceRow?.family_id) return false;

  const created = await createHandoffFromTrustedDeviceEnroller(req, res, {
    parentId: deviceRow.created_by_parent_id,
    familyId: deviceRow.family_id,
    trustedDeviceId: deviceRow.id,
  });
  return created === true || (created && created.ok === true);
}

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
 * Full handoff validation result (server-internal). Callers must check `ok` before using `handoff`.
 */
async function evaluateHandoffForRequest(req, res) {
  const rawCookie = req.cookies?.[HANDOFF_COOKIE];
  if (!rawCookie) {
    return { ok: false, reason: 'cookie_missing', code: HANDOFF_CODES.cookie_missing };
  }
  if (isLegacyBase64SessionCookie(rawCookie)) {
    clearHandoffCookie(res);
    return { ok: false, reason: 'legacy', code: HANDOFF_CODES.legacy };
  }

  const loaded = await loadHandoffRowByCookie(req);
  if (!loaded || loaded.legacy) {
    if (loaded?.legacy) clearHandoffCookie(res);
    return { ok: false, reason: 'row_missing', code: HANDOFF_CODES.row_missing };
  }
  if (loaded.revoked_at) {
    return { ok: false, reason: 'revoked', code: HANDOFF_CODES.revoked, handoffId: loaded.id };
  }
  if (loaded.used_at) {
    return { ok: false, reason: 'used', code: HANDOFF_CODES.used, handoffId: loaded.id };
  }
  if (new Date(loaded.expires_at) < new Date()) {
    return { ok: false, reason: 'expired', code: HANDOFF_CODES.expired, handoffId: loaded.id };
  }
  if (!await parentHasActiveFamilyAccess(loaded.parent_id, loaded.family_id)) {
    return { ok: false, reason: 'access_revoked', code: HANDOFF_CODES.access_revoked, handoffId: loaded.id };
  }
  const refreshValid = await refreshRowStillValid(loaded);
  if (!refreshValid) {
    return {
      ok: false,
      reason: 'parent_refresh_invalid',
      code: HANDOFF_CODES.parent_refresh_invalid,
      handoffId: loaded.id,
    };
  }
  return {
    ok: true,
    handoff: loaded,
    parentId: loaded.parent_id,
    familyId: loaded.family_id,
  };
}

/**
 * Structured handoff + refresh diagnostics for logout (no raw tokens or cookies).
 */
async function logHandoffLogoutDiagnostics(req, phase, handoffEval, accessDecoded, rawRefresh) {
  const correlationId = req.id || 'no-request-id';
  const handoffCookiePresent = Boolean(req.cookies?.[HANDOFF_COOKIE]);
  const handoffHash = handoffCookiePresent
    ? truncateHash(hashOpaque(req.cookies[HANDOFF_COOKIE]))
    : 'none';

  let refreshHash = 'none';
  let refreshUserType = null;
  let refreshChildId = null;
  let refreshParentId = null;
  let refreshRowId = null;
  if (rawRefresh && isValidRawRefreshToken(rawRefresh)) {
    refreshHash = truncateHash(hashToken(rawRefresh));
    const row = await lookupRefreshTokenRow(rawRefresh);
    if (row) {
      refreshUserType = row.user_type;
      refreshChildId = row.child_id;
      refreshParentId = row.parent_id;
      refreshRowId = row.id;
    }
  }

  const payload = {
    correlationId,
    phase,
    handoffCookiePresent,
    handoffCookieHash: handoffHash,
    handoffOk: handoffEval?.ok === true,
    handoffCode: handoffEval?.ok ? 'OK' : (handoffEval?.code || 'UNKNOWN'),
    handoffReason: handoffEval?.ok ? null : (handoffEval?.reason || null),
    accessSessionType: accessDecoded?.type || null,
    accessSubjectId: accessDecoded?.id || null,
    accessFamilyId: accessDecoded?.familyId || null,
    refreshHash,
    refreshUserType,
    refreshChildId,
    refreshParentId,
    refreshRowId,
    handoffRefreshTokenId: handoffEval?.ok ? handoffEval.handoff.refresh_token_id : null,
  };

  console.info('[HANDOFF]', JSON.stringify(payload));
}

/**
 * Validate handoff without consuming (for in-request parent context).
 * @returns {Promise<object|null>} handoff row or null — use evaluateHandoffForRequest when reason matters.
 */
async function validateHandoffForRequest(req, res) {
  const evaluated = await evaluateHandoffForRequest(req, res);
  return evaluated.ok ? evaluated.handoff : null;
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

/** Map internal consume codes to stable client-facing codes. */
function mapHandoffClientCode(internalCode) {
  switch (internalCode) {
    case 'missing':
    case 'cookie_missing':
    case 'legacy':
    case 'row_missing':
    case 'revoked':
    case 'access_revoked':
    case 'refresh_invalid':
    case 'parent_refresh_invalid':
    case 'parent_missing':
      return 'PARENT_HANDOFF_INVALID';
    case 'used':
      return 'PARENT_HANDOFF_USED';
    case 'used_or_expired':
    case 'expired':
      return 'PARENT_HANDOFF_EXPIRED';
    case 'concurrent_conflict':
      return 'PARENT_HANDOFF_USED';
    default:
      return 'PARENT_HANDOFF_CONSUME_FAILED';
  }
}

/**
 * Atomically consume handoff (DB transaction) then set parent session cookies.
 */
async function consumeHandoffAndActivateSession(req, res, options = {}) {
  const loaded = await loadHandoffRowByCookie(req);
  if (!loaded) {
    return { ok: false, code: 'missing', clientCode: 'PARENT_HANDOFF_INVALID' };
  }
  if (loaded.legacy) {
    clearHandoffCookie(res);
    return { ok: false, code: 'legacy', clientCode: 'PARENT_HANDOFF_INVALID' };
  }

  const tokenHash = hashOpaque(loaded.raw);
  const client = await db.getClient();
  let txResult;
  try {
    await client.query('BEGIN');

    const handoffLock = await client.query(
      `SELECT id, parent_id, family_id, refresh_token_id, expires_at, used_at, revoked_at
       FROM parent_session_handoff
       WHERE token_hash = $1
       FOR UPDATE`,
      [tokenHash]
    );
    const handoffRow = handoffLock.rows[0];
    if (!handoffRow) {
      await client.query('ROLLBACK');
      return { ok: false, code: 'missing', clientCode: 'PARENT_HANDOFF_INVALID' };
    }
    if (handoffRow.revoked_at) {
      await client.query('ROLLBACK');
      return { ok: false, code: 'revoked', clientCode: 'PARENT_HANDOFF_INVALID' };
    }
    if (handoffRow.used_at) {
      await client.query('ROLLBACK');
      return { ok: false, code: 'used', clientCode: 'PARENT_HANDOFF_USED' };
    }
    if (new Date(handoffRow.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return { ok: false, code: 'expired', clientCode: 'PARENT_HANDOFF_EXPIRED' };
    }

    if (options.testInjectFailAfterHandoffLock) {
      throw new Error('HANDOFF_TEST_INJECT_FAIL');
    }

    if (!await parentHasActiveFamilyAccess(handoffRow.parent_id, handoffRow.family_id, client.query.bind(client))) {
      await client.query('ROLLBACK');
      return { ok: false, code: 'access_revoked', clientCode: 'PARENT_HANDOFF_INVALID' };
    }

    const refreshLock = await client.query(
      `SELECT id, expires_at FROM refresh_token
       WHERE id = $1 AND parent_id = $2
       FOR UPDATE`,
      [handoffRow.refresh_token_id, handoffRow.parent_id]
    );
    if (refreshLock.rows.length === 0 || new Date(refreshLock.rows[0].expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return { ok: false, code: 'refresh_invalid', clientCode: 'PARENT_HANDOFF_INVALID' };
    }

    const parentRes = await client.query(
      `SELECT id, email, family_id, is_admin, onboarding_completed FROM parent WHERE id = $1`,
      [handoffRow.parent_id]
    );
    const parentRow = parentRes.rows[0];
    if (!parentRow) {
      await client.query('ROLLBACK');
      return { ok: false, code: 'parent_missing', clientCode: 'PARENT_HANDOFF_INVALID' };
    }

    const inserted = await insertRefreshTokenRow(client, {
      userId: handoffRow.parent_id,
      userType: 'parent',
      familyId: handoffRow.family_id,
    });
    const newRefreshRaw = inserted.raw;

    const marked = await client.query(
      `UPDATE parent_session_handoff
       SET used_at = NOW()
       WHERE id = $1 AND used_at IS NULL
       RETURNING id`,
      [handoffRow.id]
    );
    if (marked.rows.length === 0) {
      await client.query('ROLLBACK');
      return { ok: false, code: 'concurrent_conflict', clientCode: 'PARENT_HANDOFF_USED' };
    }

    await client.query('DELETE FROM refresh_token WHERE id = $1', [handoffRow.refresh_token_id]);
    await client.query('COMMIT');

    const accessToken = signParentAccessToken(parentRow);
    const expiresInSecs = typeof config.jwt.expiresIn === 'string'
      ? parseDuration(config.jwt.expiresIn)
      : config.jwt.expiresIn;

    setRefreshCookie(res, newRefreshRaw);
    setAccessCookie(res, accessToken, expiresInSecs);
    clearHandoffCookie(res);

    txResult = {
      ok: true,
      parent: parentRow,
      expiresAt: Date.now() + expiresInSecs * 1000,
    };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    if (err.message === 'HANDOFF_TEST_INJECT_FAIL') {
      return { ok: false, code: 'inject_fail', clientCode: 'PARENT_HANDOFF_CONSUME_FAILED' };
    }
    console.error('[HANDOFF] consume transaction error:', req.id || 'no-req-id', err.message, err.stack?.split('\n')[0]);
    return { ok: false, code: 'transaction_error', clientCode: 'PARENT_HANDOFF_CONSUME_FAILED' };
  } finally {
    client.release();
  }

  return txResult;
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
  HANDOFF_CODES,
  hashOpaque,
  clearHandoffCookie,
  isLegacyBase64SessionCookie,
  createHandoffFromParentCookies,
  createHandoffFromTrustedDeviceEnroller,
  ensureHandoffForChildSession,
  evaluateHandoffForRequest,
  validateHandoffForRequest,
  logHandoffLogoutDiagnostics,
  applyHandoffToRequestCookies,
  consumeHandoffAndActivateSession,
  mapHandoffClientCode,
  resolveParentIdFromHandoff,
  resolveFamilyIdFromHandoff,
  revokeHandoffsForParent,
  revokeHandoffsForUser,
  parentHasActiveFamilyAccess,
};
