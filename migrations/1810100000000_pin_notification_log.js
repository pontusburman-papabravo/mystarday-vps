'use strict';

/**
 * pin_notification_log — PIN parent email cooldown (db/pin-lockout.js).
 * Was referenced in account deletion and PIN notify flow but missing from baseline/migrations.
 */

exports.name = '1810100000000_pin_notification_log';

exports.up = async (client) => {
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
    CREATE INDEX IF NOT EXISTS idx_pin_notification_log_child_channel
      ON pin_notification_log (child_id, channel, notified_at DESC)
  `);
};

exports.down = async (client) => {
  await client.query('DROP TABLE IF EXISTS pin_notification_log');
};
