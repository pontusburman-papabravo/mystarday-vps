'use strict';

const db = require('./db');
const trusted = require('./trusted-device');
const { getActiveChildAccess, isParentEligibleForFamilyDevice } = require('../../db/parent-access');

const VALID_MEMBER_TYPES = new Set(['child', 'parent']);

/**
 * @param {{ type: 'parent'|'child', id: string, familyId?: string }} viewer
 * @param {'child'|'parent'} memberType
 * @param {string} memberId
 */
async function canViewMemberAvatar(viewer, memberType, memberId) {
  if (!viewer || !VALID_MEMBER_TYPES.has(memberType) || !memberId) return false;

  if (memberType === 'child') {
    const { rows } = await db.query(
      'SELECT id, family_id FROM child WHERE id = $1',
      [memberId]
    );
    const child = rows[0];
    if (!child) return false;

    if (viewer.type === 'child') {
      return viewer.familyId === child.family_id;
    }
    if (viewer.type === 'parent') {
      if (viewer.familyId !== child.family_id) return false;
      const access = await getActiveChildAccess(viewer.id, memberId);
      return !!access;
    }
    return false;
  }

  if (memberType === 'parent') {
    const { rows } = await db.query(
      'SELECT id, family_id FROM parent WHERE id = $1',
      [memberId]
    );
    const parent = rows[0];
    if (!parent) return false;

    if (viewer.type === 'parent') {
      return viewer.familyId === parent.family_id;
    }
    if (viewer.type === 'child') {
      return viewer.familyId === parent.family_id;
    }
  }

  return false;
}

/**
 * @param {string} parentId
 * @param {string} childId
 */
async function canManageChildAvatar(parentId, childId) {
  const access = await getActiveChildAccess(parentId, childId);
  if (!access) return false;
  return ['primary', 'shared'].includes(access.role);
}

/**
 * Profile picker cold start: trusted shared/child device may load family avatars
 * without a parent/child JWT (same allowlist as app-entry).
 */
async function canViewMemberAvatarViaTrustedDevice(req, memberType, memberId) {
  const raw = req.cookies?.[trusted.COOKIE_NAME];
  if (!raw || !memberId || !VALID_MEMBER_TYPES.has(memberType)) return false;

  const row = await trusted.verifyTrustedDeviceRaw(raw);
  if (!row || (row.device_mode !== 'shared' && row.device_mode !== 'child')) {
    return false;
  }

  const ctx = await trusted.getTrustedDeviceContext(raw);
  if (!ctx.ok) return false;

  if (memberType === 'child') {
    return (ctx.allowed_children || []).some((c) => c.id === memberId);
  }
  if (memberType === 'parent') {
    return isParentEligibleForFamilyDevice(memberId, ctx.family_id);
  }
  return false;
}

module.exports = {
  canViewMemberAvatar,
  canViewMemberAvatarViaTrustedDevice,
  canManageChildAvatar,
  VALID_MEMBER_TYPES,
};
