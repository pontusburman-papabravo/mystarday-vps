'use strict';

/**
 * Family Journey Fas 1 — journey_phase + family_milestones + feature flags + backfill.
 */

const ONCE_MILESTONES = [
  'account_created',
  'child_created',
  'routine_ready',
  'rewards_ready',
  'first_success',
];

const JOURNEY_FLAGS = [
  ['family_journey_context_api', 'Family Journey — master API kill switch'],
  ['family_journey_onboarding_v1', 'Family Journey — onboarding steps 5–6 handoff CTA'],
  ['family_journey_ingest_enabled', 'Family Journey — milestone ingest kill switch'],
  ['family_journey_evaluator_enabled', 'Family Journey — context evaluator kill switch'],
  ['family_journey_debug_api', 'Family Journey — debug endpoint access'],
];

module.exports = {
  name: '1808920000000_family_journey',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family
        ADD COLUMN IF NOT EXISTS journey_phase VARCHAR(32) NOT NULL DEFAULT 'SETTING_UP'
          CHECK (journey_phase IN (
            'DISCOVERING', 'SETTING_UP', 'FIRST_USE', 'BUILDING_ROUTINE',
            'ESTABLISHED_ROUTINE', 'EXPANDING', 'INDEPENDENCE'
          ))
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_journey_phase ON family (journey_phase)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS family_milestones (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id     UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        milestone     VARCHAR(64) NOT NULL,
        occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        child_id      UUID REFERENCES child(id) ON DELETE SET NULL,
        metadata      JSONB NOT NULL DEFAULT '{}',
        source        VARCHAR(32) NOT NULL DEFAULT 'system'
          CHECK (source IN ('system', 'admin', 'backfill')),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_milestones_family
        ON family_milestones (family_id, milestone, occurred_at DESC)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_family_milestones_once
        ON family_milestones (family_id, milestone)
        WHERE milestone IN (
          'account_created', 'child_created', 'routine_ready', 'rewards_ready', 'first_success'
        )
    `);

    for (const [key, description] of JOURNEY_FLAGS) {
      await client.query(
        `INSERT INTO feature_flag (key, enabled, description)
         VALUES ($1, false, $2)
         ON CONFLICT (key) DO NOTHING`,
        [key, description]
      );
    }

    // Backfill account_created from family.created_at
    await client.query(`
      INSERT INTO family_milestones (family_id, milestone, occurred_at, source)
      SELECT f.id, 'account_created', f.created_at, 'backfill'
      FROM family f
      WHERE NOT EXISTS (
        SELECT 1 FROM family_milestones fm
        WHERE fm.family_id = f.id AND fm.milestone = 'account_created'
      )
    `);

    // Backfill child_created (first child per family)
    await client.query(`
      INSERT INTO family_milestones (family_id, milestone, occurred_at, child_id, source)
      SELECT DISTINCT ON (c.family_id)
        c.family_id, 'child_created', c.created_at, c.id, 'backfill'
      FROM child c
      ORDER BY c.family_id, c.created_at ASC
      ON CONFLICT DO NOTHING
    `);

    // Backfill routine_ready (weekly_schedule exists)
    await client.query(`
      INSERT INTO family_milestones (family_id, milestone, occurred_at, source)
      SELECT DISTINCT c.family_id, 'routine_ready', MIN(ws.created_at), 'backfill'
      FROM weekly_schedule ws
      JOIN child c ON c.id = ws.child_id
      GROUP BY c.family_id
      ON CONFLICT DO NOTHING
    `);

    // Backfill rewards_ready
    await client.query(`
      INSERT INTO family_milestones (family_id, milestone, occurred_at, source)
      SELECT r.family_id, 'rewards_ready', MIN(r.created_at), 'backfill'
      FROM reward r
      GROUP BY r.family_id
      ON CONFLICT DO NOTHING
    `);

    // Backfill child_first_completion from family_activation_state
    await client.query(`
      INSERT INTO family_milestones (family_id, milestone, occurred_at, source, metadata)
      SELECT fas.family_id, 'child_first_completion', fas.first_completion_at, 'backfill', '{}'
      FROM family_activation_state fas
      WHERE fas.first_completion_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM family_milestones fm
          WHERE fm.family_id = fas.family_id AND fm.milestone = 'child_first_completion'
        )
    `);

    // Backfill parent_saw_completion from parent_seen_completion (earliest per family)
    await client.query(`
      INSERT INTO family_milestones (family_id, milestone, occurred_at, source)
      SELECT c.family_id, 'parent_saw_completion', MIN(psc.seen_at), 'backfill'
      FROM parent_seen_completion psc
      JOIN daily_log_item dli ON dli.id = psc.daily_log_item_id
      JOIN daily_log dl ON dl.id = dli.daily_log_id
      JOIN child c ON c.id = dl.child_id
      GROUP BY c.family_id
      ON CONFLICT DO NOTHING
    `);

    // Backfill first_success where both completion milestones exist
    await client.query(`
      INSERT INTO family_milestones (family_id, milestone, occurred_at, source)
      SELECT fm1.family_id, 'first_success', GREATEST(fm1.occurred_at, fm2.occurred_at), 'backfill'
      FROM family_milestones fm1
      JOIN family_milestones fm2
        ON fm2.family_id = fm1.family_id AND fm2.milestone = 'parent_saw_completion'
      WHERE fm1.milestone = 'child_first_completion'
        AND NOT EXISTS (
          SELECT 1 FROM family_milestones fm3
          WHERE fm3.family_id = fm1.family_id AND fm3.milestone = 'first_success'
        )
      ON CONFLICT DO NOTHING
    `);

    // Backfill journey_phase
    await client.query(`
      UPDATE family f SET journey_phase = 'BUILDING_ROUTINE'
      WHERE EXISTS (
        SELECT 1 FROM family_milestones fm
        WHERE fm.family_id = f.id AND fm.milestone = 'first_success'
      )
    `);
    await client.query(`
      UPDATE family f SET journey_phase = 'FIRST_USE'
      WHERE journey_phase = 'SETTING_UP'
        AND EXISTS (SELECT 1 FROM parent p WHERE p.family_id = f.id AND p.onboarding_completed = true)
        AND EXISTS (SELECT 1 FROM family_milestones fm WHERE fm.family_id = f.id AND fm.milestone = 'routine_ready')
        AND EXISTS (SELECT 1 FROM family_milestones fm WHERE fm.family_id = f.id AND fm.milestone = 'rewards_ready')
        AND NOT EXISTS (SELECT 1 FROM family_milestones fm WHERE fm.family_id = f.id AND fm.milestone = 'first_success')
    `);
  },

  down: async (client) => {
    const keys = JOURNEY_FLAGS.map(([k]) => k);
    await client.query('DELETE FROM feature_flag WHERE key = ANY($1::text[])', [keys]);
    await client.query('DROP TABLE IF EXISTS family_milestones');
    await client.query('ALTER TABLE family DROP COLUMN IF EXISTS journey_phase');
  },
};
