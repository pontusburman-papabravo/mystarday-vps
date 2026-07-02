'use strict';

/**
 * FEAT-1 Phase 5 — backfill weekly_schedule.custody_home_id from pattern configuration.
 * Idempotent; safe to re-run (only NULL custody_home_id rows).
 */

const { backfillWeeklyScheduleHomeIds } = require('../src/lib/custody-schedule-migrate');

module.exports = {
  name: '1809210000000_custody_weekly_schedule_home_backfill',

  up: async (client) => {
    const count = await backfillWeeklyScheduleHomeIds(client);
    console.log(
      `[migration] custody_weekly_schedule_home_backfill: updated ${count} weekly_schedule rows`
    );
  },

  down: async () => {
    // Data backfill — no safe rollback
  },
};
