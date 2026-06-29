'use strict';

/**
 * RET-3 — Push dag 3/7/14 för tidigare aktiverade familjer (tystnad sedan avbockning).
 * Eligibility + beslut: src/lib/journey/retention-push.js + communication-gate.
 * Flag: retention_reengagement_v1 (default OFF).
 */

const db = require('./db');
const { sendPushNotification } = require('./push-notifications');
const { RETENTION_REENGAGEMENT_LOCK_ID } = require('./scheduler-constants');
const {
  RETENTION_PUSH_MILESTONES,
  findEligibleRecipients,
  evaluateRetentionPush,
} = require('./journey/retention-push');
const analytics = require('../../db/analytics');

const PUSH_HOUR_STOCKHOLM = 9;

const COPY = {
  3: {
    title: 'Fortsätt rutinen 💫',
    body: 'Det var några dagar sedan — öppna schemat och ge dagens stjärnor.',
  },
  7: {
    title: 'En vecka sedan ni var inne',
    body: 'Barnets schema väntar. En snabb check-in räcker.',
  },
  14: {
    title: 'Vi saknar er i appen',
    body: 'Två veckor utan aktivitet — hoppa in och håll rutinen levande.',
  },
};

async function isFlagEnabled() {
  const { rows } = await db.query(
    "SELECT enabled FROM feature_flag WHERE key = 'retention_reengagement_v1' LIMIT 1"
  );
  return rows[0]?.enabled === true;
}

function msUntilNextRun() {
  const { DateTime } = require('luxon');
  const tz = 'Europe/Stockholm';
  const now = DateTime.now().setZone(tz);
  let target = now.set({ hour: PUSH_HOUR_STOCKHOLM, minute: 0, second: 0, millisecond: 0 });
  if (now >= target) target = target.plus({ days: 1 });
  return Math.max(target.diff(now).as('milliseconds'), 60_000);
}

/** @deprecated Use findEligibleRecipients from journey/retention-push */
async function findEligibleParents(milestoneDay) {
  return findEligibleRecipients(milestoneDay);
}

async function runJob() {
  if (!(await isFlagEnabled())) return { skipped: 'flag_off' };

  let lockAcquired = false;
  try {
    const { rows } = await db.query('SELECT pg_try_advisory_lock($1) AS acquired', [
      RETENTION_REENGAGEMENT_LOCK_ID,
    ]);
    lockAcquired = rows[0]?.acquired;
  } catch (err) {
    console.error('[RETENTION-PUSH] Lock error:', err.message);
    lockAcquired = true;
  }
  if (!lockAcquired) return { skipped: 'lock' };

  let sent = 0;
  try {
    for (const day of RETENTION_PUSH_MILESTONES) {
      const parents = await findEligibleRecipients(day);
      const copy = COPY[day];
      for (const row of parents) {
        const gate = await evaluateRetentionPush(row.family_id, { milestoneDay: day });
        if (!gate.allowed) continue;

        const result = await sendPushNotification(row.parent_id, {
          title: copy.title,
          body: copy.body,
          url: '/dashboard',
          type: 'retention_reengagement',
        });
        if (result.sent > 0) {
          await db.query(
            `INSERT INTO retention_reengagement_push (parent_id, family_id, milestone_day)
             VALUES ($1, $2, $3)
             ON CONFLICT (parent_id, family_id, milestone_day) DO NOTHING`,
            [row.parent_id, row.family_id, day]
          );
          analytics.track(row.family_id, 'retention_reengagement_push_sent', {
            milestone_day: day,
            parent_id: row.parent_id,
          }).catch(() => {});
          sent += result.sent;
        }
      }
    }
    if (sent > 0) {
      console.log(`[RETENTION-PUSH] Sent ${sent} push(es)`);
    }
    return { sent };
  } finally {
    if (lockAcquired) {
      await db.query('SELECT pg_advisory_unlock($1)', [RETENTION_REENGAGEMENT_LOCK_ID]).catch(() => {});
    }
  }
}

let timer = null;

function startRetentionReengagementScheduler() {
  if (process.env.IN_PROCESS_CRONS_ENABLED !== 'true'
    && process.env.POLSIA_IN_PROCESS_CRONS_ENABLED !== 'true') {
    return;
  }
  function scheduleNext() {
    timer = setTimeout(async () => {
      try {
        await runJob();
      } catch (err) {
        console.error('[RETENTION-PUSH] Job failed:', err.message);
      }
      scheduleNext();
    }, msUntilNextRun());
    if (timer.unref) timer.unref();
  }
  scheduleNext();
  console.log('[RETENTION-PUSH] Scheduler started (09:00 Europe/Stockholm)');
}

function stopRetentionReengagementScheduler() {
  if (timer) clearTimeout(timer);
  timer = null;
}

module.exports = {
  startRetentionReengagementScheduler,
  stopRetentionReengagementScheduler,
  runJob,
  findEligibleParents,
  COPY,
  MILESTONES: RETENTION_PUSH_MILESTONES,
};
