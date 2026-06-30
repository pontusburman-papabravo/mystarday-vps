'use strict';

/**
 * Trädgården — seed Pontus test family for garden_playable dev rollout.
 */

module.exports = {
  name: '1809150000000_garden_playable_allowlist',

  up: async (client) => {
    await client.query(
      `INSERT INTO family_features (family_id, feature_slug)
       SELECT DISTINCT p.family_id, 'garden_playable'
       FROM parent p
       JOIN family f ON f.id = p.family_id
       WHERE LOWER(p.email) = LOWER($1)
         AND f.archived_at IS NULL
       ON CONFLICT (family_id, feature_slug) DO NOTHING`,
      ['Pontus@burman.cc']
    );
  },

  down: async (client) => {
    await client.query(
      `DELETE FROM family_features
       WHERE feature_slug = 'garden_playable'
         AND family_id IN (
           SELECT DISTINCT p.family_id
           FROM parent p
           WHERE LOWER(p.email) = LOWER($1)
         )`,
      ['Pontus@burman.cc']
    );
  },
};
