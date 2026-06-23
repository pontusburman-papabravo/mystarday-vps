'use strict';

/**
 * Log-level daily log routes (mounted at /api/daily-logs).
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { getLogAccess } = require('../../middleware/authz');

const logRouter = express.Router();
logRouter.use(requireParent);

/**
 * PUT /api/daily-logs/:logId/pause
 * Pause a day (sick day / holiday).
 */
logRouter.put('/:logId/pause', async (req, res) => {
  try {
    const log = await getLogAccess(req.user.id, req.params.logId);
    if (!log) return res.status(404).json({ error: 'Dagloggen hittades inte' });

    const result = await db.query(
      `UPDATE daily_log SET is_paused = true WHERE id = $1 RETURNING id, date, is_paused`,
      [req.params.logId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[DAILY-LOG] Pause error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/daily-logs/:logId/unpause
 * Un-pause a day.
 */
logRouter.put('/:logId/unpause', async (req, res) => {
  try {
    const log = await getLogAccess(req.user.id, req.params.logId);
    if (!log) return res.status(404).json({ error: 'Dagloggen hittades inte' });

    const result = await db.query(
      `UPDATE daily_log SET is_paused = false WHERE id = $1 RETURNING id, date, is_paused`,
      [req.params.logId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[DAILY-LOG] Unpause error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/daily-logs/:logId/bump-time
 * Shift all uncompleted, untimed activities' start_time and end_time forward
 * by the specified number of minutes.
 *
 * Body: { minutes: 5 | 10 | 15 | 30 }
 *
 * Returns: { updated: number, snapshot: Array<{ id, start_time, end_time }> }
 * The snapshot lets the client implement a single-level undo.
 */
logRouter.put('/:logId/bump-time', async (req, res) => {
  try {
    const log = await getLogAccess(req.user.id, req.params.logId);
    if (!log) return res.status(404).json({ error: 'Dagloggen hittades inte' });

    const ALLOWED_MINUTES = [5, 10, 15, 30];
    const minutes = parseInt(req.body.minutes, 10);
    if (!ALLOWED_MINUTES.includes(minutes)) {
      return res.status(400).json({ error: 'Ogiltigt antal minuter. Tillåtna värden: 5, 10, 15, 30.' });
    }

    // Fetch all uncompleted items with a start_time for this log
    const beforeResult = await db.query(
      `SELECT id, start_time, end_time
       FROM daily_log_item
       WHERE daily_log_id = $1 AND completed = false AND start_time IS NOT NULL`,
      [req.params.logId]
    );

    if (beforeResult.rows.length === 0) {
      return res.json({ updated: 0, snapshot: [] });
    }

    // Save snapshot for undo (caller stores this)
    const snapshot = beforeResult.rows.map(r => ({
      id: r.id,
      start_time: r.start_time,
      end_time: r.end_time,
    }));

    // Shift times using PostgreSQL interval arithmetic on HH:MM text columns
    const updateResult = await db.query(
      `UPDATE daily_log_item
       SET
         start_time = TO_CHAR(
           (TO_TIMESTAMP(start_time, 'HH24:MI') + ($1 || ' minutes')::interval),
           'HH24:MI'
         ),
         end_time = CASE
           WHEN end_time IS NOT NULL THEN
             TO_CHAR(
               (TO_TIMESTAMP(end_time, 'HH24:MI') + ($1 || ' minutes')::interval),
               'HH24:MI'
             )
           ELSE NULL
         END
       WHERE daily_log_id = $2 AND completed = false AND start_time IS NOT NULL
       RETURNING id, start_time, end_time`,
      [String(minutes), req.params.logId]
    );

    res.json({ updated: updateResult.rows.length, snapshot, items: updateResult.rows });
  } catch (err) {
    console.error('[DAILY-LOG] Bump-time error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * PUT /api/daily-logs/:logId/bump-time-undo
 * Restore item times from a previously saved snapshot.
 *
 * Body: { snapshot: Array<{ id, start_time, end_time }> }
 */
logRouter.put('/:logId/bump-time-undo', async (req, res) => {
  try {
    const log = await getLogAccess(req.user.id, req.params.logId);
    if (!log) return res.status(404).json({ error: 'Dagloggen hittades inte' });

    const snapshot = req.body.snapshot;
    if (!Array.isArray(snapshot) || snapshot.length === 0) {
      return res.status(400).json({ error: 'Ogiltig snapshot' });
    }

    // Restore each item's times. Use unnest for a single efficient query.
    const ids = snapshot.map(s => s.id);
    const startTimes = snapshot.map(s => s.start_time);
    const endTimes = snapshot.map(s => s.end_time);

    const updateResult = await db.query(
      `UPDATE daily_log_item AS dli
       SET
         start_time = v.start_time,
         end_time = v.end_time
       FROM UNNEST($1::uuid[], $2::text[], $3::text[]) AS v(id, start_time, end_time)
       WHERE dli.id = v.id AND dli.daily_log_id = $4
       RETURNING dli.id, dli.start_time, dli.end_time`,
      [ids, startTimes, endTimes, req.params.logId]
    );

    res.json({ restored: updateResult.rows.length, items: updateResult.rows });
  } catch (err) {
    console.error('[DAILY-LOG] Bump-time-undo error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = logRouter;
