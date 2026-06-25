/**
 * Activation program push scheduler — days 2–7, max 1 push per effective day (Fas 5).
 * Uses getEffectiveProgramDay() — never last_seen_day (contract).
 */

const { DateTime } = require('luxon');
const db = require('./db');
const { sendPushNotification } = require('./push-notifications');
const {
  isActivationProgramEnabled,
  isPostLaunchEnrollment,
} = require('./activation-program-enroll');
const {
  getEffectiveProgramDay,
  maybeExpireProgram,
} = require('./activation-program');
const { getPushContent } = require('./activation-program-content');
const programAnalytics = require('./activation-program-analytics');
const parentActivationProgram = require('../../db/parent-activation-program');
const pushSubscriptions = require('../../db/push-subscriptions');

const SCHEDULER_LOCK_ID = 17999002;
const PUSH_HOUR_STOCKHOLM = 8;

/**
 * Whether this program should receive today's push (pure — for tests).
 */
function shouldSendPushForProgram(program, timezone, now = new Date()) {
  if (!program || program.status !== 'active' || program.cohort_arm !== 'treatment') {
    return { send: false, effectiveDay: null };
  }

  const active = maybeExpireProgram(program, timezone);
  if (active.status !== 'active') {
    return { send: false, effectiveDay: null };
  }

  const effectiveDay = getEffectiveProgramDay(active, timezone);
  if (effectiveDay < 2 || effectiveDay > 7) {
    return { send: false, effectiveDay };
  }

  if (parentActivationProgram.wasPushSentForDay(active, effectiveDay)) {
    return { send: false, effectiveDay };
  }

  return { send: true, effectiveDay };
}

function msUntilNextPushWindow() {
  const tz = 'Europe/Stockholm';
  const now = DateTime.now().setZone(tz);
  let target = now.set({
    hour: PUSH_HOUR_STOCKHOLM,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  if (now >= target) {
    target = target.plus({ days: 1 });
  }
  return Math.max(target.diff(now).as('milliseconds'), 1000);
}

async function parentCanReceivePush(parentId) {
  const { rows } = await db.query(
    `SELECT push_preferences FROM parent WHERE id = $1`,
    [parentId]
  );
  const prefs = rows[0]?.push_preferences || {};
  if (prefs.enabled === false) return false;

  const [webSubs, nativeSubs] = await Promise.all([
    pushSubscriptions.getWebSubscriptions(parentId),
    pushSubscriptions.getNativeSubscriptions(parentId),
  ]);
  return webSubs.length > 0 || nativeSubs.length > 0;
}

async function sendPushForProgram(program, effectiveDay) {
  const timezone = program.family_timezone || 'Europe/Stockholm';
  const payload = getPushContent(effectiveDay, { childName: program.child_name });
  if (!payload) return { sent: 0 };

  const canPush = await parentCanReceivePush(program.parent_id);
  if (!canPush) {
    await parentActivationProgram.markPushSent(program.id, effectiveDay);
    return { sent: 0, skipped: 'no_subscription' };
  }

  const result = await sendPushNotification(program.parent_id, {
    title: payload.title,
    body: payload.body,
    url: payload.url,
    type: 'activation_program',
  });

  await parentActivationProgram.markPushSent(program.id, effectiveDay);

  if (result.sent > 0) {
    programAnalytics.trackPushSent(program.family_id, effectiveDay);
  }

  return result;
}

async function runActivationPushJob({ force = false } = {}) {
  if (!isActivationProgramEnabled() || !isPostLaunchEnrollment()) {
    console.log('[ACTIVATION-PUSH] Disabled or pre-launch — skipping');
    return { sent: 0, skipped: 'disabled' };
  }

  const client = await db.getClient();
  let lockAcquired = false;
  let totalSent = 0;
  let eligible = 0;
  try {
    try {
      const { rows } = await client.query(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [SCHEDULER_LOCK_ID]
      );
      lockAcquired = rows[0].acquired;
    } catch (err) {
      console.error('[ACTIVATION-PUSH] Lock error:', err.message);
      return { sent: 0, skipped: 'lock_error' };
    }

    if (!lockAcquired) {
      console.log('[ACTIVATION-PUSH] Skipping — lock held');
      return { sent: 0, skipped: 'lock' };
    }

    const programs = await parentActivationProgram.listActiveTreatmentPrograms();

    for (const program of programs) {
      const timezone = program.family_timezone || 'Europe/Stockholm';
      const { send, effectiveDay } = shouldSendPushForProgram(program, timezone);
      if (!send || effectiveDay == null) continue;

      eligible += 1;
      try {
        const result = await sendPushForProgram(program, effectiveDay);
        totalSent += result.sent || 0;
      } catch (err) {
        console.error('[ACTIVATION-PUSH] Send failed for', program.id, err.message);
      }
    }

    console.log(`[ACTIVATION-PUSH] Sent ${totalSent} push(es) for ${eligible} program(s)`);
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1)', [SCHEDULER_LOCK_ID]).catch(() => {});
    }
    client.release();
  }

  return { sent: totalSent, eligible };
}

let _timer = null;

function startActivationPushScheduler() {
  if (_timer) return;

  const runAndSchedule = async () => {
    await runActivationPushJob({ force: true });
    _timer = setTimeout(runAndSchedule, msUntilNextPushWindow());
    if (_timer.unref) _timer.unref();
  };

  _timer = setTimeout(runAndSchedule, msUntilNextPushWindow());
  if (_timer.unref) _timer.unref();
  console.log('[ACTIVATION-PUSH] Scheduler started');
}

function stopActivationPushScheduler() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}

module.exports = {
  shouldSendPushForProgram,
  msUntilNextPushWindow,
  runActivationPushJob,
  startActivationPushScheduler,
  stopActivationPushScheduler,
  PUSH_HOUR_STOCKHOLM,
};
