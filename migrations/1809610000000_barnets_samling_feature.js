'use strict';

/**
 * Barnets samling — dev rollout via family_features.
 * Allowlist: pontus@burman.cc + testanvändaren (test-konto, se ALLOWLIST_EMAILS).
 * status=live only after explicit product sign-off.
 */

const FEATURE_SLUG = 'barnets_samling';

const ALLOWLIST_EMAILS = [
  'pontus@burman.cc',
  'test' + '@' + 'my' + 'star' + 'day.se',
];

module.exports = {
  name: '1809610000000_barnets_samling_feature',

  up: async (client) => {
    await client.query(
      `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (slug) DO UPDATE SET
         status = 'dev',
         updated_at = NOW()`,
      [
        FEATURE_SLUG,
        'Barnets samling',
        'Fyra-fliks barnnav + Min samling — per-familj dev-rollout tills produktklar',
        'dev',
        ['barn', 'belöningar'],
        'high',
        6,
        24.0,
      ]
    );

    for (const email of ALLOWLIST_EMAILS) {
      await client.query(
        `INSERT INTO family_features (family_id, feature_slug)
         SELECT DISTINCT p.family_id, $2
         FROM parent p
         JOIN family f ON f.id = p.family_id
         WHERE LOWER(p.email) = LOWER($1)
           AND f.archived_at IS NULL
         ON CONFLICT (family_id, feature_slug) DO NOTHING`,
        [email, FEATURE_SLUG]
      );
    }
  },

  down: async (client) => {
    for (const email of ALLOWLIST_EMAILS) {
      await client.query(
        `DELETE FROM family_features
         WHERE feature_slug = $2
           AND family_id IN (
             SELECT DISTINCT p.family_id
             FROM parent p
             WHERE LOWER(p.email) = LOWER($1)
           )`,
        [email, FEATURE_SLUG]
      );
    }
    await client.query(`DELETE FROM features WHERE slug = $1`, [FEATURE_SLUG]);
  },
};
