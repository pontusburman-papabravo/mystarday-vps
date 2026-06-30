'use strict';

const REGISTRY_SEED = require('../config/journey-experience-registry.json');

const CALIBRATION_EXPERIENCES = [
  ['BUILDING_ROUTINE', 'fm_day8_bridge', 'whisper', '', 'Första veckan är gjord. Ni leder nu — vi håller tyst.', ''],
  ['BUILDING_ROUTINE', 'fm_week4_presence', 'whisper', '', 'Ni har det.', ''],
];

module.exports = {
  name: '1809110000000_first_month_calibration',

  up: async (client) => {
    const version = REGISTRY_SEED.version || '2026-06-30-first-month-v1';
    for (const row of CALIBRATION_EXPERIENCES) {
      await client.query(
        `INSERT INTO journey_experience_registry
           (version, phase, experience_key, tone, headline, body, cta)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (version, phase, experience_key, locale) DO UPDATE
           SET tone = EXCLUDED.tone, headline = EXCLUDED.headline,
               body = EXCLUDED.body, cta = EXCLUDED.cta, is_active = true`,
        [version, ...row]
      );
    }
  },

  down: async (client) => {
    const version = REGISTRY_SEED.version || '2026-06-30-first-month-v1';
    const keys = CALIBRATION_EXPERIENCES.map((r) => r[1]);
    await client.query(
      `DELETE FROM journey_experience_registry
       WHERE version = $1 AND experience_key = ANY($2::text[])`,
      [version, keys]
    );
  },
};
