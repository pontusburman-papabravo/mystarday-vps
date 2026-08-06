'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./db');
const deviceDb = require('../../db/family-trusted-device');
const authz = require('../middleware/authz');
const {
  createRefreshToken,
  lookupRefreshTokenRow,
  setRefreshCookie,
  setAccessCookie,
} = require('./refresh-tokens');
const { parseDuration } = require('../routes/auth/session');
const { isTrustedDeviceEnabled } = require('./trusted-device-flags');

const COOKIE_NAME = 'trusted_device';
const TOKEN_BYTES = 32;

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function generateRawToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

function setTrustedDeviceCookie(res, rawToken) {
  const maxAge = 90 * 24 * 60 * 60 * 1000;
  res.cookie(COOKIE_NAME, rawToken, cookieOptions(maxAge));
}

function clearTrustedDeviceCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
  });
}

async function enrollChildDevice({ parentId, familyId, childId, platform, label }) {
  const enabled = await isTrustedDeviceEnabled(familyId);
  if (!enabled) {
    const err = new Error('FEATURE_DISABLED');
    err.code = 'TRUSTED_DEVICE_DISABLED';
    throw err;
  }

  const access = await authz.getChildAccess(parentId, childId);
  if (!access) {
    const err = new Error('FORBIDDEN');
    err.code = 'CHILD_ACCESS_DENIED';
    throw err;
  }

  const childRes = await db.query(
    'SELECT id, family_id FROM child WHERE id = $1 AND family_id = $2',
    [childId, familyId]
  );
  if (!childRes.rows[0]) {
    const err = new Error('NOT_FOUND');
    err.code = 'CHILD_NOT_FOUND';
    throw err;
  }

  const raw = generateRawToken();
  const row = await deviceDb.insertDevice({
    family_id: familyId,
    created_by_parent_id: parentId,
    device_mode: 'child',
    default_child_id: childId,
    token_hash: hashToken(raw),
    platform,
    label,
  });

  return { device: row, rawToken: raw };
}

async function verifyTrustedDeviceRaw(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const row = await deviceDb.findByTokenHash(hashToken(raw));
  if (!row || row.revoked_at) return null;
  if (row.device_mode !== 'child' || !row.default_child_id) return null;
  return row;
}

async function restoreChildSessionFromDevice(req, res, rawToken) {
  const row = await verifyTrustedDeviceRaw(rawToken);
  if (!row) {
    return { ok: false, code: 'TRUSTED_DEVICE_INVALID' };
  }

  const enabled = await isTrustedDeviceEnabled(row.family_id);
  if (!enabled) {
    return { ok: false, code: 'TRUSTED_DEVICE_DISABLED' };
  }

  const childId = row.last_active_child_id || row.default_child_id;
  const childRes = await db.query(
    `SELECT id, family_id, username, name FROM child WHERE id = $1 AND family_id = $2`,
    [childId, row.family_id]
  );
  const child = childRes.rows[0];
  if (!child) {
    return { ok: false, code: 'CHILD_NOT_FOUND' };
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

  const rawRefresh = await createRefreshToken({
    userId: child.id,
    userType: 'child',
    familyId: child.family_id,
  });
  const refreshRow = await lookupRefreshTokenRow(rawRefresh);
  if (refreshRow?.id) {
    await deviceDb.setLastRefreshTokenId(row.id, refreshRow.id);
  }

  setRefreshCookie(res, rawRefresh);
  const expiresInSecs = parseDuration(config.jwt.childExpiresIn);
  setAccessCookie(res, accessToken, expiresInSecs);
  setTrustedDeviceCookie(res, rawToken);

  await deviceDb.touchLastSeen(row.id);
  await deviceDb.setLastActiveChild(row.id, child.id);

  const analytics = require('../../db/analytics');
  analytics.track(row.family_id, 'child_session_started', {
    source: 'trusted_device_restore',
    session_mode: 'resume',
  });

  return {
    ok: true,
    child: {
      id: child.id,
      type: 'child',
      familyId: child.family_id,
      username: child.username,
      name: child.name,
    },
    device_id: row.id,
  };
}

module.exports = {
  COOKIE_NAME,
  enrollChildDevice,
  restoreChildSessionFromDevice,
  verifyTrustedDeviceRaw,
  setTrustedDeviceCookie,
  clearTrustedDeviceCookie,
  revokeDeviceForFamily: deviceDb.revokeForFamily,
  listDevicesForFamily: deviceDb.listActiveForFamily,
  revokeAllForFamily: deviceDb.revokeAllForFamilyWithTokens,
};
