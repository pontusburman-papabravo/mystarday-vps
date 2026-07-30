/**
 * PIN parent notification log — email cooldown and in-app notification tracking.
 * Schema drift: used in db/pin-lockout.js but missing from baseline-schema.sql.
 */
module.exports = {
  name: '1810000000017_pin_notification_log',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS pin_notification_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        channel VARCHAR(16) NOT NULL,
        notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS pin_notification_log_child_channel_idx
        ON pin_notification_log (child_id, channel, notified_at DESC)
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS pin_notification_log_child_channel_idx');
    await client.query('DROP TABLE IF EXISTS pin_notification_log');
  },
};
