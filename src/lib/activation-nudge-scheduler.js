'use strict';

/**
 * ACT-1 PR5 — non-activated nudge email 24–48h after signup.
 * Flag: activation_nudge_v1 (default OFF). Respects EMAIL_ENABLED.
 */

const db = require('./db');
const { sendActivationNudgeEmail } = require('./email');
const { isActivationFlagEnabled, FLAG_KEYS } = require('./activation-flags');
const { evaluateCommunicationGate } = require('./journey/communication-gate');

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly

let _timer = null;

async function isNudgeFlagEnabled() {
  const row = await db.query(
    "SELECT enabled FROM feature_flag WHERE key = 'activation_nudge_v1' LIMIT 1"
  );
  return row.rows[0]?.enabled === true;
}

async function runActivationNudgeJob() {
  if (process.env.EMAIL_ENABLED === 'false') return;
  if (!(await isNudgeFlagEnabled())) return;

  const candidates = await db.query(
    `SELECT s.family_id, p.email, p.name AS parent_name
     FROM family_activation_state s
     JOIN parent p ON p.family_id = s.family_id AND p.family_role = 'förälder'
     WHERE s.p0_activated_within_48h = false
       AND s.p0_activated_at IS NULL
       AND s.activation_nudge_sent_at IS NULL
       AND s.signup_at >= NOW() - INTERVAL '48 hours'
       AND s.signup_at <= NOW() - INTERVAL '24 hours'
       AND p.email IS NOT NULL
       AND COALESCE(p.newsletter_subscribed, true) = true
     ORDER BY s.signup_at ASC
     LIMIT 50`
  );

  for (const row of candidates.rows) {
    try {
      const flagOk = await isActivationFlagEnabled(FLAG_KEYS.onboarding, row.family_id);
      if (!flagOk) continue;

      const gate = await evaluateCommunicationGate(row.family_id, {
        channel: 'email',
        intent: 'legacy_activation_nudge',
      });
      if (!gate.allowed) {
        console.log(`[ACTIVATION-NUDGE] Skipped family ${row.family_id} — Gate: ${gate.reason}`);
        continue;
      }

      await sendActivationNudgeEmail({
        to: row.email,
        parentName: row.parent_name,
        ctaUrl: 'https://mystarday.se/onboarding',
      });

      await db.query(
        `UPDATE family_activation_state
         SET activation_nudge_sent_at = NOW()
         WHERE family_id = $1 AND activation_nudge_sent_at IS NULL`,
        [row.family_id]
      );

      require('../../db/analytics').track(row.family_id, 'activation_nudge_sent', {
        channel: 'email',
      });

      console.log('[ACTIVATION-NUDGE] Sent to family', row.family_id);
    } catch (err) {
      console.error('[ACTIVATION-NUDGE] Failed for family', row.family_id, ':', err.message);
    }
  }
}

function startActivationNudgeScheduler() {
  if (_timer) return;
  const tick = () => {
    runActivationNudgeJob().catch((err) => {
      console.error('[ACTIVATION-NUDGE] Job error:', err.message);
    });
  };
  tick();
  _timer = setInterval(tick, CHECK_INTERVAL_MS);
  if (_timer.unref) _timer.unref();
  console.log('[ACTIVATION-NUDGE] Scheduler started (hourly)');
}

function stopActivationNudgeScheduler() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = {
  startActivationNudgeScheduler,
  stopActivationNudgeScheduler,
  runActivationNudgeJob,
};
