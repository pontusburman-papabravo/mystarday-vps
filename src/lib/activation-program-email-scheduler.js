/**
 * Activation program email invites — väg B (7+ dagar inaktiv).
 * Runs daily when ACTIVATION_PROGRAM_EMAIL_ENABLED=true.
 */

const db = require('./db');
const { sendActivationProgramInviteEmail } = require('./email');
const config = require('./config');
const emailInviteDb = require('../../db/activation-program-email-invite');
const {
  isActivationEmailEnabled,
  isPostLaunchEnrollment,
} = require('./activation-program-enroll');
const { isEligibleForActivationEmail } = require('./activation-program-eligibility');
const programAnalytics = require('./activation-program-analytics');

const SCHEDULER_LOCK_ID = 17997001;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function fetchEligibleParents() {
  const result = await db.query(
    `SELECT DISTINCT ON (p.family_id)
            p.id AS parent_id,
            p.email,
            p.name AS parent_name,
            p.family_id,
            c.name AS child_name
     FROM parent p
     JOIN child c ON c.family_id = p.family_id
     JOIN notification_preference np ON np.parent_id = p.id
     WHERE p.verified = true
       AND p.is_admin = false
       AND p.onboarding_completed = true
       AND np.email_enabled = true
       AND p.email IS NOT NULL
     ORDER BY p.family_id, p.created_at ASC`,
    []
  );

  const eligible = [];
  for (const row of result.rows) {
    const ok = await isEligibleForActivationEmail(row.family_id);
    if (!ok) continue;

    const recent = await emailInviteDb.wasSentRecently(row.parent_id, 30);
    if (recent) continue;

    eligible.push(row);
  }
  return eligible;
}

async function sendInviteToParent(row) {
  const invite = await emailInviteDb.createInvite(row.parent_id, row.family_id);
  const baseUrl = config.email?.baseUrl || 'https://mystarday.se';
  const ctaUrl = `${baseUrl}/api/public/activation-program/invite/${invite.token}`;

  await sendActivationProgramInviteEmail({
    to: row.email,
    parentName: row.parent_name,
    childName: row.child_name,
    ctaUrl,
  });

  await emailInviteDb.markSent(invite.id);
  programAnalytics.trackEmailInviteSent(row.family_id, row.parent_id);
}

async function runActivationEmailJob() {
  if (!isActivationEmailEnabled() || !isPostLaunchEnrollment()) {
    console.log('[ACTIVATION-EMAIL] Disabled or pre-launch — skipping');
    return;
  }

  const client = await db.getClient();
  let lockAcquired = false;
  try {
    try {
      const { rows } = await client.query(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [SCHEDULER_LOCK_ID]
      );
      lockAcquired = rows[0].acquired;
    } catch (err) {
      console.error('[ACTIVATION-EMAIL] Lock error:', err.message);
      return;
    }

    if (!lockAcquired) {
      console.log('[ACTIVATION-EMAIL] Skipping — lock held');
      return;
    }

    const parents = await fetchEligibleParents();
    let sent = 0;
    for (const row of parents) {
      try {
        await sendInviteToParent(row);
        sent += 1;
      } catch (err) {
        console.error('[ACTIVATION-EMAIL] Send failed for', row.parent_id, err.message);
      }
    }

    console.log(`[ACTIVATION-EMAIL] Sent ${sent} invite(s)`);
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1)', [SCHEDULER_LOCK_ID]).catch(() => {});
    }
    client.release();
  }
}

let _timer = null;

function startActivationEmailScheduler() {
  if (_timer) return;

  const runAndSchedule = async () => {
    await runActivationEmailJob();
    _timer = setTimeout(runAndSchedule, MS_PER_DAY);
    if (_timer.unref) _timer.unref();
  };

  const msUntilMidnightStockholm = () => {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
    const h = parseInt(parts.hour, 10);
    const m = parseInt(parts.minute, 10);
    const s = parseInt(parts.second, 10);
    const msLeft = ((23 - h) * 3600 + (59 - m) * 60 + (60 - s)) * 1000;
    return Math.max(msLeft, 60_000);
  };

  _timer = setTimeout(runAndSchedule, msUntilMidnightStockholm());
  if (_timer.unref) _timer.unref();
  console.log('[ACTIVATION-EMAIL] Scheduler started');
}

function stopActivationEmailScheduler() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}

module.exports = {
  fetchEligibleParents,
  runActivationEmailJob,
  startActivationEmailScheduler,
  stopActivationEmailScheduler,
};
