/**
 * Föräldralås: unik PIN per vuxen (parent.parent_pin_hash), inte längre per familj.
 * Kopierar befintlig family.parent_pin_hash till alla vuxna i familjen som utgångspunkt.
 */
module.exports = {
  name: '1794000000000_parent_pin_per_adult',

  up: async (client) => {
    await client.query(`
      ALTER TABLE parent
      ADD COLUMN IF NOT EXISTS parent_pin_hash TEXT
    `);

    // Fresh installs (baseline-schema): parent_pin_hash already on parent, never on family.
    const { rows } = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'family'
        AND column_name = 'parent_pin_hash'
    `);
    if (rows.length === 0) return;

    await client.query(`
      UPDATE parent p
      SET parent_pin_hash = f.parent_pin_hash
      FROM family f
      WHERE p.family_id = f.id
        AND f.parent_pin_hash IS NOT NULL
        AND p.parent_pin_hash IS NULL
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE parent
      DROP COLUMN IF EXISTS parent_pin_hash
    `);
  },
};
