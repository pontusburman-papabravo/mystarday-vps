'use strict';

/**
 * Hourly ops report for growth_system_help_v1 — emails when activity/alerts warrant it.
 * Set GROWTH_SYSTEM_HELP_OPS_REPORT_ENABLED=false to disable.
 */

const { GROWTH_SYSTEM_HELP_OPS_REPORT_LOCK_ID } = require('./scheduler-constants');
const { runGrowthSystemHelpOpsReport } = require('./growth-system-help-ops-report');
const db = require('./db');

const INTERVAL_MS = 60 * 60 * 1000;

let _timer = null;

function isEnabled() {
  const v = process.env.GROWTH_SYSTEM_HELP_OPS_REPORT_ENABLED;
  if (v === 'false' || v === '0') return false;
  return true;
}

async function runWithLock() {
  const client = await db.getClient();
  try {
    const { rows } = await client.query(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [GROWTH_SYSTEM_HELP_OPS_REPORT_LOCK_ID]
    );
    if (!rows[0]?.acquired) {
      console.log('[GROWTH-SYSTEM-HELP-OPS] Skipped — another instance holds lock');
      return null;
    }

    try {
      const result = await runGrowthSystemHelpOpsReport();
      if (result.sent) {
        console.log(
          '[GROWTH-SYSTEM-HELP-OPS] Report emailed —',
          result.decision?.reasons?.join(', ') || 'activity'
        );
      } else if (result.seeded) {
        console.log('[GROWTH-SYSTEM-HELP-OPS] Baseline seeded (no email)');
      } else if (result.rollbackPerformed) {
        console.log('[GROWTH-SYSTEM-HELP-OPS] Rollback performed; email sent=', result.sent);
      }
      return result;
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [GROWTH_SYSTEM_HELP_OPS_REPORT_LOCK_ID]);
    }
  } finally {
    client.release();
  }
}

function scheduleNext() {
  _timer = setTimeout(() => {
    runWithLock()
      .catch((err) => console.error('[GROWTH-SYSTEM-HELP-OPS] Job error:', err.message))
      .finally(() => scheduleNext());
  }, INTERVAL_MS);
  if (_timer.unref) _timer.unref();
}

function startGrowthSystemHelpOpsScheduler() {
  if (!isEnabled()) {
    console.log('[GROWTH-SYSTEM-HELP-OPS] Disabled (GROWTH_SYSTEM_HELP_OPS_REPORT_ENABLED=false)');
    return;
  }
  if (_timer) return;
  runWithLock()
    .catch((err) => console.error('[GROWTH-SYSTEM-HELP-OPS] Initial run error:', err.message))
    .finally(() => scheduleNext());
  console.log(
    `[GROWTH-SYSTEM-HELP-OPS] Scheduler started (hourly → ${require('./growth-system-help-ops-report').reportEmail()})`
  );
}

function stopGrowthSystemHelpOpsScheduler() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}

module.exports = {
  startGrowthSystemHelpOpsScheduler,
  stopGrowthSystemHelpOpsScheduler,
  runGrowthSystemHelpOpsReportJob: runWithLock,
  INTERVAL_MS,
};
