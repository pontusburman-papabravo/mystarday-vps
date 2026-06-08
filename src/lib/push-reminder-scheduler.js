/**
 * Push reminder scheduler — runs every 5 minutes, sends contextual push
 * notifications to parents based on children's activity and schedules.
 *
 * Notification types:
 *   - schedule_reminder  : 10 min before a scheduled activity starts
 *   - inactivity_nudge   : 18:00 if child hasn't opened app today
 *   - star_milestone     : when child reaches 10/25/50/100 total stars
 *   - backfill_reminder  : 09:00 if yesterday's schedule is incomplete
 *
 * Guard: requires IN_PROCESS_CRONS_ENABLED=true (legacy: POLSIA_IN_PROCESS_CRONS_ENABLED).
 * Uses pg_advisory_lock(LOCK_ID) so horizontally scaled instances don't collide.
 *
 * Does NOT own: push delivery (see src/lib/push-notifications.js).
 */

const db = require('./db');
const { sendPushNotification } = require('./push-notifications');
const { PUSH_REMINDER_SCHEDULER_LOCK_ID } = require('./scheduler-constants');

const LOCK_ID = PUSH_REMINDER_SCHEDULER_LOCK_ID; // 1006

// Quiet hours: no notifications between this hour (24h format) and start hour.
const QUIET_START_HOUR = 21; // 21:00
const QUIET_END_HOUR   = 7;  // 07:00

// Star milestone thresholds
const STAR_MILESTONES = [10, 25, 50, 100];

/**
 * Check if current Stockholm time is within quiet hours.
 */
function isQuietHours() {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    hour12: false,
  });
  const hour = parseInt(fmt.format(new Date()), 10);
  if (QUIET_START_HOUR > QUIET_END_HOUR) {
    // Normal case: 21:00–07:00 (wraps midnight)
    return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
  }
  return hour >= QUIET_START_HOUR && hour < QUIET_END_HOUR;
}

/**
 * Get a parent's notification preferences, merged with defaults.
 */
async function getParentPrefs(parentId) {
  const result = await db.query(
    `SELECT push_preferences FROM parent WHERE id = $1`,
    [parentId]
  );
  const raw = result.rows[0]?.push_preferences || {};
  return {
    enabled: raw.enabled !== false, // default true
    schedule_reminder: raw.schedule_reminder !== false,
    inactivity_nudge:   raw.inactivity_nudge   !== false,
    star_milestone:     raw.star_milestone     !== false,
    backfill_reminder:  raw.backfill_reminder  !== false,
    quiet_start:        raw.quiet_start ?? QUIET_START_HOUR,
    quiet_end:          raw.quiet_end   ?? QUIET_END_HOUR,
    per_child:          raw.per_child  || {},
    reminder_lead_minutes: raw.reminder_lead_minutes ?? 10,
  };
}

/**
 * Check if notifications are enabled for a specific child (per_child overrides).
 */
function isChildNotificationEnabled(prefs, childId, type) {
  const childPrefs = prefs.per_child?.[childId];
  if (childPrefs && typeof childPrefs === 'object') {
    if (childPrefs[type] === false) return false;
    if (childPrefs[type] === true)  return true;
  }
  // Fall back to global toggle
  const globalToggle = {
    schedule_reminder: prefs.schedule_reminder,
    inactivity_nudge:  prefs.inactivity_nudge,
    star_milestone:    prefs.star_milestone,
    backfill_reminder: prefs.backfill_reminder,
  };
  return globalToggle[type] !== false;
}

/**
 * Main job — called every 5 minutes.
 */
async function runPushReminderJob() {
  let lockAcquired = false;
  try {
    const { rows } = await db.query(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [LOCK_ID]
    );
    lockAcquired = rows[0].acquired;
  } catch (err) {
    console.error('[PUSH-REMINDER] Lock acquisition failed:', err.message);
    lockAcquired = true; // fail-open
  }

  if (!lockAcquired) {
    console.log('[PUSH-REMINDER] Skipping — another instance holds lock');
    return;
  }

  try {
    const now = new Date();
    const stockholmNow = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    }).format(now);
    // sv-SE uses space ("2026-06-04 23:25"), not ISO "T" separator
    const [sDate, sTime] = stockholmNow.split(/[T ]/);
    const [year, month, day] = sDate.split('-').map(Number);
    const [hour, minute] = sTime.split(':').map(Number);
    const currentTimeMin = hour * 60 + minute;

    console.log(`[PUSH-REMINDER] Running at ${hour}:${String(minute).padStart(2,'0')} Stockholm`);

    // ── 1. Schedule reminders (every 5 min) ─────────────────────────────────
    await sendScheduleReminders(year, month, day, currentTimeMin);

    // ── 2. Inactivity nudge (18:00 only) ───────────────────────────────────
    if (hour === 18 && minute < 5) {
      await sendInactivityNudges();
    }

    // ── 3. Star milestone — check every 5 min for new milestones ───────────
    await sendStarMilestoneNotifications();

    // ── 4. Backfill reminder (09:00 only) ─────────────────────────────────
    if (hour === 9 && minute < 5) {
      await sendBackfillReminders();
    }

  } catch (err) {
    console.error('[PUSH-REMINDER] Job error:', err);
  } finally {
    await db.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
  }
}

/**
 * Send schedule reminders for activities starting in [lead_minutes-5, lead_minutes]
 * from now (10 min window centered on the configured lead time).
 */
async function sendScheduleReminders(year, month, day, currentTimeMin) {
  // Get parents with schedule_reminder enabled
  const parentsResult = await db.query(
    `SELECT p.id AS parent_id, p.push_preferences
     FROM parent p
     WHERE p.push_preferences::jsonb ? 'schedule_reminder'
        OR NOT p.push_preferences::jsonb ? 'enabled'`
  );

  for (const { parent_id, push_preferences: rawPrefs } of parentsResult.rows) {
    const prefs = (() => {
      const r = rawPrefs || {};
      return {
        enabled: r.enabled !== false,
        reminder_lead_minutes: r.reminder_lead_minutes ?? 10,
        per_child: r.per_child || {},
      };
    })();

    if (!prefs.enabled || prefs.schedule_reminder === false) continue;
    if (isQuietHours()) continue;

    const leadMin = prefs.reminder_lead_minutes;
    const windowStart = leadMin - 5; // e.g. 5 min before lead time
    const windowEnd   = leadMin + 5; // e.g. 5 min after lead time

    const nowPlusLead = currentTimeMin + leadMin;
    const nowPlusLeadStart = Math.max(0, windowStart);
    const nowPlusLeadEnd   = Math.min(1440, windowEnd);

    // Get all children for this parent
    const childrenResult = await db.query(
      `SELECT c.id, c.name, c.emoji
       FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1`,
      [parent_id]
    );

    for (const child of childrenResult.rows) {
      const childPrefs = prefs.per_child?.[child.id];
      if (childPrefs?.schedule_reminder === false) continue;

      // Find scheduled items that fall in the reminder window today
      const itemsResult = await db.query(
        `SELECT wsi.id, wsi.activity_name, wsi.scheduled_time, wsi.child_id
         FROM weekly_schedule_item wsi
         JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
         WHERE ws.child_id = $1
           AND (EXTRACT(DOW FROM DATE '${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}')::int
                = (EXTRACT(DOW FROM wsi.start_date)::int + 1) % 7 + 1)
           AND wsi.start_date <= DATE '${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}'
           AND (wsi.end_date IS NULL OR wsi.end_date >= DATE '${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}')
           AND wsi.completed = false
           AND wsi.scheduled_time IS NOT NULL
         LIMIT 3`,
        [child.id]
      );

      for (const item of itemsResult.rows) {
        const [sh, sm] = (item.scheduled_time || '00:00').split(':').map(Number);
        const itemTimeMin = sh * 60 + sm;
        if (itemTimeMin >= nowPlusLeadStart && itemTimeMin <= nowPlusLeadEnd) {
          const minsUntil = itemTimeMin - currentTimeMin;
          if (minsUntil > 0 && minsUntil <= leadMin) {
            await sendPushNotification(parent_id, {
              title: `Dags för "${item.activity_name}" om ${minsUntil} minuter! ⭐`,
              body: `Påminnelse för ${child.name}`,
              type: 'schedule_reminder',
              url: '/child-dashboard',
            });
            console.log(`[PUSH-REMINDER] Schedule reminder sent to parent ${parent_id} for child ${child.name}: ${item.activity_name}`);
          }
        }
      }
    }
  }
}

/**
 * Send inactivity nudge at 18:00 if a child has no daily_log entry today.
 */
async function sendInactivityNudges() {
  const parentsResult = await db.query(
    `SELECT DISTINCT p.id AS parent_id, p.push_preferences
     FROM parent p
     WHERE p.push_preferences::jsonb ? 'inactivity_nudge'
        OR NOT p.push_preferences::jsonb ? 'enabled'`
  );

  const todayStr = new Date().toISOString().slice(0, 10);

  for (const { parent_id, push_preferences: rawPrefs } of parentsResult.rows) {
    const prefs = {
      enabled: (rawPrefs || {}).enabled !== false,
      inactivity_nudge: (rawPrefs || {}).inactivity_nudge !== false,
      per_child: (rawPrefs || {}).per_child || {},
    };
    if (!prefs.enabled || prefs.inactivity_nudge === false) continue;
    if (isQuietHours()) continue;

    // Find children with no activity today
    const childrenResult = await db.query(
      `SELECT c.id, c.name, c.emoji
       FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1`,
      [parent_id]
    );

    for (const child of childrenResult.rows) {
      const childPrefs = prefs.per_child?.[child.id];
      if (childPrefs?.inactivity_nudge === false) continue;

      const logResult = await db.query(
        `SELECT 1 FROM daily_log WHERE child_id = $1 AND date = $2 LIMIT 1`,
        [child.id, todayStr]
      );

      if (logResult.rows.length === 0) {
        await sendPushNotification(parent_id, {
          title: `${child.name} har inte loggat in idag`,
          body: 'Kolla schemat och hjälp till att fylla i dagen!',
          type: 'inactivity_nudge',
          url: '/dashboard',
        });
        console.log(`[PUSH-REMINDER] Inactivity nudge sent for ${child.name} to parent ${parent_id}`);
      }
    }
  }
}

/**
 * Send star milestone notifications when a child crosses 10/25/50/100 stars.
 * Tracks milestones sent in daily_log.stars_milestones_notified (JSONB array).
 */
async function sendStarMilestoneNotifications() {
  const parentsResult = await db.query(
    `SELECT p.id AS parent_id, p.push_preferences
     FROM parent p
     WHERE p.push_preferences::jsonb ? 'star_milestone'
        OR NOT p.push_preferences::jsonb ? 'enabled'`
  );

  for (const { parent_id, push_preferences: rawPrefs } of parentsResult.rows) {
    const prefs = {
      enabled: (rawPrefs || {}).enabled !== false,
      star_milestone: (rawPrefs || {}).star_milestone !== false,
      per_child: (rawPrefs || {}).per_child || {},
    };
    if (!prefs.enabled || prefs.star_milestone === false) continue;
    if (isQuietHours()) continue;

    const childrenResult = await db.query(
      `SELECT c.id, c.name, c.emoji
       FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1`,
      [parent_id]
    );

    for (const child of childrenResult.rows) {
      const childPrefs = prefs.per_child?.[child.id];
      if (childPrefs?.star_milestone === false) continue;

      // Sum total stars earned
      const totalResult = await db.query(
        `SELECT COALESCE(SUM(dli.star_value), 0)::int AS total_stars
         FROM daily_log dl
         JOIN daily_log_item dli ON dli.daily_log_id = dl.id
         WHERE dl.child_id = $1 AND dli.completed = true`,
        [child.id]
      );
      const totalStars = parseInt(totalResult.rows[0].total_stars, 10);

      for (const milestone of STAR_MILESTONES) {
        if (totalStars >= milestone) {
          // Check if we already notified for this milestone
          const notifResult = await db.query(
            `SELECT metadata FROM notification_log
             WHERE parent_id = $1 AND type = 'star_milestone'
               AND created_at > NOW() - INTERVAL '7 days'
             LIMIT 1`,
            [parent_id]
          );
          const alreadyNotified = notifResult.rows.some(r => {
            const m = JSON.parse(r.metadata || '{}');
            return m.child_id === child.id && m.milestone === milestone;
          });

          if (!alreadyNotified) {
            await sendPushNotification(parent_id, {
              title: `${child.name} har samlat ${milestone} stjärnor! 🌟`,
              body: milestone === 100
                ? 'Helt fantastiskt! Nu väntar nya utmaningar!'
                : `${child.emoji || '⭐'} Grattis till ${child.name}!`,
              type: 'star_milestone',
              url: '/dashboard',
            });
            console.log(`[PUSH-REMINDER] Star milestone (${milestone}) sent for ${child.name} to parent ${parent_id}`);
          }
        }
      }
    }
  }
}

/**
 * Send backfill reminders at 09:00 for yesterday's incomplete schedules.
 */
async function sendBackfillReminders() {
  const parentsResult = await db.query(
    `SELECT DISTINCT p.id AS parent_id, p.push_preferences
     FROM parent p
     WHERE p.push_preferences::jsonb ? 'backfill_reminder'
        OR NOT p.push_preferences::jsonb ? 'enabled'`
  );

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  for (const { parent_id, push_preferences: rawPrefs } of parentsResult.rows) {
    const prefs = {
      enabled: (rawPrefs || {}).enabled !== false,
      backfill_reminder: (rawPrefs || {}).backfill_reminder !== false,
      per_child: (rawPrefs || {}).per_child || {},
    };
    if (!prefs.enabled || prefs.backfill_reminder === false) continue;
    if (isQuietHours()) continue;

    const childrenResult = await db.query(
      `SELECT c.id, c.name, c.emoji
       FROM child c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_id = $1`,
      [parent_id]
    );

    for (const child of childrenResult.rows) {
      const childPrefs = prefs.per_child?.[child.id];
      if (childPrefs?.backfill_reminder === false) continue;

      // Check if yesterday has any daily_log entry
      const logResult = await db.query(
        `SELECT id FROM daily_log WHERE child_id = $1 AND date = $2 LIMIT 1`,
        [child.id, yesterdayStr]
      );

      if (logResult.rows.length === 0) {
        await sendPushNotification(parent_id, {
          title: `Gårdagens schema för ${child.name} saknas`,
          body: 'Fyll i gårdagen så är allt uppdaterat!',
          type: 'backfill_reminder',
          url: '/daily-log',
        });
        console.log(`[PUSH-REMINDER] Backfill reminder sent for ${child.name} to parent ${parent_id}`);
      }
    }
  }
}

// ── Scheduler timer ────────────────────────────────────────────────────────────

let _timer = null;
const INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

function scheduleNextRun() {
  _timer = setTimeout(async () => {
    await runPushReminderJob();
    scheduleNextRun();
  }, INTERVAL_MS);
  if (_timer.unref) _timer.unref();
}

function isInProcessCronsEnabled() {
  return process.env.IN_PROCESS_CRONS_ENABLED === 'true'
    || process.env.POLSIA_IN_PROCESS_CRONS_ENABLED === 'true';
}

/**
 * Start the push reminder scheduler.
 * Guard: only starts if IN_PROCESS_CRONS_ENABLED === 'true'.
 */
function startPushReminderScheduler() {
  if (!isInProcessCronsEnabled()) {
    console.log('[PUSH-REMINDER] Disabled (set IN_PROCESS_CRONS_ENABLED=true)');
    return;
  }
  scheduleNextRun();
  console.log('[PUSH-REMINDER] Scheduler started (every 5 minutes)');
}

/**
 * Stop the scheduler (for graceful shutdown / tests).
 */
function stopPushReminderScheduler() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}

/**
 * Run immediately (for manual trigger / testing).
 */
async function runPushReminderNow() {
  return runPushReminderJob();
}

module.exports = {
  startPushReminderScheduler,
  stopPushReminderScheduler,
  runPushReminderNow,
};