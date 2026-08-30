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
const { resolveCommunicationLocale } = require('./communication-locale');
const { DELETION_SCHEDULER_LOCK_ID } = require('./scheduler-constants');
const { withAdvisoryLock } = require('./scheduler-lock');
const familyDeletion = require('./family-deletion');

let _timer = null;

// How often to check for deletions (milliseconds)
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const GRACE_PERIOD_DAYS = 30;

async function runDeletionJob() {
  const outcome = await withAdvisoryLock(DELETION_SCHEDULER_LOCK_ID, async () => {
  console.log('[DELETION-SCHEDULER] Checking for due deletions...');

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
      await db.query(
        `INSERT INTO deletion_job (parent_id, family_id, status, error)
         VALUES ($1, $2, 'failed', $3)
         ON CONFLICT (parent_id) DO UPDATE SET
           error = $3, status = 'failed'`,
        [row.id, row.family_id, err.message]
      );
    }
  }
  });

  if (outcome?.skipped === 'lock') {
    console.log('[DELETION-SCHEDULER] Skipping — another instance holds the lock');
  }
}

/**
 * Execute due pending_deletion using the same administrative-authority
 * rules as DELETE /api/family/delete-account.
 */
async function executeCascadeDelete({ id: parentId, email, family_id }) {
  const client = await db.getClient();
  let capturedAvatarKeys = [];
  let committed = false;

  try {
    await client.query('BEGIN');

    const familyLocaleResult = await client.query(
      'SELECT preferred_locale FROM family WHERE id = $1',
      [family_id]
    );
    const communicationLocale = resolveCommunicationLocale(familyLocaleResult.rows[0]?.preferred_locale);

    await familyDeletion.lockFamilyDeletionAuthority(client, family_id);
    const impact = await familyDeletion.deletionConsequenceForCaller(client, parentId, family_id);

    if (impact.mode === 'family') {
      capturedAvatarKeys = await familyDeletion.collectFamilyAvatarStorageKeys(client, family_id);
      await familyDeletion.hardDeleteFamilyData(client, family_id);
      console.log(`[DELETION-SCHEDULER] Deleted family ${family_id} (last authorized adult)`);
    } else if (impact.mode === 'self') {
      const parentKey = await familyDeletion.collectParentAvatarStorageKey(client, parentId);
      capturedAvatarKeys = parentKey ? [parentKey] : [];
      await familyDeletion.removeParentFromFamily(client, {
        parentId,
        familyId: family_id,
        revokedBy: parentId,
      });
      console.log(`[DELETION-SCHEDULER] Removed parent ${parentId} (other authorized adults remain)`);
    } else {
      const parentKey = await familyDeletion.collectParentAvatarStorageKey(client, parentId);
      capturedAvatarKeys = parentKey ? [parentKey] : [];
      await client.query('DELETE FROM parent_child WHERE parent_id = $1', [parentId]);
      await client.query('DELETE FROM notification_preference WHERE parent_id = $1', [parentId]);
      await client.query('DELETE FROM parent WHERE id = $1', [parentId]);
      console.log(`[DELETION-SCHEDULER] Deleted parent ${parentId} (no administrative authority)`);
    }

    await client.query(
      `INSERT INTO deletion_job (parent_id, family_id, status, deleted_at)
       VALUES ($1, $2, 'completed', NOW())
       ON CONFLICT (parent_id) DO UPDATE SET
         status = 'completed', deleted_at = NOW()`,
      [parentId, family_id]
    );

    await client.query('COMMIT');
    committed = true;

    // Send deletion confirmation email (non-blocking)
    const firstName = email.split('@')[0].split('.')[0]; // rough extraction
    sendAccountDeletedEmail(email, firstName, communicationLocale).catch(err => {
      console.warn(`[DELETION-SCHEDULER] Failed to send deletion email to parent ${parentId}:`, err.message);
    });

    console.log(`[DELETION-SCHEDULER] Completed deletion for parent ${parentId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  if (committed) {
    await familyDeletion.cleanupAvatarStorageKeysAfterCommit(capturedAvatarKeys);
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