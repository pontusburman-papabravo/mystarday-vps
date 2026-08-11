/**
 * Parent-child access layer.
 * Owns: revoked_at filtering, role derivation, account_type sync.
 * Does NOT own: child table, parent table, other auth logic.
 *
 * All queries to parent_child use revoked_at IS NULL by default.
 * This file is the ONLY place that filters on revoked_at.
 */

const db = require('../src/lib/db');

/**
 * Derive the effective account_type for a parent.
 * Returns { hasPrimaryOrShared, hasPedagogOnly, pedagogChildIds[], isDualRole }.
 */
async function getParentRoles(parentId) {
  const result = await db.query(`
    SELECT pc.role, pc.child_id
    FROM parent_child pc
    WHERE pc.parent_id = $1 AND pc.revoked_at IS NULL
  `, [parentId]);

  const rows = result.rows;
  return {
    hasPrimaryOrShared: rows.some(r => ['primary', 'shared'].includes(r.role)),
    hasPedagogOnly: rows.length > 0 && rows.every(r => r.role === 'pedagog'),
    pedagogChildIds: rows.filter(r => r.role === 'pedagog').map(r => r.child_id),
    isDualRole:
      rows.some(r => ['primary', 'shared'].includes(r.role)) &&
      rows.some(r => r.role === 'pedagog'),
  };
}

/**
 * Get children for a parent, filtered by allowed roles.
 * This is the ONLY supported path for retrieving parent's children.
 *
 * @param {string} parentId
 * @param {{ allowedRoles: string[] }} options
 */
async function getChildrenForParent(parentId, options = { allowedRoles: ['primary', 'shared'] }) {
  const { allowedRoles } = options;
  const result = await db.query(`
    SELECT c.*, pc.role
    FROM child c
    JOIN parent_child pc ON pc.child_id = c.id
    WHERE pc.parent_id = $1
      AND pc.role = ANY($2)
      AND pc.revoked_at IS NULL
    ORDER BY c.sort_order ASC, c.created_at ASC
  `, [parentId, allowedRoles]);
  return result.rows;
}

/**
 * Get child IDs for pedagogen role only.
 */
async function getPedagogChildIds(parentId) {
  const result = await db.query(`
    SELECT c.id
    FROM child c
    JOIN parent_child pc ON pc.child_id = c.id
    WHERE pc.parent_id = $1
      AND pc.role = 'pedagog'
      AND pc.revoked_at IS NULL
  `, [parentId]);
  return result.rows.map(r => r.id);
}

/**
 * Sync account_type on parent based on current roles.
 * Returns the new account_type.
 * Call this after any parent_child insert/delete/revoke.
 */
async function syncAccountType(parentId) {
  const { hasPrimaryOrShared, pedagogChildIds } = await getParentRoles(parentId);
  const hasPedagog = pedagogChildIds.length > 0;

  let accountType = 'family';
  if (hasPrimaryOrShared && hasPedagog) accountType = 'dual';
  else if (!hasPrimaryOrShared && hasPedagog) accountType = 'educator';

  await db.query(
    'UPDATE parent SET account_type = $2 WHERE id = $1',
    [parentId, accountType]
  );
  return accountType;
}

/**
 * Verify parent has an active (non-revoked) link to a child.
 * Returns child row with pc.role or null.
 */
async function getActiveChildAccess(parentId, childId) {
  const result = await db.query(
    `SELECT c.id, c.family_id, c.timezone, c.birthday, c.name, c.emoji, pc.role
     FROM child c
     JOIN parent_child pc ON pc.child_id = c.id
     WHERE pc.parent_id = $1 AND c.id = $2 AND pc.revoked_at IS NULL`,
    [parentId, childId]
  );
  return result.rows[0] || null;
}

const TRUSTED_DEVICE_PARENT_ROLES = ['primary', 'shared'];

/**
 * Adults eligible for Netflix-style profile picker on a family trusted device.
 * Requires an active primary/shared parent_child link (pedagog-only excluded).
 */
async function getAllowedParentsForFamilyDevice(familyId) {
  const result = await db.query(
    `SELECT p.id, p.family_id, p.email, p.name, p.avatar_storage_key, p.avatar_updated_at
     FROM parent p
     WHERE p.family_id = $1
       AND p.is_admin = false
       AND p.parent_pin_hash IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM parent_child pc
         WHERE pc.parent_id = p.id
           AND pc.revoked_at IS NULL
           AND pc.role = ANY($2::text[])
       )
     ORDER BY p.created_at ASC`,
    [familyId, TRUSTED_DEVICE_PARENT_ROLES]
  );
  return result.rows;
}

/**
 * Verify a parent may be selected on a trusted family device profile picker.
 */
async function isParentEligibleForFamilyDevice(parentId, familyId) {
  const result = await db.query(
    `SELECT p.id
     FROM parent p
     INNER JOIN parent_child pc ON pc.parent_id = p.id
     WHERE p.id = $1
       AND p.family_id = $2
       AND p.is_admin = false
       AND p.parent_pin_hash IS NOT NULL
       AND pc.revoked_at IS NULL
       AND pc.role = ANY($3::text[])
     LIMIT 1`,
    [parentId, familyId, TRUSTED_DEVICE_PARENT_ROLES]
  );
  return Boolean(result.rows[0]);
}

module.exports = {
  getParentRoles,
  getChildrenForParent,
  getPedagogChildIds,
  syncAccountType,
  getActiveChildAccess,
  getAllowedParentsForFamilyDevice,
  isParentEligibleForFamilyDevice,
  TRUSTED_DEVICE_PARENT_ROLES,
};