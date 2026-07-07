/**
 * One-click opt-out token for notification emails (weekly summary, etc.).
 */
module.exports = {
  name: '1808980000000_notification_preference_opt_out_token',

  up: async (client) => {
    await client.query(`
      ALTER TABLE notification_preference
        ADD COLUMN IF NOT EXISTS email_opt_out_token UUID NOT NULL DEFAULT gen_random_uuid()
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE notification_preference
        DROP COLUMN IF EXISTS email_opt_out_token
    `);
  },
};
