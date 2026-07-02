'use strict';

/**
 * FEAT-1 BC-9 — custody handoff eve reminders + optional "Packa väska" once-task.
 * Runs daily ~18:00 Europe/Stockholm when IN_PROCESS_CRONS_ENABLED=true.
 */

const db = require('./db');
const { sendPushNotification } = require('./push-notifications');
const { CUSTODY_HANDOFF_SCHEDULER_LOCK_ID } = require('./scheduler-constants');
const { withAdvisoryLock } = require('./scheduler-lock');
const custodyDb = require('../../db/custody');
const { isCustodyHandoffEve, engineCtxFromPatternRow } = require('./custody-notify');
const { resolveCustodyDateSync } = require('./custody-schedule-engine');
const { addDaysIso } = require('./date-utils');
const { getOrGenerateDailyLog } = require('./daily-log-generator');
const { isActivationFlagEnabled, FLAG_KEYS } = require('./activation-flags');
const analytics = require('../../db/analytics');

const LOCK_ID = CUSTODY_HANDOFF_SCHEDULER_LOCK_ID;

function stockholmParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
  };
}

async function ensurePackLuggageTask(childId, dateStr) {
  const { log, items } = await getOrGenerateDailyLog(childId, dateStr);
  const hasPack = items.some(
    (i) => i.is_once_task && String(i.name || '').toLowerCase().includes('packa')
  );
  if (hasPack) return false;

  await db.query(
    `INSERT INTO daily_log_item (
       daily_log_id, name, icon, star_value, sort_order, section, is_once_task, completed
     ) VALUES ($1, 'Packa väska', '🎒', 0, 999, 'kvall', true, false)`,
    [log.id]
  );
  return true;
}

async function runCustodyHandoffJob(now = new Date()) {
  const { dateStr, hour, minute } = stockholmParts(now);
  if (hour !== 18 || minute >= 10) return;

  const outcome = await withAdvisoryLock(LOCK_ID, async () => {
  const patterns = await db.query(
    `SELECT cp.*, c.name AS child_name, c.family_id, c.emoji
     FROM custody_pattern cp
     JOIN child c ON c.id = cp.child_id`
  );

  let sent = 0;
  for (const row of patterns.rows) {
    const flagOk = await isActivationFlagEnabled(FLAG_KEYS.custodySchedule, row.family_id);
    if (!flagOk) continue;

    const homes = await custodyDb.listHomes(row.family_id);
    const homesById = Object.fromEntries(homes.map((h) => [h.id, h]));
    const engineCtx = engineCtxFromPatternRow(row, homesById);
    if (!isCustodyHandoffEve(engineCtx, dateStr)) continue;

    const tomorrow = addDaysIso(dateStr, 1);
    const nextResolved = resolveCustodyDateSync(engineCtx, tomorrow);
    const nextHome = nextResolved.activeHome;
    if (!nextHome) continue;

    const parents = await db.query(
      `SELECT DISTINCT p.id
       FROM parent p
       JOIN parent_child pc ON pc.parent_id = p.id AND pc.child_id = $1
       WHERE pc.revoked_at IS NULL`,
      [row.child_id]
    );

    if (row.pack_luggage_reminder !== false) {
      try {
        await ensurePackLuggageTask(row.child_id, tomorrow);
      } catch (err) {
        console.error('[CUSTODY-HANDOFF] Pack task failed:', row.child_id, err.message);
      }
    }

    for (const parent of parents.rows) {
      const titlePrefix = `Byte imorgon — ${row.child_name}`;
      const dup = await db.query(
        `SELECT 1 FROM notification_log
         WHERE parent_id = $1 AND type = 'custody_handoff_reminder'
           AND title LIKE $2
           AND created_at::date = $3::date
         LIMIT 1`,
        [parent.id, `${titlePrefix}%`, dateStr]
      );
      if (dup.rows.length) continue;

      await sendPushNotification(parent.id, {
        title: `${titlePrefix} hos ${nextHome.label}`,
        body: row.pack_luggage_reminder !== false
          ? '🎒 Packa väska finns i morgondagens schema.'
          : 'Kom ihåg att förbereda för veckobyte.',
        type: 'custody_handoff_reminder',
        url: '/daily-log',
      });
      sent += 1;
    }

    analytics.track(row.family_id, 'custody_handoff_reminder_sent', {
      child_id: row.child_id,
      next_home: nextHome.label,
    });
  }

  if (sent > 0) {
    console.log(`[CUSTODY-HANDOFF] Sent ${sent} reminder(s) for ${dateStr}`);
  }
  });

  if (outcome?.skipped === 'lock') {
    console.log('[CUSTODY-HANDOFF] Skipping — another instance holds the lock');
  }
}

let _timer = null;

function startCustodyHandoffScheduler() {
  const enabled = process.env.IN_PROCESS_CRONS_ENABLED === 'true'
    || process.env.POLSIA_IN_PROCESS_CRONS_ENABLED === 'true';
  if (!enabled) {
    console.log('[CUSTODY-HANDOFF] Disabled (IN_PROCESS_CRONS_ENABLED)');
    return;
  }

  const tick = () => {
    runCustodyHandoffJob().catch((err) => {
      console.error('[CUSTODY-HANDOFF] Job error:', err.message);
    });
  };

  tick();
  _timer = setInterval(tick, 5 * 60 * 1000);
  if (_timer.unref) _timer.unref();
  console.log('[CUSTODY-HANDOFF] Scheduler started (checks every 5 min, sends ~18:00)');
}

function stopCustodyHandoffScheduler() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = {
  runCustodyHandoffJob,
  startCustodyHandoffScheduler,
  stopCustodyHandoffScheduler,
  ensurePackLuggageTask,
};
