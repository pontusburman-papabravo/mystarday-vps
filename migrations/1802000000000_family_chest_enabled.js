/**
 * Option B: parents can disable family chest; story + projects stay on.
 */
module.exports = {
  name: '1802000000000_family_chest_enabled',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family
        ADD COLUMN IF NOT EXISTS family_chest_enabled BOOLEAN NOT NULL DEFAULT true
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE family DROP COLUMN IF EXISTS family_chest_enabled
    `);
  },
};
