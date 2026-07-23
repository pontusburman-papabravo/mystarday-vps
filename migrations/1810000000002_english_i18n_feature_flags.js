'use strict';

/**
 * Per-family English rollout flags (features/family_features).
 * - english_app: parent/auth UI may use en-GB when assigned
 * - english_child_experience: child_en pack (QA only until child UX is complete)
 *
 * Both default OFF globally (status=dev). Remove english_child_experience gate when
 * the English child experience is complete (see docs/i18n-english-plan.md).
 */

const FLAG_SPECS = [
  {
    slug: 'english_app',
    name: 'English app (parent/auth)',
    description: 'Allows en-GB locale for existing families in settings. New registrations may still choose language at signup.',
  },
  {
    slug: 'english_child_experience',
    name: 'English child experience pack',
    description: 'When ON with english_app, runtime may select child_en. When OFF, en-GB families keep child_se for child UX.',
  },
];

module.exports = {
  name: '1810000000002_english_i18n_feature_flags',

  up: async (client) => {
    for (const spec of FLAG_SPECS) {
      await client.query(
        `INSERT INTO features (slug, name, description, status, tags, priority, complexity, estimated_hours)
         VALUES ($1, $2, $3, 'dev', $4, 'high', 5, 8.0)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           status = 'dev',
           updated_at = NOW()`,
        [spec.slug, spec.name, spec.description, ['i18n', 'english']]
      );
    }
  },

  down: async (client) => {
    await client.query(
      `DELETE FROM family_features WHERE feature_slug = ANY($1::text[])`,
      [FLAG_SPECS.map((s) => s.slug)]
    );
    await client.query(
      `DELETE FROM features WHERE slug = ANY($1::text[])`,
      [FLAG_SPECS.map((s) => s.slug)]
    );
  },
};
