'use strict';

/**
 * Resolve which child IDs an inviter may attach to a family_invite.
 * Empty/missing selection defaults to all children the inviter may administer.
 */

const db = require('./db');
const { getChildrenForParent } = require('../../db/parent-access');

async function resolveInviteChildIdsForParent(parentId, familyId, requestedChildIds) {
  const accessible = await getChildrenForParent(parentId, { allowedRoles: ['primary', 'shared'] });
  const accessibleIds = new Set(accessible.map((c) => c.id));

  if (accessibleIds.size === 0) {
    return { ok: false, status: 403, error: 'INVITE_NO_CHILDREN', code: 'INVITE_NO_CHILDREN' };
  }

  let childIds = Array.isArray(requestedChildIds) ? requestedChildIds : [];
  if (childIds.length === 0) {
    childIds = [...accessibleIds];
  } else {
    const notAllowed = childIds.filter((id) => !accessibleIds.has(id));
    if (notAllowed.length > 0) {
      return {
        ok: false,
        status: 403,
        error: 'INVITE_CHILD_ACCESS',
        code: 'INVITE_CHILD_ACCESS',
      };
    }
    const inFamily = await db.query(
      'SELECT id FROM child WHERE family_id = $1 AND id = ANY($2::uuid[])',
      [familyId, childIds]
    );
    if (inFamily.rows.length !== childIds.length) {
      return { ok: false, status: 400, error: 'INVITE_INVALID_CHILDREN', code: 'INVITE_INVALID_CHILDREN' };
    }
  }

  return { ok: true, childIds };
}

module.exports = { resolveInviteChildIdsForParent };
