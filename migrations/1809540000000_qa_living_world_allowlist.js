'use strict';

/**
 * QA test family — enable living-world path to Minnesrummet (G7 hotfix).
 * Requires morgonhus → garden → memory_hall chain.
 * See docs/qa-test-account.md
 */

const QA_PARENT_EMAIL = 'review' + '@' + 'my' + 'star' + 'day.se';
const QA_LIVING_WORLD_FLAGS = ['morgonhus_playable', 'garden_playable', 'memory_hall_playable'];

module.exports = {
  name: '1809540000000_qa_living_world_allowlist',

  up: async (client) => {
    for (const slug of QA_LIVING_WORLD_FLAGS) {
      await client.query(
        `INSERT INTO family_features (family_id, feature_slug)
         SELECT DISTINCT p.family_id, $2
         FROM parent p
         JOIN family f ON f.id = p.family_id
         WHERE LOWER(p.email) = LOWER($1)
           AND f.archived_at IS NULL
         ON CONFLICT (family_id, feature_slug) DO NOTHING`,
        [QA_PARENT_EMAIL, slug]
      );
    }
  },

  down: async (client) => {
    await client.query(
      `DELETE FROM family_features
       WHERE feature_slug = ANY($2::text[])
         AND family_id IN (
           SELECT DISTINCT p.family_id
           FROM parent p
           WHERE LOWER(p.email) = LOWER($1)
         )`,
      [QA_PARENT_EMAIL, QA_LIVING_WORLD_FLAGS]
    );
  },
};
