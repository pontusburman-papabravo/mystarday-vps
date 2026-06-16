'use strict';

/** Track first return after win-back send (dedupes win_back_returned analytics). */
module.exports = {
  name: '1806700000000_win_back_returned_at',

  up: async (client) => {
    await client.query(`
      ALTER TABLE win_back_email_log
        ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_win_back_email_log_returned_at
        ON win_back_email_log (returned_at DESC)
        WHERE returned_at IS NOT NULL
    `);
  },
};
