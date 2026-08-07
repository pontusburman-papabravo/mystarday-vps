'use strict';

const db = require('./db');

async function callerPrimaryChildIds(client, parentId, familyId) {
  const r = await client.query(
    `SELECT pc.child_id
     FROM parent_child pc
     INNER JOIN child c ON c.id = pc.child_id AND c.family_id = $2
     WHERE pc.parent_id = $1
       AND pc.role = 'primary'
       AND pc.revoked_at IS NULL`,
    [parentId, familyId]
  );
  return new Set(r.rows.map((row) => row.child_id));
}

async function callerAdminChildIds(client, parentId, familyId) {
  const r = await client.query(
    `SELECT pc.child_id
     FROM parent_child pc
     INNER JOIN child c ON c.id = pc.child_id AND c.family_id = $2
     WHERE pc.parent_id = $1
       AND pc.role IN ('primary', 'shared')
       AND pc.revoked_at IS NULL`,
    [parentId, familyId]
  );
  return new Set(r.rows.map((row) => row.child_id));
}

/**
 * Parent with at least one active primary link in the family.
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
 * Whether caller may PUT /members/:targetId/children (endpoint entry).
 */
async function assertCanUpdateMemberChildren(callerId, targetMemberId, familyId) {
  if (callerId === targetMemberId) {
    return { ok: true };
  }
  const isPrimary = await callerIsPrimaryFamilyAdmin(callerId, familyId);
  if (!isPrimary) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: 'Endast familjens huvudförälder kan ändra andra vuxnas barnåtkomst',
    };
  }
  return { ok: true };
}

/**
 * Child-by-child authorization for link deltas (Model 1 — reject whole request).
 * @param {import('pg').PoolClient} client
 */
async function assertAuthorizedChildLinkDelta(client, callerId, familyId, targetMemberId, desiredChildIds) {
  const desiredSet = new Set(desiredChildIds);
  const currentRes = await client.query(
    `SELECT child_id FROM parent_child
     WHERE parent_id = $1 AND revoked_at IS NULL`,
    [targetMemberId]
  );
  const currentIds = currentRes.rows.map((r) => r.child_id);
  const currentSet = new Set(currentIds);

  const added = desiredChildIds.filter((id) => !currentSet.has(id));
  const removed = currentIds.filter((id) => !desiredSet.has(id));

  if (callerId === targetMemberId) {
    const adminIds = await callerAdminChildIds(client, callerId, familyId);
    for (const childId of added) {
      if (!adminIds.has(childId)) {
        return {
          ok: false,
          code: 'FORBIDDEN',
          message: 'Du kan bara ge åtkomst till barn du själv administrerar',
        };
      }
    }
    return { ok: true };
  }

  const primaryIds = await callerPrimaryChildIds(client, callerId, familyId);
  for (const childId of [...added, ...removed]) {
    if (!primaryIds.has(childId)) {
      return {
        ok: false,
        code: 'FORBIDDEN',
        message: 'Du kan bara ändra kopplingar för barn där du är huvudförälder',
      };
    }
  }
  return { ok: true };
}

/**
 * Lock parent_child rows for affected children (deterministic order).
 * @param {import('pg').PoolClient} client
 */
async function lockParentChildRowsForChildren(client, childIds) {
  const sorted = [...new Set(childIds)].sort();
  if (sorted.length === 0) return;
  await client.query(
    `SELECT parent_id, child_id FROM parent_child
     WHERE child_id = ANY($1::uuid[])
     ORDER BY child_id, parent_id
     FOR UPDATE`,
    [sorted]
  );
}

/**
 * After updating target parent's child list, every child must still have an admin.
 * Allows recovery when legacy state left a child with zero admins.
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
    let projectedAdminCount = 0;
    for (const link of linksRes.rows) {
      if (link.revoked_at) continue;
      if (!['primary', 'shared'].includes(link.role)) continue;
      if (link.parent_id === targetParentId) {
        if (targetSet.has(childId)) projectedAdminCount += 1;
      } else {
        projectedAdminCount += 1;
      }
    }
    if (projectedAdminCount >= 1) continue;
    return {
      ok: false,
      code: 'LAST_ADMIN',
      message: 'Varje barn måste ha minst en vuxen med åtkomst',
    };
  }
  return { ok: true };
}

module.exports = {
  callerIsPrimaryFamilyAdmin,
  assertCanUpdateMemberChildren,
  assertAuthorizedChildLinkDelta,
  lockParentChildRowsForChildren,
  assertNoChildWithoutAdmin,
};
