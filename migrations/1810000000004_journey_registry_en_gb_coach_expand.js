'use strict';

/**
 * Upgrade en-GB journey_experience_registry rows for databases that already ran
 * 1810000000003 before coach_expand (or any current experience) was present.
 * Re-upserts all en-GB copy from the shared config source — idempotent.
 */

const REGISTRY_SEED = require('../config/journey-experience-registry.json');
const EN_TRANSLATIONS = require('../config/journey-en-GB-translations');

module.exports = {
  name: '1810000000004_journey_registry_en_gb_coach_expand',

  up: async (client) => {
    const version = REGISTRY_SEED.version || '2026-06-30-first-week-v1';

    for (const [phase, experiences] of Object.entries(REGISTRY_SEED.phases || {})) {
      for (const [experienceKey, exp] of Object.entries(experiences)) {
        const tr = EN_TRANSLATIONS[experienceKey];
        const headline = tr ? tr[0] : exp.headline;
        const body = tr ? tr[1] : exp.body;
        const cta = tr ? tr[2] : exp.cta;

        await client.query(
          `INSERT INTO journey_experience_registry
             (version, phase, experience_key, tone, headline, body, cta, locale, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'en-GB', true)
           ON CONFLICT (version, phase, experience_key, locale) DO UPDATE
             SET tone = EXCLUDED.tone, headline = EXCLUDED.headline,
                 body = EXCLUDED.body, cta = EXCLUDED.cta, is_active = true`,
          [version, phase, experienceKey, exp.tone, headline, body, cta]
        );
      }
    }
  },

  down: async (client) => {
    const version = REGISTRY_SEED.version || '2026-06-30-first-week-v1';
    await client.query(
      `DELETE FROM journey_experience_registry
       WHERE locale = 'en-GB' AND version = $1 AND experience_key = 'coach_expand'`,
      [version]
    );
  },
};
