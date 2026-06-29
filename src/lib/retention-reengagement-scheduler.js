'use strict';

/**
 * RET-3 — Push dag 3/7/14 för aktiverade familjer som slutat logga in.
 * Flag: retention_reengagement_v1 (default OFF).
 */

const db = require('./db');
const { sendPushNotification } = require('./push-notifications');
const { RETENTION_REENGAGEMENT_LOCK_ID } = require('./scheduler-constants');
const { evaluateCommunicationGate } = require('./journey/communication-gate');
const analytics = require('../../db/analytics');

const MILESTONES = [3, 7, 14];
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

/**
 * Families with ever_completed + whole days since last activity in milestones.
 */
async function findEligibleParents(milestoneDay) {
  const { rows } = await db.query(
    `
    WITH family_activity AS (
      SELECT
        fam.id AS family_id,
        EXISTS (
          SELECT 1 FROM daily_log_item dli
          JOIN daily_log dl ON dl.id = dli.daily_log_id
          JOIN child c ON c.id = dl.child_id
          WHERE c.family_id = fam.id AND dli.completed = true
        ) AS ever_completed,
        GREATEST(
          COALESCE((SELECT MAX(le.occurred_at) FROM login_event le WHERE le.family_id = fam.id), TIMESTAMPTZ 'epoch'),
          COALESCE((
            SELECT MAX(dli.completed_at)
            FROM daily_log_item dli
            JOIN daily_log dl ON dl.id = dli.daily_log_id
            JOIN child c ON c.id = dl.child_id
            WHERE c.family_id = fam.id AND dli.completed = true
          ), TIMESTAMPTZ 'epoch')
        ) AS last_active
      FROM family fam
      WHERE fam.archived_at IS NULL
    )
    SELECT DISTINCT p.id AS parent_id, fa.family_id
    FROM family_activity fa
    JOIN parent p ON p.family_id = fa.family_id
    WHERE fa.ever_completed = true
      AND fa.last_active > TIMESTAMPTZ '1971-01-01'
      AND FLOOR(EXTRACT(EPOCH FROM (NOW() - fa.last_active)) / 86400)::int = $1
      AND NOT EXISTS (
        SELECT 1 FROM retention_reengagement_push r
        WHERE r.parent_id = p.id AND r.family_id = fa.family_id AND r.milestone_day = $1
      )
      AND COALESCE((p.push_preferences->>'enabled')::boolean, true) = true
      AND COALESCE((p.push_preferences->>'inactivity_nudge')::boolean, true) = true
    `,
    [milestoneDay]
  );
  return rows;
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
    for (const day of MILESTONES) {
      const parents = await findEligibleParents(day);
      const copy = COPY[day];
      for (const row of parents) {
        const gate = await evaluateCommunicationGate(row.family_id, {
          channel: 'push',
          intent: 'legacy_retention_push',
        });
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
  MILESTONES,
};
