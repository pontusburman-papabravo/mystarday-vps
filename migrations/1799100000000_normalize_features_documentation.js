'use strict';

/**
 * Normalize documentation.acceptance_criteria string → string[] for admin UI.
 */

module.exports = {
  name: 'normalize_features_documentation',
  up: async (client) => {
    await client.query(`
      UPDATE features
      SET documentation = jsonb_set(
        documentation,
        '{acceptance_criteria}',
        CASE
          WHEN position(E'\\n' in documentation->>'acceptance_criteria') > 0
            THEN to_jsonb(regexp_split_to_array(documentation->>'acceptance_criteria', E'\\n+'))
          ELSE jsonb_build_array(documentation->>'acceptance_criteria')
        END,
        true
      ),
      updated_at = NOW()
      WHERE documentation IS NOT NULL
        AND jsonb_typeof(documentation->'acceptance_criteria') = 'string'
        AND (documentation->>'acceptance_criteria') IS NOT NULL
        AND (documentation->>'acceptance_criteria') <> ''
    `);

    await client.query(`
      UPDATE features
      SET documentation = documentation - 'dev_notes' - 'changelog',
          updated_at = NOW()
      WHERE documentation ? 'dev_notes' OR documentation ? 'changelog'
    `);
  },
};
