'use strict';

/**
 * Schema drift — win_back_email_log was in baseline-schema without email_type/error.
 * Admin email-logg API fails without these columns.
 */
module.exports = {
  name: '1806500000000_win_back_email_log_columns',

  up: async (client) => {
    await client.query(`
      ALTER TABLE win_back_email_log
        ADD COLUMN IF NOT EXISTS email_type VARCHAR(32) DEFAULT 'win-back'
    `);
    await client.query(`
      ALTER TABLE win_back_email_log
        ADD COLUMN IF NOT EXISTS error TEXT
    `);
    await client.query(`
      UPDATE win_back_email_log
      SET email_type = 'win-back'
      WHERE email_type IS NULL
    `);
  },
};
