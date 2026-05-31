/**
 * Centralized authorization middleware and helpers.
 * Owns: family_id scoping, parent_child ownership checks, child self-access checks.
 * Does NOT own: JWT verification (auth.js), CSRF (csrf.js), rate limiting (rateLimiter.js).
 *
 * Kill switch: AUTHZ_HARDENING_ENABLED=false disables new middleware and falls through
 * to legacy per-route checks. Default: enabled.
 *
 * Usage:
 *   const authz = require('../middleware/authz');
 *
 *   // Helpers (async functions — return row or null):
 *   const child = await authz.getChildAccess(parentId, childId);
 *   const log   = await authz.getLogAccess(parentId, logId);
 *   const item  = await authz.getItemAccess(parentId, itemId);
 *   const sched = await authz.getScheduleAccess(parentId, scheduleId);
 *   const sday  = await authz.getSpecialDayAccess(parentId, scheduleId);
 *
 *   // Middleware factories (attach resolved row to req):
 *   router.get('/:childId/foo', authz.requireChildAccess('childId'), handler);
 *   router.put('/:logId/bar',   authz.requireLogAccess('logId'), handler);
 *   // req.authzChild / req.authzLog / req.authzItem / req.authzSchedule are set after pass.
 */

const db = require('../lib/db');
const { getParentRoles } = require('../../db/parent-access');

// Kill switch: set AUTHZ_HARDENING_ENABLED=false to disable and fall through.
const ENABLED = process.env.AUTHZ_HARDENING_ENABLED !== 'false';

// ─── Core helpers ────────────────────────────────────────────────────────────
// These are the canonical, single-source-of-truth implementations.
// Route files should import and reuse these rather than writing their own.

/**
 * Verify parent has access to a child (any role: primary or shared).
 * Returns child row or null.
 */
async function getChildAccess(parentId, childId) {
  const result = await db.query(
    `SELECT c.id, c.family_id, c.timezone, c.birthday, c.name
     FROM child c
     JOIN parent_child pc ON pc.child_id = c.id
     WHERE pc.parent_id = $1 AND c.id = $2`,
    [parentId, childId]
  );
  return result.rows[0] || null;
}

/**
 * Verify parent has access to a daily_log via child ownership.
 * Returns log row or null.
 */
async function getLogAccess(parentId, logId) {
  const result = await db.query(
    `SELECT dl.id, dl.child_id, dl.date, dl.is_paused, dl.generated_from, dl.created_at
     FROM daily_log dl
     JOIN child c ON c.id = dl.child_id
     JOIN parent_child pc ON pc.child_id = c.id
     WHERE pc.parent_id = $1 AND dl.id = $2`,
    [parentId, logId]
  );
  return result.rows[0] || null;
}

/**
 * Verify parent has access to a daily_log_item via log → child → parent.
 * Returns item row or null.
 */
async function getItemAccess(parentId, itemId) {
  const result = await db.query(
    `SELECT dli.id, dli.daily_log_id, dli.completed, dli.completed_at, dl.child_id, dl.is_paused
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     JOIN child c ON c.id = dl.child_id
     JOIN parent_child pc ON pc.child_id = c.id
     WHERE pc.parent_id = $1 AND dli.id = $2`,
    [parentId, itemId]
  );
  return result.rows[0] || null;
}

/**
 * Verify parent has access to a weekly_schedule.
 * Supports child-scoped schedules (child_id IS NOT NULL) and
 * family-level template schedules (child_id IS NULL, family_id set).
 * Returns schedule row or null.
 */
async function getScheduleAccess(parentId, scheduleId) {
  // Child-scoped first
  const childResult = await db.query(
    `SELECT ws.id, ws.child_id, ws.day_of_week, ws.sort_order
     FROM weekly_schedule ws
     JOIN child c ON c.id = ws.child_id
     JOIN parent_child pc ON pc.child_id = c.id
     WHERE pc.parent_id = $1 AND ws.id = $2`,
    [parentId, scheduleId]
  );
  if (childResult.rows.length > 0) return childResult.rows[0];

  // Family-level template (child_id IS NULL)
  const familyResult = await db.query(
    `SELECT ws.id, ws.child_id, ws.day_of_week, ws.sort_order
     FROM weekly_schedule ws
     JOIN parent p ON p.family_id = ws.family_id
     WHERE p.id = $1 AND ws.id = $2 AND ws.child_id IS NULL`,
    [parentId, scheduleId]
  );
  return familyResult.rows[0] || null;
}

/**
 * Verify parent has access to a special_day_schedule via child ownership.
 * Returns schedule row or null.
 */
async function getSpecialDayAccess(parentId, scheduleId) {
  const result = await db.query(
    `SELECT sds.id, sds.child_id, sds.date, sds.note
     FROM special_day_schedule sds
     JOIN child c ON c.id = sds.child_id
     JOIN parent_child pc ON pc.child_id = c.id
     WHERE pc.parent_id = $1 AND sds.id = $2`,
    [parentId, scheduleId]
  );
  return result.rows[0] || null;
}

/**
 * Verify parent has access to a reward (via family_id).
 * Returns reward row or null.
 */
async function getRewardAccess(parentFamilyId, rewardId) {
  const result = await db.query(
    `SELECT id, name, star_cost, family_id FROM reward
     WHERE family_id = $1 AND id = $2`,
    [parentFamilyId, rewardId]
  );
  return result.rows[0] || null;
}

/**
 * Verify parent has access to an activity (via family_id).
 * Returns activity row or null.
 */
async function getActivityAccess(parentFamilyId, activityId) {
  const result = await db.query(
    `SELECT id, name, family_id FROM activity_template
     WHERE family_id = $1 AND id = $2`,
    [parentFamilyId, activityId]
  );
  return result.rows[0] || null;
}

// ─── Middleware factories ────────────────────────────────────────────────────
// Each factory returns an Express middleware that:
//   1. If kill switch off → next() immediately (legacy path).
//   2. Calls the helper with req.user.id + req.params[paramName].
//   3. Sets req.authzXxx to the resolved row.
//   4. Returns 403 if not found/authorized.
//
// Note: req.user must already be set (requireParent middleware runs before these).

/**
 * Middleware: verify parent owns the child at req.params[paramName].
 * Sets req.authzChild on success.
 */
function requireChildAccess(paramName = 'childId') {
  return async (req, res, next) => {
    if (!ENABLED) return next();
    try {
      const child = await getChildAccess(req.user.id, req.params[paramName]);
      if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
      req.authzChild = child;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware: verify parent owns the daily_log at req.params[paramName].
 * Sets req.authzLog on success.
 */
function requireLogAccess(paramName = 'logId') {
  return async (req, res, next) => {
    if (!ENABLED) return next();
    try {
      const log = await getLogAccess(req.user.id, req.params[paramName]);
      if (!log) return res.status(403).json({ error: 'Du har inte åtkomst till denna daglogg' });
      req.authzLog = log;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware: verify parent owns the daily_log_item at req.params[paramName].
 * Sets req.authzItem on success.
 */
function requireItemAccess(paramName = 'itemId') {
  return async (req, res, next) => {
    if (!ENABLED) return next();
    try {
      const item = await getItemAccess(req.user.id, req.params[paramName]);
      if (!item) return res.status(403).json({ error: 'Du har inte åtkomst till detta moment' });
      req.authzItem = item;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware: verify parent owns the weekly_schedule at req.params[paramName].
 * Sets req.authzSchedule on success.
 */
function requireScheduleAccess(paramName = 'scheduleId') {
  return async (req, res, next) => {
    if (!ENABLED) return next();
    try {
      const schedule = await getScheduleAccess(req.user.id, req.params[paramName]);
      if (!schedule) return res.status(403).json({ error: 'Du har inte åtkomst till detta schema' });
      req.authzSchedule = schedule;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware: verify parent owns the special_day_schedule at req.params[paramName].
 * Sets req.authzSpecialDay on success.
 */
function requireSpecialDayAccess(paramName = 'scheduleId') {
  return async (req, res, next) => {
    if (!ENABLED) return next();
    try {
      const sday = await getSpecialDayAccess(req.user.id, req.params[paramName]);
      if (!sday) return res.status(403).json({ error: 'Du har inte åtkomst till detta specialschema' });
      req.authzSpecialDay = sday;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  // Kill switch flag (exported for tests)
  ENABLED,

  // Helpers (for direct use in route handlers that need the row for logic)
  getChildAccess,
  getLogAccess,
  getItemAccess,
  getScheduleAccess,
  getSpecialDayAccess,
  getRewardAccess,
  getActivityAccess,

  // Middleware factories (for route-level use)
  requireChildAccess,
  requireLogAccess,
  requireItemAccess,
  requireScheduleAccess,
  requireSpecialDayAccess,
};

// ─── Role-based access middleware ──────────────────────────────────────────
// These guard family-only operations from pedagog-only parents.

// requireNotPedagogOnly — blocks pedagog-only parents from family routes.
// Use on: dashboard-stats, children CRUD, rewards, family settings.
// Does NOT block dual-role parents (they have primary/shared too).
// Catches DB errors and logs them so we can diagnose 500s on /api/children.
function requireNotPedagogOnly(req, res, next) {
  if (!ENABLED) return next();
  getParentRoles(req.user.id).then(({ hasPedagogOnly }) => {
    if (hasPedagogOnly) {
      return res.status(403).json({ error: 'PEDAGOG_ONLY', message: 'Åtkomst nekad.' });
    }
    next();
  }).catch(err => {
    console.error('[AUTHZ] requireNotPedagogOnly failed for parent', req.user.id, ':', err.message);
    next(err);
  });
}

// requirePrimaryParent — blocks shared parents from pedagog-invite operations.
// Use on: POST /api/family/invite-pedagog
function requirePrimaryParent(req, res, next) {
  if (!ENABLED) return next();
  db.query(`
    SELECT 1 FROM parent_child
    WHERE parent_id = $1 AND role = 'primary' AND revoked_at IS NULL
    LIMIT 1
  `, [req.user.id]).then(({ rows }) => {
    if (rows.length === 0) {
      return res.status(403).json({ error: 'ONLY_PRIMARY', message: 'Endast primärförälder kan hantera pedagog-inbjudan.' });
    }
    next();
  }).catch(next);
}

Object.assign(module.exports, {
  requireNotPedagogOnly,
  requirePrimaryParent,
});
