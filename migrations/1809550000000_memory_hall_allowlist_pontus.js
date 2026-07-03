'use strict';

/**
 * Minnesrummet — move dev allowlist to Pontus test family (not App Store review account).
 * Pontus already has morgonhus_playable + garden_playable (migrations 180913, 180915).
 * Revokes living-world flags from review@ App Store account added in 180953/180954.
 */

const DEV_PARENT_EMAIL = 'Pontus@burman.cc';
const REVIEW_PARENT_EMAIL = 'review' + '@' + 'my' + 'star' + 'day.se';
const LIVING_WORLD_FLAGS = ['morgonhus_playable', 'garden_playable', 'memory_hall_playable'];

module.exports = {
  name: '1809550000000_memory_hall_allowlist_pontus',

  up: async (client) => {
    await client.query(
      `INSERT INTO family_features (family_id, feature_slug)
       SELECT DISTINCT p.family_id, 'memory_hall_playable'
       FROM parent p
       JOIN family f ON f.id = p.family_id
       WHERE LOWER(p.email) = LOWER($1)
         AND f.archived_at IS NULL
       ON CONFLICT (family_id, feature_slug) DO NOTHING`,
      [DEV_PARENT_EMAIL]
    );

    await client.query(
      `DELETE FROM family_features
       WHERE feature_slug = ANY($2::text[])
         AND family_id IN (
           SELECT DISTINCT p.family_id
           FROM parent p
           WHERE LOWER(p.email) = LOWER($1)
         )`,
      [REVIEW_PARENT_EMAIL, LIVING_WORLD_FLAGS]
    );
  },

  down: async (client) => {
    await client.query(
      `DELETE FROM family_features
       WHERE feature_slug = 'memory_hall_playable'
         AND family_id IN (
           SELECT DISTINCT p.family_id
           FROM parent p
           WHERE LOWER(p.email) = LOWER($1)
         )`,
      [DEV_PARENT_EMAIL]
    );

    for (const slug of LIVING_WORLD_FLAGS) {
      await client.query(
        `INSERT INTO family_features (family_id, feature_slug)
         SELECT DISTINCT p.family_id, $2
         FROM parent p
         JOIN family f ON f.id = p.family_id
         WHERE LOWER(p.email) = LOWER($1)
           AND f.archived_at IS NULL
         ON CONFLICT (family_id, feature_slug) DO NOTHING`,
        [REVIEW_PARENT_EMAIL, slug]
      );
    }
  },
};
