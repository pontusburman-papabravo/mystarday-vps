'use strict';

/**
 * Phase 1A — canonical schedule apply idempotency ledger.
 *
 * Why a new table (evaluated against existing infra first):
 * `widget_completion_idempotency` (see db/widget-idempotency.js) is the only existing
 * idempotency pattern in the codebase, but it is keyed by (installation_id, idempotency_key)
 * and scoped to widget completion — reusing it would overload an unrelated domain table
 * with schedule-apply semantics and a different retention profile. `schedule_apply_operation`
 * follows the exact same pattern (store the operation's result once, replay on retry) but is
 * keyed by (child_id, operation_id) — the natural identity for a single-child canonical apply
 * command (see src/lib/schedule-apply.js).
 *
 * Retention: operations are cleaned up after 30 days by
 * cleanupExpiredScheduleApplyOperations() in src/lib/schedule-apply.js — no unbounded growth.
 *
 * Rollback: removing this table (see down()) is safe — losing idempotency records only means
 * a retried request after that is re-executed as a fresh operation (protected by the same
 * merge/duplicate rules); it cannot resurrect deleted schedule data.
 */

module.exports = {
  name: '1810430000000_schedule_apply_operation',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_apply_operation (
        operation_id VARCHAR(200) NOT NULL,
        child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        result_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (operation_id, child_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_apply_operation_created_at
        ON schedule_apply_operation (created_at)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_apply_operation_family
        ON schedule_apply_operation (family_id)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS schedule_apply_operation');
  },
};
