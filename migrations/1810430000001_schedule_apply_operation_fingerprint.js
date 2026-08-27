'use strict';

/**
 * Phase 1A hardening (PR #1093 review) — command fingerprint for the schedule-apply
 * idempotency ledger.
 *
 * (operation_id, child_id) alone is not a sufficient identity: a client could reuse an
 * operation_id for a materially different command (different source, days, or mode).
 * `command_fingerprint` stores a deterministic hash (src/lib/schedule-apply.js
 * `computeCommandFingerprint`) of every input that affects the materialized result. A
 * replay is only honoured when the fingerprint matches exactly; a mismatch is a
 * deterministic 409 IDEMPOTENCY_KEY_REUSED with no mutation (see schedule-apply.js).
 *
 * Backfill: table is new in this same unreleased phase (no live/deployed rows exist yet
 * outside local/test databases), so the column is added NOT NULL with a placeholder
 * default that is immediately dropped — safe on an empty or near-empty table.
 *
 * Rollback: drops the column only; the ledger continues to function under the previous
 * (operation_id, child_id)-only identity used before this hardening pass.
 */

module.exports = {
  name: '1810430000001_schedule_apply_operation_fingerprint',

  up: async (client) => {
    await client.query(`
      ALTER TABLE schedule_apply_operation
        ADD COLUMN IF NOT EXISTS command_fingerprint VARCHAR(64) NOT NULL DEFAULT ''
    `);
    await client.query(`
      ALTER TABLE schedule_apply_operation
        ALTER COLUMN command_fingerprint DROP DEFAULT
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE schedule_apply_operation
        DROP COLUMN IF EXISTS command_fingerprint
    `);
  },
};
