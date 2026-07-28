/**
 * Activation program email invites — väg B (7+ dagar inaktiv).
 * Runs daily when ACTIVATION_PROGRAM_EMAIL_ENABLED=true.
 */

const db = require('./db');
const { sendActivationProgramInviteEmail } = require('./email');
const config = require('./config');
const { ACTIVATION_PROGRAM_EMAIL_LOCK_ID } = require('./scheduler-constants');
const { withAdvisoryLock } = require('./scheduler-lock');
const emailInviteDb = require('../../db/activation-program-email-invite');
const {
  isActivationEmailEnabled,
  isPostLaunchEnrollment,
} = require('./activation-program-enroll');
const { isEligibleForActivationEmail } = require('./activation-program-eligibility');
const programAnalytics = require('./activation-program-analytics');
const { evaluateCommunicationGate } = require('./journey/communication-gate');
const { resolveCommunicationLocale } = require('./communication-locale');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function fetchEligibleParents() {
  const result = await db.query(
    `SELECT DISTINCT ON (p.family_id)
            p.id AS parent_id,
            p.email,
            p.name AS parent_name,
            p.family_id,
            c.name AS child_name,
            COALESCE(f.preferred_locale, 'sv-SE') AS preferred_locale
     FROM parent p
     JOIN family f ON f.id = p.family_id
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
  const gate = await evaluateCommunicationGate(row.family_id, {
    channel: 'email',
    intent: 'legacy_activation_email',
  });
  if (!gate.allowed) {
    console.log(`[ACTIVATION-EMAIL] Skipped family ${row.family_id} — Gate: ${gate.reason}`);
    return false;
  }

  const invite = await emailInviteDb.createInvite(row.parent_id, row.family_id);
  const baseUrl = config.email?.baseUrl || 'https://mystarday.se';
  const ctaUrl = `${baseUrl}/api/public/activation-program/invite/${invite.token}`;

  await sendActivationProgramInviteEmail({
    to: row.email,
    parentName: row.parent_name,
    childName: row.child_name,
    ctaUrl,
    locale: resolveCommunicationLocale(row.preferred_locale),
  });

  await emailInviteDb.markSent(invite.id);
  programAnalytics.trackEmailInviteSent(row.family_id, row.parent_id);
  return true;
}

async function runActivationEmailJob() {
  if (!isActivationEmailEnabled() || !isPostLaunchEnrollment()) {
    console.log('[ACTIVATION-EMAIL] Disabled or pre-launch — skipping');
    return;
  }

  const outcome = await withAdvisoryLock(ACTIVATION_PROGRAM_EMAIL_LOCK_ID, async () => {
  const parents = await fetchEligibleParents();
  let sent = 0;
  for (const row of parents) {
    try {
      const ok = await sendInviteToParent(row);
      if (ok) sent += 1;
    } catch (err) {
      console.error('[ACTIVATION-EMAIL] Send failed for', row.parent_id, err.message);
    }
  }

  console.log(`[ACTIVATION-EMAIL] Sent ${sent} invite(s)`);
  });

  if (outcome?.skipped === 'lock') {
    console.log('[ACTIVATION-EMAIL] Skipping — lock held');
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
