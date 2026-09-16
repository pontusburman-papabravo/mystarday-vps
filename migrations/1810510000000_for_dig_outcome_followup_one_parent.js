'use strict';

/**
 * One parent → one follow-up email per batch.
 * Recipient items store which pending child+goal rows were included.
 * Opt-out is isolated from newsletter subscriptions.
 */

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

module.exports = {
  name: '1810510000000_for_dig_outcome_followup_one_parent',
  snapshotContract: {
    backwardCompatible: true,
    schemaOnly: true,
  },
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS for_dig_outcome_followup_recipient_item (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_id UUID NOT NULL REFERENCES for_dig_outcome_followup_recipient(id) ON DELETE CASCADE,
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        goal_slug VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (recipient_id, family_id, child_id, goal_slug)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_for_dig_followup_recipient_item_recipient
        ON for_dig_outcome_followup_recipient_item (recipient_id)
    `);

    await client.query(`
      INSERT INTO for_dig_outcome_followup_recipient_item
        (recipient_id, family_id, child_id, goal_slug, created_at)
      SELECT id, family_id, child_id, goal_slug, created_at
        FROM for_dig_outcome_followup_recipient
       WHERE family_id IS NOT NULL
         AND child_id IS NOT NULL
         AND goal_slug IS NOT NULL
         AND parent_id IS NOT NULL
      ON CONFLICT (recipient_id, family_id, child_id, goal_slug) DO NOTHING
    `);

    await client.query(`
      UPDATE for_dig_outcome_followup_recipient_item i
         SET recipient_id = keeper.keeper_id
        FROM (
          SELECT r.id AS dupe_id,
                 FIRST_VALUE(r.id) OVER (
                   PARTITION BY r.batch_id, r.parent_id
                   ORDER BY r.created_at ASC, r.id ASC
                 ) AS keeper_id
            FROM for_dig_outcome_followup_recipient r
           WHERE r.parent_id IS NOT NULL
        ) keeper
       WHERE i.recipient_id = keeper.dupe_id
         AND keeper.dupe_id <> keeper.keeper_id
         AND NOT EXISTS (
           SELECT 1
             FROM for_dig_outcome_followup_recipient_item existing
            WHERE existing.recipient_id = keeper.keeper_id
              AND existing.family_id = i.family_id
              AND existing.child_id = i.child_id
              AND existing.goal_slug = i.goal_slug
         )
    `);

    await client.query(`
      DELETE FROM for_dig_outcome_followup_recipient r
       WHERE parent_id IS NOT NULL
         AND id <> (
           SELECT x.id
             FROM for_dig_outcome_followup_recipient x
            WHERE x.batch_id = r.batch_id
              AND x.parent_id = r.parent_id
            ORDER BY x.created_at ASC, x.id ASC
            LIMIT 1
         )
    `);

    const uniques = await client.query(`
      SELECT conname
        FROM pg_constraint
       WHERE conrelid = 'public.for_dig_outcome_followup_recipient'::regclass
         AND contype = 'u'
    `);
    for (const row of uniques.rows) {
      await client.query(
        `ALTER TABLE for_dig_outcome_followup_recipient DROP CONSTRAINT IF EXISTS ${quoteIdent(row.conname)}`
      );
    }

    await client.query(`
      DROP INDEX IF EXISTS idx_for_dig_outcome_followup_recipient_match
    `);

    await client.query(`
      DELETE FROM for_dig_outcome_followup_recipient WHERE parent_id IS NULL
    `);

    await client.query(`
      ALTER TABLE for_dig_outcome_followup_recipient
        DROP COLUMN IF EXISTS family_id,
        DROP COLUMN IF EXISTS child_id,
        DROP COLUMN IF EXISTS goal_slug
    `);

    await client.query(`
      ALTER TABLE for_dig_outcome_followup_recipient
        ALTER COLUMN parent_id SET NOT NULL
    `);

    await client.query(`
      ALTER TABLE for_dig_outcome_followup_recipient
        DROP CONSTRAINT IF EXISTS for_dig_outcome_followup_recipient_parent_id_fkey
    `);

    await client.query(`
      ALTER TABLE for_dig_outcome_followup_recipient
        ADD CONSTRAINT for_dig_outcome_followup_recipient_parent_id_fkey
        FOREIGN KEY (parent_id) REFERENCES parent(id) ON DELETE CASCADE
    `);

    await client.query(`
      ALTER TABLE for_dig_outcome_followup_recipient
        ADD CONSTRAINT for_dig_outcome_followup_recipient_batch_parent_key
        UNIQUE (batch_id, parent_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS for_dig_followup_email_preference (
        parent_id UUID PRIMARY KEY REFERENCES parent(id) ON DELETE CASCADE,
        opted_out_at TIMESTAMPTZ,
        unsub_token UUID NOT NULL DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_for_dig_followup_email_preference_unsub_token
        ON for_dig_followup_email_preference (unsub_token)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS for_dig_followup_email_preference');
    await client.query('DROP TABLE IF EXISTS for_dig_outcome_followup_recipient_item');
    await client.query(`
      ALTER TABLE for_dig_outcome_followup_recipient
        DROP CONSTRAINT IF EXISTS for_dig_outcome_followup_recipient_batch_parent_key
    `);
    await client.query(`
      ALTER TABLE for_dig_outcome_followup_recipient
        DROP CONSTRAINT IF EXISTS for_dig_outcome_followup_recipient_parent_id_fkey
    `);
    await client.query(`
      ALTER TABLE for_dig_outcome_followup_recipient
        ALTER COLUMN parent_id DROP NOT NULL
    `);
    await client.query(`
      ALTER TABLE for_dig_outcome_followup_recipient
        ADD CONSTRAINT for_dig_outcome_followup_recipient_parent_id_fkey
        FOREIGN KEY (parent_id) REFERENCES parent(id) ON DELETE SET NULL
    `);
    await client.query(`
      ALTER TABLE for_dig_outcome_followup_recipient
        ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES family(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES child(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS goal_slug VARCHAR(64)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_for_dig_outcome_followup_recipient_match
        ON for_dig_outcome_followup_recipient (family_id, child_id, goal_slug)
    `);
  },
};
