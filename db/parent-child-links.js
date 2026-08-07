'use strict';

/**
 * Update active parent_child links (soft revoke for removed children).
 */

/**
 * @param {import('pg').PoolClient} client
 * @param {string} parentId
 * @param {string[]} childIds — must be non-empty
 * @param {{ revokedBy?: string }} options
 */
async function setActiveChildrenForParent(client, parentId, childIds, options = {}) {
  const revokedBy = options.revokedBy || null;
  const ids = [...new Set(childIds)];

  await client.query(
    `UPDATE parent_child
     SET revoked_at = NOW(), revoked_by = $2
     WHERE parent_id = $1
       AND revoked_at IS NULL
       AND NOT (child_id = ANY($3::uuid[]))`,
    [parentId, revokedBy, ids]
  );

  for (const childId of ids) {
    await client.query(
      `INSERT INTO parent_child (parent_id, child_id, role, revoked_at, revoked_by)
       VALUES ($1, $2, 'shared', NULL, NULL)
       ON CONFLICT (parent_id, child_id) DO UPDATE
       SET revoked_at = NULL, revoked_by = NULL`,
      [parentId, childId]
    );
  }
}

module.exports = { setActiveChildrenForParent };
