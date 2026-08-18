/**
 * db/pin-lockout.js
 * Owns: pin_lockout, pin_notification_log, pin_audit_log tables.
 * Does NOT own: authentication logic, email sending, SSE broadcasting.
 *
 * All functions accept a child_id (UUID). Lockout state is stored as a single
 * row per child (upserted), making reads O(1) on primary key.
 */

const db = require('../src/lib/db');
const config = require('../src/lib/config');

function queryWith(client) {
  return client ? client.query.bind(client) : db.query.bind(db);
}

// ─── Lockout thresholds ───────────────────────────────────
// Exponential backoff schedule:
//   ≥ MAX_ATTEMPTS: baseLockoutMinutes (default 1min)
//   ≥ MAX_ATTEMPTS + 3: 5 × base (default 5min)
//   ≥ MAX_ATTEMPTS + 6: 15 × base (default 15min)
const MAX_ATTEMPTS = config.rateLimits.childPin.maxAttempts; // default 5
const BASE_MINUTES = config.rateLimits.childPin.baseLockoutMinutes; // default 1

/**
 * Compute lockout duration in minutes based on total attempt count.
 * Returns 0 if not yet locked.
 */
function getLockoutMinutes(attemptCount) {
  if (attemptCount >= MAX_ATTEMPTS + 6) return BASE_MINUTES * 15;
  if (attemptCount >= MAX_ATTEMPTS + 3) return BASE_MINUTES * 5;
  if (attemptCount >= MAX_ATTEMPTS) return BASE_MINUTES;
  return 0;
}

/**
 * Get current lockout state for a child.
 * Returns null if no lockout row exists.
 */
async function getLockout(childId) {
  const result = await db.query(
    `SELECT id, child_id, attempt_count, locked_until, last_attempt_at
     FROM pin_lockout WHERE child_id = $1`,
    [childId]
  );
  return result.rows[0] || null;
}

/**
 * Record a failed PIN attempt and compute new lockout state.
 * Returns the updated lockout row including:
 *   - attempt_count: total failed attempts
 *   - locked_until: timestamp when lockout expires (null if not locked)
 *   - lockout_minutes: how long the lockout lasts (0 if not locked)
 *   - attempts_remaining: attempts left before next lockout
 */
async function recordFailedAttempt(childId, ipAddress) {
  // Upsert: create or increment attempt counter
  const result = await db.query(
    `INSERT INTO pin_lockout (child_id, ip_address, attempt_count, last_attempt_at)
     VALUES ($1, $2, 1, NOW())
     ON CONFLICT (child_id) DO UPDATE
       SET attempt_count = pin_lockout.attempt_count + 1,
           ip_address = EXCLUDED.ip_address,
           last_attempt_at = NOW()
     RETURNING id, child_id, attempt_count, locked_until`,
    [childId, ipAddress || null]
  );
  const row = result.rows[0];
  const lockoutMinutes = getLockoutMinutes(row.attempt_count);

  // Apply lockout if threshold crossed
  if (lockoutMinutes > 0) {
    const lockedUntil = new Date(Date.now() + lockoutMinutes * 60_000);
    await db.query(
      `UPDATE pin_lockout SET locked_until = $1 WHERE child_id = $2`,
      [lockedUntil, childId]
    );
    row.locked_until = lockedUntil;
  }

  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - row.attempt_count);
  return {
    ...row,
    lockout_minutes: lockoutMinutes,
    attempts_remaining: attemptsRemaining,
  };
}

/**
 * Reset attempt counter and lockout for a child (parent unlocks).
 */
/**
 * Reset attempt counter and lockout for a child (parent unlock or PIN change).
 * @param {string} childId
 * @param {import('pg').PoolClient} [client] Optional transaction client for atomic updates.
 */
async function clearLockout(childId, client) {
  const q = queryWith(client);
  await q(
    `UPDATE pin_lockout SET attempt_count = 0, locked_until = NULL WHERE child_id = $1`,
    [childId]
  );
}

/**
 * Check if a child is currently locked out (lockout has not expired).
 * Returns { locked: true, locked_until, lockout_minutes } or { locked: false }.
 */
async function checkLockout(childId) {
  const lockout = await getLockout(childId);
  if (!lockout || !lockout.locked_until || new Date(lockout.locked_until) <= new Date()) {
    return { locked: false, attempt_count: lockout?.attempt_count || 0 };
  }

  const msRemaining = new Date(lockout.locked_until) - Date.now();
  const minutesRemaining = Math.ceil(msRemaining / 60_000);
  return {
    locked: true,
    locked_until: lockout.locked_until,
    lockout_minutes: minutesRemaining,
    retry_after_seconds: Math.ceil(msRemaining / 1000),
  };
}

/**
 * Record a successful login — clear the attempt counter.
 */
async function recordSuccessfulLogin(childId) {
  await db.query(
    `DELETE FROM pin_lockout WHERE child_id = $1`,
    [childId]
  );
}

// ─── Notification cooldown ────────────────────────────────

/**
 * Check whether email cooldown is active for a child.
 * Returns true if an email was sent within PIN_EMAIL_COOLDOWN_MINUTES.
 */
async function isEmailCooldownActive(childId) {
  const cooldownMinutes = config.email.pinEmailCooldownMinutes;
  const result = await db.query(
    `SELECT id FROM pin_notification_log
     WHERE child_id = $1 AND channel = 'email'
       AND notified_at >= NOW() - INTERVAL '1 minute' * $2
     LIMIT 1`,
    [childId, cooldownMinutes]
  );
  return result.rows.length > 0;
}

/**
 * Record that a notification was sent via a given channel ('email' or 'in_app').
 */
async function recordNotification(childId, familyId, channel) {
  await db.query(
    `INSERT INTO pin_notification_log (child_id, family_id, channel)
     VALUES ($1, $2, $3)`,
    [childId, familyId, channel]
  );
}

// ─── Audit log ────────────────────────────────────────────

/**
 * Log a PIN-related audit event.
 * event_type: 'attempt_failed' | 'attempt_success' | 'lockout' | 'lockout_cleared' |
 *             'parent_notified' | 'email_suppressed' | 'pin_reset'
 */
/**
 * @param {import('pg').PoolClient} [client] Optional transaction client.
 */
async function auditLog(childId, familyId, eventType, ipAddress, metadata = {}, client) {
  const q = queryWith(client);
  await q(
    `INSERT INTO pin_audit_log (child_id, family_id, event_type, ip_address, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [childId, familyId, eventType, ipAddress || null, JSON.stringify(metadata)]
  );
}

/**
 * Get PIN audit log for a child (admin view, latest 50 events).
 */
async function getAuditLog(childId, limit = 50) {
  const result = await db.query(
    `SELECT id, event_type, ip_address, metadata, created_at
     FROM pin_audit_log
     WHERE child_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [childId, limit]
  );
  return result.rows;
}

module.exports = {
  MAX_ATTEMPTS,
  BASE_MINUTES,
  getLockoutMinutes,
  getLockout,
  recordFailedAttempt,
  clearLockout,
  checkLockout,
  recordSuccessfulLogin,
  isEmailCooldownActive,
  recordNotification,
  auditLog,
  getAuditLog,
};
