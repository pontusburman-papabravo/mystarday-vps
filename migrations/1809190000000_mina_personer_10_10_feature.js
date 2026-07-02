'use strict';

/**
 * Mina personer 10/10 — dev rollout via family_features.
 * Seeds Pontus test family (pontus@burman.cc) only until mobile Olle-test → status=live.
 */

module.exports = {
  name: '1809190000000_mina_personer_10_10_feature',

  up: async (client) => {
    await client.query(
      `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (slug) DO UPDATE SET
         status = 'dev',
         updated_at = NOW()`,
      [
        'mina_personer_10_10',
        'Mina personer 10/10',
        'Barnets relationsvy med resolveFamilyState — per-familj dev-rollout',
        'dev',
        ['barn', 'familj'],
        'high',
        4,
        8.0,
      ]
    );

    await client.query(
      `INSERT INTO family_features (family_id, feature_slug)
       SELECT DISTINCT p.family_id, 'mina_personer_10_10'
       FROM parent p
       JOIN family f ON f.id = p.family_id
       WHERE LOWER(p.email) = LOWER($1)
         AND f.archived_at IS NULL
       ON CONFLICT (family_id, feature_slug) DO NOTHING`,
      ['pontus@burman.cc']
    );
  },

  down: async (client) => {
    await client.query(
      `DELETE FROM family_features
       WHERE feature_slug = 'mina_personer_10_10'
         AND family_id IN (
           SELECT DISTINCT p.family_id
           FROM parent p
           WHERE LOWER(p.email) = LOWER($1)
         )`,
      ['pontus@burman.cc']
    );
    await client.query(`DELETE FROM features WHERE slug = 'mina_personer_10_10'`);
  },
};
