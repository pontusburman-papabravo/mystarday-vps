'use strict';

/**
 * Signup film is not needed: slim goes Home, Journey day 1 shows child view.
 * Preview at /onboarding/film-preview stays for QA.
 */

module.exports = {
  name: '1810530000000_disable_onboarding_handoff_film',
  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: false,
    featureFlagEnabledChanges: [
      {
        key: 'activation_onboarding_handoff_film_v1',
        before: true,
        after: false,
      },
    ],
  },

  up: async (client) => {
    await client.query(
      `UPDATE feature_flag
          SET enabled = false,
              description = $2
        WHERE key = $1`,
      [
        'activation_onboarding_handoff_film_v1',
        'OFF — signup film removed from live onboarding (preview-only)',
      ]
    );
  },

  down: async (client) => {
    await client.query(
      `UPDATE feature_flag
          SET enabled = true,
              description = $2
        WHERE key = $1`,
      [
        'activation_onboarding_handoff_film_v1',
        'ACT-1 handoff film after schema save (music + text)',
      ]
    );
  },
};
