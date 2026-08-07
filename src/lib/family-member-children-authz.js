'use strict';

const db = require('./db');

/**
 * Parent with at least one active primary link in the family (family admin for child access).
 */
async function callerIsPrimaryFamilyAdmin(parentId, familyId) {
  const r = await db.query(
    `SELECT 1 FROM parent_child pc
     INNER JOIN child c ON c.id = pc.child_id AND c.family_id = $2
     WHERE pc.parent_id = $1
       AND pc.role = 'primary'
       AND pc.revoked_at IS NULL
     LIMIT 1`,
    [parentId, familyId]
  );
  return r.rows.length > 0;
}

/**
 * Whether caller may PUT /members/:targetId/children.
 * Self-update allowed; changing another member requires primary family admin.
 */
async function assertCanUpdateMemberChildren(callerId, targetMemberId, familyId) {
  if (callerId === targetMemberId) {
    return { ok: true };
  }
  const isPrimary = await callerIsPrimaryFamilyAdmin(callerId, familyId);
  if (!isPrimary) {
    return { ok: false, code: 'FORBIDDEN', message: 'Endast familjens huvudförälder kan ändra andra vuxnas barnåtkomst' };
  }
  return { ok: true };
}

/**
 * After updating target parent's child list, every child in the family must still
 * have at least one active primary or shared adult.
 *
 * @param {import('pg').PoolClient} client
 */
async function assertNoChildWithoutAdmin(client, familyId, targetParentId, newChildIdsForTarget) {
  const childrenRes = await client.query(
    'SELECT id FROM child WHERE family_id = $1',
    [familyId]
  );
  const targetSet = new Set(newChildIdsForTarget);

  for (const { id: childId } of childrenRes.rows) {
    const linksRes = await client.query(
      `SELECT pc.parent_id, pc.role, pc.revoked_at
       FROM parent_child pc
       WHERE pc.child_id = $1`,
      [childId]
    );
    let adminCount = 0;
    for (const link of linksRes.rows) {
      if (link.revoked_at) continue;
      if (!['primary', 'shared'].includes(link.role)) continue;
      if (link.parent_id === targetParentId) {
        if (targetSet.has(childId)) adminCount += 1;
      } else {
        adminCount += 1;
      }
    }
    if (adminCount < 1) {
      return {
        ok: false,
        code: 'LAST_ADMIN',
        message: 'Varje barn måste ha minst en vuxen med åtkomst',
      };
    }
  }
  return { ok: true };
}

module.exports = {
  callerIsPrimaryFamilyAdmin,
  assertCanUpdateMemberChildren,
  assertNoChildWithoutAdmin,
};
