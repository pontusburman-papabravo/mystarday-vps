'use strict';

const REGISTRY_SEED = require('../config/journey-experience-registry.json');

const FIRST_MONTH_EXPERIENCES = [
  ['BUILDING_ROUTINE', 'fm_welcome_back', 'affirmation', 'Välkommen tillbaka', 'Semestern är över — rutinen finns kvar när ni är redo. Ingen stress.', 'Okej'],
  ['BUILDING_ROUTINE', 'fm_own_initiative', 'affirmation', 'Er egen rutin', 'Ni har skapat något som passar er familj. Det är precis så det ska vara.', 'Visa schemat'],
  ['BUILDING_ROUTINE', 'fm_calm_week', 'affirmation', 'En lugn vecka', 'Ni har hittat en rytm som fungerar — utan att jaga något.', 'Okej'],
  ['BUILDING_ROUTINE', 'fm_coparent_roots', 'affirmation', 'Ni gör det tillsammans', 'När fler vuxna är med blir vardagen lättare — inte mer komplicerad.', 'Okej'],
  ['BUILDING_ROUTINE', 'fm_child_explores', 'coach', 'Barnet utforskar själv', 'Stjärnvärlden växer när barnet leder. Du behöver inte styra.', 'Se barnupplevelsen'],
  ['BUILDING_ROUTINE', 'fm_morning_flows', 'affirmation', 'Morgonen flyter på', 'Barnet klarar morgonen i sin egen takt. Det är en riktig förändring.', 'Okej'],
  ['BUILDING_ROUTINE', 'fm_sibling_moment', 'affirmation', 'Syskon tillsammans', 'När barnen hittar sin egen rytm tillsammans — det är vardagsmagi.', 'Okej'],
  ['BUILDING_ROUTINE', 'fm_tradition', 'affirmation', 'Er tradition', 'Ni har något som återkommer — en liten ritual som är er.', 'Okej'],
  ['BUILDING_ROUTINE', 'fm_month_affirmation', 'reflection', 'Er vardag', null, 'Stäng'],
];

module.exports = {
  name: '1809100000000_journey_first_month',

  up: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_family_milestones_once');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_milestones_once
        ON family_milestones (family_id, milestone)
        WHERE milestone IN (
          'account_created', 'child_created', 'routine_ready', 'rewards_ready',
          'first_success', 'week_reflection_completed', 'month_reflection_completed'
        )
    `);

    const version = REGISTRY_SEED.version || '2026-06-30-first-month-v1';
    for (const row of FIRST_MONTH_EXPERIENCES) {
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
      ['family_journey_first_month_v1', 'Family Journey — first month experience (dag 8–30 efter first_success)']
    );
  },

  down: async (client) => {
    await client.query(
      "DELETE FROM feature_flag WHERE key = 'family_journey_first_month_v1'"
    );
    const version = REGISTRY_SEED.version || '2026-06-30-first-month-v1';
    const keys = FIRST_MONTH_EXPERIENCES.map((r) => r[1]);
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
          'account_created', 'child_created', 'routine_ready', 'rewards_ready',
          'first_success', 'week_reflection_completed'
        )
    `);
  },
};
