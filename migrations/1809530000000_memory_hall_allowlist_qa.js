'use strict';

/**
 * Minnesrummet — QA test family allowlist (G6 / HRC-FLAG-MH).
 * Enables memory_hall_playable for App Store review account only.
 * See docs/qa-test-account.md
 */

const QA_PARENT_EMAIL = 'review' + '@' + 'my' + 'star' + 'day.se';

module.exports = {
  name: '1809530000000_memory_hall_allowlist_qa',

  up: async (client) => {
    await client.query(
      `INSERT INTO family_features (family_id, feature_slug)
       SELECT DISTINCT p.family_id, 'memory_hall_playable'
       FROM parent p
       JOIN family f ON f.id = p.family_id
       WHERE LOWER(p.email) = LOWER($1)
         AND f.archived_at IS NULL
       ON CONFLICT (family_id, feature_slug) DO NOTHING`,
      [QA_PARENT_EMAIL]
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
      [QA_PARENT_EMAIL]
    );
  },
};
