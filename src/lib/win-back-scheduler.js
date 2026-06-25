/**
 * Win-back email scheduler.
 *
 * Fires every Sunday at 10:00 Europe/Stockholm time.
 * Identifies families inactive for >18 days and creates win-back email records.
 *
 * Auto-approve (feature_flag win_back_auto_approve, default ON):
 *   - ON  → each record is sent immediately (pending_approval → sent).
 *   - OFF → records stay pending_approval; admin approves in /admin Email-logg.
 *   Toggle the flag in the admin Email-logg panel.
 *
 * Conditions:
 *   - WIN_BACK_ENABLED=true (default false)
 *   - last_activity > 18 days ago
 *   - no win-back email (status=sent) sent to that parent in the last 30 days
 *   - parent has email_enabled = true
 *
 * Status flow: pending_approval → (auto-approve OR admin approves) → sent
 *               pending_approval → (admin rejects OR stale) → rejected
 *
 * Feature flag slug: win_back_email (status: dev)
 */

const db = require('./db');
const winBackLog = require('../../db/win-back-email-log');
const { WIN_BACK_SCHEDULER_LOCK_ID } = require('./scheduler-constants');
const { isAutoApproveEnabled, approveAndSend } = require('./win-back-sender');

/**
 * Days of inactivity to trigger a win-back email record.
 */
const INACTIVITY_THRESHOLD_DAYS = 18;

/**
 * Minimum days between win-back emails to the same parent (cooldown after sent).
 */
const EMAIL_COOLDOWN_DAYS = 30;

/**
 * Day-of-month of the last Sunday in a given month (for DST calculation).
 * @param {number} year  - e.g. 2026
 * @param {number} month - 0-indexed (0=January, 11=December)
 */
function lastSundayOfMonth(year, month) {
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const dayOfWeek = lastDayOfMonth.getDay(); // 0=Sun
  const sunday = new Date(lastDayOfMonth.getTime() - dayOfWeek * 86400 * 1000);
  return sunday.getDate();
}

/**
 * Milliseconds until next Sunday 10:00 Europe/Stockholm.
 */
function msUntilNextSunday1000Stockholm() {
  const now = new Date();

  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const localDow = new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`).getDay();

  const targetHour = 10;
  const currentHour = parseInt(parts.hour, 10);
  const currentMinute = parseInt(parts.minute, 10);

  let daysUntilSunday = (7 - localDow) % 7;
  if (daysUntilSunday === 0 && (currentHour < targetHour || (currentHour === targetHour && currentMinute === 0))) {
    daysUntilSunday = 0;
  } else if (daysUntilSunday === 0) {
    daysUntilSunday = 7;
  }

  const nextSundayLocal = new Date(`${parts.year}-${parts.month}-${parts.day}T${targetHour}:00:00`);
  nextSundayLocal.setDate(nextSundayLocal.getDate() + daysUntilSunday);

  const stockholmYear = parseInt(
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric' }).format(nextSundayLocal),
    10
  );

  const dstStart = lastSundayOfMonth(stockholmYear, 2);
  const dstEnd   = lastSundayOfMonth(stockholmYear, 9);
  const stockholmDay   = nextSundayLocal.getDate();
  const stockholmMonth = nextSundayLocal.getMonth() + 1;

  let offsetMs;
  if (stockholmMonth > 3 && stockholmMonth < 10) {
    offsetMs = 2 * 3600 * 1000;
  } else if (stockholmMonth === 3 && stockholmDay >= dstStart) {
    offsetMs = 2 * 3600 * 1000;
  } else if (stockholmMonth === 10 && stockholmDay < dstEnd) {
    offsetMs = 2 * 3600 * 1000;
  } else {
    offsetMs = 1 * 3600 * 1000;
  }

  const utcMs = nextSundayLocal.getTime() - offsetMs;
  return Math.max(0, utcMs - now.getTime());
}

/**
 * Fetch families eligible for a pending win-back email record.
 * Inactive = no parent login and no child completion in the last N days
 * (same signals as admin retention dashboard — works for migrated users without analytics_events).
 * Cooldown checks for 'sent' status only — pending_approval records don't block.
 */
async function fetchEligibleFamilies() {
  return db.query(
    `SELECT DISTINCT ON (p.family_id)
       p.id         AS parent_id,
       p.email      AS parent_email,
       p.name       AS parent_name,
       p.family_id,
       c.name       AS child_name
     FROM parent p
     JOIN family f ON f.id = p.family_id AND f.archived_at IS NULL
     JOIN child c ON c.family_id = p.family_id
     LEFT JOIN notification_preference np ON np.parent_id = p.id
     WHERE p.verified = true
       AND p.is_admin = false
       AND p.email IS NOT NULL
       AND COALESCE(np.email_enabled, true) = true
       -- Inactive: no login or child completion in threshold window
       AND NOT EXISTS (
         SELECT 1 FROM login_event le
         WHERE le.family_id = p.family_id
           AND le.occurred_at > NOW() - INTERVAL '${INACTIVITY_THRESHOLD_DAYS} days'
       )
       AND NOT EXISTS (
         SELECT 1 FROM daily_log_item dli
         JOIN daily_log dl ON dl.id = dli.daily_log_id
         JOIN child c2 ON c2.id = dl.child_id
         WHERE c2.family_id = p.family_id
           AND dli.completed = true
           AND dli.completed_at IS NOT NULL
           AND dli.completed_at > NOW() - INTERVAL '${INACTIVITY_THRESHOLD_DAYS} days'
       )
       -- Not already in cooldown: no 'sent' win-back in the last 30 days
       AND NOT EXISTS (
         SELECT 1 FROM win_back_email_log wbel
         WHERE wbel.parent_id = p.id
           AND wbel.status = 'sent'
           AND wbel.sent_at > NOW() - INTERVAL '${EMAIL_COOLDOWN_DAYS} days'
       )
       -- No existing pending/approved record for this parent
       AND NOT EXISTS (
         SELECT 1 FROM win_back_email_log wbel
         WHERE wbel.parent_id = p.id
           AND wbel.status IN ('pending_approval', 'approved', 'failed')
       )
     ORDER BY p.family_id, p.created_at ASC`,
    []
  );
}

let _timer = null;

function scheduleNextRun() {
  const ms = msUntilNextSunday1000Stockholm();
  const minutes = Math.round(ms / 60000);
  console.log(`[WIN-BACK] Next run in ${minutes} minutes (next Sunday 10:00 Stockholm)`);

  _timer = setTimeout(async () => {
    await runWinBackJob();
    scheduleNextRun();
  }, ms);

  if (_timer.unref) _timer.unref();
}

async function runWinBackJob() {
  if (process.env.WIN_BACK_ENABLED !== 'true') {
    console.log('[WIN-BACK] Disabled (WIN_BACK_ENABLED != true) — skipping');
    return;
  }

  const client = await db.getClient();
  let lockAcquired = false;
  try {
    try {
      const { rows } = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [WIN_BACK_SCHEDULER_LOCK_ID]);
      lockAcquired = rows[0].acquired;
    } catch (err) {
      console.error('[WIN-BACK] Failed to acquire advisory lock:', err.message);
      return;
    }

    if (!lockAcquired) {
      console.log('[WIN-BACK] Skipping — another instance holds the lock');
      return;
    }

    const autoApprove = await isAutoApproveEnabled();
    console.log(`[WIN-BACK] Starting job — auto-approve ${autoApprove ? 'ON (sending automatically)' : 'OFF (queuing for manual approval)'}`);

    let createdCount = 0;
    let sentCount = 0;
    let errorCount = 0;

    const eligible = await fetchEligibleFamilies();
    console.log(`[WIN-BACK] Found ${eligible.rows.length} eligible families`);

    for (const row of eligible.rows) {
      try {
        const childResult = await db.query(
          `SELECT c.name, c.id
           FROM child c
           JOIN parent_child pc ON pc.child_id = c.id AND pc.revoked_at IS NULL
           WHERE pc.parent_id = $1
           ORDER BY (pc.role = 'primary') DESC, c.created_at ASC
           LIMIT 1`,
          [row.parent_id]
        );
        const childName = childResult.rows[0]?.name || row.child_name || 'barnet';
        const childId = childResult.rows[0]?.id || null;

        const record = await winBackLog.insertPending({
          familyId: row.family_id,
          parentId: row.parent_id,
          parentEmail: row.parent_email,
          parentName: row.parent_name,
          childId,
          childName,
          subject: null,
          body: null,
        });

        createdCount++;

        if (autoApprove && record?.id) {
          const result = await approveAndSend(record.id);
          if (result.ok) {
            sentCount++;
            console.log(`[WIN-BACK] Auto-sent to ${row.parent_email} (child: ${childName})`);
          } else {
            errorCount++;
            console.error(`[WIN-BACK] Auto-send failed for ${row.parent_email}:`, result.error || 'okänt fel');
          }
        } else {
          console.log(`[WIN-BACK] Pending record created for ${row.parent_email} (child: ${childName})`);
        }
      } catch (err) {
        errorCount++;
        console.error(`[WIN-BACK] Error for parent ${row.parent_id}:`, err.message);
      }
    }

    console.log(`[WIN-BACK] Done. Created=${createdCount} Sent=${sentCount} Errors=${errorCount}`);
  } catch (err) {
    console.error('[WIN-BACK] Job failed:', err.message);
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1)', [WIN_BACK_SCHEDULER_LOCK_ID]).catch(() => {});
    }
    client.release();
  }
}

function startWinBackScheduler() {
  scheduleNextRun();
  console.log('[WIN-BACK] Scheduler started');
}

function stopWinBackScheduler() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}

async function runWinBackNow() {
  return runWinBackJob();
}

module.exports = {
  startWinBackScheduler,
  stopWinBackScheduler,
  runWinBackNow,
  fetchEligibleFamilies,
  INACTIVITY_THRESHOLD_DAYS,
  EMAIL_COOLDOWN_DAYS,
};