'use strict';

const db = require('./db');
const { getActiveChildAccess } = require('../../db/parent-access');

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

module.exports = {
  canViewMemberAvatar,
  canManageChildAvatar,
  VALID_MEMBER_TYPES,
};
