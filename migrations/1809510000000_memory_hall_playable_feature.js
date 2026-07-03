'use strict';

/**
 * Memory Hall (world 3) — feature registration only.
 * Dev status, NO family allowlist — reversible scaffold (BL-029 / HRC-adjacent).
 */

module.exports = {
  name: '1809510000000_memory_hall_playable_feature',

  up: async (client) => {
    await client.query(
      `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (slug) DO UPDATE SET
         status = 'dev',
         updated_at = NOW()`,
      [
        'memory_hall_playable',
        'Minneshallen (spelbar, scaffold)',
        'World 3 scaffold — pack scene + API; creative direction blocked BL-012',
        'dev',
        ['barn', 'belöningar'],
        'medium',
        4,
        8.0,
      ]
    );
  },

  down: async (client) => {
    await client.query(
      `DELETE FROM family_features WHERE feature_slug = 'memory_hall_playable'`
    );
    await client.query(
      `DELETE FROM features WHERE slug = 'memory_hall_playable'`
    );
  },
};
