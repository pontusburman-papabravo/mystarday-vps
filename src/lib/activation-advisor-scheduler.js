'use strict';

/**
 * Daily activation health advisor — writes recommendations to admin_operational_alert.
 * Set ACTIVATION_ADVISOR_ENABLED=false to disable.
 */

const { runActivationAdvisor } = require('./activation-advisor');
const { ACTIVATION_ADVISOR_LOCK_ID } = require('./scheduler-constants');
const db = require('./db');

const ADVISOR_HOUR_STOCKHOLM = 7;
const ADVISOR_MINUTE = 30;

let _timer = null;

function isEnabled() {
  const v = process.env.ACTIVATION_ADVISOR_ENABLED;
  if (v === 'false' || v === '0') return false;
  return true;
}

function msUntilNextRun() {
  const { DateTime } = require('luxon');
  const tz = 'Europe/Stockholm';
  const now = DateTime.now().setZone(tz);
  let target = now.set({
    hour: ADVISOR_HOUR_STOCKHOLM,
    minute: ADVISOR_MINUTE,
    second: 0,
    millisecond: 0,
  });
  if (now >= target) target = target.plus({ days: 1 });
  return Math.max(target.diff(now).as('milliseconds'), 60_000);
}

async function runWithLock() {
  const client = await db.getClient();
  try {
    const { rows } = await client.query(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [ACTIVATION_ADVISOR_LOCK_ID]
    );
    if (!rows[0]?.acquired) {
      console.log('[ACTIVATION-ADVISOR] Skipped — another instance holds lock');
      return null;
    }

    try {
      const result = await runActivationAdvisor();
      console.log(
        '[ACTIVATION-ADVISOR] Saved',
        result.saved.length,
        'alert(s); pruned',
        result.pruned
      );
      return result;
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [ACTIVATION_ADVISOR_LOCK_ID]);
    }
  } finally {
    client.release();
  }
}

function scheduleNext() {
  const delay = msUntilNextRun();
  _timer = setTimeout(() => {
    runWithLock()
      .catch((err) => console.error('[ACTIVATION-ADVISOR] Job error:', err.message))
      .finally(() => scheduleNext());
  }, delay);
  if (_timer.unref) _timer.unref();
}

function startActivationAdvisorScheduler() {
  if (!isEnabled()) {
    console.log('[ACTIVATION-ADVISOR] Disabled (ACTIVATION_ADVISOR_ENABLED=false)');
    return;
  }
  if (_timer) return;
  scheduleNext();
  console.log('[ACTIVATION-ADVISOR] Scheduler started (daily ~07:30 Europe/Stockholm)');
}

function stopActivationAdvisorScheduler() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}

module.exports = {
  startActivationAdvisorScheduler,
  stopActivationAdvisorScheduler,
  runActivationAdvisorJob: runWithLock,
  msUntilNextRun,
};
