'use strict';

/**
 * Ensure pin_notification_log exists.
 *
 * Used by PIN email cooldown (db/pin-lockout.js) and account deletion.
 * The table was documented/used in app code but never added to baseline/migrations,
 * which made DELETE /api/family/delete-account fail for every family.
 */

module.exports = {
  name: '1810100000000_pin_notification_log',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS pin_notification_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        family_id UUID REFERENCES family(id) ON DELETE CASCADE,
        channel VARCHAR(32) NOT NULL,
        notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pin_notification_log_child_channel_notified
        ON pin_notification_log (child_id, channel, notified_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS pin_notification_log');
  },
};
