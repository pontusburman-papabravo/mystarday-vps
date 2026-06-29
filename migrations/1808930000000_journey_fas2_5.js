'use strict';

const REGISTRY_SEED = require('../config/journey-experience-registry.json');

const FAS2_5_FLAGS = [
  ['family_journey_registry_v2', 'Family Journey Fas 2 — DB experience registry'],
  ['family_journey_handoff_v2', 'Family Journey Fas 2 — Context-only handoff banner'],
  ['family_journey_parent_ack_v1', 'Family Journey Fas 2 — parent ack without activation program'],
  ['activation_program_new_enrollments', 'Activation program — allow new enrollments (OFF = sunset +1)'],
  ['family_journey_coach_v1', 'Family Journey Fas 3 — Hem coach from Context'],
  ['family_journey_established_phase', 'Family Journey Fas 3 — ESTABLISHED_ROUTINE transition'],
  ['family_journey_engine_shadow', 'Family Journey Fas 3 — Engine vs Context shadow log'],
  ['activation_program_api_deprecated', 'Family Journey Fas 4 — program API returns 410'],
  ['activation_program_ui_removed', 'Family Journey Fas 4 — remove program UI assets'],
  ['family_journey_expanding_phase', 'Family Journey Fas 5 — EXPANDING phase'],
  ['family_journey_independence_phase', 'Family Journey Fas 5 — INDEPENDENCE phase'],
  ['family_journey_push_v1', 'Family Journey Fas 5 — push driven by Context'],
  ['family_journey_add_child_v1', 'Family Journey Fas 5 — add-child handoff via Context'],
];

const ONCE_SCOPED = [
  'established_routine', 'child_self_sufficient_week', 'second_child_created', 'coparent_joined',
];

module.exports = {
  name: '1808930000000_journey_fas2_5',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family_milestones
        ADD COLUMN IF NOT EXISTS scope_key VARCHAR(64) NOT NULL DEFAULT ''
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_milestones_scoped_once
        ON family_milestones (family_id, milestone, scope_key)
        WHERE milestone IN (
          'child_logged_in', 'handoff_started', 'handoff_deferred',
          'established_routine', 'child_self_sufficient_week',
          'second_child_created', 'coparent_joined', 'parent_saw_completion'
        )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS journey_experience_registry (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        version         VARCHAR(32) NOT NULL,
        phase           VARCHAR(32) NOT NULL,
        experience_key  VARCHAR(64) NOT NULL,
        tone            VARCHAR(32) NOT NULL,
        headline        TEXT NOT NULL,
        body            TEXT,
        cta             TEXT,
        locale          VARCHAR(8) NOT NULL DEFAULT 'sv',
        is_active       BOOLEAN NOT NULL DEFAULT true,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (version, phase, experience_key, locale)
      )
    `);

    const version = REGISTRY_SEED.version || '2026-06-28-v1';
    for (const [phase, experiences] of Object.entries(REGISTRY_SEED.phases || {})) {
      for (const [key, exp] of Object.entries(experiences)) {
        await client.query(
          `INSERT INTO journey_experience_registry
             (version, phase, experience_key, tone, headline, body, cta)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (version, phase, experience_key, locale) DO NOTHING`,
          [version, phase, key, exp.tone, exp.headline, exp.body || null, exp.cta || null]
        );
      }
    }

    // Fas 3+ coach experiences
    const coachSeed = [
      ['BUILDING_ROUTINE', 'coach_consistency', 'coach', 'Bygg vanan', 'Barnet är igång — håll rutinen lätt och rolig den här veckan.', 'Visa tips'],
      ['BUILDING_ROUTINE', 'coach_evening', 'coach', 'Kvällsrutin?', 'Familjer som lägger till en enkel kvällsrutin får oftast stabilare dagar.', 'Utforska'],
      ['ESTABLISHED_ROUTINE', 'coach_expand', 'coach', 'Ni har kommit in i flytet', 'Rutinen sitter. Utforska nya belöningar eller bjud in en medförälder.', 'Fortsätt'],
      ['EXPANDING', 'handoff_to_child', 'coach', 'Nytt barn — dags att börja', 'Låt barnet logga in med namn och PIN.', 'Låt barnet börja'],
      ['FIRST_USE', 'parent_ack_completion', 'coach', 'Barnet klarade en aktivitet!', 'Bekräfta så ni firar första framgången tillsammans.', 'Visa'],
      ['BUILDING_ROUTINE', 'celebrate_first_success', 'celebration', 'Första stjärnan är klar!', 'Barnet har klarat sin första aktivitet — och du såg det.', 'Toppen!'],
      ['FIRST_USE', 'handoff_to_child', 'coach', 'Nu är det barnets tur!', 'Låt barnet logga in med namn och PIN.', 'Låt barnet börja'],
      ['BUILDING_ROUTINE', 'push_handoff_reminder', 'coach', 'Påminnelse', 'Barnet väntar på att börja i appen.', null],
      ['BUILDING_ROUTINE', 'push_coach_nudge', 'coach', 'Fortsätt rutinen', 'Små steg varje dag ger starka vanor.', null],
    ];
    for (const row of coachSeed) {
      await client.query(
        `INSERT INTO journey_experience_registry
           (version, phase, experience_key, tone, headline, body, cta)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (version, phase, experience_key, locale) DO NOTHING`,
        [version, ...row]
      );
    }

    for (const [key, description] of FAS2_5_FLAGS) {
      const defaultEnabled = key === 'activation_program_new_enrollments';
      await client.query(
        `INSERT INTO feature_flag (key, enabled, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING`,
        [key, defaultEnabled, description]
      );
    }
  },

  down: async (client) => {
    const keys = FAS2_5_FLAGS.map(([k]) => k);
    await client.query('DELETE FROM feature_flag WHERE key = ANY($1::text[])', [keys]);
    await client.query('DROP TABLE IF EXISTS journey_experience_registry');
    await client.query('DROP INDEX IF EXISTS idx_family_milestones_scoped_once');
    await client.query('ALTER TABLE family_milestones DROP COLUMN IF EXISTS scope_key');
  },
};
