/**
 * Parent activation program (onboarding_7d MVP) — datamodell.
 */
module.exports = {
  name: '1799200000000_parent_activation_program',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS parent_activation_program (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id            UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        parent_id            UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        status               TEXT NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'completed', 'opted_out', 'expired')),
        cohort_arm           TEXT NOT NULL DEFAULT 'treatment'
                               CHECK (cohort_arm IN ('treatment', 'control')),
        program_type         TEXT NOT NULL DEFAULT 'onboarding_7d'
                               CHECK (program_type IN ('onboarding_7d', 'reactivation_3d')),
        started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        first_banner_seen_at TIMESTAMPTZ,
        last_seen_day        SMALLINT NOT NULL DEFAULT 0 CHECK (last_seen_day >= 0),
        completed_at         TIMESTAMPTZ,
        opted_out_at         TIMESTAMPTZ,
        day_status           JSONB NOT NULL DEFAULT '{}',
        reflection_score     SMALLINT CHECK (reflection_score BETWEEN 1 AND 5),
        reflection_text      TEXT,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS parent_activation_program_active_family
        ON parent_activation_program (family_id)
        WHERE status = 'active'
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS parent_activation_program_type_status
        ON parent_activation_program (program_type, status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS parent_activation_program_cohort
        ON parent_activation_program (cohort_arm, status)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS parent_seen_completion (
        parent_id         UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
        daily_log_item_id UUID NOT NULL REFERENCES daily_log_item(id) ON DELETE CASCADE,
        seen_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (parent_id, daily_log_item_id)
      )
    `);
  },
};
