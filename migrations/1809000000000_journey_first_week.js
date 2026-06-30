'use strict';

const REGISTRY_SEED = require('../config/journey-experience-registry.json');

const FIRST_WEEK_EXPERIENCES = [
  ['BUILDING_ROUTINE', 'fw_day1_morning', 'coach', 'God morgon', 'Schemat ligger redo. Låt barnet logga in och börja dagen i sin egen takt.', 'Visa barnet'],
  ['BUILDING_ROUTINE', 'fw_day1_evening', 'coach', 'En lugn kväll', 'En enkel kvällsrutin gör morgondagen lättare. Kika tillsammans på vad som väntar.', 'Till kvällen'],
  ['BUILDING_ROUTINE', 'fw_day2_quiet', 'coach', 'Barnet hittar rytmen', 'Ni behöver inte göra så mycket nu — låt barnet leda.', 'Visa barnupplevelsen'],
  ['BUILDING_ROUTINE', 'fw_day3_new_day', 'coach', 'Imorgon är en ny dag', 'Igår blev det inte som planerat — det är helt okej. Rutinen finns kvar när ni är redo.', 'Okej'],
  ['BUILDING_ROUTINE', 'fw_day4_discovery', 'coach', 'Något nytt i världen', 'Barnet har hittat något nytt i stjärnvärlden — helt på egen hand.', 'Se vad som hänt'],
  ['BUILDING_ROUTINE', 'fw_week_reflection', 'reflection', 'En vecka tillsammans', null, 'Stäng'],
];

module.exports = {
  name: '1809000000000_journey_first_week',

  up: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_family_milestones_once');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_milestones_once
        ON family_milestones (family_id, milestone)
        WHERE milestone IN (
          'account_created', 'child_created', 'routine_ready', 'rewards_ready',
          'first_success', 'week_reflection_completed'
        )
    `);

    const version = REGISTRY_SEED.version || '2026-06-30-first-week-v1';
    for (const row of FIRST_WEEK_EXPERIENCES) {
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

    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      ['family_journey_first_week_v1', 'Family Journey — first week experience (dag 1–7 efter first_success)']
    );
  },

  down: async (client) => {
    await client.query(
      "DELETE FROM feature_flag WHERE key = 'family_journey_first_week_v1'"
    );
    const version = REGISTRY_SEED.version || '2026-06-30-first-week-v1';
    const keys = FIRST_WEEK_EXPERIENCES.map((r) => r[1]);
    await client.query(
      `DELETE FROM journey_experience_registry
       WHERE version = $1 AND experience_key = ANY($2::text[])`,
      [version, keys]
    );
    await client.query('DROP INDEX IF EXISTS idx_family_milestones_once');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_milestones_once
        ON family_milestones (family_id, milestone)
        WHERE milestone IN (
          'account_created', 'child_created', 'routine_ready', 'rewards_ready', 'first_success'
        )
    `);
  },
};
