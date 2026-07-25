'use strict';

/**
 * ACT-1 D2 — email reminder when schema is saved but child access not verified.
 * Segment: schema_saved_at (2–48h window); state-based, not skip events.
 * Flag: activation_child_handoff_v1 (per-family cohort via activation-flags).
 */

const db = require('./db');
const config = require('./config');
const { sendChildHandoffReminderEmail } = require('./email');
const { resolveCommunicationLocale } = require('./communication-locale');
const { isActivationFlagEnabled, FLAG_KEYS } = require('./activation-flags');
const { evaluateCommunicationGate } = require('./journey/communication-gate');
const { CHILD_HANDOFF_REMINDER_LOCK_ID } = require('./scheduler-constants');
const { withAdvisoryLock } = require('./scheduler-lock');

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

const HANDOFF_REMINDER_CANDIDATE_SQL = `
  SELECT s.family_id, p.email, p.name AS parent_name, f.preferred_locale
  FROM family_activation_state s
  JOIN parent p ON p.family_id = s.family_id AND p.family_role = 'förälder'
  JOIN family f ON f.id = s.family_id
  LEFT JOIN notification_preference np ON np.parent_id = p.id
  WHERE s.schema_saved_at IS NOT NULL
    AND s.child_access_completed_at IS NULL
    AND s.first_completion_at IS NULL
    AND s.p0_activated_at IS NULL
    AND s.child_handoff_reminder_sent_at IS NULL
    AND s.schema_saved_at <= NOW() - INTERVAL '2 hours'
    AND s.schema_saved_at >= NOW() - INTERVAL '48 hours'
    AND p.email IS NOT NULL
    AND COALESCE(np.email_enabled, true) = true
  ORDER BY s.schema_saved_at ASC
  LIMIT 50`;

let _timer = null;

function resolveHandoffReminderCtaUrl() {
  const base = String(process.env.APP_URL || config.email?.baseUrl || '').replace(/\/$/, '');
  if (!base) return '/onboarding?resume=child-handoff';
  return `${base}/onboarding?resume=child-handoff`;
}

async function fetchHandoffReminderCandidates(client = db) {
  return client.query(HANDOFF_REMINDER_CANDIDATE_SQL);
}

async function runChildHandoffReminderJob() {
  if (process.env.EMAIL_ENABLED === 'false') return;

  const outcome = await withAdvisoryLock(CHILD_HANDOFF_REMINDER_LOCK_ID, async () => {
    const candidates = await fetchHandoffReminderCandidates();
    console.log('[CHILD-HANDOFF-REMINDER] Candidates:', candidates.rows.length);

    for (const row of candidates.rows) {
      try {
        const flagOk = await isActivationFlagEnabled(FLAG_KEYS.childHandoff, row.family_id);
        if (!flagOk) {
          console.log(`[CHILD-HANDOFF-REMINDER] Skipped family ${row.family_id} — flag_off`);
          continue;
        }

        const gate = await evaluateCommunicationGate(row.family_id, {
          channel: 'email',
          intent: 'legacy_child_handoff_reminder',
        });
        if (!gate.allowed) {
          console.log(`[CHILD-HANDOFF-REMINDER] Skipped family ${row.family_id} — Gate: ${gate.reason}`);
          continue;
        }

        const claimed = await db.query(
          `UPDATE family_activation_state
           SET child_handoff_reminder_sent_at = NOW()
           WHERE family_id = $1 AND child_handoff_reminder_sent_at IS NULL
           RETURNING family_id`,
          [row.family_id]
        );
        if (claimed.rows.length === 0) {
          console.log(`[CHILD-HANDOFF-REMINDER] Skipped family ${row.family_id} — already_claimed`);
          continue;
        }

        await sendChildHandoffReminderEmail({
          to: row.email,
          parentName: row.parent_name,
          ctaUrl: resolveHandoffReminderCtaUrl(),
          locale: resolveCommunicationLocale(row.preferred_locale),
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
  fetchHandoffReminderCandidates,
  resolveHandoffReminderCtaUrl,
  HANDOFF_REMINDER_CANDIDATE_SQL,
};
