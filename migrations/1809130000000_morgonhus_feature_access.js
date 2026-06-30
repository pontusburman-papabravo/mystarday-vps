'use strict';

/**
 * Morgonhuset — migrate from global feature_flag to features/family_features.
 * - Registers morgonhus_playable (dev) in features table
 * - Removes legacy global kill switch (prevents accidental global rollout)
 * - Seeds Pontus test families on allowlist
 */

module.exports = {
  name: '1809130000000_morgonhus_feature_access',

  up: async (client) => {
    await client.query(
      `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (slug) DO NOTHING`,
      [
        'morgonhus_playable',
        'Morgonhuset (spelbart)',
        'Första spelbara Morgonhuset-scenen i barnets Min värld — per-familj dev-rollout',
        'dev',
        ['barn', 'belöningar'],
        'high',
        5,
        12.0,
      ]
    );

    await client.query(
      `INSERT INTO family_features (family_id, feature_slug)
       SELECT f.id, 'morgonhus_playable'
       FROM family f
       WHERE f.archived_at IS NULL
         AND f.name ILIKE '%pontus%'
       ON CONFLICT (family_id, feature_slug) DO NOTHING`
    );

    await client.query(
      `DELETE FROM feature_flag WHERE key = 'morgonhus_playable_v1'`
    );
  },

  down: async (client) => {
    await client.query(
      `DELETE FROM family_features WHERE feature_slug = 'morgonhus_playable'`
    );
    await client.query(
      `DELETE FROM features WHERE slug = 'morgonhus_playable'`
    );
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      [
        'morgonhus_playable_v1',
        'Morgonhuset — first playable morning house scene for child Min värld (default OFF)',
      ]
    );
  },
};
