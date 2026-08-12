'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./db');
const deviceDb = require('../../db/family-trusted-device');
const authz = require('../middleware/authz');
const { getChildrenForParent, getAllowedParentsForFamilyDevice, isParentEligibleForFamilyDevice } = require('../../db/parent-access');
const {
  createRefreshToken,
  lookupRefreshTokenRow,
  setRefreshCookie,
  setAccessCookie,
} = require('./refresh-tokens');
const { parseDuration } = require('../routes/auth/session');
const { isTrustedDeviceEnabled } = require('./trusted-device-flags');
const { avatarApiFields } = require('./avatar-api');
const { ensureHandoffForChildSession } = require('./parent-session-handoff');

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

async function enrollSharedDevice({ parentId, familyId, platform, label }) {
  const enabled = await isTrustedDeviceEnabled(familyId);
  if (!enabled) {
    const err = new Error('FEATURE_DISABLED');
    err.code = 'TRUSTED_DEVICE_DISABLED';
    throw err;
  }

  const raw = generateRawToken();
  const row = await deviceDb.insertDevice({
    family_id: familyId,
    created_by_parent_id: parentId,
    device_mode: 'shared',
    default_child_id: null,
    token_hash: hashToken(raw),
    platform,
    label,
  });

  return { device: row, rawToken: raw };
}

async function enrollParentDevice({ parentId, familyId, platform, label }) {
  const enabled = await isTrustedDeviceEnabled(familyId);
  if (!enabled) {
    const err = new Error('FEATURE_DISABLED');
    err.code = 'TRUSTED_DEVICE_DISABLED';
    throw err;
  }

  const parentRes = await db.query(
    'SELECT id, family_id FROM parent WHERE id = $1 AND family_id = $2',
    [parentId, familyId]
  );
  if (!parentRes.rows[0]) {
    const err = new Error('FORBIDDEN');
    err.code = 'PARENT_FAMILY_MISMATCH';
    throw err;
  }

  const raw = generateRawToken();
  const row = await deviceDb.insertDevice({
    family_id: familyId,
    created_by_parent_id: parentId,
    device_mode: 'parent',
    default_child_id: null,
    token_hash: hashToken(raw),
    platform,
    label,
  });

  return { device: row, rawToken: raw };
}

async function getEnrollingParentRow(row) {
  if (!row?.created_by_parent_id || !row?.family_id) return null;
  const parentRes = await db.query(
    `SELECT id, family_id, email, is_admin FROM parent WHERE id = $1 AND family_id = $2`,
    [row.created_by_parent_id, row.family_id]
  );
  return parentRes.rows[0] || null;
}

function allowedCountBucket(count) {
  if (count <= 1) return '1';
  if (count === 2) return '2';
  return '3_plus';
}

async function listFamilyChildrenForDevice(familyId, enrollingParentId) {
  if (enrollingParentId) {
    const rows = await getChildrenForParent(enrollingParentId, { allowedRoles: ['primary', 'shared'] });
    return rows.map((c) => ({
      id: c.id,
      username: c.username,
      name: c.name,
      emoji: c.emoji || '⭐',
      familyId: c.family_id,
      ...avatarApiFields(c, 'child'),
    }));
  }
  const result = await db.query(
    `SELECT id, family_id, username, name, emoji, avatar_url
     FROM child WHERE family_id = $1 ORDER BY name ASC`,
    [familyId]
  );
  return result.rows.map((c) => ({
    id: c.id,
    username: c.username,
    name: c.name,
    emoji: c.emoji || '⭐',
    familyId: c.family_id,
    ...avatarApiFields(c, 'child'),
  }));
}

async function listParentsForSharedDevice(familyId) {
  const rows = await getAllowedParentsForFamilyDevice(familyId);
  return rows.map((p) => ({
    id: p.id,
    name: p.name || (p.email ? String(p.email).split('@')[0] : 'Vuxen'),
    familyId: p.family_id,
    type: 'parent',
    hasAppPin: p.has_app_pin === true,
    ...avatarApiFields(p, 'parent'),
  }));
}

async function countSharedDeviceProfiles(familyId, enrollingParentId) {
  const children = await listFamilyChildrenForDevice(familyId, enrollingParentId);
  const parents = await listParentsForSharedDevice(familyId);
  return {
    children,
    parents,
    totalProfiles: children.length + parents.length,
  };
}

async function verifyTrustedDeviceRaw(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const row = await deviceDb.findByTokenHash(hashToken(raw));
  if (!row || row.revoked_at) return null;
  if (row.device_mode === 'child') {
    if (!row.default_child_id) return null;
  } else if (row.device_mode === 'shared' || row.device_mode === 'parent') {
    /* ok */
  } else {
    return null;
  }
  return row;
}

async function creatorHasChildAccess(row, childId) {
  const access = await authz.getChildAccess(row.created_by_parent_id, childId);
  if (!access) return false;
  const childRes = await db.query(
    'SELECT id FROM child WHERE id = $1 AND family_id = $2',
    [childId, row.family_id]
  );
  return Boolean(childRes.rows[0]);
}

async function issueParentSessionForDevice(res, row, rawToken, source) {
  const parent = await getEnrollingParentRow(row);
  if (!parent) {
    return { ok: false, code: 'PARENT_ACCESS_DENIED' };
  }

  const accessToken = jwt.sign(
    {
      id: parent.id,
      type: 'parent',
      familyId: parent.family_id,
      email: parent.email || null,
      isAdmin: parent.is_admin || false,
      trustedDeviceId: row.id,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const rawRefresh = await createRefreshToken({
    userId: parent.id,
    userType: 'parent',
    familyId: parent.family_id,
    trustedDeviceId: row.id,
  });
  const refreshRow = await lookupRefreshTokenRow(rawRefresh);
  if (refreshRow?.id) {
    await deviceDb.setLastRefreshTokenId(row.id, refreshRow.id);
  }

  setRefreshCookie(res, rawRefresh);
  const expiresInSecs = parseDuration(config.jwt.expiresIn);
  setAccessCookie(res, accessToken, expiresInSecs);
  setTrustedDeviceCookie(res, rawToken);

  await deviceDb.touchLastSeen(row.id);

  const analytics = require('../../db/analytics');
  analytics.track(row.family_id, 'parent_session_started', {
    source: source || 'trusted_device_restore_parent',
    session_mode: 'resume',
    device_mode: row.device_mode,
  });

  return {
    ok: true,
    parent: {
      id: parent.id,
      type: 'parent',
      familyId: parent.family_id,
      email: parent.email || null,
    },
    device_id: row.id,
    device_mode: row.device_mode,
  };
}

async function issueChildSessionForDevice(req, res, row, rawToken, childId, source) {
  if (!childId) {
    return { ok: false, code: 'CHILD_NOT_FOUND' };
  }
  if (!(await creatorHasChildAccess(row, childId))) {
    return { ok: false, code: 'CHILD_ACCESS_DENIED' };
  }
  const handoffOk = await ensureHandoffForChildSession(req, res, row);
  if (!handoffOk) {
    console.error('[TRUSTED_DEVICE] handoff create failed before child session', row?.id, source);
    return { ok: false, code: 'PARENT_HANDOFF_CREATE_FAILED' };
  }
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
      trustedDeviceId: row.id,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.childExpiresIn }
  );

  const rawRefresh = await createRefreshToken({
    userId: child.id,
    userType: 'child',
    familyId: child.family_id,
    trustedDeviceId: row.id,
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
    source: source || 'trusted_device_restore',
    session_mode: 'resume',
    device_mode: row.device_mode,
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
    device_mode: row.device_mode,
  };
}

async function getTrustedDeviceContext(rawToken) {
  const row = await verifyTrustedDeviceRaw(rawToken);
  if (!row) {
    return { ok: false, code: 'TRUSTED_DEVICE_INVALID' };
  }
  const enabled = await isTrustedDeviceEnabled(row.family_id);
  if (!enabled) {
    return { ok: false, code: 'TRUSTED_DEVICE_DISABLED' };
  }
  if (row.device_mode === 'parent') {
    const parent = await getEnrollingParentRow(row);
    if (!parent) {
      return { ok: false, code: 'PARENT_ACCESS_DENIED' };
    }
    const allowed = await listFamilyChildrenForDevice(row.family_id, row.created_by_parent_id);
    return {
      ok: true,
      device_mode: row.device_mode,
      allowed_children: allowed,
      allowed_count_bucket: allowedCountBucket(allowed.length),
      can_switch_children: allowed.length > 1,
      last_active_child_id: row.last_active_child_id,
      family_id: row.family_id,
    };
  }

  if (row.device_mode === 'child') {
    const childId = row.default_child_id;
    if (!childId || !(await creatorHasChildAccess(row, childId))) {
      return { ok: false, code: 'CHILD_ACCESS_DENIED' };
    }
    const childRes = await db.query(
      `SELECT id, family_id, username, name, emoji, avatar_url
       FROM child WHERE id = $1 AND family_id = $2`,
      [childId, row.family_id]
    );
    const c = childRes.rows[0];
    if (!c) {
      return { ok: false, code: 'CHILD_NOT_FOUND' };
    }
    const allowed = [{
      id: c.id,
      username: c.username,
      name: c.name,
      emoji: c.emoji || '⭐',
      familyId: c.family_id,
      ...avatarApiFields(c, 'child'),
    }];
    return {
      ok: true,
      device_mode: row.device_mode,
      allowed_children: allowed,
      allowed_count_bucket: '1',
      can_switch_children: false,
      last_active_child_id: row.last_active_child_id,
      family_id: row.family_id,
    };
  }

  const allowed = await listFamilyChildrenForDevice(row.family_id, row.created_by_parent_id);
  return {
    ok: true,
    device_mode: row.device_mode,
    allowed_children: allowed,
    allowed_count_bucket: allowedCountBucket(allowed.length),
    can_switch_children: true,
    last_active_child_id: row.last_active_child_id,
    family_id: row.family_id,
  };
}

async function selectChildOnTrustedDevice(req, res, rawToken, childId) {
  const row = await verifyTrustedDeviceRaw(rawToken);
  if (!row) {
    return { ok: false, code: 'TRUSTED_DEVICE_INVALID' };
  }
  const enabled = await isTrustedDeviceEnabled(row.family_id);
  if (!enabled) {
    return { ok: false, code: 'TRUSTED_DEVICE_DISABLED' };
  }
  if (row.device_mode !== 'shared') {
    return { ok: false, code: 'DEVICE_MODE_NOT_SHARED' };
  }
  const allowed = await listFamilyChildrenForDevice(row.family_id, row.created_by_parent_id);
  if (!allowed.some((c) => c.id === childId)) {
    return { ok: false, code: 'CHILD_ACCESS_DENIED' };
  }
  return issueChildSessionForDevice(req, res, row, rawToken, childId, 'trusted_device_select_child');
}

async function selectParentOnTrustedDevice(req, res, rawToken, parentId, options) {
  const opts = options || {};
  const row = await verifyTrustedDeviceRaw(rawToken);
  if (!row) {
    return { ok: false, code: 'TRUSTED_DEVICE_INVALID' };
  }
  const enabled = await isTrustedDeviceEnabled(row.family_id);
  if (!enabled) {
    return { ok: false, code: 'TRUSTED_DEVICE_DISABLED' };
  }
  if (row.device_mode !== 'shared' && row.device_mode !== 'child' && row.device_mode !== 'parent') {
    return { ok: false, code: 'DEVICE_MODE_NOT_SHARED' };
  }

  const eligible = await isParentEligibleForFamilyDevice(parentId, row.family_id);
  if (!eligible) {
    return { ok: false, code: 'PARENT_ACCESS_DENIED' };
  }

  const parentRes = await db.query(
    `SELECT id, email, family_id, is_admin, name, onboarding_completed
     FROM parent WHERE id = $1 AND family_id = $2 AND is_admin = false`,
    [parentId, row.family_id]
  );
  const parentRow = parentRes.rows[0];
  if (!parentRow) {
    return { ok: false, code: 'PARENT_ACCESS_DENIED' };
  }

  const parentPinDb = require('../../db/parent-pin');
  const familyHasPin = await parentPinDb.familyAnyParentHasPin(row.family_id);
  if (!familyHasPin) {
    return { ok: false, code: 'ADULT_PIN_SETUP_REQUIRED' };
  }

  const hasOwnPin = await parentPinDb.parentHasPin(parentId);
  if (!hasOwnPin) {
    return { ok: false, code: 'PARENT_PIN_NOT_SET' };
  }

  const unlockMethod = String(opts.unlockMethod || '').toLowerCase();
  if (unlockMethod !== 'pin') {
    return { ok: false, code: 'ADULT_VERIFICATION_REQUIRED' };
  }

  const pin = String(opts.pin || '');
  if (!/^\d{4}$/.test(pin)) {
    return { ok: false, code: 'PARENT_PIN_INVALID' };
  }
  const pinResult = await parentPinDb.verifyParentPin({
    familyId: row.family_id,
    parentId,
    pin,
  });
  if (!pinResult.ok) {
    return { ok: false, code: 'PARENT_PIN_INVALID' };
  }

  const { signParentAccessWithOptionalLease } = require('./adult-privilege-escalation');
  const signed = signParentAccessWithOptionalLease(parentRow, {
    deviceMode: row.device_mode,
  });

  const rawRefresh = await createRefreshToken({
    userId: parentRow.id,
    userType: 'parent',
    familyId: parentRow.family_id,
    trustedDeviceId: row.id,
  });
  const refreshRow = await lookupRefreshTokenRow(rawRefresh);
  if (refreshRow?.id) {
    await deviceDb.setLastRefreshTokenId(row.id, refreshRow.id);
  }

  setRefreshCookie(res, rawRefresh);
  setAccessCookie(res, signed.accessToken, signed.expiresInSecs);
  setTrustedDeviceCookie(res, rawToken);
  await deviceDb.touchLastSeen(row.id);

  const analytics = require('../../db/analytics');
  analytics.track(row.family_id, 'parent_session_started', {
    source: opts.source || 'trusted_device_select_parent',
    session_mode: 'select',
    device_mode: row.device_mode,
  });

  return {
    ok: true,
    parent: {
      id: parentRow.id,
      type: 'parent',
      familyId: parentRow.family_id,
      email: parentRow.email || null,
      name: parentRow.name || null,
      onboarding_completed: parentRow.onboarding_completed,
    },
    device_id: row.id,
    device_mode: row.device_mode,
    privilegeLeaseUntil: signed.privilegeLeaseUntil,
  };
}

async function restoreParentSessionFromDevice(res, rawToken) {
  const row = await verifyTrustedDeviceRaw(rawToken);
  if (!row) {
    return { ok: false, code: 'TRUSTED_DEVICE_INVALID' };
  }
  if (row.device_mode !== 'parent') {
    return { ok: false, code: 'DEVICE_MODE_NOT_PARENT' };
  }
  const enabled = await isTrustedDeviceEnabled(row.family_id);
  if (!enabled) {
    return { ok: false, code: 'TRUSTED_DEVICE_DISABLED' };
  }
  return issueParentSessionForDevice(res, row, rawToken, 'trusted_device_restore_parent');
}

async function restoreChildSessionFromDevice(req, res, rawToken, options) {
  const opts = options || {};
  const row = await verifyTrustedDeviceRaw(rawToken);
  if (!row) {
    return { ok: false, code: 'TRUSTED_DEVICE_INVALID' };
  }

  const enabled = await isTrustedDeviceEnabled(row.family_id);
  if (!enabled) {
    return { ok: false, code: 'TRUSTED_DEVICE_DISABLED' };
  }

  if (row.device_mode === 'parent') {
    return { ok: false, code: 'DEVICE_MODE_NOT_CHILD' };
  }

  if (row.device_mode === 'shared') {
    const profileCounts = await countSharedDeviceProfiles(row.family_id, row.created_by_parent_id);
    const allowed = profileCounts.children;
    if (allowed.length === 0) {
      return { ok: false, code: 'CHILD_NOT_FOUND' };
    }

    let childId = opts.preferredChildId || null;
    if (childId && !allowed.some((c) => c.id === childId)) {
      childId = null;
    }

    if (profileCounts.totalProfiles > 1) {
      if (!childId) {
        return {
          ok: false,
          code: 'SHARED_PICKER_REQUIRED',
          device_mode: 'shared',
          allowed_children: allowed,
          allowed_count_bucket: allowedCountBucket(allowed.length),
        };
      }
      return issueChildSessionForDevice(req, res, row, rawToken, childId, 'trusted_device_restore');
    }

    if (allowed.length === 1) {
      return issueChildSessionForDevice(req, res, row, rawToken, allowed[0].id, 'trusted_device_restore');
    }

    return {
      ok: false,
      code: 'SHARED_PICKER_REQUIRED',
      device_mode: 'shared',
      allowed_children: allowed,
      allowed_count_bucket: allowedCountBucket(allowed.length),
    };
  }

  const childId = opts.preferredChildId || row.last_active_child_id || row.default_child_id;
  if (row.device_mode === 'child' && childId !== row.default_child_id) {
    return { ok: false, code: 'CHILD_ACCESS_DENIED' };
  }
  return issueChildSessionForDevice(req, res, row, rawToken, childId, 'trusted_device_restore');
}

async function revokeDeviceForFamily(deviceId, familyId) {
  const row = await deviceDb.findById(deviceId);
  const revoked = await deviceDb.revokeForFamily(deviceId, familyId);
  if (revoked && row?.created_by_parent_id) {
    const { revokeHandoffsForParent } = require('./parent-session-handoff');
    await revokeHandoffsForParent(row.created_by_parent_id);
  }
  return revoked;
}

module.exports = {
  COOKIE_NAME,
  enrollChildDevice,
  enrollSharedDevice,
  enrollParentDevice,
  restoreChildSessionFromDevice,
  restoreParentSessionFromDevice,
  getTrustedDeviceContext,
  selectChildOnTrustedDevice,
  selectParentOnTrustedDevice,
  listParentsForSharedDevice,
  countSharedDeviceProfiles,
  verifyTrustedDeviceRaw,
  getEnrollingParentRow,
  setTrustedDeviceCookie,
  clearTrustedDeviceCookie,
  revokeDeviceForFamily,
  listDevicesForFamily: deviceDb.listActiveForFamily,
  revokeAllForFamily: deviceDb.revokeAllForFamilyWithTokens,
  allowedCountBucket,
};
