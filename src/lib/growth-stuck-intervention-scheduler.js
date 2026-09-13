'use strict';

/**
 * Hourly auto-send for founder stuck-family intervention emails.
 * Flag: growth_stuck_cohorts_v1. Reuses evaluateStuckIntervention + sendStuckIntervention.
 *
 * Timing (via existing eligibility):
 * - Family in 48h–14d stuck window
 * - 72h cooldown after activation nudge or prior growth email
 * - One email per intervention_key (idempotent)
 */

const { listGrowthStuckCohorts } = require('../../db/growth-stuck-cohorts');
const { GROWTH_STUCK_INTERVENTION_LOCK_ID } = require('./scheduler-constants');
const { withAdvisoryLock } = require('./scheduler-lock');
const {
  isGrowthStuckAutoSendEnabled,
  isAutoSendCohort,
} = require('./growth-stuck-auto-send');
const {
  sendStuckIntervention,
} = require('./growth-stuck-intervention');

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const BATCH_LIMIT = 50;

let _timer = null;

async function runGrowthStuckInterventionJob() {
  if (process.env.EMAIL_ENABLED === 'false') return;
  if (!(await isGrowthStuckAutoSendEnabled())) return;

  const outcome = await withAdvisoryLock(GROWTH_STUCK_INTERVENTION_LOCK_ID, async () => {
    const families = await listGrowthStuckCohorts({ limit: BATCH_LIMIT });
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const family of families) {
      if (!isAutoSendCohort(family.blockingStep)) {
        skipped += 1;
        continue;
      }

      try {
        const result = await sendStuckIntervention(family.familyId, null, {
          source: 'scheduler',
        });
        if (result.ok) {
          sent += 1;
          console.log(
            '[GROWTH-STUCK-AUTO] Sent',
            family.blockingStep,
            'to family',
            family.familyId
          );
        } else {
          skipped += 1;
          const codes = (result.blockers || []).map((b) => b.code).join(', ') || 'ineligible';
          console.log(
            '[GROWTH-STUCK-AUTO] Skipped family',
            family.familyId,
            '—',
            codes
          );
        }
      } catch (err) {
        failed += 1;
        console.error(
          '[GROWTH-STUCK-AUTO] Failed family',
          family.familyId,
          ':',
          err.message
        );
      }
    }

    if (sent || failed) {
      console.log(
        `[GROWTH-STUCK-AUTO] Batch done — sent=${sent} skipped=${skipped} failed=${failed}`
      );
    }
    return { sent, skipped, failed, candidates: families.length };
  });

  if (outcome?.skipped === 'lock') {
    console.log('[GROWTH-STUCK-AUTO] Skipping — another instance holds the lock');
  }
}

function startGrowthStuckInterventionScheduler() {
  if (_timer) return;
  const tick = () => {
    runGrowthStuckInterventionJob().catch((err) => {
      console.error('[GROWTH-STUCK-AUTO] Job error:', err.message);
    });
  };
  tick();
  _timer = setInterval(tick, CHECK_INTERVAL_MS);
  if (_timer.unref) _timer.unref();
  console.log('[GROWTH-STUCK-AUTO] Scheduler started (hourly, growth_stuck_cohorts_v1)');
}

function stopGrowthStuckInterventionScheduler() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = {
  CHECK_INTERVAL_MS,
  BATCH_LIMIT,
  runGrowthStuckInterventionJob,
  startGrowthStuckInterventionScheduler,
  stopGrowthStuckInterventionScheduler,
};
