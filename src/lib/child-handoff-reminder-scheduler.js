'use strict';

/**
 * ACT-1 D2 — email 24h after child_handoff_skipped if child access not completed.
 * Flag: activation_child_handoff_v1 (per-family cohort via activation-flags).
 */

const db = require('./db');
const { sendChildHandoffReminderEmail } = require('./email');
const { isActivationFlagEnabled, FLAG_KEYS } = require('./activation-flags');
const { CHILD_HANDOFF_REMINDER_LOCK_ID } = require('./scheduler-constants');
const { withAdvisoryLock } = require('./scheduler-lock');

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

let _timer = null;

async function runChildHandoffReminderJob() {
  if (process.env.EMAIL_ENABLED === 'false') return;

  const outcome = await withAdvisoryLock(CHILD_HANDOFF_REMINDER_LOCK_ID, async () => {
    const candidates = await db.query(
      `SELECT DISTINCT ON (s.family_id)
              s.family_id,
              p.email,
              p.name AS parent_name
       FROM family_activation_state s
       JOIN parent p ON p.family_id = s.family_id AND p.family_role = 'förälder'
       JOIN analytics_events ae ON ae.family_id = s.family_id
         AND ae.event_type = 'child_handoff_skipped'
       WHERE s.child_access_completed_at IS NULL
         AND s.child_handoff_reminder_sent_at IS NULL
         AND ae.created_at <= NOW() - INTERVAL '23 hours'
         AND ae.created_at >= NOW() - INTERVAL '26 hours'
         AND p.email IS NOT NULL
         AND COALESCE(p.newsletter_subscribed, true) = true
       ORDER BY s.family_id, ae.created_at DESC
       LIMIT 50`
    );

    for (const row of candidates.rows) {
      try {
        const flagOk = await isActivationFlagEnabled(FLAG_KEYS.childHandoff, row.family_id);
        if (!flagOk) continue;

        const claimed = await db.query(
          `UPDATE family_activation_state
           SET child_handoff_reminder_sent_at = NOW()
           WHERE family_id = $1 AND child_handoff_reminder_sent_at IS NULL
           RETURNING family_id`,
          [row.family_id]
        );
        if (claimed.rows.length === 0) continue;

        await sendChildHandoffReminderEmail({
          to: row.email,
          parentName: row.parent_name,
          ctaUrl: 'https://mystarday.se/onboarding',
        });

        require('../../db/analytics').track(row.family_id, 'child_handoff_reminder_sent', {
          channel: 'email',
        });

        console.log('[CHILD-HANDOFF-REMINDER] Sent to family', row.family_id);
      } catch (err) {
        console.error('[CHILD-HANDOFF-REMINDER] Failed for family', row.family_id, ':', err.message);
      }
    }
  });

  if (outcome?.skipped === 'lock') {
    console.log('[CHILD-HANDOFF-REMINDER] Skipping — another instance holds the lock');
  }
}

function startChildHandoffReminderScheduler() {
  if (_timer) return;
  const tick = () => {
    runChildHandoffReminderJob().catch((err) => {
      console.error('[CHILD-HANDOFF-REMINDER] Job error:', err.message);
    });
  };
  tick();
  _timer = setInterval(tick, CHECK_INTERVAL_MS);
  if (_timer.unref) _timer.unref();
  console.log('[CHILD-HANDOFF-REMINDER] Scheduler started (hourly)');
}

function stopChildHandoffReminderScheduler() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = {
  startChildHandoffReminderScheduler,
  stopChildHandoffReminderScheduler,
  runChildHandoffReminderJob,
};
