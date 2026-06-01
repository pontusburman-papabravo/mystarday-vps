/**
 * Idempotent: child.sort_order column + missing parent_child links for same-family parents.
 */
module.exports = {
  name: '1792000000000_child_sort_order_and_parent_child_backfill',

  up: async (client) => {
    await client.query(`
      ALTER TABLE child
      ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0
    `);

    await client.query(`
      INSERT INTO parent_child (parent_id, child_id, role)
      SELECT p.id, c.id,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM parent_child pc0
            WHERE pc0.child_id = c.id
              AND pc0.role = 'primary'
              AND pc0.revoked_at IS NULL
          ) THEN 'shared'
          ELSE 'primary'
        END
      FROM child c
      INNER JOIN parent p ON p.family_id = c.family_id
      WHERE NOT EXISTS (
        SELECT 1 FROM parent_child pc
        WHERE pc.parent_id = p.id AND pc.child_id = c.id
      )
    `);
  },
};
