/**
 * Deletion scheduler — runs periodically to execute GDPR cascade deletions.
 *
 * Every hour it checks for parents marked as pending_deletion whose
 * deletion_requested_at is older than 30 days, then performs the full
 * cascade delete and sends a confirmation email.
 *
 * Uses setInterval (no external dependencies).
 * Uses pg_advisory_lock to prevent partial re-deletion across multiple instances.
 * Partial deletion on crash = data loss — the lock is safety-critical here.
 */

const db = require('./db');
const { sendAccountDeletedEmail } = require('./email');
const { DELETION_SCHEDULER_LOCK_ID } = require('./scheduler-constants');

let _timer = null;

// How often to check for deletions (milliseconds)
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const GRACE_PERIOD_DAYS = 30;

async function runDeletionJob() {
  // Advisory lock prevents two instances from deleting the same families concurrently.
  // Partial family deletion on crash = data loss — this lock is safety-critical.
  const client = await db.getClient();
  let lockAcquired = false;
  try {
    try {
      const { rows } = await client.query(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [DELETION_SCHEDULER_LOCK_ID]
      );
      lockAcquired = rows[0].acquired;
    } catch (err) {
      console.error('[DELETION-SCHEDULER] Failed to acquire advisory lock:', err.message);
      return;
    }

    if (!lockAcquired) {
      console.log('[DELETION-SCHEDULER] Skipping — another instance holds the lock');
      return;
    }

    console.log('[DELETION-SCHEDULER] Checking for due deletions...');
    // Find all parents past their 30-day grace period with pending deletion
    const due = await db.query(`
      SELECT p.id, p.email, p.family_id, p.deletion_requested_at
      FROM parent p
      WHERE p.pending_deletion = true
        AND p.deletion_requested_at IS NOT NULL
        AND p.deletion_requested_at < NOW() - INTERVAL '${GRACE_PERIOD_DAYS} days'
    `);

    if (due.rows.length === 0) {
      console.log('[DELETION-SCHEDULER] No deletions due.');
      return;
    }

    console.log(`[DELETION-SCHEDULER] Found ${due.rows.length} deletion(s) to process.`);

    for (const row of due.rows) {
      try {
        await executeCascadeDelete(row);
      } catch (err) {
        console.error(`[DELETION-SCHEDULER] Failed to delete parent ${row.id}:`, err.message);
        // Record the error so we don't keep retrying the same failing parent
        await db.query(
          `INSERT INTO deletion_job (parent_id, family_id, status, error)
           VALUES ($1, $2, 'failed', $3)
           ON CONFLICT (parent_id) DO UPDATE SET
             error = $3, status = 'failed'`,
          [row.id, row.family_id, err.message]
        );
      }
    }
  } catch (err) {
    console.error('[DELETION-SCHEDULER] Job error:', err.message);
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1)', [DELETION_SCHEDULER_LOCK_ID]).catch(() => {});
    }
    client.release();
  }
}

/**
 * Execute the full cascade delete for a single family.
 * Deletes the family row — CASCADE constraints handle all child rows.
 * Then deletes the parent.
 */
async function executeCascadeDelete({ id: parentId, email, family_id, deletion_requested_at }) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // First check if this is the last active parent in the family
    const otherParents = await client.query(
      `SELECT id FROM parent
       WHERE family_id = $1 AND id != $2 AND pending_deletion = false`,
      [family_id, parentId]
    );

    const isLastParent = otherParents.rows.length === 0;

    if (isLastParent) {
      // Delete the family — CASCADE handles:
      // child, parent_child, category, activity_template,
      // weekly_schedule + weekly_schedule_item,
      // daily_log + daily_log_item, rating,
      // reward + reward_redemption, streak, parent_note
      await client.query(`DELETE FROM family WHERE id = $1`, [family_id]);
      console.log(`[DELETION-SCHEDULER] Deleted family ${family_id} (cascade)`);
    } else {
      // Not the last parent — just mark the parent account for deletion
      // (other parents in the family remain active)
      await client.query(`DELETE FROM parent WHERE id = $1`, [parentId]);
      console.log(`[DELETION-SCHEDULER] Deleted parent ${parentId} (non-last parent)`);
    }

    // Record the deletion job
    await client.query(
      `INSERT INTO deletion_job (parent_id, family_id, status, deleted_at)
       VALUES ($1, $2, 'completed', NOW())
       ON CONFLICT (parent_id) DO UPDATE SET
         status = 'completed', deleted_at = NOW()`,
      [parentId, family_id]
    );

    await client.query('COMMIT');

    // Send deletion confirmation email (non-blocking)
    const firstName = email.split('@')[0].split('.')[0]; // rough extraction
    sendAccountDeletedEmail(email, firstName).catch(err => {
      console.warn(`[DELETION-SCHEDULER] Failed to send deletion email to ${email}:`, err.message);
    });

    console.log(`[DELETION-SCHEDULER] Completed deletion for ${email}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Start the deletion scheduler. Call once at server startup.
 */
function startDeletionScheduler() {
  // Run immediately on startup, then every CHECK_INTERVAL_MS
  runDeletionJob().catch(err => console.error('[DELETION-SCHEDULER] Initial run failed:', err.message));

  _timer = setInterval(() => {
    runDeletionJob().catch(err => console.error('[DELETION-SCHEDULER] Run failed:', err.message));
  }, CHECK_INTERVAL_MS);

  if (_timer.unref) _timer.unref();

  console.log(`[DELETION-SCHEDULER] Scheduler started (checks every ${CHECK_INTERVAL_MS / 60000} minutes)`);
}

/**
 * Stop the scheduler (useful for graceful shutdown).
 */
function stopDeletionScheduler() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.log('[DELETION-SCHEDULER] Scheduler stopped');
  }
}

module.exports = { startDeletionScheduler, stopDeletionScheduler, runDeletionJob };